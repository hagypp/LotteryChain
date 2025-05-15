// TicketsList.test.js
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import TicketsList from '../Dashboard/TicketsList';

// No need to mock the useLottery hook, we're passing props directly to the component
describe('TicketsList Component', () => {
  // Sample data for testing
  const mockTickets = [
    { id: 1, status: 0, creationTimestamp: (Date.now() / 1000).toString(), lotteryRound: 0 }, // Active
    { id: 2, status: 1, creationTimestamp: (Date.now() / 1000).toString(), lotteryRound: 1 }, // In Lottery
    { id: 3, status: 2, creationTimestamp: (Date.now() / 1000).toString(), lotteryRound: 1 }, // USED
    { id: 4, status: 3, creationTimestamp: (Date.now() / 1000).toString(), lotteryRound: 1 }, // WON_SMALL_PRIZE
    { id: 5, status: 4, creationTimestamp: (Date.now() / 1000).toString(), lotteryRound: 1 }, // WON_BIG_PRIZE
  ];
  
  const mockHandleSelectForLottery = jest.fn();
  const mockSetTicketCategory = jest.fn();
  
  // Default props for rendering the component
  const defaultProps = {
    tickets: mockTickets,
    ticketCategory: 'all',
    setTicketCategory: mockSetTicketCategory,
    isLoading: {},
    isLotteryActive: true,
    handleSelectForLottery: mockHandleSelectForLottery
  };

  beforeEach(() => {
    // Reset mocks before each test
    mockHandleSelectForLottery.mockReset();
    mockSetTicketCategory.mockReset();
  });

  test('renders tickets list correctly', () => {
    render(<TicketsList {...defaultProps} />);
    
    // Check if all tickets are rendered
    expect(screen.getByText('Ticket #1')).toBeInTheDocument();
    expect(screen.getByText('Ticket #2')).toBeInTheDocument();
    expect(screen.getByText('Ticket #3')).toBeInTheDocument();
    expect(screen.getByText('Ticket #4')).toBeInTheDocument();
    expect(screen.getByText('Ticket #5')).toBeInTheDocument();
    
    // Check different ticket statuses using more specific selectors
    // We need to specify which element contains the text to avoid ambiguity
    
    // Find all status spans - which have the ticket-status class
    const statusElements = screen.getAllByText(/Active|In Lottery|USED|WON_SMALL_PRIZE|WON_BIG_PRIZE/, 
      { selector: '.ticket-status' });
    
    // Check that we have 5 status elements (one for each ticket)
    expect(statusElements).toHaveLength(5);
    
    // Check that the status elements contain the expected text
    expect(statusElements[0]).toHaveTextContent('Active');
    expect(statusElements[1]).toHaveTextContent('In Lottery');
    expect(statusElements[2]).toHaveTextContent('USED');
    expect(statusElements[3]).toHaveTextContent('WON_SMALL_PRIZE');
    expect(statusElements[4]).toHaveTextContent('WON_BIG_PRIZE');
  });

  test('clicking on a filter changes the ticket category', () => {
    render(<TicketsList {...defaultProps} />);
    
    // Click on different category tabs - be more specific with selectors to avoid ambiguity
    const allTab = screen.getByText('All Tickets');
    fireEvent.click(allTab);
    expect(mockSetTicketCategory).toHaveBeenCalledWith('all');
    
    // Find tab buttons specifically to avoid conflicts with status text
    const tabs = screen.getAllByRole('button');
    const activeTab = tabs.find(tab => tab.textContent === 'Active');
    fireEvent.click(activeTab);
    expect(mockSetTicketCategory).toHaveBeenCalledWith('active');
    
    const inLotteryTab = tabs.find(tab => tab.textContent === 'In Lottery');
    fireEvent.click(inLotteryTab);
    expect(mockSetTicketCategory).toHaveBeenCalledWith('inLottery');
  });

  test('clicking Enter into Lottery button triggers handleSelectForLottery', () => {
    render(<TicketsList {...defaultProps} />);
    
    // Find and click the "Enter into Lottery" button for ticket #1
    const enterButton = screen.getByText('Enter into Lottery');
    fireEvent.click(enterButton);
    
    // Check if the function was called with the correct ticket ID
    expect(mockHandleSelectForLottery).toHaveBeenCalledWith(1);
  });
});