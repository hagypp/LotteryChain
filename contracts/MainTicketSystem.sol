// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./PlayerRegistry.sol";
import "./TicketManager.sol";
import "./LotteryManager.sol";

contract MainTicketSystem {
    PlayerRegistry private playerRegistry;
    TicketManager private ticketManager;
    LotteryManager private lotteryManager;
    address private immutable i_owner;
    
    constructor() {
        i_owner = msg.sender;
        
        // Deploy sub-contracts
        playerRegistry = new PlayerRegistry();
        ticketManager = new TicketManager(1 ether);
        lotteryManager = new LotteryManager();
    }

    function getOwner() external view returns (address) {
        return i_owner;
    }

    modifier onlyOwner() {
        require(msg.sender == i_owner, "Only the contract owner can call this function"); _;
    }

    modifier onlyRegister() {
        require(playerRegistry.isPlayerRegistered(msg.sender),"Not a registered player"); _;
    }

    // Player Registration Functions
    function registerPlayer() external {
        require(playerRegistry.registerPlayer(msg.sender), "Registration failed");
    }

    function isPlayerRegistered(address _player) external view returns (bool) {
        return playerRegistry.isPlayerRegistered(_player);
    }

    // Add the function to get all registered players
    function getAllRegisteredPlayers() external view returns (address[] memory) {
        return playerRegistry.getAllRegisteredPlayers();
    }

    // Ticket Purchase Functions
    function purchaseTicket() external onlyRegister payable returns (uint256) {        
        uint256 ticketPrice = ticketManager.getTicketPrice();
        require(msg.value >= ticketPrice, "Insufficient payment for ticket");

        uint256 ticketId = ticketManager.purchaseTicket(msg.sender);
        
        if (msg.value > ticketPrice) {
            payable(msg.sender).transfer(msg.value - ticketPrice);
        }
        
        return ticketId;
    }

    function getActiveTickets() external view returns (uint256[] memory) {
        return ticketManager.getActiveTickets(msg.sender);
    }

    // Lottery Functions
    function startNewLotteryRound() external onlyOwner {
        lotteryManager.startNewLotteryRound();
    }

    function selectTicketsForLottery(uint256[] calldata _ticketIds) external onlyRegister {
        uint256 validTicketCount = ticketManager.deactivateTickets(msg.sender, _ticketIds);
        require(validTicketCount > 0, "No valid tickets selected");
        
        uint256 ticketPrice = ticketManager.getTicketPrice();
        for (uint256 i = 0; i < validTicketCount; i++) {
            lotteryManager.addParticipantAndPrizePool(msg.sender, ticketPrice);
        }
    }

    function drawLotteryWinner() external onlyOwner returns (address) {
        LotteryRound memory currentRound = lotteryManager.getLotteryRound(lotteryManager.getCurrentRound());
        require(currentRound.participants.length > 0, "No participants in this round");
        require(!currentRound.isFinalized, "Lottery round already finalized");

        uint256 prizePool = currentRound.totalPrizePool;
        require(address(this).balance >= prizePool,"Insufficient contract balance to pay prize.");

        address winner = lotteryManager.drawLotteryWinner();
        (bool success, ) = payable(winner).call{value: prizePool}("");
        require(success, "Prize transfer failed");
        return winner;
    }

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
        return playerRegistry.getTotalRegisteredPlayers();
    }

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    receive() external payable {}
}
