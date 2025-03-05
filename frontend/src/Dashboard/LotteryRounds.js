import React, { useState, useEffect } from 'react';
import contractService from '../services/contractService';
import './LotteryRounds.css';

const LotteryRounds = ({ refreshTrigger }) => {
  const [rounds, setRounds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRounds = async () => {
    try {
      const roundsInfo = await contractService.getAllLotteryRoundsInfo();
      setRounds(roundsInfo);
      setError(null);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRounds();
  }, []);

  useEffect(() => {
    if (refreshTrigger) {
      fetchRounds();
    }
  }, [refreshTrigger]);

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
                <span className={`round-status ${round.isFinalized ? 'completed' : 'active'}`}>
                  {round.isFinalized ? 'Completed' : 'Active'}
                </span>
              </div>
              <div className="lottery-rounds-column">{round.totalPrizePool} ETH</div>
              <div className="lottery-rounds-column">{round.participants.length}</div>
              <div className="lottery-rounds-column">
                {round.isFinalized && round.winner !== '0x0000000000000000000000000000000000000000'
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