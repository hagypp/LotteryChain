// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PlayerRegistry {
    mapping(address => bool) private registeredPlayers;
    address[] private registeredAddresses; // Array to store registered player addresses
    uint256 private totalPlayersRegister;

    function registerPlayer(address _player) external returns (bool) {
        require(!registeredPlayers[_player], "Player already registered");
        registeredPlayers[_player] = true;
        registeredAddresses.push(_player); // Add to the list of registered addresses
        totalPlayersRegister++;
        return true;
    }

    function isPlayerRegistered(address _player) external view returns (bool) {
        return registeredPlayers[_player];
    }

    function getTotalRegisteredPlayers() external view returns (uint256) {
        return totalPlayersRegister;
    }

    function getAllRegisteredPlayers() external view returns (address[] memory) {
        return registeredAddresses; // Return the list of registered addresses
    }
}
