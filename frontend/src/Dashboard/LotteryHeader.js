import React from 'react';
import { useLottery } from '../contexts/LotteryContext';
import './Dashboard.css';

const LotteryHeader = () => {
  const { 
    contractState: { 
      ticketPrice, 
      isLotteryActive, 
      blockStatus, 
      currentPrizePool, 
      totalTickets, 
      currentRound,
      commission,
      percentage_small, 
      percentage_mini
    },
    uiState: { isLoading },
    actions: { 
      handlePurchase, 
      handleCloseLottery, 
      handleDrawWinner,
      checkPendingPrize,
      claimPrize
    },
    pendingPrize,
    formatEth
  } = useLottery();

  // Calculate prize distributions
  const calculatedCommission = (currentPrizePool * commission) / 100;
  const prizePoolAfterCommission = currentPrizePool - calculatedCommission;
  const calculatedMiniPrize = (prizePoolAfterCommission * percentage_mini) / 100;
  const calculatedSmallPrize = (prizePoolAfterCommission * percentage_small) / 100;
  const calculatedBigPrize = prizePoolAfterCommission - calculatedSmallPrize - calculatedMiniPrize;

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
          <span className="header-info-value">{Number(ticketPrice).toFixed(2)} ETH</span>
        </div>
        
        <div className="header-info-item">
          <span className="header-info-label">TICKETS IN THE LOTTERY</span>
          <span className="header-info-value">{totalTickets}</span>
        </div>
      </div>

<div className="header-info-row">
        <div className="tooltip-wrapper">
          <div className="header-info-item">
            <span className="header-info-label">PRIZE POOL</span>
            <span className="header-info-value">{formatEth(currentPrizePool)} ETH</span>
          </div>
          <span className="tooltip-text">
            Total ETH collected from ticket for this lottery round.
          </span>
        </div>
        <div className="tooltip-wrapper">
          <div className="header-info-item">
            <span className="header-info-label">BIG PRIZE</span>
            <span className="header-info-value">{formatEth(calculatedBigPrize)} ETH</span>
          </div>
          <span className="tooltip-text">
            guess 6 numbers and the strong number to win the prize
          </span>
        </div>
        <div className="tooltip-wrapper">
          <div className="header-info-item">
            <span className="header-info-label">SMALL PRIZE</span>
            <span className="header-info-value">{formatEth(calculatedSmallPrize)} ETH</span>
          </div>
          <span className="tooltip-text">
            guess 6 numbers to win the prize
          </span>
        </div>
        <div className="tooltip-wrapper">
          <div className="header-info-item">
            <span className="header-info-label">MINI PRIZE</span>
            <span className="header-info-value">{formatEth(calculatedMiniPrize)} ETH</span>
          </div>
          <span className="tooltip-text">
            distributed among non-winners tickets using a softmax function, favoring earlier ticket purchases
          </span>
        </div>
        <div className="tooltip-wrapper">
          <div className="header-info-item">
            <span className="header-info-label">COMMISSION</span>
            <span className="header-info-value">{formatEth(calculatedCommission)} ETH</span>
          </div>
          <span className="tooltip-text">
            deducted for the smart contract owner to fund lottery operations
          </span>
        </div>
      </div>
      
      
      <div className="block-status-consolidated">
        <div className="block-status-header">
          <span className="header-info-label" style={{textAlign: 'center', display: 'block', marginBottom: '0.75rem', fontSize: '1.25rem'}}>
            BLOCK STATUS
          </span>
        </div>
        <div className="block-status-content">
          <div className="tooltip-wrapper">
            <div className="block-metric">
              <span className="block-metric-label">BLOCKS UNTIL CLOSE LOTTERY</span>
              <span className={`block-metric-value ${blockStatus.blocksUntilClose === '0' ? 'green-text' : 'red-text'}`}>
          {blockStatus.blocksUntilClose}
              </span>
            </div>
            <span className="tooltip-text">
              Number of blockchain blocks remaining until the lottery can be closed, reaching 0 allows to close the lottery.
            </span>
          </div>
          <div className="tooltip-wrapper">
            <div className="block-metric">
              <span className="block-metric-label">BLOCKS UNTIL LOTTERY WINNER</span>
              <span className={`block-metric-value ${blockStatus.blocksUntilDraw === '0' ? 'green-text' : 'red-text'}`}>
                {blockStatus.blocksUntilDraw}
              </span>
            </div>
            <span className="tooltip-text">
              Number of blockchain blocks remaining until the winner can be drawn, reaching 0 allows to draw lottery winner.
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
            Purchase a ticket for {Number(ticketPrice).toFixed(2)} ETH.<br/> 
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

        <div className="tooltip-wrapper">
          {Number(pendingPrize) > 0 ? (
            <button 
              onClick={claimPrize}
              disabled={isLoading.claimPrize}
              className="header-claim-button"
            >
              {isLoading.claimPrize ? "Claiming..." : `CLAIM ${formatEth(pendingPrize)} ETH`}
            </button>
          ) : (
            <button 
              onClick={checkPendingPrize}
              disabled={isLoading.checkPrize}
              className="header-claim-button"
            >
              {isLoading.checkPrize ? "Checking..." : "CHECK PRIZE"}
            </button>
          )}
          <span className="tooltip-text">
            {Number(pendingPrize) > 0 ? 
              'Claim your prize from the current lottery round.' : 
              'Check if you have any unclaimed prize.'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default LotteryHeader;