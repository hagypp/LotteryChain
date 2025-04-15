// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

    enum TicketStatus {
        ACTIVE,         // Ticket is purchased but not in any lottery round 0 
        IN_LOTTERY,     // Ticket is currently in an active lottery round   1
        USED,           // Ticket was used in a past lottery round           2
        WON_SMALL_PRIZE, // Ticket won a small prize                      3
        WON_BIG_PRIZE    // Ticket won a big prize                        4
    }

    struct TicketData {
        uint256 id;
        address owner;
        uint256 creationTimestamp;  // Timestamp for when the ticket is purchased
        TicketStatus status;
        uint256 lotteryRound;  // Track which round the ticket is/was in
        bytes32 ticketHash; // Hash of the ticket data
        bytes32 ticketHashWithStrong; // Hash of the ticket data with strong
    }
    
contract TicketManager {


    address[] private players; // Store all addresses

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

        if (playerTickets[_buyer].length == 0)
            players.push(_buyer); // Store only new addresses

        playerTickets[_buyer].push(TicketData({
            id: ticketId,
            owner: _buyer,
            creationTimestamp: block.timestamp,  // Store the timestamp of ticket purchase
            status: TicketStatus.ACTIVE,
            lotteryRound: 0,
            ticketHash: 0,
            ticketHashWithStrong: 0
        }));

        totalTicketsSold++;

        return ticketId;
    }

    // Set the ticket in a lottery round
    function setTicketInLottery(address _player, uint256 _ticketId, bytes32 _ticketHash,bytes32 _ticketHashWithStrong,uint256 _lotteryRound) 
        external 
        returns (bool) 
    {
        TicketData[] storage tickets = playerTickets[_player];
        uint256 length = tickets.length;

        for (uint256 i; i < length; ++i) { // Preload length and use ++i for gas savings
            if (tickets[i].id == _ticketId) {
                require(tickets[i].status == TicketStatus.ACTIVE, "Ticket must be active to enter lottery");

                tickets[i].status = TicketStatus.IN_LOTTERY;
                tickets[i].lotteryRound = _lotteryRound;
                tickets[i].ticketHash = _ticketHash;
                tickets[i].ticketHashWithStrong = _ticketHashWithStrong;

                return true;
            }
        }

        return false;
    }

    // Mark the ticket as used
    function markTicketAsUsed(address _player, uint256 _ticketId) 
        external 
        returns (bool) 
    {
        TicketData[] storage tickets = playerTickets[_player];
        uint256 length = tickets.length;

        for (uint256 i; i < length; ++i) { // Use ++i and cache length for gas optimization
            if (tickets[i].id == _ticketId) {
                require(tickets[i].status == TicketStatus.IN_LOTTERY, "Ticket is not in the lottery");

                tickets[i].status = TicketStatus.USED;
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
        uint256 count = 0;

        // First, count matching tickets
        for (uint256 i = 0; i < tickets.length; i++) {
            if (tickets[i].status == _status) {
                count++;
            }
        }

        // Create array with the exact size
        uint256[] memory filteredTickets = new uint256[](count);
        uint256 index = 0;

        // Populate the array
        for (uint256 i = 0; i < tickets.length; i++) {
            if (tickets[i].status == _status) {
                filteredTickets[index] = tickets[i].id;
                index++;
            }
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
        uint256 length = tickets.length;

        for (uint256 i; i < length; ++i) { // Use preloaded length and ++i for gas optimization
            if (tickets[i].id == _ticketId) {
                return tickets[i];
            }
        }

        revert("Ticket not found");
    }

    // Get all tickets for a player
    function getPlayerTickets(address _player) external view returns (TicketData[] memory) {
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


    function markTicketAsWinner(address _player, uint256 _ticketId, bool isBigPrize) 
    external 
    returns (bool) {
    TicketData[] storage tickets = playerTickets[_player];
    uint256 length = tickets.length;

    for (uint256 i; i < length; ++i) {
        if (tickets[i].id == _ticketId) {
            require(tickets[i].status == TicketStatus.IN_LOTTERY, "Ticket is not in the lottery");

            tickets[i].status = isBigPrize ? TicketStatus.WON_BIG_PRIZE : TicketStatus.WON_SMALL_PRIZE;
            return true;
        }
    }

    return false;
}
}
