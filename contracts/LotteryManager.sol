// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;
import "./TicketManager.sol";

interface ITicketManager {
    function setTicketInLottery(address _player, uint256 _ticketId, bytes32 _ticketHash, bytes32 _ticketHashWithStrong, uint256 _lotteryRound) external returns (bool);
    function markTicketAsStatus(address _player, uint256 _ticketId, TicketStatus _status) external returns (bool) ;
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

    address[] smallPrizeWinners;  // Winners of small prize
    address[] bigPrizeWinners;    // Winners of big prize
    address[] miniPrizeWinners;

    lotteryStatus status;

    uint256 openBlock;
    uint256 closeBlock;

    uint256 smallPrize;
    uint256 bigPrize;
    uint256 miniPrize;

    uint256 commission;

    uint256 totalTickets;
}

contract LotteryManager {
    mapping(uint256 => LotteryRound) private lotteryRounds;
    uint256 private currentLotteryRound;
    address private immutable i_owner;
    bool private activeRound;
    ITicketManager private ticketManager;

    uint256 private constant SCALE_FACTOR = 1e18;
    uint256 private BLOCKS_TO_WAIT_fOR_CLOSE = 4;
    uint256 private BLOCKS_TO_WAIT_fOR_DRAW = 1;

    uint256 private constant SMALL_PRIZE_PERCENTAGE = 30; //prize pool for small prize the rest if for the big (80%)
    uint256 private constant FLEX_COMMISSION = 5;       // commission for owner
    uint256 private constant MINI_PRIZE_PERCENTAGE = 10; //mini prize

    constructor(address _ticketManagerAddress) 
    {
        i_owner = tx.origin;
        activeRound = false;
        ticketManager = ITicketManager(_ticketManagerAddress);
        startNewLotteryRound();
    }
    function getMINI_PRIZE_PERCENTAGE() external pure returns (uint256) {
        return MINI_PRIZE_PERCENTAGE;
    }
    function getSMALL_PRIZE_PERCENTAGE() external pure returns (uint256) {
        return SMALL_PRIZE_PERCENTAGE;
    }
    function getFLEX_COMMISSION() external pure returns (uint256) {
        return FLEX_COMMISSION;
    }
    function getBlocksWait() external view returns (uint256, uint256) {
        return (BLOCKS_TO_WAIT_fOR_CLOSE, BLOCKS_TO_WAIT_fOR_DRAW);
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
    
    function canCloseLottery () public view returns (bool) {
        LotteryRound storage round = lotteryRounds[currentLotteryRound];
        return round.openBlock + BLOCKS_TO_WAIT_fOR_CLOSE < block.number;
    }

    function canDrawWinner() public view returns (bool) {
        LotteryRound storage round = lotteryRounds[currentLotteryRound];
        return round.closeBlock + BLOCKS_TO_WAIT_fOR_DRAW < block.number;
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

        LotteryRound storage currentRound = lotteryRounds[currentLotteryRound];
        activeRound = false;        
        currentRound.status = lotteryStatus.FINALIZED;
        currentLotteryRound++;

        LotteryRound storage newRound = lotteryRounds[currentLotteryRound];
        newRound.roundNumber = currentLotteryRound;
        newRound.totalPrizePool = 0;
        // newRound.smallPrizeWinners = [];
        // newRound.bigPrizeWinners = [];
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
        round.totalTickets += 1;
        return true;
    }

    // Calculate softmax weights based on ticket holding time with reduced stack depth
    function calculateSoftmaxWeights(LotteryRound storage round) private view returns (uint256[] memory) {
        uint256 participantCount = round.participants.length;
        if (participantCount == 0) return new uint256[](0);
        
        uint256[] memory weights = new uint256[](participantCount);
        
        // First calculate raw weights
        calculateRawWeights(weights,round);
        
        // Then apply softmax transformation
        applySoftmaxTransformation(weights);
        
        return weights;
    }

    // Split function to reduce stack depth - calculate raw time-based weights
    function calculateRawWeights(uint256[] memory weights, LotteryRound storage round) private view {
        uint256 maxTime = block.timestamp;
        
        for (uint256 i = 0; i < weights.length; i++) {
            address participant = round.participants[i];
            weights[i] = calculateParticipantWeight(participant, maxTime, round);
        }
    }

    // Calculate weight for a single participant
    function calculateParticipantWeight(address participant, uint256 maxTime,LotteryRound storage round) private view returns (uint256) {
        uint256[] storage ticketIds = round.participantTickets[participant];
        uint256 totalHoldTime = 0;
        
        for (uint256 j = 0; j < ticketIds.length; j++) {
            (,, uint256 creationTimestamp,,,,) = ticketManager.getTicketData(participant, ticketIds[j]);
            totalHoldTime += (maxTime - creationTimestamp) / 1 hours;
        }
        
        return totalHoldTime;
    }

    // Apply softmax transformation to weights
    function applySoftmaxTransformation(uint256[] memory weights) private pure {
        // Find maximum weight to prevent overflow
        uint256 maxWeight = 0;
        for (uint256 i = 0; i < weights.length; i++) {
            if (weights[i] > maxWeight) {
                maxWeight = weights[i];
            }
        }
        
        // Calculate exp and sum
        uint256 sumExp = 0;
        for (uint256 i = 0; i < weights.length; i++) {
            // Normalize by subtracting max (prevents overflow)
            weights[i] = fastExp(weights[i], maxWeight);
            sumExp += weights[i];
        }
        
        // Normalize to get final weights
        if (sumExp > 0) {
            for (uint256 i = 0; i < weights.length; i++) {
                weights[i] = (weights[i] * SCALE_FACTOR) / sumExp;
            }
        }
    }

    // Optimized exponential approximation
    function fastExp(uint256 x, uint256 maxVal) private pure returns (uint256) {
        // Normalize x by subtracting the max value (all values become <= 0)
        // which prevents overflow in the exp calculation
        if (x < maxVal) {
            // For values much smaller than max, return near-zero
            if (maxVal - x > 10) {
                return 1; // Very small but not zero
            }
            
            // Calculate exp for negative normalized value
            return expApprox(0); // For normalized negative values
        }
        
        // For x = maxVal, return e^0 = 1*SCALE_FACTOR
        return SCALE_FACTOR;
    }

    // Simple exp approximation with reduced terms
    function expApprox(uint256 x) private pure returns (uint256) {
        // Using only 4 terms for taylor series
        // e^x ≈ 1 + x + x²/2! + x³/3! + x⁴/4!
        uint256 result = SCALE_FACTOR;
        
        if (x == 0) return result;
        
        uint256 term = SCALE_FACTOR;
        
        // Term 1: x
        term = (term * x) / SCALE_FACTOR;
        result += term;
        
        // Term 2: x²/2!
        term = (term * x) / (2 * SCALE_FACTOR);
        result += term;
        
        // Term 3: x³/3!
        term = (term * x) / (3 * SCALE_FACTOR);
        result += term;
        
        // Term 4: x⁴/4!
        term = (term * x) / (4 * SCALE_FACTOR);
        result += term;
        
        return result;
    }


      // Helper function to identify small and big prize winners
    function identifyWinners(
        bytes32 keccak256HashNumbers,
        bytes32 keccak256HashFull,
        LotteryRound storage round
    ) private returns (uint256 smallWinnerCount1, uint256 bigWinnerCount1) {
         // First pass to count winners
        uint256 smallWinnerCount = 0;
        uint256 bigWinnerCount = 0;
        
        for (uint256 i = 0; i < round.participants.length; i++) {
            address participant = round.participants[i];
            uint256[] storage ticketIds = round.participantTickets[participant];
            
            for (uint256 j = 0; j < ticketIds.length; j++) {
                (,,,, , bytes32 ticketHash, bytes32 ticketHashWithStrong) = 
                    ticketManager.getTicketData(participant, ticketIds[j]);
                
                if (ticketHashWithStrong == keccak256HashFull) {
                    bigWinnerCount++;
                } else if (ticketHash == keccak256HashNumbers) {
                    smallWinnerCount++;
                }
            }
        }
        
        // Create arrays of exact size
        address [] memory  smallWinners = new address[](smallWinnerCount);
        address [] memory bigWinners = new address[](bigWinnerCount);
        
        // Second pass to fill arrays and mark tickets
        smallWinnerCount = 0;
        bigWinnerCount = 0;
        
        for (uint256 i = 0; i < round.participants.length; i++) {
            address participant = round.participants[i];
            uint256[] storage ticketIds = round.participantTickets[participant];
            
            for (uint256 j = 0; j < ticketIds.length; j++) {
                (,,,, , bytes32 ticketHash, bytes32 ticketHashWithStrong) = 
                    ticketManager.getTicketData(participant, ticketIds[j]);
                
                if (ticketHashWithStrong == keccak256HashFull) {
                    bigWinners[bigWinnerCount] = participant;
                    bigWinnerCount++;
                    ticketManager.markTicketAsStatus(participant, ticketIds[j], TicketStatus.WON_BIG_PRIZE);
                } else if (ticketHash == keccak256HashNumbers) {
                    smallWinners[smallWinnerCount] = participant;
                    smallWinnerCount++;
                    ticketManager.markTicketAsStatus(participant, ticketIds[j], TicketStatus.WON_SMALL_PRIZE);
                } 
            }
        }
        round.bigPrizeWinners = bigWinners;
        round.smallPrizeWinners = smallWinners;
        return (smallWinnerCount, bigWinnerCount);
    }

    // Helper function to select mini prize winners
    function selectMiniPrizeWinners(
        LotteryRound storage round,
        bytes32 keccak256HashNumbers,
        bytes32 keccak256HashFull
    ) private returns (uint256 miniWinnerCount) {
        miniWinnerCount = 0;
        round.miniPrizeWinners = new address[](1);

        address[] memory eligibleParticipants = new address[](round.participants.length);
        uint256 eligibleCount = 0;

        for (uint256 i = 0; i < round.participants.length; i++) {
            address participant = round.participants[i];
            uint256[] storage ticketIds = round.participantTickets[participant];
            bool hasEligibleTicket = false;
            for (uint256 j = 0; j < ticketIds.length; j++) {
                (, , , TicketStatus status, , ,) = ticketManager.getTicketData(participant, ticketIds[j]);
                if (status == TicketStatus.IN_LOTTERY) {
                    hasEligibleTicket = true;
                    break;
                }
            }
            if (hasEligibleTicket) {
                eligibleParticipants[eligibleCount] = participant;
                eligibleCount++;
            }
        }
        
        if(eligibleCount == 0) {
            return 0; // No eligible participants for mini prize
        }

            uint256[] memory weights = calculateSoftmaxWeights(round);
            uint256 randomValue = uint256(keccak256(abi.encodePacked(keccak256HashNumbers, keccak256HashFull))) % SCALE_FACTOR;
            uint256 cumulativeWeight = 0;

            for (uint256 i = 0; i < eligibleCount; i++) 
            {
                if (weights[i] > 0) {
                    cumulativeWeight += weights[i];
                    if (randomValue < cumulativeWeight) {
                        round.miniPrizeWinners[miniWinnerCount] = eligibleParticipants[i];
                        miniWinnerCount++;
                        uint256[] storage ticketIds = round.participantTickets[eligibleParticipants[i]];
                        for (uint256 j = 0; j < ticketIds.length; j++) {
                            (, , , TicketStatus status, , ,) = ticketManager.getTicketData(eligibleParticipants[i], ticketIds[j]);
                            if (status == TicketStatus.IN_LOTTERY) {
                                ticketManager.markTicketAsStatus(eligibleParticipants[i], ticketIds[j], TicketStatus.WON_MINI_PRIZE);
                                break;
                            }
                        }
                        break;
                    }
                }
        }
        return miniWinnerCount;
    }

    // Helper function to resize winner arrays
    function resizeWinnerArrays(
        LotteryRound storage round,
        uint256 smallWinnerCount,
        uint256 bigWinnerCount,
        uint256 miniWinnerCount
    ) private returns (
        address[] memory finalSmallPrizeWinners,
        address[] memory finalBigPrizeWinners,
        address[] memory finalMiniPrizeWinners
    ) {
        finalSmallPrizeWinners = new address[](smallWinnerCount);
        finalBigPrizeWinners = new address[](bigWinnerCount);
        finalMiniPrizeWinners = new address[](miniWinnerCount);

        for (uint256 i = 0; i < smallWinnerCount; i++) {
            finalSmallPrizeWinners[i] = round.smallPrizeWinners[i];
        }
        for (uint256 i = 0; i < bigWinnerCount; i++) {
            finalBigPrizeWinners[i] = round.bigPrizeWinners[i];
        }
        for (uint256 i = 0; i < miniWinnerCount; i++) {
            finalMiniPrizeWinners[i] = round.miniPrizeWinners[i];
        }

        round.smallPrizeWinners = finalSmallPrizeWinners;
        round.bigPrizeWinners = finalBigPrizeWinners;
        round.miniPrizeWinners = finalMiniPrizeWinners;
    }

    // Helper function to calculate and distribute prizes
    function calculateAndDistributePrizes(
        LotteryRound storage round,
        uint256 smallWinnerCount,
        uint256 bigWinnerCount,
        uint256 miniWinnerCount
    ) private {
        uint256 totalPrizePool = round.totalPrizePool;
        uint256 commission = (totalPrizePool * FLEX_COMMISSION) / 100;
        uint256 miniPrizePool = (totalPrizePool * MINI_PRIZE_PERCENTAGE) / 100;
        uint256 smallPrizePool = (totalPrizePool * SMALL_PRIZE_PERCENTAGE) / 100;
        uint256 bigPrizePool = totalPrizePool - commission - smallPrizePool - miniPrizePool;

        round.smallPrize = smallPrizePool;
        round.bigPrize = bigPrizePool;
        round.miniPrize = miniPrizePool;
        round.commission = commission;

        if (smallWinnerCount > 0) {
            uint256 smallPrizePerWinner = smallPrizePool / smallWinnerCount;
            for (uint256 i = 0; i < smallWinnerCount; i++) {
                payable(round.smallPrizeWinners[i]).transfer(smallPrizePerWinner);
            }
        } else if (smallPrizePool > 0) {
            round.commission += smallPrizePool;
            round.smallPrize = 0;
        }

        if (bigWinnerCount > 0) {
            uint256 bigPrizePerWinner = bigPrizePool / bigWinnerCount;
            for (uint256 i = 0; i < bigWinnerCount; i++) {
                payable(round.bigPrizeWinners[i]).transfer(bigPrizePerWinner);
            }
        } else if (bigPrizePool > 0) {
            round.commission += bigPrizePool;
            round.bigPrize = 0;
        }

        if (miniWinnerCount > 0) {
            uint256 miniPrizePerWinner = miniPrizePool / miniWinnerCount;
            for (uint256 i = 0; i < miniWinnerCount; i++) {
                payable(round.miniPrizeWinners[i]).transfer(miniPrizePerWinner);
            }
        } else if (miniPrizePool > 0) {
            round.commission += miniPrizePool;
            round.miniPrize = 0;
        }

        if (round.commission > 0) {
            payable(i_owner).transfer(round.commission);
        }
    }

    function drawLotteryWinner(
        bytes32 keccak256HashNumbers,
        bytes32 keccak256HashFull
    ) external returns (address[] memory, address[] memory, address[] memory) {
        require(canDrawWinner(), "Wait for some time to draw the winner");
        LotteryRound storage currentRound = lotteryRounds[currentLotteryRound];
        require(currentRound.status == lotteryStatus.CLOSED, "Lottery round already finalized");

        if (currentRound.participants.length == 0) {
            address[] memory emptyArray = new address[](0);
            currentRound.smallPrizeWinners = emptyArray;
            currentRound.bigPrizeWinners = emptyArray;
            currentRound.miniPrizeWinners = emptyArray;
            return (emptyArray, emptyArray, emptyArray);
        }

        // Identify small and big prize winners
        (uint256 smallWinnerCount, uint256 bigWinnerCount) = identifyWinners(
            keccak256HashNumbers,
            keccak256HashFull,
            currentRound
        );

        // Select mini prize winners
        uint256 miniWinnerCount = selectMiniPrizeWinners(
            currentRound,
            keccak256HashNumbers,
            keccak256HashFull
        );

        // Resize winner arrays
        (
            address[] memory finalSmallPrizeWinners,
            address[] memory finalBigPrizeWinners,
            address[] memory finalMiniPrizeWinners
        ) = resizeWinnerArrays(
            currentRound,
            smallWinnerCount,
            bigWinnerCount,
            miniWinnerCount
        );

        markTicketsAsUsed(currentRound);

        // Calculate and distribute prizes
        calculateAndDistributePrizes(
            currentRound,
            smallWinnerCount,
            bigWinnerCount,
            miniWinnerCount
        );

        return (
            finalSmallPrizeWinners,
            finalBigPrizeWinners,
            finalMiniPrizeWinners
        );
    }

    function markTicketsAsUsed(LotteryRound storage round) private {
        for (uint256 i = 0; i < round.participants.length; i++) {
            address participant = round.participants[i];
            uint256[] storage ticketIds = round.participantTickets[participant];
            for (uint256 j = 0; j < ticketIds.length; j++) 
            {
                (, , , TicketStatus status, , ,) = ticketManager.getTicketData(participant, ticketIds[j]);
                if (status == TicketStatus.IN_LOTTERY) 
                {
                    ticketManager.markTicketAsStatus(participant, ticketIds[j], TicketStatus.USED);
                }
            }
        }
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
        address[][] memory addressArrays,
        lotteryStatus status,
        uint256 bigPrize,
        uint256 smallPrize,
        uint256 miniPrize,
        uint256 commission,
        uint256 totalTickets
    ) {
        require(_index <= currentLotteryRound && _index >= 1, "Invalid lottery round index");
        LotteryRound storage round = lotteryRounds[_index];

        address [][] memory Arrays = new address[][](4);
        Arrays[0] = round.participants.length > 0 ? round.participants : new address[](0);
        Arrays[1] = round.smallPrizeWinners.length > 0 ? round.smallPrizeWinners : new address[](0);
        Arrays[2] = round.bigPrizeWinners.length > 0 ? round.bigPrizeWinners : new address[](0);
        Arrays[3] = round.miniPrizeWinners.length > 0 ? round.miniPrizeWinners : new address[](0);
        return (
            round.roundNumber,
            round.totalPrizePool,
            Arrays,
            round.status,
            round.bigPrize,
            round.smallPrize,
            round.miniPrize,
            round.commission,
            round.totalTickets
        );
    }


    // Modified getCurrentWinners to include mini prize winners
    function getCurrentWinners() external view returns (
        address[] memory smallPrizeWinners,
        address[] memory bigPrizeWinners,
        address[] memory miniPrizeWinners
    ) {
        LotteryRound storage currentRound = lotteryRounds[currentLotteryRound-1];
        return (currentRound.smallPrizeWinners, currentRound.bigPrizeWinners, currentRound.miniPrizeWinners);
    }

    function getCurrentPrizePool() external view returns (uint256) {
        LotteryRound storage currentRound = lotteryRounds[currentLotteryRound];
        return currentRound.totalPrizePool;
    }

    function getCurrentTotalTickets() external view returns (uint256) {
        LotteryRound storage currentRound = lotteryRounds[currentLotteryRound];
        return currentRound.totalTickets;
    }
    receive() external payable {}
}