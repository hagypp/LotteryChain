// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./TicketManager.sol";
import "./LotteryManager.sol";

contract MainTicketSystem {
    TicketManager private ticketManager;
    LotteryManager private lotteryManager;
    address private immutable i_owner;

    event LotteryRoundStatusChanged(bool isOpen);
    event BlockStatusUpdated(uint256 blocksUntilClose, uint256 blocksUntilDraw);

    constructor() {
        // Deploy sub-contracts
        ticketManager = new TicketManager(1 ether);
        lotteryManager = new LotteryManager(address(ticketManager));
    }

    function updateBlockStatus() public {
        (uint256 blocksUntilClose, uint256 blocksUntilDraw) = lotteryManager.getLotteryBlockStatus();
        emit BlockStatusUpdated(blocksUntilClose, blocksUntilDraw);
    }

    function startNewLotteryRound() private {
        lotteryManager.startNewLotteryRound();
        updateBlockStatus();
        emit LotteryRoundStatusChanged(true);
    }

    function closeLotteryRound() public {
        lotteryManager.closeLotteryRound();
        updateBlockStatus();
        emit LotteryRoundStatusChanged(false);
    }

    function canCloseLottery () private returns (bool) {
        if (lotteryManager.canCloseLottery ()){
            closeLotteryRound();
            return false;
        } 
        return true;
    }

    function canDrawWinner() private returns (bool) {
        if (lotteryManager.canDrawWinner()){
            drawLotteryWinner(0,0);
            return false;
        } 
        return true;
    }

    // Ticket Purchase Functions
    function purchaseTicket() external payable returns (uint256) {        
        uint256 ticketPrice = ticketManager.getTicketPrice();
        require(msg.value >= ticketPrice, "Insufficient payment for ticket");

        uint256 ticketId = ticketManager.purchaseTicket(msg.sender);
        
        if (msg.value > ticketPrice) {
            payable(msg.sender).transfer(msg.value - ticketPrice);
        }

        if (isLotteryActive()) {
            canCloseLottery();
        } else {
            canDrawWinner();
        }
           
        updateBlockStatus();
        return ticketId;
    }

    function selectTicketsForLottery(uint256 _ticketId, bytes32 _ticketHash, bytes32 _ticketHashWithStrong) 
        external  
        returns (bool) 
    {   
        if (isLotteryActive()) {
            canCloseLottery();
            
        } else {
            canDrawWinner();
        }

        // Verify ticket status is ACTIVE before entering lottery
        require( ticketManager.getTicketData(msg.sender, _ticketId).status == TicketStatus.ACTIVE,
            "Invalid ticket status"
        );

        updateBlockStatus();
        // Add ticket to lottery round
        return lotteryManager.addParticipantAndPrizePool( msg.sender, _ticketId, _ticketHash, _ticketHashWithStrong, ticketManager.getTicketPrice()); 
    }

    function drawLotteryWinner(bytes32 keccak256HashNumbers, bytes32 keccak256HashFull) public returns (address) {
        address winner;
        winner = lotteryManager.drawLotteryWinner(keccak256HashNumbers, keccak256HashFull);
        if (winner!=address(0))
        {
            uint256 totalPrizePools;
            (,totalPrizePools,,,) = lotteryManager.getLotteryRoundInfo(lotteryManager.getCurrentRound());
            require(totalPrizePools>0,"No money");
            (bool success, ) = payable(winner).call{value: totalPrizePools}("");
            require(success, "Prize transfer failed");
        }
        startNewLotteryRound();
        return winner;
    }

    function setTicketPrice(uint256 _newPrice) external {
        ticketManager.setTicketPrice(_newPrice);
    }

    function getActiveTickets() external view returns (uint256[] memory) {
        return ticketManager.getTicketsByStatus(msg.sender, TicketStatus.ACTIVE);
    } 

    function isLotteryActive() public view  returns (bool) {
        return lotteryManager.isLotteryActive();
    }

    function getTicketPrice() external view returns (uint256) {
        return ticketManager.getTicketPrice();
    }

    function getAllLotteryRoundsInfo() external view returns (
        uint256[] memory roundNumbers,
        uint256[] memory totalPrizePools,
        address[][] memory participantsList,
        address[] memory winners,
        lotteryStatus[] memory Statuses
    ) {
        return lotteryManager.getAllLotteryRoundsInfo();
    }

    function getPlayerTickets(address _player) external view returns (TicketData[] memory) {
        return ticketManager.getPlayerTickets(_player);
    }

    function getLotteryBlockStatus() public view returns (uint256 blocksUntilClose, uint256 blocksUntilDraw) {
        return lotteryManager.getLotteryBlockStatus();
    }

    function getContractBlance() public view returns (uint balance)
    {
        return address(this).balance;
    }

    receive() external payable {}
}