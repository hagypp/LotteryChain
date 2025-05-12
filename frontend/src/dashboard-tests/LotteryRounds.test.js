// LotteryRounds.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom'; // Import the jest-dom matchers
import LotteryRounds from '../Dashboard/LotteryRounds';

// Make sure the path to your contractService is correct
jest.mock('../services/contractService', () => ({
  getLotteryRoundInfo: jest.fn(async (roundNumber) => {
    if (roundNumber === '999') {
      throw new Error('Round not found');
    }
    
    // Return mock data for different rounds
    if (roundNumber === '5') {
      return {
        roundNumber: 5,
        totalPrizePool: '5000000000000000000',
        participants: ['0x123...', '0x456...'],
        smallPrizeWinners: ['0xabc...'],
        bigPrizeWinners: ['0xdef...'],
        status: 2, // Finalized
        bigPrize: '3500000000000000000',
        smallPrize: '1000000000000000000',
        commission: '500000000000000000',
        totalTickets: 25
      };
    }
    
    if (roundNumber === '1') {
      return {
        roundNumber: 1,
        totalPrizePool: '1000000000000000000',
        participants: ['0x123...'],
        smallPrizeWinners: [],
        bigPrizeWinners: [],
        status: 1, // Closed
        bigPrize: '700000000000000000',
        smallPrize: '200000000000000000',
        commission: '100000000000000000',
        totalTickets: 5
      };
    }
    
    if (roundNumber === '2') {
      return {
        roundNumber: 2,
        totalPrizePool: '2000000000000000000',
        participants: ['0x123...', '0x456...'],
        smallPrizeWinners: ['0xabc...'],
        bigPrizeWinners: ['0xdef...'],
        status: 2, // Finalized
        bigPrize: '1400000000000000000',
        smallPrize: '400000000000000000',
        commission: '200000000000000000',
        totalTickets: 10
      };
    }
    
    // Default data for round 3 (current)
    return {
      roundNumber: 3,
      totalPrizePool: '3000000000000000000',
      participants: ['0x123...', '0x456...', '0x789...'],
      smallPrizeWinners: [],
      bigPrizeWinners: [],
      status: 0, // Open
      bigPrize: '2100000000000000000',
      smallPrize: '600000000000000000',
      commission: '300000000000000000',
      totalTickets: 15
    };
  }),
  getCurrentRound: jest.fn(async () => 3),
  getFLEX_COMMISSION: jest.fn(async () => 10),
  getSMALL_PRIZE_PERCENTAGE: jest.fn(async () => 20)
}));

// Setup test utils with async mock rendering
const renderWithInitialize = async (component) => {
  const result = render(component);
  
  // Wait for useEffect to complete without relying on specific text
  // This handles potential race conditions better
  await waitFor(() => {
    // Check for either loading text or loaded content
    const hasLoadingText = screen.queryByText('Loading round data...') !== null;
    const hasLoadedContent = screen.queryByText('#3 Current') !== null;
    expect(hasLoadingText || hasLoadedContent).toBe(true);
  });
  
  // Wait for data to be loaded
  await waitFor(() => {
    expect(screen.getByText('#3 Current')).toBeInTheDocument();
  }, { timeout: 3000 });
  
  return result;
};

describe('LotteryRounds Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('fetches and displays recent rounds when contract is ready', async () => {
    await renderWithInitialize(<LotteryRounds isContractReady={true} />);
    
    // Check round cards after async operations
    const roundCards = screen.getAllByText(/Round #/);
    expect(roundCards.length).toBeGreaterThan(0);
    
    // Check if the current round counter is displayed
    expect(screen.getByText('#3 Current')).toBeInTheDocument();
    
    // Check prize pools and ticket counts (values should be in the DOM)
    expect(screen.getAllByText(/ETH/)).toHaveLength(roundCards.length);
    expect(screen.getAllByText(/Tickets/)).toHaveLength(roundCards.length);
  });
  
  test('allows searching for a specific round', async () => {
    await renderWithInitialize(<LotteryRounds isContractReady={true} />);
    
    // Enter a round number in the search input
    const input = screen.getByPlaceholderText('Enter round number');
    fireEvent.change(input, { target: { value: '5' } });
    
    // Click the search button
    const searchButton = screen.getByText('View Details');
    fireEvent.click(searchButton);
    
    // Wait for modal to open
    await waitFor(() => {
      expect(screen.getByText(/Round #5/)).toBeInTheDocument();
    });
    
    // Check modal content
    expect(screen.getByText('Total Prize Pool')).toBeInTheDocument();
    
    // Check for prize values
    const prizeValues = screen.getAllByText(/ETH/);
    expect(prizeValues.length).toBeGreaterThan(0);
    
    // Check for the total tickets value
    expect(screen.getByText('25')).toBeInTheDocument();
    
    // Close the modal
    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);
    
    // Check that the modal has been closed
    await waitFor(() => {
      expect(screen.queryByText('Total Prize Pool')).not.toBeInTheDocument();
    });
  });
  
  test('clicking on a recent round card opens its details', async () => {
    await renderWithInitialize(<LotteryRounds isContractReady={true} />);
    
    // Click on a round card (use queryAllByText to avoid failures)
    const roundCards = screen.getAllByText(/Round #/);
    expect(roundCards.length).toBeGreaterThan(0);
    fireEvent.click(roundCards[0]);
    
    // Wait for modal to open
    await waitFor(() => {
      expect(screen.getByText('Total Prize Pool')).toBeInTheDocument();
    });
    
    // Check that modal content is displayed
    const prizeValues = screen.getAllByText(/ETH/);
    expect(prizeValues.length).toBeGreaterThan(0);
    
    // Close the modal
    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);
  });
  
  test('shows error when searching for a non-existent round', async () => {
    await renderWithInitialize(<LotteryRounds isContractReady={true} />);
    
    // Enter a non-existent round number
    const input = screen.getByPlaceholderText('Enter round number');
    fireEvent.change(input, { target: { value: '999' } });
    
    // Click the search button
    const searchButton = screen.getByText('View Details');
    fireEvent.click(searchButton);
    
    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/Could not fetch round data/)).toBeInTheDocument();
    });
  });
});