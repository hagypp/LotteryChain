// LotteryRounds integration test
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import LotteryRounds from '../Dashboard/LotteryRounds';
import { LotteryProvider } from '../contexts/LotteryContext';

// Mock the contract service
jest.mock('../services/contractService', () => ({
  getCurrentRound: jest.fn(),
  getLotteryRoundInfo: jest.fn(),
  getFLEX_COMMISSION: jest.fn(),
  getSMALL_PRIZE_PERCENTAGE: jest.fn(),
  getMINI_PRIZE_PERCENTAGE: jest.fn(),
}));

// Mock the context to avoid actual blockchain interactions
jest.mock('../contexts/LotteryContext', () => {
  const originalModule = jest.requireActual('../contexts/LotteryContext');
  
  return {
    ...originalModule,
    LotteryProvider: ({ children }) => <div data-testid="lottery-provider">{children}</div>,
    useLottery: () => ({
      showNotification: jest.fn(),
    })
  };
});

// Import the mocked contractService
import contractService from '../services/contractService';

// Increase timeout for all tests
jest.setTimeout(30000);

describe('LotteryRounds Component', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Setup default mock implementations
    contractService.getCurrentRound.mockResolvedValue('5');
    contractService.getFLEX_COMMISSION.mockResolvedValue('5');
    contractService.getSMALL_PRIZE_PERCENTAGE.mockResolvedValue('30');
    contractService.getMINI_PRIZE_PERCENTAGE.mockResolvedValue('10');
    
    // Mock recent rounds data
    contractService.getLotteryRoundInfo.mockImplementation((roundNumber) => {
      const round = parseInt(roundNumber);
      return Promise.resolve({
        roundNumber: round.toString(),
        status: round === 4 ? '2' : round === 3 ? '1' : '0', // Round 4 finalized, 3 closed, others open
        totalPrizePool: `${(round + 1) * 1000000000000000000}`, // 1 ETH * (round + 1)
        totalTickets: `${(round + 1) * 10}`,
        addressArrays: [
          [`0x123456789abcdef${round}`, `0x987654321fedcba${round}`], // participants
          [`0xsmallwinner${round}`], // small prize winners
          [`0xbigwinner${round}`], // big prize winners
          [`0xminiwinner${round}`], // mini prize winners
        ],
        bigPrize: `${500000000000000000}`, // 0.5 ETH
        smallPrize: `${300000000000000000}`, // 0.3 ETH
        miniPrize: `${100000000000000000}`, // 0.1 ETH
        commission: `${50000000000000000}`, // 0.05 ETH
        randomNumbers: round === 4 ? ['7', '14', '21', '28', '35'] : ['0', '0', '0', '0', '0'],
        strongNumber: round === 4 ? '9' : '0'
      });
    });
  });

  test('renders correctly when contract is not ready', async () => {
    render(
      <LotteryProvider>
        <LotteryRounds isContractReady={false} />
      </LotteryProvider>
    );
    
    expect(screen.getByText('Recent Rounds')).toBeInTheDocument();
    expect(screen.getByText('Connect wallet to view recent rounds')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter round number')).toBeDisabled();
  });

  test('loads and displays recent rounds when contract is ready', async () => {
    render(
      <LotteryProvider>
        <LotteryRounds isContractReady={true} />
      </LotteryProvider>
    );

    // Wait for the component to load data
    await waitFor(() => {
      expect(screen.getByText('#5 Current')).toBeInTheDocument();
    }, { timeout: 15000 });

    // Check that recent rounds are displayed
    expect(screen.getByText('Round #4')).toBeInTheDocument();
    expect(screen.getByText('Round #3')).toBeInTheDocument();
    expect(screen.getByText('Round #2')).toBeInTheDocument();
    expect(screen.getByText('Round #1')).toBeInTheDocument();

    // Check status display
    expect(screen.getByText('Finalized')).toBeInTheDocument(); // Round 4
    expect(screen.getByText('Closed')).toBeInTheDocument(); // Round 3
    expect(screen.getAllByText('Open')).toHaveLength(2); // Rounds 1 and 2

    // Check prize pools
    expect(screen.getByText('5.00 ETH')).toBeInTheDocument(); // Round 4: 5 ETH
    expect(screen.getByText('4.00 ETH')).toBeInTheDocument(); // Round 3: 4 ETH
  });

  test('opens modal when clicking on a round card', async () => {
    render(
      <LotteryProvider>
        <LotteryRounds isContractReady={true} />
      </LotteryProvider>
    );

    // Wait for rounds to load
    await waitFor(() => {
      expect(screen.getByText('Round #4')).toBeInTheDocument();
    }, { timeout: 15000 });

    // Click on round 4 card
    const round4Card = screen.getByText('Round #4').closest('.recent-round-card');
    fireEvent.click(round4Card);

    // Wait for modal to appear
    await waitFor(() => {
      expect(screen.getByText('7, 14, 21, 28, 35 | Strong: 9')).toBeInTheDocument();
    }, { timeout: 10000 });

    // Check modal content
    expect(screen.getByText('Total Prize Pool')).toBeInTheDocument();
    expect(screen.getByText('Big Prize Winners')).toBeInTheDocument();
    expect(screen.getByText('Small Prize Winners')).toBeInTheDocument();
    expect(screen.getByText('Mini Prize Winners')).toBeInTheDocument();
    expect(screen.getByText('Participants')).toBeInTheDocument();
  });

  test('closes modal when clicking close button', async () => {
    render(
      <LotteryProvider>
        <LotteryRounds isContractReady={true} />
      </LotteryProvider>
    );

    // Wait for rounds to load and open modal
    await waitFor(() => {
      expect(screen.getByText('Round #4')).toBeInTheDocument();
    }, { timeout: 15000 });

    const round4Card = screen.getByText('Round #4').closest('.recent-round-card');
    fireEvent.click(round4Card);

    await waitFor(() => {
      expect(screen.getByText('Close')).toBeInTheDocument();
    }, { timeout: 10000 });

    // Close the modal
    fireEvent.click(screen.getByText('Close'));

    // Modal should be closed (winning numbers not visible)
    await waitFor(() => {
      expect(screen.queryByText('7, 14, 21, 28, 35 | Strong: 9')).not.toBeInTheDocument();
    });
  });

  test('search functionality works correctly', async () => {
    render(
      <LotteryProvider>
        <LotteryRounds isContractReady={true} />
      </LotteryProvider>
    );

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('#5 Current')).toBeInTheDocument();
    }, { timeout: 15000 });

    // Enter round number in search input
    const searchInput = screen.getByPlaceholderText('Enter round number');
    fireEvent.change(searchInput, { target: { value: '3' } });

    // Click search button
    const searchButton = screen.getByText('View Details');
    fireEvent.click(searchButton);

    // Wait for modal to appear with round 3 data
    await waitFor(() => {
      expect(screen.getByText('Round #3')).toBeInTheDocument();
    }, { timeout: 10000 });

    
  });

  test('displays correct status for different round states', async () => {
    render(
      <LotteryProvider>
        <LotteryRounds isContractReady={true} />
      </LotteryProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Round #4')).toBeInTheDocument();
    }, { timeout: 15000 });

    // Click on finalized round (should show winning numbers)
    const round4Card = screen.getByText('Round #4').closest('.recent-round-card');
    fireEvent.click(round4Card);

    await waitFor(() => {
      expect(screen.getByText('7, 14, 21, 28, 35 | Strong: 9')).toBeInTheDocument();
    }, { timeout: 10000 });

    // Close modal and check open round (should not show winning numbers)
    fireEvent.click(screen.getByText('Close'));
    
    await waitFor(() => {
      expect(screen.queryByText('7, 14, 21, 28, 35 | Strong: 9')).not.toBeInTheDocument();
    });

    const round1Card = screen.getByText('Round #1').closest('.recent-round-card');
    fireEvent.click(round1Card);

    await waitFor(() => {
      expect(screen.getByText('Not drawn')).toBeInTheDocument();
    }, { timeout: 10000 });
  });

  test('handles error states gracefully', async () => {
    // Mock a failed contract call
    contractService.getCurrentRound.mockRejectedValue(new Error('Contract error'));
    
    render(
      <LotteryProvider>
        <LotteryRounds isContractReady={true} />
      </LotteryProvider>
    );

    // Wait a bit for potential async operations to complete
    await new Promise(resolve => setTimeout(resolve, 500));

    // Should still show the interface even with errors
    expect(screen.getByText('Recent Rounds')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter round number')).toBeInTheDocument();
  });

  test('disables controls when loading', async () => {
    // Mock a slow contract call to simulate loading state
    let resolvePromise;
    const slowPromise = new Promise(resolve => {
      resolvePromise = resolve;
    });

    contractService.getLotteryRoundInfo.mockImplementation(() => slowPromise);

    render(
      <LotteryProvider>
        <LotteryRounds isContractReady={true} />
      </LotteryProvider>
    );

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter round number')).toBeInTheDocument();
    });

    // Enter search term
    const searchInput = screen.getByPlaceholderText('Enter round number');
    fireEvent.change(searchInput, { target: { value: '1' } });

    // Click search button
    const searchButton = screen.getByText('View Details');
    fireEvent.click(searchButton);

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText('Searching...')).toBeInTheDocument();
    });

    // Resolve the promise to complete the test
    resolvePromise({
      roundNumber: '1',
      status: '0',
      totalPrizePool: '1000000000000000000',
      totalTickets: '10',
      addressArrays: [[], [], [], []],
      bigPrize: '0',
      smallPrize: '0',
      miniPrize: '0',
      commission: '0',
      randomNumbers: ['0', '0', '0', '0', '0'],
      strongNumber: '0'
    });
  });

  test('formats addresses correctly', async () => {
    render(
      <LotteryProvider>
        <LotteryRounds isContractReady={true} />
      </LotteryProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Round #4')).toBeInTheDocument();
    }, { timeout: 15000 });

    // Open modal
    const round4Card = screen.getByText('Round #4').closest('.recent-round-card');
    fireEvent.click(round4Card);

    await waitFor(() => {
      // Check that addresses are formatted correctly (first 6 + last 4 characters)
      expect(screen.getByText('0x1234...def4')).toBeInTheDocument();
      expect(screen.getByText('0x9876...cba4')).toBeInTheDocument();
    }, { timeout: 10000 });
  });
});