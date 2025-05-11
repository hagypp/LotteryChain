import React from 'react';
import { useLottery } from '../contexts/LotteryContext';
import './Dashboard.css';

const LotteryHeader = () => {
  const { 
    contractState: { ticketPrice, isLotteryActive, blockStatus, currentPrizePool, totalTickets, currentRound ,commission,percentage },
    uiState: { isLoading },
    actions: { handlePurchase, handleCloseLottery, handleDrawWinner }
  } = useLottery();

  const formatEth = (value) => {
    if (!value) return '0';
    // Convert Wei to ETH
    return (Number(value) / 1e18).toFixed(6);
  };

  const calculatedCommission = (currentPrizePool * commission) / 100;
  const prizePoolAfterCommission = currentPrizePool - calculatedCommission;
  const calculatedSmallPrize = (prizePoolAfterCommission * percentage) / 100;
  const calculatedBigPrize = prizePoolAfterCommission - calculatedSmallPrize;


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
          <span className="header-info-label">LOTTERY ROUND</span>
          <span className="header-info-value">{currentRound}</span>
        </div>
      
        <div className="header-info-item">
          <span className="header-info-label">TICKET PRICE</span>
          <span className="header-info-value">{Number(ticketPrice).toFixed(6)} ETH</span>
          </div>
        
        <div className="header-info-item">
          <span className="header-info-label">TICKETS IN THE LOTTERY</span>
          <span className="header-info-value">{totalTickets}</span>
        </div>
      </div>


      <div className="header-info-row">

      <div className="header-info-item">
          <span className="header-info-label">PRIZE POLL</span>
          <span className="header-info-value">{formatEth(currentPrizePool)} ETH</span>
        </div>
  <div className="header-info-item">
    <span className="header-info-label">BIG PRIZE</span>
    <span className="header-info-value">{formatEth(calculatedBigPrize)} ETH</span>
  </div>
  <div className="header-info-item">
    <span className="header-info-label">SMALL PRIZE</span>
    <span className="header-info-value">{formatEth(calculatedSmallPrize)} ETH</span>
  </div>
  <div className="header-info-item">
    <span className="header-info-label">COMMISSION</span>
    <span className="header-info-value">{formatEth(calculatedCommission)} ETH</span>
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
        <div className="tooltip-wrapper">
          <button 
            onClick={handlePurchase} 
            disabled={isLoading.purchase}
            className="header-purchase-button"
          >
            {isLoading.purchase ? "Processing..." : "BUY TICKET"}
          </button>
          <span className="tooltip-text">
            Purchase a ticket for {Number(ticketPrice).toFixed(6)} ETH.<br/> 
            <span className="tooltip-highlight"><strong>Note :</strong> buy ticket will not guarantee participation in the lottery. </span><br/>
            <span className="tooltip-highlight"><strong>Note :</strong> if we reach 0 blocks until close this action may close the lottery. </span>
          </span>
        </div>

        <div className="tooltip-wrapper">
          <button 
            onClick={isLotteryActive ? handleCloseLottery : handleDrawWinner}
            disabled={isLoading.lotteryAction}
            className={`header-purchase-button ${isLotteryActive ? 'close-lottery' : 'draw-winner'}`}
          >
            {isLoading.lotteryAction ? "Processing..." : isLotteryActive ? "CLOSE LOTTERY" : "DRAW WINNER"}
          </button>
          <span className="tooltip-text">
            {isLotteryActive ? 
              'Close the current lottery round to stop ticket purchases.' : 
              'Draw the winner for the current lottery round.'}<br/>
            <span className="tooltip-highlight"><strong>Note : </strong> {isLotteryActive ? 
              'This action alow only when we reach 0 blocks until close.' : 
              'This action alow only when we reach 0 blocks until draw.'}</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default LotteryHeader;