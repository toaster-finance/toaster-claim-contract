import { expect } from "chai";
import { ethers } from "hardhat";
import { ContractFactory, BaseContract } from "ethers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { keccak256 as solidityKeccak256, AbiCoder } from "ethers";
import { MerkleTree } from "merkletreejs";

interface IMerkleAirdrop extends BaseContract {
  merkleRoot(): Promise<string>;
  setMerkleRoot(root: string): Promise<any>;
  depositTokens(amount: bigint): Promise<any>;
  claim(amount: bigint, proof: string[]): Promise<any>;
  withdrawUnclaimed(amount: bigint): Promise<any>;
  setToken(token: string): Promise<any>;
  connect(signer: HardhatEthersSigner): IMerkleAirdrop;
  getAddress(): Promise<string>;
}

interface IERC20 extends BaseContract {
  balanceOf(account: string): Promise<bigint>;
  mint(to: string, amount: bigint): Promise<any>;
  approve(spender: string, amount: bigint): Promise<any>;
  getAddress(): Promise<string>;
}

describe("MerkleAirdrop", function () {
  let merkleAirdrop: IMerkleAirdrop;
  let token: IERC20;
  let owner: HardhatEthersSigner;
  let addr1: HardhatEthersSigner;
  let addr2: HardhatEthersSigner;
  let addr3: HardhatEthersSigner;
  let merkleTree: MerkleTree;
  let airdropAmounts: { account: HardhatEthersSigner; amount: bigint }[];

  beforeEach(async function () {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();

    airdropAmounts = [
      { account: addr1, amount: ethers.parseEther("100") },
      { account: addr2, amount: ethers.parseEther("200") },
      { account: addr3, amount: ethers.parseEther("300") },
    ];

    // Deploy mock ERC20 token
    const MockToken: ContractFactory = await ethers.getContractFactory("MockERC20");
    token = (await MockToken.deploy("Mock Token", "MTK")) as unknown as IERC20;

    // Deploy MerkleAirdrop contract
    const MerkleAirdrop: ContractFactory = await ethers.getContractFactory("MerkleAirdrop");
    merkleAirdrop = (await MerkleAirdrop.deploy()) as IMerkleAirdrop;

    // Set token
    await merkleAirdrop.setToken(await token.getAddress());

    // Create merkle tree
    const abiCoder = new AbiCoder();
    const leaves = airdropAmounts.map((x) =>
      solidityKeccak256(abiCoder.encode(["address", "uint256"], [x.account.address, x.amount])),
    );
    merkleTree = new MerkleTree(leaves, solidityKeccak256, { sortPairs: true });

    // Mint tokens to owner and approve MerkleAirdrop contract
    await token.mint(owner.address, ethers.parseEther("1000"));
    await token.approve(await merkleAirdrop.getAddress(), ethers.parseEther("1000"));
  });

  describe("Token Management", function () {
    it("Should set token correctly", async function () {
      const MockToken = await ethers.getContractFactory("MockERC20");
      const newToken = (await MockToken.deploy("New Token", "NTK")) as unknown as IERC20;
      await merkleAirdrop.setToken(await newToken.getAddress());
    });

    it("Should not allow setting zero address as token", async function () {
      await expect(merkleAirdrop.setToken(ethers.ZeroAddress)).to.be.revertedWith(
        "Invalid token address",
      );
    });

    it("Should not allow changing token when balance exists", async function () {
      await merkleAirdrop.depositTokens(ethers.parseEther("100"));
      const MockToken = await ethers.getContractFactory("MockERC20");
      const newToken = (await MockToken.deploy("New Token", "NTK")) as unknown as IERC20;
      await expect(merkleAirdrop.setToken(await newToken.getAddress())).to.be.revertedWith(
        "Contract still has token balance",
      );
    });
  });

  it("Should set merkle root correctly", async function () {
    const root = merkleTree.getHexRoot();
    await merkleAirdrop.setMerkleRoot(root);
    expect(await merkleAirdrop.merkleRoot()).to.equal(root);
  });

  it("Should deposit tokens correctly", async function () {
    const amount = ethers.parseEther("1000");
    await merkleAirdrop.depositTokens(amount);
    expect(await token.balanceOf(await merkleAirdrop.getAddress())).to.equal(amount);
  });

  it("Should allow valid claims", async function () {
    // Set merkle root and deposit tokens
    await merkleAirdrop.setMerkleRoot(merkleTree.getHexRoot());
    await merkleAirdrop.depositTokens(ethers.parseEther("1000"));

    // Claim for addr1
    const abiCoder = new AbiCoder();
    const leaf = solidityKeccak256(
      abiCoder.encode(["address", "uint256"], [addr1.address, airdropAmounts[0].amount]),
    );
    const proof = merkleTree.getHexProof(leaf);

    await merkleAirdrop.connect(addr1).claim(airdropAmounts[0].amount, proof);
    expect(await token.balanceOf(addr1.address)).to.equal(airdropAmounts[0].amount);
  });

  it("Should prevent duplicate claims", async function () {
    await merkleAirdrop.setMerkleRoot(merkleTree.getHexRoot());
    await merkleAirdrop.depositTokens(ethers.parseEther("1000"));

    const abiCoder = new AbiCoder();
    const leaf = solidityKeccak256(
      abiCoder.encode(["address", "uint256"], [addr1.address, airdropAmounts[0].amount]),
    );
    const proof = merkleTree.getHexProof(leaf);

    await merkleAirdrop.connect(addr1).claim(airdropAmounts[0].amount, proof);
    await expect(
      merkleAirdrop.connect(addr1).claim(airdropAmounts[0].amount, proof),
    ).to.be.revertedWith("Already claimed");
  });

  it("Should reject invalid proofs", async function () {
    await merkleAirdrop.setMerkleRoot(merkleTree.getHexRoot());
    await merkleAirdrop.depositTokens(ethers.parseEther("1000"));

    const abiCoder = new AbiCoder();
    const leaf = solidityKeccak256(
      abiCoder.encode(["address", "uint256"], [addr1.address, airdropAmounts[0].amount]),
    );
    const proof = merkleTree.getHexProof(leaf);

    // Try to claim with wrong amount
    await expect(
      merkleAirdrop.connect(addr1).claim(ethers.parseEther("999"), proof),
    ).to.be.revertedWith("Invalid proof");
  });

  it("Should allow owner to withdraw unclaimed tokens", async function () {
    const depositAmount = ethers.parseEther("1000");
    await merkleAirdrop.depositTokens(depositAmount);

    const withdrawAmount = ethers.parseEther("500");
    await merkleAirdrop.withdrawUnclaimed(withdrawAmount);

    expect(await token.balanceOf(await merkleAirdrop.getAddress())).to.equal(
      depositAmount - withdrawAmount,
    );
    expect(await token.balanceOf(owner.address)).to.equal(withdrawAmount);
  });
});
