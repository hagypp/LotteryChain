// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TicketManager {
    enum TicketStatus {
        ACTIVE,         // Ticket is purchased but not in any lottery round 0 
        IN_LOTTERY,     // Ticket is currently in an active lottery round   1
        USED,           // Ticket was used in a past lottery round           2
        EXPIRED         // Ticket is no longer valid                         3
    }

    struct TicketData {
        uint256 id;
        address owner;
        uint256 creationTimestamp;  // Timestamp for when the ticket is purchased
        TicketStatus status;
        uint256 lotteryRound;  // Track which round the ticket is/was in
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

    // Purchase a ticket and store the time of purchase
    function purchaseTicket(address _buyer) external payable returns (uint256) {
        uint256 ticketId = totalTicketsSold;
        playerTickets[_buyer].push(TicketData({
            id: ticketId,
            owner: _buyer,
            creationTimestamp: block.timestamp,  // Store the timestamp of ticket purchase
            status: TicketStatus.ACTIVE,
            lotteryRound: 0
        }));

        totalTicketsSold++;

        return ticketId;
    }

    // Set the ticket in a lottery round
    function setTicketInLottery(address _player, uint256 _ticketId, uint256 _lotteryRound) external returns (bool) {
        for (uint256 i = 0; i < playerTickets[_player].length; i++) {
            if (playerTickets[_player][i].id == _ticketId) {
                require(playerTickets[_player][i].status == TicketStatus.ACTIVE, 
                    "Ticket must be active to enter lottery");
                
                playerTickets[_player][i].status = TicketStatus.IN_LOTTERY;
                playerTickets[_player][i].lotteryRound = _lotteryRound;
                
                return true;
            }
        }
        return false;
    }

    // Mark the ticket as used
    function markTicketAsUsed(address _player, uint256 _ticketId) external returns (bool) {
        for (uint256 i = 0; i < playerTickets[_player].length; i++) {
            if (playerTickets[_player][i].id == _ticketId && 
                playerTickets[_player][i].status == TicketStatus.IN_LOTTERY) {
                
                playerTickets[_player][i].status = TicketStatus.USED;
            
                return true;
            }
        }
        return false;
    }

    // Expire the ticket
    function expireTicket(address _player, uint256 _ticketId) external returns (bool) {
        for (uint256 i = 0; i < playerTickets[_player].length; i++) {
            if (playerTickets[_player][i].id == _ticketId && 
                playerTickets[_player][i].status == TicketStatus.ACTIVE) {
                
                playerTickets[_player][i].status = TicketStatus.EXPIRED;
                
                return true;
            }
        }
        return false;
    }

    // Get tickets by a specific status
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

    // Get detailed ticket information
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

    // Get all tickets for a player
    function getPlayerTickets(address _player) 
        external 
        view 
        returns (TicketData[] memory) 
    {
        return playerTickets[_player];
    }

    // Get the ticket price
    function getTicketPrice() external view returns (uint256) {
        return ticketPrice;
    }

    // Set a new ticket price
    function setTicketPrice(uint256 _newPrice) external onlyOwner {
        ticketPrice = _newPrice;
    }

    // Get total tickets sold
    function getTotalTicketsSold() external view returns (uint256) {
        return totalTicketsSold;
    }

    // Get the purchase time for a specific ticket
    function getTicketPurchaseTime(address _player, uint256 _ticketId) external view returns (uint256) {
        TicketData[] storage tickets = playerTickets[_player];
        for (uint256 i = 0; i < tickets.length; i++) {
            if (tickets[i].id == _ticketId) {
                return tickets[i].creationTimestamp;  // Return the timestamp of ticket purchase
            }
        }
        revert("Ticket not found");
    }
}
