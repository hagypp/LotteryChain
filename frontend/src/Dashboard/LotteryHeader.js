import React from 'react';
import { useLottery } from '../contexts/LotteryContext';

const LotteryHeader = () => {
  const { 
    contractState: { ticketPrice, isLotteryActive, blockStatus },
    tickets,
    uiState: { isLoading },
    actions: { handlePurchase, handleCloseLottery, handleDrawWinner }
  } = useLottery();

  return (
    <div className="dashboard-header-row">
      <div className="header-info-container">
        <div className="header-info-item">
          <span className="header-info-label">LOTTERY STATUS</span>
          <span className={`header-info-value ${isLotteryActive ? 'lottery-active' : 'lottery-inactive'}`}>
            {isLotteryActive ? 'Open' : 'Closed'}
          </span>
        </div>
        
        <div className="header-info-item">
          <span className="header-info-label">TICKET PRICE</span>
          <span className="header-info-value">{ticketPrice} ETH</span>
        </div>
        
        <div className="header-info-item">
          <span className="header-info-label">ACTIVE TICKETS</span>
          <span className="header-info-value">{tickets.length}</span>
        </div>
      </div>
      
      <div className="block-status-consolidated">
        <div className="block-status-header">
          <span className="header-info-label" style={{textAlign: 'center', display: 'block', marginBottom: '0.75rem'}}>
            BLOCK STATUS
          </span>
        </div>
        <div className="block-status-content">
          <div className="block-metric">
            <span className="block-metric-label">UNTIL BLOCKS CLOSE</span>
            <span className="block-metric-value">
              {blockStatus.blocksUntilClose}
            </span>
          </div>
          <div className="block-metric">
            <span className="block-metric-label">UNTIL LOTTERY WINNER</span>
            <span className="block-metric-value">
              {blockStatus.blocksUntilDraw}
            </span>
          </div>
        </div>
      </div>
      
      <div className="button-container">
        <button 
          onClick={handlePurchase} 
          disabled={isLoading.purchase}
          className="header-purchase-button"
        >
          {isLoading.purchase ? "Processing..." : "BUY TICKET"}
        </button>
        
        <button 
          onClick={isLotteryActive ? handleCloseLottery : handleDrawWinner}
          disabled={isLoading.lotteryAction}
          className={`header-purchase-button ${isLotteryActive ? 'close-lottery' : 'draw-winner'}`}
        >
          {isLoading.lotteryAction ? "Processing..." : isLotteryActive ? "CLOSE LOTTERY" : "DRAW WINNER"}
        </button>
      </div>
    </div>
  );
};

export default LotteryHeader;