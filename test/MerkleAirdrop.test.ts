import { expect } from "chai";
import { ethers } from "hardhat";
import { ContractFactory, BaseContract } from "ethers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { keccak256 as solidityKeccak256, AbiCoder } from "ethers";
import { MerkleTree } from "merkletreejs";

interface IMerkleAirdrop extends BaseContract {
  merkleRoot(): Promise<string>;
  initAirdrop(token: string, merkleRoot: string, amount: bigint): Promise<any>;
  claim(amount: bigint, proof: string[]): Promise<any>;
  withdrawUnclaimed(): Promise<any>;
  isClaimed(user: string): Promise<boolean>;
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
  let newToken: IERC20;
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

    // Deploy mock ERC20 tokens
    const MockToken = await ethers.getContractFactory("MockERC20");
    token = (await MockToken.deploy("Mock Token", "MTK")) as unknown as IERC20;
    newToken = (await MockToken.deploy("New Token", "NTK")) as unknown as IERC20;

    // Deploy MerkleAirdrop contract
    const MerkleAirdrop = await ethers.getContractFactory("MerkleAirdrop");
    merkleAirdrop = (await MerkleAirdrop.deploy()) as unknown as IMerkleAirdrop;

    // Create merkle tree
    const abiCoder = new AbiCoder();
    const leaves = airdropAmounts.map((x) =>
      solidityKeccak256(abiCoder.encode(["address", "uint256"], [x.account.address, x.amount])),
    );
    merkleTree = new MerkleTree(leaves, solidityKeccak256, { sortPairs: true });

    // Mint tokens and approve
    await token.mint(owner.address, ethers.parseEther("1000"));
    await token.approve(await merkleAirdrop.getAddress(), ethers.parseEther("1000"));
    await newToken.mint(owner.address, ethers.parseEther("1000"));
    await newToken.approve(await merkleAirdrop.getAddress(), ethers.parseEther("1000"));
  });

  describe("Airdrop Initialization", function () {
    it("Should initialize airdrop correctly", async function () {
      await merkleAirdrop.initAirdrop(
        await token.getAddress(),
        merkleTree.getHexRoot(),
        ethers.parseEther("1000"),
      );
    });

    it("Should not allow initialization with zero address token", async function () {
      await expect(
        merkleAirdrop.initAirdrop(
          ethers.ZeroAddress,
          merkleTree.getHexRoot(),
          ethers.parseEther("1000"),
        ),
      ).to.be.revertedWithCustomError(merkleAirdrop, "InvalidTokenAddress");
    });

    it("Should not allow new initialization when tokens remain", async function () {
      await merkleAirdrop.initAirdrop(
        await token.getAddress(),
        merkleTree.getHexRoot(),
        ethers.parseEther("1000"),
      );

      await expect(
        merkleAirdrop.initAirdrop(
          await newToken.getAddress(),
          merkleTree.getHexRoot(),
          ethers.parseEther("1000"),
        ),
      ).to.be.revertedWithCustomError(merkleAirdrop, "ContractHasLeftoverTokens");
    });
  });

  describe("Claiming", function () {
    beforeEach(async function () {
      await merkleAirdrop.initAirdrop(
        await token.getAddress(),
        merkleTree.getHexRoot(),
        ethers.parseEther("1000"),
      );
    });

    it("Should allow valid claims", async function () {
      const abiCoder = new AbiCoder();
      const leaf = solidityKeccak256(
        abiCoder.encode(["address", "uint256"], [addr1.address, airdropAmounts[0].amount]),
      );
      const proof = merkleTree.getHexProof(leaf);

      await merkleAirdrop.connect(addr1).claim(airdropAmounts[0].amount, proof);
      expect(await token.balanceOf(addr1.address)).to.equal(airdropAmounts[0].amount);
      expect(await merkleAirdrop.isClaimed(addr1.address)).to.be.true;
    });

    it("Should prevent duplicate claims in same round", async function () {
      const abiCoder = new AbiCoder();
      const leaf = solidityKeccak256(
        abiCoder.encode(["address", "uint256"], [addr1.address, airdropAmounts[0].amount]),
      );
      const proof = merkleTree.getHexProof(leaf);

      await merkleAirdrop.connect(addr1).claim(airdropAmounts[0].amount, proof);
      await expect(
        merkleAirdrop.connect(addr1).claim(airdropAmounts[0].amount, proof),
      ).to.be.revertedWithCustomError(merkleAirdrop, "AlreadyClaimed");
    });

    it("Should allow claiming in new round", async function () {
      // First round claim
      const abiCoder = new AbiCoder();
      const leaf = solidityKeccak256(
        abiCoder.encode(["address", "uint256"], [addr1.address, airdropAmounts[0].amount]),
      );
      const proof = merkleTree.getHexProof(leaf);

      await merkleAirdrop.connect(addr1).claim(airdropAmounts[0].amount, proof);

      // Create new merkle tree for second round with different amounts
      const newAirdropAmounts = [
        { account: addr1, amount: ethers.parseEther("150") },
        { account: addr2, amount: ethers.parseEther("250") },
        { account: addr3, amount: ethers.parseEther("350") },
      ];

      const newLeaves = newAirdropAmounts.map((x) =>
        solidityKeccak256(abiCoder.encode(["address", "uint256"], [x.account.address, x.amount])),
      );
      const newMerkleTree = new MerkleTree(newLeaves, solidityKeccak256, { sortPairs: true });

      // Withdraw and start new round
      await merkleAirdrop.withdrawUnclaimed();
      await merkleAirdrop.initAirdrop(
        await newToken.getAddress(),
        newMerkleTree.getHexRoot(),
        ethers.parseEther("1000"),
      );

      // Should be able to claim in new round with new amount
      const newLeaf = solidityKeccak256(
        abiCoder.encode(["address", "uint256"], [addr1.address, newAirdropAmounts[0].amount]),
      );
      const newProof = newMerkleTree.getHexProof(newLeaf);

      await merkleAirdrop.connect(addr1).claim(newAirdropAmounts[0].amount, newProof);
      expect(await newToken.balanceOf(addr1.address)).to.equal(newAirdropAmounts[0].amount);
    });
  });

  describe("Withdrawing", function () {
    beforeEach(async function () {
      await merkleAirdrop.initAirdrop(
        await token.getAddress(),
        merkleTree.getHexRoot(),
        ethers.parseEther("1000"),
      );
    });

    it("Should allow owner to withdraw all unclaimed tokens", async function () {
      await merkleAirdrop.withdrawUnclaimed();
      expect(await token.balanceOf(await merkleAirdrop.getAddress())).to.equal(0n);
      expect(await token.balanceOf(owner.address)).to.equal(ethers.parseEther("1000"));
    });

    it("Should not allow withdrawal when no tokens exist", async function () {
      await merkleAirdrop.withdrawUnclaimed();
      await expect(merkleAirdrop.withdrawUnclaimed()).to.be.revertedWithCustomError(
        merkleAirdrop,
        "NoTokensToWithdraw",
      );
    });
  });
});
