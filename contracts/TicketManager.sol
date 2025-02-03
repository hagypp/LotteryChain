// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TicketManager {
    enum TicketStatus {
        ACTIVE,         // Ticket is purchased but not in any lottery round 0 
        IN_LOTTERY,     // Ticket is currently in an active lottery round   1
        USED,          // Ticket was used in a past lottery round           2
        EXPIRED        // Ticket is no longer valid                         3
    }

    struct TicketData {
        uint256 id;
        address owner;
        uint256 creationTimestamp;
        TicketStatus status;
        uint256 lotteryRound;  // Track which round the ticket is/was in
    }

    mapping(address => TicketData[]) private playerTickets;
    uint256 private totalTicketsSold;
    address private immutable i_owner;
    uint256 private ticketPrice;

    // event TicketPurchased(address indexed buyer, uint256 indexed ticketId, uint256 timestamp);
    // event TicketStatusChanged(uint256 indexed ticketId, TicketStatus newStatus, uint256 lotteryRound);

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
            status: TicketStatus.ACTIVE,
            lotteryRound: 0
        }));

        totalTicketsSold++;

        // emit TicketPurchased(_buyer, ticketId, block.timestamp);
        return ticketId;
    }

    function setTicketInLottery(address _player, uint256 _ticketId, uint256 _lotteryRound) external returns (bool) {
        for (uint256 i = 0; i < playerTickets[_player].length; i++) {
            if (playerTickets[_player][i].id == _ticketId) {
                require(playerTickets[_player][i].status == TicketStatus.ACTIVE, 
                    "Ticket must be active to enter lottery");
                
                playerTickets[_player][i].status = TicketStatus.IN_LOTTERY;
                playerTickets[_player][i].lotteryRound = _lotteryRound;
                
                // emit TicketStatusChanged(_ticketId, TicketStatus.IN_LOTTERY, _lotteryRound);
                return true;
            }
        }
        return false;
    }

    function markTicketAsUsed(address _player, uint256 _ticketId) external returns (bool) {
        for (uint256 i = 0; i < playerTickets[_player].length; i++) {
            if (playerTickets[_player][i].id == _ticketId && 
                playerTickets[_player][i].status == TicketStatus.IN_LOTTERY) {
                
                playerTickets[_player][i].status = TicketStatus.USED;
                
                // emit TicketStatusChanged(_ticketId, TicketStatus.USED, playerTickets[_player][i].lotteryRound);
                return true;
            }
        }
        return false;
    }

    function expireTicket(address _player, uint256 _ticketId) external returns (bool) {
        for (uint256 i = 0; i < playerTickets[_player].length; i++) {
            if (playerTickets[_player][i].id == _ticketId && 
                playerTickets[_player][i].status == TicketStatus.ACTIVE) {
                
                playerTickets[_player][i].status = TicketStatus.EXPIRED;
                
                // emit TicketStatusChanged(_ticketId, TicketStatus.EXPIRED, 0);
                return true;
            }
        }
        return false;
    }

    function getTicketsByStatus(address _player, TicketStatus _status) 
        external 
        view 
        returns (uint256[] memory) 
    {
        TicketData[] storage tickets = playerTickets[_player];
        uint256[] memory filteredTickets = new uint256[](tickets.length);
        uint256 count = 0;

        for (uint256 i = 0; i < tickets.length; i++) {
            if (tickets[i].status == _status) {
                filteredTickets[count] = tickets[i].id;
                count++;
            }
        }

        // Resize array to actual count
        assembly {
            mstore(filteredTickets, count)
        }

        return filteredTickets;
    }

    function getTicketData(address _player, uint256 _ticketId) 
        external 
        view 
        returns (TicketData memory) 
    {
        TicketData[] storage tickets = playerTickets[_player];
        for (uint256 i = 0; i < tickets.length; i++) {
            if (tickets[i].id == _ticketId) {
                return tickets[i];
            }
        }
        revert("Ticket not found");
    }

    function getPlayerTickets(address _player) 
        external 
        view 
        returns (TicketData[] memory) 
    {
        return playerTickets[_player];
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