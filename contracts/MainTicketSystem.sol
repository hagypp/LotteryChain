// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./PlayerRegistry.sol";
import "./TicketManager.sol";
import "./LotteryManager.sol";

contract MainTicketSystem {
    PlayerRegistry private  playerRegistry;
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
        require(msg.sender == i_owner, "Only the contract owner can call this function");_;
    }

    modifier onlyRegister(){
        require(playerRegistry.isPlayerRegistered(msg.sender),"Not a registered player");_;
    }

    // Player Registration Functions
    function registerPlayer() external {
        require(playerRegistry.registerPlayer(msg.sender), "Registration failed");
    }

    function isPlayerRegistered(address _player) external view returns (bool) {
        return playerRegistry.isPlayerRegistered(_player);
    }

    // Ticket Purchase Functions
    function purchaseTicket() external onlyRegister payable returns (uint256) {        
        // Ensure the full ticket price is sent to the contract
        uint256 ticketPrice = ticketManager.getTicketPrice();
        require(msg.value >= ticketPrice, "Insufficient payment for ticket");

        // Purchase ticket and keep the ticket price in the contract
        uint256 ticketId = ticketManager.purchaseTicket(msg.sender);
        
        // Refund any excess payment
        if (msg.value > ticketPrice) {
            payable(msg.sender).transfer(msg.value - ticketPrice);
        }
        // payable(0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2).transfer(msg.value);
        return ticketId;
        // return 1;
    }

    function getActiveTickets() external onlyRegister view returns (uint256[] memory) {
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
        // Get current lottery round details
        LotteryRound memory currentRound = lotteryManager.getLotteryRound(
            lotteryManager.getCurrentRound()
        );

        // Validate lottery round conditions
        require(currentRound.participants.length > 0, "No participants in this round");
        require(!currentRound.isFinalized, "Lottery round already finalized");

        // Ensure contract has sufficient balance
        uint256 prizePool = currentRound.totalPrizePool;
        require(address(this).balance >= prizePool,"Insufficient contract balance to pay prize.");

        // Draw the winner
        address winner = lotteryManager.drawLotteryWinner();

        // Transfer prize pool to the winner
        (bool success, ) = payable(winner).call{value: prizePool}("");
        require(success, "Prize transfer failed");
        return winner;
    }


    // Additional Utility Functions
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
        // Add a function to check contract balance
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // Fallback function to receive Ether
    receive() external payable {}
}