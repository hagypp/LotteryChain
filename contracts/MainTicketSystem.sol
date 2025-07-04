// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "./TicketManager.sol";
import "./LotteryManager.sol";

contract MainTicketSystem {
    TicketManager private ticketManager;
    LotteryManager private lotteryManager;
    // address private immutable i_owner;

    event LotteryRoundStatusChanged(bool isOpen);
    event BlockStatusUpdated(uint256 blocksUntilClose, uint256 blocksUntilDraw);
    event TicketEnteredLottery(uint256 roundNumber, uint256 totalTickets, uint256 prizePool);
    

    event TicketSelected(address indexed user, uint256 ticketId, bool success);


    constructor() {
        // Deploy sub-contracts
        // i_owner = msg.sender;
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

    function canCloseLottery() private returns (bool) {
        if (lotteryManager.canCloseLottery()){
            closeLotteryRound(); 
            return true;
        }
        return false;
    }


    // function canDrawWinner() private {
    //     if (lotteryManager.canDrawWinner()){
    //         // drawLotteryWinner(0,0);
    //         return; // Placeholder for drawing winner logic
    //     } 
    // }

    // Ticket Purchase Functions
    function purchaseTicket() external payable returns (uint256) {        
        uint256 ticketPrice = ticketManager.getTicketPrice();
        require(msg.value >= ticketPrice, "Insufficient payment for ticket");

        uint256 ticketId = ticketManager.purchaseTicket(msg.sender);
        
        // Forward the ticket price to LotteryManager
        (bool success, ) = address(lotteryManager).call{value: ticketPrice}("");
        require(success, "Failed to forward Ether to LotteryManager");

        if (msg.value > ticketPrice) {
            (bool sent, ) = msg.sender.call{value: msg.value - ticketPrice}("");
            require(sent, "Refund failed");
        }

        if (isLotteryActive()) {
            canCloseLottery();
        } 
        // else {
        //     canDrawWinner();
        // }
           
        updateBlockStatus();
        return ticketId;
    }

    function selectTicketsForLottery(uint256 _ticketId, bytes32 _ticketHash, bytes32 _ticketHashWithStrong) 
        external  
        returns (bool) 
    {
        require(_ticketHash != bytes32(0), "Ticket hash cannot be empty");
        require(_ticketHashWithStrong != bytes32(0), "Strong ticket hash cannot be empty");
   
        bool success = false;
        if (isLotteryActive()) {
            if(canCloseLottery())
            {
                updateBlockStatus();
                emit TicketSelected(msg.sender, _ticketId, false);
                return false;
            } 
        } 
        // else {
        //     canDrawWinner();
        // }

        // Verify ticket status is ACTIVE before entering lottery
        require( ticketManager.getTicketData(msg.sender, _ticketId).status == TicketStatus.ACTIVE,
            "Invalid ticket status"
        );

        updateBlockStatus();
        // Add ticket to lottery round
        success = lotteryManager.addParticipantAndPrizePool(msg.sender, _ticketId, _ticketHash, _ticketHashWithStrong, ticketManager.getTicketPrice());

        if (success) {
            emit TicketEnteredLottery(
                lotteryManager.getCurrentRound(), 
                lotteryManager.getCurrentTotalTickets(),
                lotteryManager.getCurrentPrizePool() 
        );
        } 
        emit TicketSelected(msg.sender, _ticketId, success);
  
        return success;
    }

    function drawLotteryWinner(bytes32 keccak256HashNumbers, bytes32 keccak256HashFull, uint8[6] memory randomNumbers, uint8 strongNumber) public  
    {
        require(validate(randomNumbers, strongNumber), "Invalid input data");
        // require(keccak256HashNumbers != bytes32(0), "Ticket hash cannot be empty");
        // require(keccak256HashFull != bytes32(0), "Strong ticket hash cannot be empty");
        lotteryManager.drawLotteryWinner(keccak256HashNumbers, keccak256HashFull, randomNumbers, strongNumber);
        startNewLotteryRound();
        emit TicketEnteredLottery(
            lotteryManager.getCurrentRound(), 
            lotteryManager.getCurrentTotalTickets(),
            lotteryManager.getCurrentPrizePool()
        );
    }

    function validate(
        uint8[6] memory randomNumbers, 
        uint8 strongNumber
    ) private pure returns (bool) {
        if(strongNumber < 1 || strongNumber > 7) {
            return false; // Strong number must be between 1 and 7
        }
        for (uint8 i = 0; i < 6; i++) {
            if (randomNumbers[i] < 1 || randomNumbers[i] > 37) {
                return false; // Each number must be between 1 and 37
            }
        }
        return true; // All numbers are valid
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

    function getLotteryRoundInfo(uint256 _index) external view returns (
        uint256 roundNumber,
        uint256 totalPrizePool,
        address[][] memory addressArrays,
        lotteryStatus status,
        uint256 bigPrize,
        uint256 smallPrize,
        uint256 miniPrize,
        uint256 commission,
        uint256 totalTickets,
        uint8[6] memory randomNumbers,
        uint8 strongNumber
    ) {
        return lotteryManager.getLotteryRoundInfo(_index);
    }

    function getPlayerTickets(address _player) external view returns (TicketData[] memory) {
        return ticketManager.getPlayerTickets(_player);
    }

    function getLotteryBlockStatus() public view returns (uint256 blocksUntilClose, uint256 blocksUntilDraw) {
        return lotteryManager.getLotteryBlockStatus();
    }

    function getContractBlance() public view returns (uint balance)
    {
        return address(lotteryManager).balance;
    }

    function getCurrentWinners() external view returns (
    address[] memory smallPrizeWinners,
    address[] memory bigPrizeWinners,
    address[] memory miniPrizeWinners
    ) {
        return lotteryManager.getCurrentWinners();
    }

    function getCurrentPrizePool() external view returns (uint256) {
        return lotteryManager.getCurrentPrizePool();
    }

    function getCurrentTotalTickets() external view returns (uint256) {
        return lotteryManager.getCurrentTotalTickets();
    }

    function getCurrentRound() external view returns (uint256) {
        return lotteryManager.getCurrentRound();
    }

    function getSMALL_PRIZE_PERCENTAGE() external view returns (uint256) {
        return lotteryManager.getSMALL_PRIZE_PERCENTAGE();
    }
    function getFLEX_COMMISSION() external view returns (uint256) {
        return lotteryManager.getFLEX_COMMISSION();
    }
    function getMINI_PRIZE_PERCENTAGE() external view returns (uint256) {
        return lotteryManager.getMINI_PRIZE_PERCENTAGE();
    }
    function getBlocksWait() external view returns (uint256, uint256) {
        return lotteryManager.getBlocksWait();
    }
    
    receive() external payable {
        (bool success, ) = address(lotteryManager).call{value: msg.value}("");
        require(success, "Failed to forward Ether to LotteryManager");
    }

    // fallback() external payable {
    // revert("Unsupported function call");
    // }

    // Function to claimPrize from the contract
    function claimPrize(address user) external {
        lotteryManager.claimPrize(user);
        updateBlockStatus();
    }

    function getPendingPrize(address user) external view returns (uint256) {
        return lotteryManager.getPendingPrize(user);
    }
}