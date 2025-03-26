// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "./TicketManager.sol";

interface ITicketManager
 {
    function setTicketInLottery(address _player, uint256 _ticketId, bytes32 _ticketHash,bytes32 _ticketHashWithStrong ,uint256 _lotteryRound) external returns (bool);
    function markTicketAsUsed(address _player, uint256 _ticketId) external returns (bool);
    function getTicketData(address _player, uint256 _ticketId) external view returns (
        uint256 id,
        address owner,
        uint256 creationTimestamp,
        TicketStatus status,
        uint256 lotteryRound,
        bytes32 ticketHash,
        bytes32 ticketHashWithStrong
    );
}

enum lotteryStatus { OPEN, CLOSED, FINALIZED }

struct LotteryRound {
    uint256 roundNumber;
    uint256 totalPrizePool;
    address[] participants;
    mapping(address => uint256[]) participantTickets; // Store ticket IDs for each participant
    address winner;

    lotteryStatus status;

    uint256 openBlock;
    uint256 closeBlock;
}

contract LotteryManager {
    mapping(uint256 => LotteryRound) private lotteryRounds;
    uint256 private currentLotteryRound;
    address private immutable i_owner;
    bool private activeRound;
    ITicketManager private ticketManager;

    uint256 private constant SCALE_FACTOR = 1e18;
    uint256 private BLOCKS_TO_WAIT_fOR_CLOSE = 5;
    uint256 private BLOCKS_TO_WAIT_fOR_DRAW = 5;

    constructor(address _ticketManagerAddress) {
        activeRound = false;
        ticketManager = ITicketManager(_ticketManagerAddress);
        startNewLotteryRound();
    }

  function getLotteryBlockStatus() external view returns (
        uint256 blocksUntilClose,
        uint256 blocksUntilDraw
    ) {
        uint256 currentBlock = block.number;
        blocksUntilClose = 0;
        blocksUntilDraw = 0;

        LotteryRound storage round = lotteryRounds[currentLotteryRound];

            if (round.status == lotteryStatus.OPEN) {
                blocksUntilClose = (round.openBlock + BLOCKS_TO_WAIT_fOR_CLOSE > currentBlock)
                    ? (round.openBlock + BLOCKS_TO_WAIT_fOR_CLOSE) - currentBlock
                    : 0;
                    blocksUntilDraw = BLOCKS_TO_WAIT_fOR_DRAW + blocksUntilClose;
            } else if (round.status == lotteryStatus.CLOSED) {
                blocksUntilDraw = (round.closeBlock + BLOCKS_TO_WAIT_fOR_DRAW > currentBlock)
                    ? (round.closeBlock + BLOCKS_TO_WAIT_fOR_DRAW) - currentBlock
                    : 0;
            }
            return ( blocksUntilClose, blocksUntilDraw);
    }

   
    function getLotteryStatus() external view returns (lotteryStatus) {
        return lotteryRounds[currentLotteryRound].status;
    }
    
    function canCloseLottery () public view returns (bool) {
        LotteryRound storage round = lotteryRounds[currentLotteryRound];
        return round.openBlock + BLOCKS_TO_WAIT_fOR_CLOSE <= block.number;
    }

    function canDrawWinner() public view returns (bool) {
        LotteryRound storage round = lotteryRounds[currentLotteryRound];
        return round.closeBlock + BLOCKS_TO_WAIT_fOR_DRAW <= block.number;
    }

    function closeLotteryRound() external {
        LotteryRound storage round = lotteryRounds[currentLotteryRound];
        require(round.status == lotteryStatus.OPEN, "Current lottery round is not open");
        require(canCloseLottery (), "Wait for some time to close the lottery round");
        round.status = lotteryStatus.CLOSED;
        round.closeBlock = block.number;
        activeRound = false;
    }

    function startNewLotteryRound() public returns (uint256) {
        require(!activeRound, "There is a lottery active");
        
        LotteryRound storage newRound = lotteryRounds[currentLotteryRound];
        newRound.roundNumber = currentLotteryRound;
        newRound.totalPrizePool = 0;
        newRound.winner = address(0);
        newRound.status = lotteryStatus.OPEN;
        
        activeRound = true;

        newRound.openBlock = block.number;
        newRound.closeBlock = 0 ;
        return currentLotteryRound;
    }

    function addParticipantAndPrizePool(address _participant, uint256 _ticketId, bytes32 _ticketHash, bytes32 _ticketHashWithStrong ,uint256 _ticketPrice) external returns (bool) {
        LotteryRound storage round = lotteryRounds[currentLotteryRound];

        require(round.status == lotteryStatus.OPEN, "Current lottery round is closed");
        
        // Set ticket status to IN_LOTTERY
        require(ticketManager.setTicketInLottery(_participant, _ticketId, _ticketHash, _ticketHashWithStrong ,currentLotteryRound), 
                "Failed to set ticket status");

        // Add participant if first ticket
        if (round.participantTickets[_participant].length == 0) {
            round.participants.push(_participant);
        }
        
        round.participantTickets[_participant].push(_ticketId);
        round.totalPrizePool += _ticketPrice;
        return true;
    }

    function calculateSoftmaxWeights() private view returns (uint256[] memory) {
        LotteryRound storage round = lotteryRounds[currentLotteryRound];
        uint256[] memory weights = new uint256[](round.participants.length);
        uint256 maxTime = block.timestamp;

        // Calculate weights based on holding time for all tickets of each participant
        for (uint256 i = 0; i < round.participants.length; i++) {   //for each participant
            address participant = round.participants[i];    //get the address of the participant 
            uint256[] storage ticketIds = round.participantTickets[participant];    //get the ticket ids of the participant
            
            uint256 totalHoldTime = 0;

            // Sum up the hold time for all tickets
            for (uint256 j = 0; j < ticketIds.length; j++) {
                (,, uint256 creationTimestamp,,,,) = ticketManager.getTicketData(participant, ticketIds[j]); //get the ticket data
                uint256 timeHeld = (maxTime - creationTimestamp) / 1 hours; // Time held in hours
                totalHoldTime += timeHeld;
            }

            // Assign weight proportional to total hold time
            weights[i] = (totalHoldTime * SCALE_FACTOR) / 100;
        }

        // Normalize weights using softmax
        uint256 sumWeights = 0;
        for (uint256 i = 0; i < weights.length; i++) {
            sumWeights += weights[i];
        }

        if (sumWeights > 0) {
            for (uint256 i = 0; i < weights.length; i++) {
                weights[i] = (weights[i] * SCALE_FACTOR) / sumWeights; // Normalize weights
            }
        }

        return weights;
    }

    function drawLotteryWinner(bytes32 keccak256HashNumbers, bytes32 keccak256HashFull) external returns (address) {
        require(canDrawWinner(), "Wait for some time to draw the winner");

        LotteryRound storage currentRound = lotteryRounds[currentLotteryRound];

        require(currentRound.status == lotteryStatus.CLOSED, "Lottery round already finalized");
        require(currentRound.participants.length > 0, "No participants in this round");
        
        //Calculate weights based on holding time
        // uint256[] memory weights = calculateSoftmaxWeights();

        // Select winner using weighted random selection
        // uint256 randomValue = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao))) % SCALE_FACTOR;
        // uint256 cumulativeWeight = 0;
        address winner;

        for (uint256 i = 0; i < currentRound.participants.length; i++) {
            address participant = currentRound.participants[i];
            uint256[] storage ticketIds = currentRound.participantTickets[participant];
            for (uint256 j = 0; j < ticketIds.length; j++) {
                (uint256 id,address owner,uint256 creationTimestamp,TicketStatus status ,uint256 lotteryRound,bytes32 ticketHash,bytes32 ticketHashWithStrong) = ticketManager.getTicketData(participant, ticketIds[j]);
                if(ticketHashWithStrong == keccak256HashFull){
                    winner = participant;
                    break;
                }
            }
            break;
        }
        // for (uint256 i = 0; i < currentRound.participants.length; i++) {
        //     cumulativeWeight += weights[i];
        //     if (randomValue < cumulativeWeight) {
        //         winner = currentRound.participants[i];
        //         break;
        //     }
        // }

        // Mark all tickets in this round as USED
        for (uint256 i = 0; i < currentRound.participants.length; i++) {
            address participant = currentRound.participants[i];
            uint256[] storage ticketIds = currentRound.participantTickets[participant];
            for (uint256 j = 0; j < ticketIds.length; j++) {
                ticketManager.markTicketAsUsed(participant, ticketIds[j]);
            }
        }



        currentRound.winner = winner;
        currentRound.status = lotteryStatus.FINALIZED;
        activeRound = false;
        currentLotteryRound++;
        
        return winner;
    }

    function getCurrentRound() external view returns (uint256) {
        return currentLotteryRound;
    }

    function isLotteryActive() external view returns (bool) {
        return activeRound;
    }

    function getLotteryRoundInfo(uint256 _index) external view returns (
        uint256 roundNumber,
        uint256 totalPrizePool,
        address[] memory participants,
        address winner,
        lotteryStatus status
    ) {
        LotteryRound storage round = lotteryRounds[_index];
        return (
            round.roundNumber,
            round.totalPrizePool,
            round.participants,
            round.winner,
            round.status
        );
    }

    function getAllLotteryRoundsInfo() external view returns (
        uint256[] memory roundNumbers,
        uint256[] memory totalPrizePools,
        address[][] memory participantsList,
        address[] memory winners,
        lotteryStatus[] memory Statuses
    )
    {
        uint256 totalRounds = currentLotteryRound+1; 
        roundNumbers = new uint256[](totalRounds);
        totalPrizePools = new uint256[](totalRounds);
        participantsList = new address[][](totalRounds);
        winners = new address[](totalRounds);
        Statuses = new lotteryStatus[](totalRounds);

        for (uint256 i = 0; i < totalRounds; i++) {
            LotteryRound storage round = lotteryRounds[i];

            roundNumbers[i] = round.roundNumber;
            totalPrizePools[i] = round.totalPrizePool;
            participantsList[i] = round.participants;
            winners[i] = round.winner;
            Statuses[i] = round.status;
        }

        return (roundNumbers, totalPrizePools, participantsList, winners, Statuses);
    }

}