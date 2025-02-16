// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title MerkleAirdrop
 * @dev A contract that verifies pre-calculated user amounts using a Merkle tree for efficient on-chain verification.
 */
contract MerkleAirdrop is Ownable {
    using SafeERC20 for IERC20;

    IERC20 public token;

    // Merkle root of pre-calculated (address, amount) pairs
    bytes32 public merkleRoot;

    // Mapping to prevent duplicate claims
    mapping(address => bool) public hasClaimed;

    event MerkleRootSet(bytes32 merkleRoot);
    event Claimed(address indexed claimant, uint256 amount);
    event WithdrawUnclaimed(address indexed owner, uint256 amount);
    event TokenSet(address indexed tokenAddress);

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Set or change the token address
     */
    function setToken(IERC20 _token) external onlyOwner {
        require(address(_token) != address(0), "Invalid token address");
        // Check if there's no remaining balance before changing token
        if (address(token) != address(0)) {
            require(token.balanceOf(address(this)) == 0, "Contract still has token balance");
        }
        token = _token;
        emit TokenSet(address(_token));
    }

    /**
     * @dev Set the Merkle root. Can be updated for multiple rounds.
     */
    function setMerkleRoot(bytes32 _merkleRoot) external onlyOwner {
        merkleRoot = _merkleRoot;
        emit MerkleRootSet(_merkleRoot);
    }

    /**
     * @dev Owner deposits tokens to the contract (airdrop pool)
     */
    function depositTokens(uint256 amount) external onlyOwner {
        require(address(token) != address(0), "Token not set");
        require(amount > 0, "Cannot deposit zero");
        token.safeTransferFrom(msg.sender, address(this), amount);
    }

    /**
     * @dev Users claim tokens by submitting amount and merkleProof
     */
    function claim(uint256 amount, bytes32[] calldata merkleProof) external {
        require(address(token) != address(0), "Token not set");
        require(!hasClaimed[msg.sender], "Already claimed");
        require(merkleRoot != bytes32(0), "Merkle root not set");

        // Merkle tree leaf
        bytes32 leaf = keccak256(abi.encode(msg.sender, amount));
        bool valid = MerkleProof.verify(merkleProof, merkleRoot, leaf);
        require(valid, "Invalid proof");

        hasClaimed[msg.sender] = true;

        // Transfer tokens
        token.safeTransfer(msg.sender, amount);

        emit Claimed(msg.sender, amount);
    }

    /**
     * @dev Owner can withdraw unclaimed tokens
     */
    function withdrawUnclaimed(uint256 amount) external onlyOwner {
        require(address(token) != address(0), "Token not set");
        uint256 bal = token.balanceOf(address(this));
        require(amount <= bal, "Not enough tokens");
        token.safeTransfer(msg.sender, amount);

        emit WithdrawUnclaimed(msg.sender, amount);
    }
} 