// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract EcoToken is ERC20, Ownable {
    mapping(address => bool) public authorized;

    event TokensRewarded(address indexed recipient, uint256 amount, string reason);

    constructor() ERC20("EcoGov Token", "ECO") Ownable(msg.sender) {
        _mint(msg.sender, 1000000 * 10**decimals());
    }

    modifier onlyAuthorized() {
        require(authorized[msg.sender] || msg.sender == owner(), "Not authorized");
        _;
    }

    function authorizeContract(address contractAddr) external onlyOwner {
        authorized[contractAddr] = true;
    }

    function rewardTokens(address recipient, uint256 amount, string memory reason) external onlyAuthorized {
        _mint(recipient, amount);
        emit TokensRewarded(recipient, amount, reason);
    }
}