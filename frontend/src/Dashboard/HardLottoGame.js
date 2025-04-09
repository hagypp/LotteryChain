import React from 'react';
import LotteryRounds from './LotteryRounds';
import TicketsList from './TicketsList';
import SelectNumbers from './SelectNumbers';
import { useLottery } from '../contexts/LotteryContext';

const HardLottoGame = ({ account }) => {
  const {
    contractState: { isLotteryActive, isContractReady },
    tickets,
    uiState: { 
      isSelectingNumbers, 
      selectedTicketId, 
      ticketCategory,
      isLoading  
    },
    actions: { 
      handleSelectForLottery, 
      refreshDashboardData, 
      closeSelectNumbers, 
      setTicketCategory 
    }
  } = useLottery();

  return (
    <div className="lotto-game-container">
      <div className="dashboard-content-grid">
        <div className="dashboard-tickets-column">
          <TicketsList 
            tickets={tickets}
            ticketCategory={ticketCategory}
            setTicketCategory={setTicketCategory}
            isLotteryActive={isLotteryActive}
            handleSelectForLottery={handleSelectForLottery}
            isLoading={isLoading} 
          />
        </div>
        
        <div className="dashboard-lottery-column">
          <LotteryRounds isContractReady={isContractReady} />
        </div>
      </div>

      {isSelectingNumbers && (
        <SelectNumbers 
          onClose={() => closeSelectNumbers()} 
          account={account} 
          ticketId={selectedTicketId} 
          onTicketAdded={refreshDashboardData} 
        />
      )}
    </div>
  );
};

export default HardLottoGame;