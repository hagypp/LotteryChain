// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PlayerRegistry {
    mapping(address => bool) private registeredPlayers;
    uint256 private totalPlayersRegister;

    function registerPlayer() external returns (bool) {
        require(!registeredPlayers[msg.sender], "Player already registered");
        registeredPlayers[msg.sender] = true;
        totalPlayersRegister++;
        return true;
    }

    function isPlayerRegistered(address _player) external view returns (bool) {
        return registeredPlayers[_player];
    }

    function getTotalRegisteredPlayers() external view returns (uint256) {
        return totalPlayersRegister;
    }
}