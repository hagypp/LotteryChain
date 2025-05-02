import React, { useState, useEffect } from 'react';
import contractService from '../services/contractService';
import './LotteryRounds.css';

const LotteryRounds = ({ isContractReady }) => {
  const [roundInput, setRoundInput] = useState('');
  const [roundData, setRoundData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [latestRound, setLatestRound] = useState(null);
  const [recentRounds, setRecentRounds] = useState([]);

  const [flexCommission, setFlexCommission] = useState(null);
  const [smallPrizePercentage, setSmallPrizePercentage] = useState(null);

  // Fetch latest round on component mount if contract is ready
  useEffect(() => {
    if (isContractReady) {
      fetchLatestRoundInfo();
      fetchStaticPercentages();
    }
  }, [isContractReady]);

  const fetchStaticPercentages = async () => {
    try {
      const commission = await contractService.getFLEX_COMMISSION();
      const percentage = await contractService.getSMALL_PRIZE_PERCENTAGE();
      setFlexCommission(Number(commission));
      setSmallPrizePercentage(Number(percentage));
    } catch (error) {
      console.error("Failed to fetch static percentages:", error);
    }
  };

  const fetchLatestRoundInfo = async () => {
    try {
      const currentRound = await contractService.getCurrentRound();
      setLatestRound(Number(currentRound));
      
      // Fetch recent rounds data
      const recentRoundsData = [];
      const roundsToFetch = Math.min(4, Number(currentRound));
      
      for (let i = Number(currentRound); i > Number(currentRound) - roundsToFetch; i--) {
        if (i >= 0) {
          try {
            const roundData = await contractService.getLotteryRoundInfo(i.toString());
            recentRoundsData.push({
              roundNumber: Number(roundData.roundNumber),
              status: Number(roundData.status),
              totalPrizePool: roundData.totalPrizePool,
              totalTickets: roundData.totalTickets
            });
          } catch (err) {
            console.error(`Error fetching round ${i}:`, err);
          }
        }
      }
      
      setRecentRounds(recentRoundsData);
    } catch (err) {
      console.error("Failed to fetch latest round:", err);
    }
  };

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

  const getStatusClass = (status) => {
    switch (status) {
      case 0:
        return 'status-open';
      case 1:
        return 'status-closed';
      case 2:
        return 'status-finalized';
      default:
        return '';
    }
  };

  const formatAddress = (address) => {
    if (!address || address === '0x0000000000000000000000000000000000000000') return 'N/A';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatEth = (value) => {
    if (!value) return '0';
    // Convert Wei to ETH
    return (Number(value) / 1e18).toFixed(6);
  };

  const fetchRoundByIndex = async (roundNumberInput) => {
    // Make sure we have a valid input to work with
    let roundNumberStr;
    
    // Handle both direct values and potential React events
    if (roundNumberInput && roundNumberInput.target) {
      // This is likely a React event object, not what we want
      roundNumberStr = roundInput.toString();
    } else {
      // This should be a proper value (either direct number or from state)
      roundNumberStr = roundNumberInput ? roundNumberInput.toString() : roundInput.toString();
    }

    if (!isContractReady || !roundNumberStr || roundNumberStr === '') {
      return;
    }
  
    try {
      setIsLoading(true);
      setError(null);
      
      // Make an explicit string to avoid circular reference issues
      const roundNumberPrimitive = String(roundNumberStr);
      console.log('Fetching round with index:', roundNumberPrimitive);
      
      const data = await contractService.getLotteryRoundInfo(roundNumberPrimitive);
      console.log('Fetched round data:', data);

      const {
        roundNumber,
        totalPrizePool,
        participants,
        smallPrizeWinners,
        bigPrizeWinners,
        status,
        bigPrize,
        smallPrize,
        commission,
        totalTickets
      } = data;

      const numericStatus = Number(status);
      const totalPrize = Number(totalPrizePool);
      
      let calculatedCommission = commission;
      let calculatedSmallPrize = smallPrize;
      let calculatedBigPrize = bigPrize;
            
      if (numericStatus === 0 || numericStatus === 1) {
        const commissionRate = flexCommission ?? 10; // fallback if not loaded
        const prizePercentage = smallPrizePercentage ?? 20;

        calculatedCommission = (totalPrize * commissionRate) / 100;
        const prizePoolAfterCommission = totalPrize - calculatedCommission;
        calculatedSmallPrize = (prizePoolAfterCommission * prizePercentage) / 100;
        calculatedBigPrize = prizePoolAfterCommission - calculatedSmallPrize;
      }

      
      setRoundData({
        roundNumber: Number(roundNumber),
        totalPrizePool,
        participants,
        smallPrizeWinners,
        bigPrizeWinners,
        status: numericStatus,
        bigPrize: calculatedBigPrize,
        smallPrize: calculatedSmallPrize,
        commission: calculatedCommission,
        totalTickets
      });
      

      setIsModalOpen(true);
    } catch (err) {
      console.error("Error fetching round:", err);
      setError('Could not fetch round data. Make sure the round exists.');
      setRoundData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchRound = () => {
    if (!roundInput || roundInput === '') {
      setError('Please enter a valid round number');
      return;
    }
    fetchRoundByIndex(roundInput);
  };

  return (
    <div className="lottery-rounds-container">
      <div className="recent-rounds-section">
        {/* Header with title and search input in the same row */}
        <div className="rounds-header-container">
          <div className="rounds-header-left">
            <h3 className="recent-rounds-title">
              Recent Rounds
              {latestRound !== null && <span className="rounds-counter">#{latestRound} Current</span>}
            </h3>
          </div>
          
          <div className="rounds-header-right">
            <div className="rounds-search-bar">
              <div className="search-input-group">
                <input
                  type="number"
                  min="1"
                  max={latestRound ?? ''}
                  placeholder="Enter round number"
                  value={roundInput}
                  onChange={(e) => setRoundInput(e.target.value)}
                  className="round-input"
                  disabled={!isContractReady}
                />
                <button 
                  onClick={handleFetchRound} 
                  disabled={isLoading || !roundInput || !isContractReady}
                  className="search-button"
                >
                  {isLoading ? (
                    <>
                      <span className="loader"></span>
                      <span>Searching...</span>
                    </>
                  ) : (
                    <span>View Details</span>
                  )}
                </button>
              </div>
              {error && <div className="lottery-rounds-error">{error}</div>}
            </div>
          </div>
        </div>

        {/* Rounds grid */}
        {isContractReady && recentRounds.length > 0 ? (
          <div className="recent-rounds-grid">
            {recentRounds.map((round, index) => (
              <div 
                key={index} 
                className="recent-round-card"
                onClick={() => {
                  const roundStr = round.roundNumber.toString();
                  setRoundInput(roundStr);
                  fetchRoundByIndex(roundStr);
                }}                
              >
                <div className="round-number">Round #{round.roundNumber}</div>
                <div className={`round-status ${getStatusClass(round.status)}`}>
                  {getStatusText(round.status)}
                </div>
                <div className="round-prize">
                  <span className="prize-icon">🏆</span>
                  <span className="prize-value">{formatEth(round.totalPrizePool)} ETH</span>
                </div>
                <div className="round-tickets">
                  <span className="ticket-icon">🎫</span>
                  <span className="ticket-value">{round.totalTickets} Tickets</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="connect-wallet-message">
            {isContractReady ? 'Loading round data...' : 'Connect wallet to view recent rounds'}
          </div>
        )}
      </div>

      {isModalOpen && roundData && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Round #{roundData.roundNumber}</h2>
              <span className={`round-status ${getStatusClass(roundData.status)}`}>
                {getStatusText(roundData.status)}
              </span>
            </div>

            <div className="prize-info-section">
              <div className="prize-info-item main-prize">
                <div className="prize-label">Total Prize Pool</div>
                <div className="prize-value">{formatEth(roundData.totalPrizePool)} ETH</div>
              </div>
              
              <div className="prize-info-grid">
                <div className="prize-info-item">
                  <div className="prize-label">Big Prize</div>
                  <div className="prize-value">{formatEth(roundData.bigPrize)} ETH</div>
                </div>
                
                <div className="prize-info-item">
                  <div className="prize-label">Small Prize</div>
                  <div className="prize-value">{formatEth(roundData.smallPrize)} ETH</div>
                </div>
                
                <div className="prize-info-item">
                  <div className="prize-label">Commission</div>
                  <div className="prize-value">{formatEth(roundData.commission)} ETH</div>
                </div>
                
                <div className="prize-info-item">
                  <div className="prize-label">Total Tickets</div>
                  <div className="prize-value">{roundData.totalTickets}</div>
                </div>
              </div>
            </div>

            <div className="winners-participants-grid">
              <div className="winners-section">
                <h3>Winners</h3>
                
                <div className="winner-category">
                  <h4>Big Prize Winners</h4>
                  <div className="winners-list">
                    {roundData.bigPrizeWinners && roundData.bigPrizeWinners.length > 0 ? 
                      roundData.bigPrizeWinners.map((winner, index) => (
                        <div key={index} className="winner-item">
                          <span className="winner-icon">👑</span>
                          {formatAddress(winner)}
                        </div>
                      )) : 
                      <div className="no-winners">No winners yet</div>
                    }
                  </div>
                </div>
                
                <div className="winner-category">
                  <h4>Small Prize Winners</h4>
                  <div className="winners-list">
                    {roundData.smallPrizeWinners && roundData.smallPrizeWinners.length > 0 ? 
                      roundData.smallPrizeWinners.map((winner, index) => (
                        <div key={index} className="winner-item">
                          <span className="winner-icon">🥈</span>
                          {formatAddress(winner)}
                        </div>
                      )) : 
                      <div className="no-winners">No winners yet</div>
                    }
                  </div>
                </div>
              </div>

              <div className="participants-section">
                <h3>Participants</h3>
                <div className="participants-list">
                  {roundData.participants && roundData.participants.length > 0 ? 
                    roundData.participants.map((participant, index) => (
                      <div key={index} className="participant-item">
                        <span className="participant-icon">🎫</span>
                        {formatAddress(participant)}
                      </div>
                    )) : 
                    <div className="no-participants">No participants yet</div>
                  }
                </div>
              </div>
            </div>

            <button onClick={() => setIsModalOpen(false)} className="close-modal-button">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LotteryRounds;