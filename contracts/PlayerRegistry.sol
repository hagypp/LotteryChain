// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PlayerRegistry {
    mapping(address => bool) private registeredPlayers;
    uint256 private totalPlayersRegister;
    // address private owner;

    // constructor() {
    //     owner = msg.sender;
    // }


    function registerPlayer(address _player) external returns (bool) {
        if (!registeredPlayers[_player]) {
            registeredPlayers[_player] = true;
            totalPlayersRegister++;
            return true;
        }
        return false;
    }

    function isPlayerRegistered(address _player) external view returns (bool) {
        return registeredPlayers[_player];
    }

    function getTotalRegisteredPlayers() external view returns (uint256) {
        return totalPlayersRegister;
    }
}