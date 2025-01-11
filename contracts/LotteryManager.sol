// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

    struct LotteryRound {
        uint256 roundNumber;
        uint256 totalPrizePool;
        address[] participants;
        address winner;
        bool isFinalized;
    }
contract LotteryManager {


    mapping(uint256 => LotteryRound) private lotteryRounds;
    uint256 private currentLotteryRound;
    address private immutable i_owner;
    bool private activeRound;

    constructor() {
        i_owner = msg.sender;
        activeRound = false;
    }

    modifier onlyOwner() {
        require(msg.sender == i_owner, "Only the contract owner can call this function");
        _;
    }

    function startNewLotteryRound() external onlyOwner returns (uint256) {
        require(!activeRound, "There is a lottery active");  
        
        lotteryRounds[currentLotteryRound] = LotteryRound({
            roundNumber: currentLotteryRound,
            totalPrizePool: 0,
            participants: new address[](0),
            winner: address(0),
            isFinalized: false
        });
        
        activeRound = true;
        return currentLotteryRound;
    }

    function addParticipantAndPrizePool(address _participant, uint256 _ticketPrice) external returns (bool) {
        require(activeRound, "Current lottery round is closed");
        require(!lotteryRounds[currentLotteryRound].isFinalized, "Current lottery round is closed");

        lotteryRounds[currentLotteryRound].participants.push(_participant);
        lotteryRounds[currentLotteryRound].totalPrizePool += _ticketPrice;
        return true;
    }

    function drawLotteryWinner() external onlyOwner returns (address) {
        require(activeRound, "Current lottery round is closed");
        LotteryRound storage currentRound = lotteryRounds[currentLotteryRound];
        
        require(!currentRound.isFinalized, "Lottery round already finalized");
        require(currentRound.participants.length > 0, "No participants in this round");

        uint256 randomIndex = uint256(blockhash(block.number - 1)) % currentRound.participants.length;
        address winner = currentRound.participants[randomIndex];

        currentRound.winner = winner;
        currentRound.isFinalized = true;
        activeRound = false;
        currentLotteryRound++;
        
        return winner;
    }

    function getLotteryRound(uint256 _index) external view returns (LotteryRound memory) {
        return lotteryRounds[_index];
    }

    function getTotalPrizePool() external view returns (uint256) {
        return lotteryRounds[currentLotteryRound].totalPrizePool;
    }
    function getCurrentRound() external view returns (uint256) {
        return currentLotteryRound;
    }
}