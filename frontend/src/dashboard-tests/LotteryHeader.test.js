// LotteryHeader.test.js
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import LotteryHeader from '../Dashboard/LotteryHeader';

// Mock formatEth function
const mockFormatEth = (value) => {
  if (!value) return '0.00';
  // Convert wei to ETH and format to 2 decimal places
  const ethValue = parseFloat(value) / Math.pow(10, 18);
  return ethValue.toFixed(2);
};

// Mock the lottery context
jest.mock('../contexts/LotteryContext', () => ({
  useLottery: () => ({
    contractState: {
      isContractReady: true,
      currentRound: 3,
      ticketPrice: 0.1, // 0.1 ETH as a number
      isLotteryActive: true,
      blockStatus: {
        blocksUntilClose: 50,
        blocksUntilDraw: 100
      },
      currentPrizePool: '5000000000000000000', // 5 ETH
      totalTickets: 15,
      commission: 10,
      percentage_small: 15,
      percentage_mini: 5
    },
    uiState: {
      isLoading: {
        purchase: false,
        lotteryAction: false,
        claimPrize: false,
        checkPrize: false
      }
    },
    actions: {
      handlePurchase: jest.fn(),
      handleCloseLottery: jest.fn(),
      handleDrawWinner: jest.fn(),
      checkPendingPrize: jest.fn(),
      claimPrize: jest.fn()
    },
    pendingPrize: '0',
    formatEth: mockFormatEth
  })
}));

describe('LotteryHeader Component', () => {
  test('renders lottery header with correct information', () => {
    render(<LotteryHeader />);
    
    // Check for ticket price
    const ticketPriceElement = screen.getByText('TICKET PRICE').closest('.header-info-item');
    expect(ticketPriceElement).toHaveTextContent('0.10 ETH');
    
    // Check for prize pool
    const prizePoolElement = screen.getByText('PRIZE POOL').closest('.header-info-item');
    expect(prizePoolElement).toHaveTextContent('5.00 ETH');
    
    // Check for lottery status
    expect(screen.getByText('Open')).toBeInTheDocument();
    
    // Check for round number
    expect(screen.getByText('3')).toBeInTheDocument();
    
    // Check for total tickets
    expect(screen.getByText('15')).toBeInTheDocument();
    
    // Check for block status
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();

    // Check for buttons
    expect(screen.getByText('BUY TICKET')).toBeInTheDocument();
    expect(screen.getByText('CLOSE LOTTERY')).toBeInTheDocument();
    expect(screen.getByText('CHECK PRIZE')).toBeInTheDocument();
  });

  test('displays appropriate UI when contract is not ready', () => {
    // Override the mock temporarily for this test
    jest.spyOn(require('../contexts/LotteryContext'), 'useLottery').mockImplementation(() => ({
      contractState: {
        isContractReady: false,
        ticketPrice: 0, // 0 as a number
        isLotteryActive: false,
        blockStatus: {
          blocksUntilClose: 0,
          blocksUntilDraw: 0
        },
        currentPrizePool: '0',
        totalTickets: 0,
        currentRound: 0,
        commission: 0,
        percentage_small: 0,
        percentage_mini: 0
      },
      uiState: {
        isLoading: {
          purchase: false,
          lotteryAction: false,
          claimPrize: false,
          checkPrize: false
        }
      },
      actions: {
        handlePurchase: jest.fn(),
        handleCloseLottery: jest.fn(),
        handleDrawWinner: jest.fn(),
        checkPendingPrize: jest.fn(),
        claimPrize: jest.fn()
      },
      pendingPrize: '0',
      formatEth: mockFormatEth
    }));
    
    render(<LotteryHeader />);
    
    // Check for lottery status
    expect(screen.getByText('Closed')).toBeInTheDocument();
    
    // Check that prize pool shows 0.00 ETH
    const prizePoolElement = screen.getByText('PRIZE POOL').closest('.header-info-item');
    expect(prizePoolElement).toHaveTextContent('0.00 ETH');
    
    // Clean up the mock override
    jest.restoreAllMocks();
  });
});