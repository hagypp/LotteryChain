import React, { useState, useEffect, useRef } from 'react';
import contractService from '../services/contractService';
import './LotteryRounds.css';

const LotteryRounds = ({ isContractReady }) => {
  const [rounds, setRounds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const dataFetchedRef = useRef(false);

  const fetchRounds = async () => {
    try {
      setIsLoading(true);
      const roundsInfo = await contractService.getAllLotteryRoundsInfo();
      console.log("Raw rounds inside:", roundsInfo);
      
      const lotteryRounds = roundsInfo.roundNumbers
        .map((roundNumber, index) => {
          // Safely handle potential missing or undefined data
          const rawPrizePool = roundsInfo.totalPrizePools[index] || '0';
          const status = Number(roundsInfo.statuses[index]);

          return {
            roundNumber: Number(roundNumber),
            status: status,
            totalPrizePool: rawPrizePool, // Keep as Wei
            participants: roundsInfo.participantsList[index] || [],
            smallPrizeWinners: roundsInfo.smallPrizeWinnersList[index] || [],
            bigPrizeWinners: roundsInfo.bigPrizeWinnersList[index] || [],
          };
        })
        .filter(round => round.roundNumber > 0);

      console.log("Processed rounds:", lotteryRounds);
      setRounds(lotteryRounds);
      setError(null);
    } catch (error) {
      console.error("Error fetching rounds:", error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Only fetch data when contract is ready and we haven't fetched before
  useEffect(() => {
    if (isContractReady && !dataFetchedRef.current) {
      fetchRounds();
      dataFetchedRef.current = true;
    }
  }, [isContractReady]);

  // Listen for lottery updates
  useEffect(() => {
    const handleLotteryUpdate = () => {
      if (isContractReady) {
        fetchRounds();
      }
    };

    // Listen for custom events that should trigger a refresh
    window.addEventListener('drawLotteryComplete', handleLotteryUpdate);
    window.addEventListener('lotteryStatusUpdated', handleLotteryUpdate);

    return () => {
      window.removeEventListener('drawLotteryComplete', handleLotteryUpdate);
      window.removeEventListener('lotteryStatusUpdated', handleLotteryUpdate);
    };
  }, [isContractReady]);

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
        return 'Open';
      case 1:
        return 'Closed';
      case 2:
        return 'Finalized';
      default:
        return 'Unknown Status';
    }
  };

  const formatAddress = (address) => {
    if (!address || address === '0x0000000000000000000000000000000000000000') return 'N/A';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="lottery-rounds-container">
      <h2 className="lottery-rounds-title">Lottery Rounds History</h2>
      
      <div className="lottery-rounds-table">
        <div className="lottery-rounds-header">
          <div className="lottery-rounds-column">Round</div>
          <div className="lottery-rounds-column">Status</div>
          <div className="lottery-rounds-column">Prize Pool (Wei)</div>
          <div className="lottery-rounds-column">Participants</div>
          <div className="lottery-rounds-column">Small Prize Winners</div>
          <div className="lottery-rounds-column">Big Prize Winners</div>
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
              <div className="lottery-rounds-column">{round.totalPrizePool}</div>
              <div className="lottery-rounds-column">{round.participants.length}</div>
              <div className="lottery-rounds-column">
                {round.status === 2 && round.smallPrizeWinners.length > 0
                  ? round.smallPrizeWinners.map((winner) => formatAddress(winner)).join(', ')
                  : 'N/A'}
              </div>
              <div className="lottery-rounds-column">
                {round.bigPrizeWinners.length > 0
                  ? round.bigPrizeWinners.map((winner) => formatAddress(winner)).join(', ')
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