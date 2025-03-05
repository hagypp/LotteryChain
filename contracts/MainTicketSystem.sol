// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./TicketManager.sol";
import "./LotteryManager.sol";

contract MainTicketSystem {
    TicketManager private ticketManager;
    LotteryManager private lotteryManager;
    address private immutable i_owner;
    
    constructor() {
        i_owner = msg.sender;
        
        // Deploy sub-contracts
        ticketManager = new TicketManager(1 ether);
        lotteryManager = new LotteryManager(address(ticketManager));
    }

    function getOwner() external view returns (address) {
        return i_owner;
    }

    modifier onlyOwner() {
        require(msg.sender == i_owner, "Only the contract owner can call this function"); 
        _;
    }
    function getAllRegisteredPlayers() external view returns (address[] memory) {
        return ticketManager.getTotalPlayers();
    }

    // Ticket Purchase Functions
    function purchaseTicket() external payable returns (uint256) {        
        uint256 ticketPrice = ticketManager.getTicketPrice();
        require(msg.value >= ticketPrice, "Insufficient payment for ticket");

        uint256 ticketId = ticketManager.purchaseTicket(msg.sender);
        
        if (msg.value > ticketPrice) {
            payable(msg.sender).transfer(msg.value - ticketPrice);
        }
        
        return ticketId;
    }

    function getActiveTickets() external view returns (uint256[] memory) {
        return ticketManager.getTicketsByStatus(msg.sender, TicketManager.TicketStatus.ACTIVE);
    }


    // Lottery Functions
    function startNewLotteryRound() external onlyOwner {
        lotteryManager.startNewLotteryRound();
    }

    function selectTicketsForLottery(uint256 _ticketId, bytes32 _ticketHash) 
        external  
        returns (bool) 
    {
        uint256 currentRound = lotteryManager.getCurrentRound();
        uint256 ticketPrice = ticketManager.getTicketPrice();

        // Verify ticket status is ACTIVE before entering lottery
        require(
            ticketManager.getTicketData(msg.sender, _ticketId).status == TicketManager.TicketStatus.ACTIVE,
            "Invalid ticket status"
        );

        // Add ticket to lottery round
        return lotteryManager.addParticipantAndPrizePool(
            msg.sender,
            _ticketId,
            _ticketHash,
            ticketPrice
        ); 
    }


    function drawLotteryWinner() external onlyOwner returns (address) {
        (
            uint256 roundNumber,
            uint256 prizePool,
            address[] memory participants,
            address winner,
            bool isFinalized
        ) = lotteryManager.getLotteryRoundInfo(lotteryManager.getCurrentRound());

        require(participants.length > 0, "No participants in this round");
        require(!isFinalized, "Lottery round already finalized");
        require(address(this).balance >= prizePool, "Insufficient contract balance to pay prize");

        winner = lotteryManager.drawLotteryWinner();
        
        // Transfer prize to winner
        (bool success, ) = payable(winner).call{value: prizePool}("");
        require(success, "Prize transfer failed");
        
        return winner;
    }

    // Getter Functions
    function getTicketPrice() external view returns (uint256) {
        return ticketManager.getTicketPrice();
    }

    function setTicketPrice(uint256 _newPrice) external onlyOwner {
        ticketManager.setTicketPrice(_newPrice);
    }

    function getTotalTicketsSold() external view returns (uint256) {
        return ticketManager.getTotalTicketsSold();
    }

    function getTotalRegisteredPlayers() external view returns (uint256) {
        return ticketManager.getTotalPlayers().length;
    }

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function getCurrentLotteryRound() external view returns (
        uint256 roundNumber,
        uint256 prizePool,
        address[] memory participants,
        address winner,
        bool isFinalized
    ) {
        return lotteryManager.getLotteryRoundInfo(lotteryManager.getCurrentRound());
    }

    function getTicketPurchaseTime(uint256 _ticketId, address _player) public view returns (uint256) {
        return ticketManager.getTicketPurchaseTime(_player, _ticketId);
    }

    function isLotteryActive() external view  onlyOwner returns (bool) {
        return lotteryManager.isLotteryActive();
    }

    function getAllLotteryRoundsInfo() external view returns (
        uint256[] memory roundNumbers,
        uint256[] memory totalPrizePools,
        address[][] memory participantsList,
        address[] memory winners,
        bool[] memory finalizedStatuses
    ) {
        return lotteryManager.getAllLotteryRoundsInfo();
    }

    // Get all tickets for a player
    function getPlayerTickets(address _player) external view returns (TicketManager.TicketData[] memory) {
        return ticketManager.getPlayerTickets(_player);
    }

    
    receive() external payable {}
}