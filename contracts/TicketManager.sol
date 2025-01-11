// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TicketManager {
    struct TicketData {
        uint256 id;
        address owner;
        uint256 creationTimestamp;
        bool isActive;
    }

    mapping(address => TicketData[]) private playerTickets;
    uint256 private totalTicketsSold;
    address private immutable i_owner;
    uint256 private ticketPrice;

    constructor(uint256 _initialTicketPrice) {
        i_owner = msg.sender;
        ticketPrice = _initialTicketPrice;
    }

    modifier onlyOwner() {
        require(msg.sender == i_owner, "Only the contract owner can call this function");
        _;
    }

    function purchaseTicket(address _buyer) external payable returns (uint256) {

        uint256 ticketId = totalTicketsSold;
        playerTickets[_buyer].push(TicketData({
            id: ticketId,
            owner: _buyer,
            creationTimestamp: block.timestamp,
            isActive: true
        }));

        totalTicketsSold++;

        return ticketId;
    }

    function deactivateTickets(address _player, uint256[] calldata _ticketIds) external returns (uint256) {
        uint256 validTicketCount = 0;
        for (uint256 i = 0; i < _ticketIds.length; i++) {
            for (uint256 j = 0; j < playerTickets[_player].length; j++) {
                if (playerTickets[_player][j].id == _ticketIds[i] && 
                    playerTickets[_player][j].isActive) {
                    playerTickets[_player][j].isActive = false;
                    validTicketCount++;
                    break;
                }
            }
        }
        return validTicketCount;
    }

    function getActiveTickets(address _player) external view returns (uint256[] memory) {
        TicketData[] storage tickets = playerTickets[_player];
        uint256[] memory activeTicketIds = new uint256[](tickets.length);
        uint256 count = 0;

        for (uint256 i = 0; i < tickets.length; i++) {
            if (tickets[i].isActive) {
                activeTicketIds[count] = tickets[i].id;
                count++;
            }
        }

        assembly {
            mstore(activeTicketIds, count)
        }

        return activeTicketIds;
    }

    function getTicketPrice() external view returns (uint256) {
        return ticketPrice;
    }

    function setTicketPrice(uint256 _newPrice) external onlyOwner {
        ticketPrice = _newPrice;
    }

    function getTotalTicketsSold() external view returns (uint256) {
        return totalTicketsSold;
    }
}