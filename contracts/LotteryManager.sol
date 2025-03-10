// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ITicketManager
 {
    enum TicketStatus { ACTIVE, IN_LOTTERY, USED, EXPIRED }
    function setTicketInLottery(address _player, uint256 _ticketId, bytes32 _ticketHash,bytes32 _ticketHashWithStrong ,uint256 _lotteryRound) external returns (bool);
    function markTicketAsUsed(address _player, uint256 _ticketId) external returns (bool);
    function getTicketData(address _player, uint256 _ticketId) external view returns (
        uint256 id,
        address owner,
        uint256 creationTimestamp,
        TicketStatus status,
        uint256 lotteryRound
    );
}

struct LotteryRound {
    uint256 roundNumber;
    uint256 totalPrizePool;
    address[] participants;
    mapping(address => uint256[]) participantTickets; // Store ticket IDs for each participant
    address winner;
    bool isFinalized;
}

contract LotteryManager {
    mapping(uint256 => LotteryRound) private lotteryRounds;
    uint256 private currentLotteryRound = 1;
    address private immutable i_owner;
    bool private activeRound;
    ITicketManager private ticketManager;
    uint256 private constant SCALE_FACTOR = 1e18;

    constructor(address _ticketManagerAddress) {
        i_owner = msg.sender;
        activeRound = false;

        ticketManager = ITicketManager(_ticketManagerAddress);
    }

    modifier onlyOwner() {
        require(msg.sender == i_owner, "Only the contract owner can call this function");
        _;
    }

    function startNewLotteryRound() external onlyOwner returns (uint256) {
        require(!activeRound, "There is a lottery active");
        
        LotteryRound storage newRound = lotteryRounds[currentLotteryRound];
        newRound.roundNumber = currentLotteryRound;
        newRound.totalPrizePool = 0;
        newRound.winner = address(0);
        newRound.isFinalized = false;
        
        activeRound = true;
        return currentLotteryRound;
    }

    function addParticipantAndPrizePool(address _participant, uint256 _ticketId, bytes32 _ticketHash, bytes32 _ticketHashWithStrong ,uint256 _ticketPrice) external returns (bool) {
        require(activeRound, "Current lottery round is closed");
        require(!lotteryRounds[currentLotteryRound].isFinalized, "Current lottery round is closed");
        
        LotteryRound storage round = lotteryRounds[currentLotteryRound];
        
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
                (,, uint256 creationTimestamp,,) = ticketManager.getTicketData(participant, ticketIds[j]); //get the ticket data
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


    function drawLotteryWinner() external onlyOwner returns (address) {
        require(activeRound, "Current lottery round is closed");
        LotteryRound storage currentRound = lotteryRounds[currentLotteryRound];
        
        require(!currentRound.isFinalized, "Lottery round already finalized");
        require(currentRound.participants.length > 0, "No participants in this round");

        // Calculate weights based on holding time
        uint256[] memory weights = calculateSoftmaxWeights();

        // Select winner using weighted random selection
        uint256 randomValue = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao))) % SCALE_FACTOR;
        uint256 cumulativeWeight = 0;
        address winner = currentRound.participants[0];

        for (uint256 i = 0; i < currentRound.participants.length; i++) {
            cumulativeWeight += weights[i];
            if (randomValue < cumulativeWeight) {
                winner = currentRound.participants[i];
                break;
            }
        }

        // Mark all tickets in this round as USED
        for (uint256 i = 0; i < currentRound.participants.length; i++) {
            address participant = currentRound.participants[i];
            uint256[] storage ticketIds = currentRound.participantTickets[participant];
            for (uint256 j = 0; j < ticketIds.length; j++) {
                ticketManager.markTicketAsUsed(participant, ticketIds[j]);
            }
        }

        currentRound.winner = winner;
        currentRound.isFinalized = true;
        activeRound = false;
        currentLotteryRound++;
        
        return winner;
    }

    function getLotteryRoundInfo(uint256 _index) external view returns (
        uint256 roundNumber,
        uint256 totalPrizePool,
        address[] memory participants,
        address winner,
        bool isFinalized
    ) {
        LotteryRound storage round = lotteryRounds[_index];
        return (
            round.roundNumber,
            round.totalPrizePool,
            round.participants,
            round.winner,
            round.isFinalized
        );
    }

    function getParticipantTicketsInRound(uint256 _roundNumber, address _participant) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return lotteryRounds[_roundNumber].participantTickets[_participant];
    }

    function getTotalPrizePool() external view returns (uint256) {
        return lotteryRounds[currentLotteryRound].totalPrizePool;
    }

    function getCurrentRound() external view returns (uint256) {
        return currentLotteryRound;
    }

    function isLotteryActive() external view returns (bool) {
    return activeRound;
    }
    function getAllLotteryRoundsInfo() external view returns (
        uint256[] memory roundNumbers,
        uint256[] memory totalPrizePools,
        address[][] memory participantsList,
        address[] memory winners,
        bool[] memory finalizedStatuses
    ) {
        uint256 totalRounds = currentLotteryRound; 
        roundNumbers = new uint256[](totalRounds);
        totalPrizePools = new uint256[](totalRounds);
        participantsList = new address[][](totalRounds);
        winners = new address[](totalRounds);
        finalizedStatuses = new bool[](totalRounds);

        for (uint256 i = 0; i < currentLotteryRound; i++) {
            LotteryRound storage round = lotteryRounds[i];

            roundNumbers[i] = round.roundNumber;
            totalPrizePools[i] = round.totalPrizePool;
            participantsList[i] = round.participants;
            winners[i] = round.winner;
            finalizedStatuses[i] = round.isFinalized;
        }

        return (roundNumbers, totalPrizePools, participantsList, winners, finalizedStatuses);
    }
}