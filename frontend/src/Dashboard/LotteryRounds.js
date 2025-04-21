import React, { useState } from 'react';
import contractService from '../services/contractService';
import './LotteryRounds.css';

const LotteryRounds = ({ isContractReady }) => {
  const [roundInput, setRoundInput] = useState('');
  const [roundData, setRoundData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const fetchRoundByIndex = async () => {
    if (!isContractReady || roundInput === '') return;

    try {
      setIsLoading(true);
      setError(null);

      const data = await contractService.getLotteryRoundInfo(roundInput);
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

      setRoundData({
        roundNumber: Number(roundNumber),
        totalPrizePool,
        participants,
        smallPrizeWinners,
        bigPrizeWinners,
        status: Number(status),
        bigPrize,
        smallPrize,
        commission,
        totalTickets
      });

      setIsModalOpen(true); // ✅ Open modal
    } catch (err) {
      console.error(err);
      setError('Could not fetch round data. Make sure the round exists.');
      setRoundData(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="main">
      <div className="lottery-rounds-container">
        <h2 className="title">Get Lottery Round Info</h2>

        <div className="lottery-rounds-controls">
          <input
            type="number"
            min="0"
            placeholder="Enter round number"
            value={roundInput}
            onChange={(e) => setRoundInput(e.target.value)}
          />
          <button onClick={fetchRoundByIndex} disabled={isLoading || !roundInput}>
            {isLoading ? 'Loading...' : 'Fetch Round'}
          </button>
        </div>

        {error && <div className="lottery-rounds-error">{error}</div>}

        {isModalOpen && roundData && (
          <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>Round #{roundData.roundNumber} Details</h2>
              <p><strong>Status:</strong> {getStatusText(roundData.status)}</p>
              <p><strong>Total Prize Pool:</strong> {roundData.totalPrizePool} Wei</p>
              <p><strong>Big Prize:</strong> {roundData.bigPrize}</p>
              <p><strong>Small Prize:</strong> {roundData.smallPrize}</p>
              <p><strong>Commission:</strong> {roundData.commission}</p>
              <p><strong>Total Tickets:</strong> {roundData.totalTickets}</p>
              <p><strong>Participants:</strong> {roundData.participants.join(', ') || 'N/A'}</p>
              <p><strong>Small Prize Winners:</strong> {roundData.smallPrizeWinners.join(', ') || 'N/A'}</p>
              <p><strong>Big Prize Winners:</strong> {roundData.bigPrizeWinners.join(', ') || 'N/A'}</p>
              <button onClick={() => setIsModalOpen(false)}>Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LotteryRounds;
