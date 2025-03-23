import React, { useState, useEffect } from 'react';
import contractService from '../services/contractService';
import './LotteryRounds.css';

const LotteryRounds = ({ refreshTrigger }) => {
  const [rounds, setRounds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRounds = async () => {
    try {
      setIsLoading(true); // Start loading
      const roundsInfo = await contractService.getAllLotteryRoundsInfo();
      
      // Extract relevant information from the fetched data
      const lotteryRounds = roundsInfo.roundNumbers.map((roundNumber, index) => ({
        roundNumber: Number(roundNumber.toString()),
        status: Number(roundsInfo.Statuses[index].toString()), // Convert BigInt to string, then to Number
        totalPrizePool: contractService.web3.utils.fromWei(roundsInfo.totalPrizePools[index].toString(), 'ether'),
        participants: roundsInfo.participantsList[index],
        winner: roundsInfo.winners[index],
      }));
      
      setRounds(lotteryRounds);
      setError(null);
    } catch (error) {
      console.error("Error fetching rounds:", error);
      setError(error.message);
    } finally {
      setIsLoading(false); // End loading
    }
  };

  useEffect(() => {
    // Only fetch rounds when the component mounts
    let isMounted = true;
    
    const loadRounds = async () => {
      try {
        await contractService.init(); // Ensure contract is initialized
        if (isMounted) {
          fetchRounds();
        }
      } catch (error) {
        console.error("Failed to initialize contract:", error);
        if (isMounted) {
          setError("Failed to initialize contract service");
          setIsLoading(false);
        }
      }
    };
    
    loadRounds();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, []); // Only run on mount

  // Separate useEffect for refresh trigger
  useEffect(() => {
    if (refreshTrigger) {
      fetchRounds();
    }
  }, [refreshTrigger]); // Fetch again if refreshTrigger changes

  if (isLoading) {
    return (
      <div className="lottery-rounds-container">
        <div className="lottery-rounds-loading">Loading lottery rounds...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="lottery-rounds-container">
        <div className="lottery-rounds-error">Error loading lottery rounds: {error}</div>
      </div>
    );
  }

  const getStatusText = (status) => {
    switch (status) {
      case 0:
        return 'Open'; // OPEN
      case 1:
        return 'Closed'; // CLOSED
      case 2:
        return 'Finalized'; // FINALIZED
      default:
        return 'Unknown Status';
    }
  };

  return (
    <div className="lottery-rounds-container">
      <h2 className="lottery-rounds-title">Lottery Rounds History</h2>
      
      <div className="lottery-rounds-table">
        <div className="lottery-rounds-header">
          <div className="lottery-rounds-column">Round</div>
          <div className="lottery-rounds-column">Status</div>
          <div className="lottery-rounds-column">Prize Pool</div>
          <div className="lottery-rounds-column">Participants</div>
          <div className="lottery-rounds-column">Winner</div>
        </div>
        
        {rounds && rounds.length > 0 ? (
          rounds.map((round) => (
            <div key={round.roundNumber} className="lottery-rounds-row">
              <div className="lottery-rounds-column">#{round.roundNumber}</div>
              <div className="lottery-rounds-column">
                <span className={`round-status ${round.status === 2 ? 'completed' : round.status === 1 ? 'closed' : 'open'}`}>
                  {getStatusText(round.status)}
                </span>
              </div>
              <div className="lottery-rounds-column">{round.totalPrizePool} ETH</div>
              <div className="lottery-rounds-column">{round.participants.length}</div>
              <div className="lottery-rounds-column">
                {round.status === 2 && round.winner !== '0x0000000000000000000000000000000000000000'
                  ? `${round.winner.slice(0, 6)}...${round.winner.slice(-4)}`
                  : 'N/A'}
              </div>
            </div>
          ))
        ) : (
          <div className="lottery-rounds-empty">No lottery rounds found</div>
        )}
      </div>
    </div>
  );
};

export default LotteryRounds;