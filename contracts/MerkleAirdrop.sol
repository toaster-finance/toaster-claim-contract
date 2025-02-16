// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title MerkleAirdrop
 * @dev A smart contract for token airdrops with Merkle tree verification
 * @notice Supports multiple airdrop rounds with efficient claim tracking
 */
contract MerkleAirdrop is Ownable {
    using SafeERC20 for IERC20;

    /// @notice Current token being distributed
    IERC20 public token;
    
    /// @notice Current Merkle root for verification
    bytes32 public merkleRoot;

    /// @notice Mapping of (merkleRoot => user => hasClaimed) to track claims per round
    mapping(bytes32 => mapping(address => bool)) public hasClaimed;

    event AirdropInitialized(address indexed token, bytes32 indexed merkleRoot, uint256 depositAmount);
    event Claimed(address indexed claimant, uint256 amount);
    event WithdrawUnclaimed(address indexed owner, uint256 amount);

    error InvalidTokenAddress();
    error TokenNotSet();
    error MerkleRootNotSet();
    error AlreadyClaimed();
    error InvalidProof();
    error NoTokensToWithdraw();
    error ContractHasLeftoverTokens();

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Initialize a new airdrop round
     * @param _token ERC20 token address for distribution
     * @param _merkleRoot Merkle root of the current round's user data
     * @param _depositAmount Amount of tokens to deposit for the airdrop
     * @notice Previous round must be completed (all tokens withdrawn) before starting new round
     */
    function initAirdrop(
        IERC20 _token,
        bytes32 _merkleRoot,
        uint256 _depositAmount
    ) external onlyOwner {
        if (address(_token) == address(0)) revert InvalidTokenAddress();
        
        // Prevent new round if current round has remaining tokens
        if (address(token) != address(0)) {
            if (token.balanceOf(address(this)) > 0) revert ContractHasLeftoverTokens();
        }

        // Set up new round
        token = _token;
        merkleRoot = _merkleRoot;

        // Transfer tokens to contract (requires prior approval from owner)
        if (_depositAmount > 0) {
            token.safeTransferFrom(msg.sender, address(this), _depositAmount);
        }

        emit AirdropInitialized(address(_token), _merkleRoot, _depositAmount);
    }

    /**
     * @dev Claim tokens by submitting amount and merkle proof
     * @param amount Token amount to claim
     * @param merkleProof Merkle proof for verification
     * @notice Each address can only claim once per round
     */
    function claim(uint256 amount, bytes32[] calldata merkleProof) external {
        if (address(token) == address(0)) revert TokenNotSet();
        if (merkleRoot == bytes32(0)) revert MerkleRootNotSet();
        if (hasClaimed[merkleRoot][msg.sender]) revert AlreadyClaimed();

        // Create leaf from user data and verify proof
        bytes32 leaf = keccak256(abi.encode(msg.sender, amount));
        if (!MerkleProof.verify(merkleProof, merkleRoot, leaf)) revert InvalidProof();

        // Mark as claimed before transfer to prevent reentrancy
        hasClaimed[merkleRoot][msg.sender] = true;

        // Transfer tokens
        token.safeTransfer(msg.sender, amount);

        emit Claimed(msg.sender, amount);
    }

    /**
     * @dev Withdraw all remaining tokens
     * @notice After withdrawal, a new round can be started with initAirdrop
     */
    function withdrawUnclaimed() external onlyOwner {
        if (address(token) == address(0)) revert TokenNotSet();
        
        uint256 bal = token.balanceOf(address(this));
        if (bal == 0) revert NoTokensToWithdraw();

        token.safeTransfer(msg.sender, bal);
        emit WithdrawUnclaimed(msg.sender, bal);
    }

    /**
     * @dev Check if a user has claimed in the current round
     * @param user Address to check
     * @return bool True if the user has already claimed in this round
     */
    function isClaimed(address user) external view returns (bool) {
        return hasClaimed[merkleRoot][user];
    }
} 