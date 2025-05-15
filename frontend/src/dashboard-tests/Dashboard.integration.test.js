// Dashboard integration test
import React from 'react';
import { render, screen } from '@testing-library/react';
import Dashboard from '../Dashboard/Dashboard';
import { LotteryProvider } from '../contexts/LotteryContext';

// Mock the context to avoid actual blockchain interactions
jest.mock('../contexts/LotteryContext', () => {
  const originalModule = jest.requireActual('../contexts/LotteryContext');
  
  return {
    ...originalModule,
    LotteryProvider: ({ children }) => <div data-testid="lottery-provider">{children}</div>,
    useLottery: () => ({
      contractState: {
        isLotteryActive: true,
        isContractReady: true,
        ticketPrice: '10000000000000000',
        blockStatus: { blocksUntilClose: 10, blocksUntilDraw: 20 },
        currentPrizePool: '1000000000000000000',
        totalTickets: 5,
        currentRound: 1
      },
      tickets: [
        { id: 1, status: 0, creationTimestamp: (Date.now() / 1000).toString(), lotteryRound: 0 }
      ],
      uiState: {
        isSelectingNumbers: false,
        selectedTicketId: null,
        ticketCategory: 'all',
        isLoading: {}
      },
      actions: {
        handleSelectForLottery: jest.fn(),
        refreshDashboardData: jest.fn(),
        closeSelectNumbers: jest.fn(),
        setTicketCategory: jest.fn(),
        handlePurchase: jest.fn(),
        handleCloseLottery: jest.fn(),
        handleDrawWinner: jest.fn()
      }
    })
  };
});

// Mock child components
jest.mock('../Dashboard/LotteryHeader', () => () => <div data-testid="lottery-header">Lottery Header</div>);
jest.mock('../Dashboard/HardLottoGame', () => () => <div data-testid="hard-lotto-game">Hard Lotto Game</div>);
jest.mock('../Dashboard/WinnerAnnouncement', () => () => <div data-testid="winner-announcement">Winner Announcement</div>);
jest.mock('../Dashboard/Notifications', () => () => <div data-testid="notifications">Notifications</div>);

describe('Dashboard Component', () => {
  test('renders all child components correctly', () => {
    render(<Dashboard account="0x123456" />);
    
    // Check that LotteryProvider wrapper is present
    expect(screen.getByTestId('lottery-provider')).toBeInTheDocument();
    
    // Check that all child components are rendered
    expect(screen.getByTestId('lottery-header')).toBeInTheDocument();
    expect(screen.getByTestId('hard-lotto-game')).toBeInTheDocument();
    expect(screen.getByTestId('winner-announcement')).toBeInTheDocument();
    expect(screen.getByTestId('notifications')).toBeInTheDocument();
  });
});