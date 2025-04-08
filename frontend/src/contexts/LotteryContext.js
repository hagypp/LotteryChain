import React, { createContext, useState, useEffect, useCallback, useRef, useContext } from 'react';
import contractService from '../services/contractService';

// Create context
const LotteryContext = createContext(null);

// Custom hook to use the context
export const useLottery = () => {
  const context = useContext(LotteryContext);
  if (!context) {
    throw new Error('useLottery must be used within a LotteryProvider');
  }
  return context;
};

// Provider component
export const LotteryProvider = ({ children, account }) => {
  // Contract state
  const [contractState, setContractState] = useState({
    ticketPrice: '0',
    isLotteryActive: false,
    isContractReady: false,
    blockStatus: {
      blocksUntilClose: 'unknown',
      blocksUntilDraw: 'unknown'
    }
  });
  
  const [tickets, setTickets] = useState([]);
  const [uiState, setUiState] = useState({
    status: '',
    isSelectingNumbers: false,
    selectedTicketId: null,
    ticketCategory: 'all',
    lotteryControlError: '',
    isLoading: {
      purchase: false,
      lotteryAction: false
      // Ticket-specific loading states will be added dynamically
    }
  });
  
  // Refs to track initialization
  const initializationDoneRef = useRef(false);
  const listenerRegisteredRef = useRef(false);
  const initAttemptedRef = useRef(false);
  
  // Set loading state
  const setIsLoading = useCallback((key, value) => {
    setUiState(prev => ({
      ...prev,
      isLoading: {
        ...prev.isLoading,
        [key]: value
      }
    }));
  }, []);
  
  // Initialize contract
  useEffect(() => {
    if (initializationDoneRef.current || initAttemptedRef.current) {
      return;
    }
    
    initAttemptedRef.current = true;
    
    const initialize = async () => {
      try {
        await contractService.init();
        
        // Get initial data in parallel
        const [lotteryStatus, blockStatusData, price, userTickets] = await Promise.all([
          contractService.isLotteryActive(),
          contractService.getLotteryBlockStatus(),
          contractService.getTicketPrice(),
          account ? contractService.getPlayerTickets(account) : []
        ]);
        
        setContractState({
          ticketPrice: price.toString(),
          isLotteryActive: lotteryStatus,
          isContractReady: true,
          blockStatus: {
            blocksUntilClose: blockStatusData.blocksUntilClose.toString(),
            blocksUntilDraw: blockStatusData.blocksUntilDraw.toString()
          }
        });
        
        setTickets(userTickets);
        setUiState(prev => ({
          ...prev,
          status: `Lottery is ${lotteryStatus ? 'open' : 'closed'}`
        }));
        
        initializationDoneRef.current = true;
        
        // Set up event listeners
        if (!listenerRegisteredRef.current) {
          const unsubscribeLotteryStatus = contractService.addLotteryStatusListener((isActive) => {
            setContractState(prev => ({
              ...prev,
              isLotteryActive: isActive
            }));
            setUiState(prev => ({
              ...prev,
              status: `Lottery is now ${isActive ? 'open' : 'closed'}`
            }));
          });
          
          const unsubscribeBlockStatus = contractService.addBlockStatusListener((blocksUntilClose, blocksUntilDraw) => {
            setContractState(prev => ({
              ...prev,
              blockStatus: {
                blocksUntilClose,
                blocksUntilDraw
              }
            }));
          });
          
          window.addEventListener('beforeunload', () => {
            unsubscribeLotteryStatus();
            unsubscribeBlockStatus();
          });
          
          listenerRegisteredRef.current = true;
        }
      } catch (error) {
        console.error('Error initializing contract:', error);
        setUiState(prev => ({
          ...prev,
          status: `Error initializing contract: ${error.message}`
        }));
      }
    };
    
    initialize();
  }, [account]);
  
  // Refresh dashboard data
  const refreshDashboardData = useCallback(async () => {
    if (!contractState.isContractReady || !account) {
      return;
    }
    
    try {
      const [price, playerTickets, blockStatusData] = await Promise.all([
        contractService.getTicketPrice(),
        contractService.getPlayerTickets(account),
        contractService.getLotteryBlockStatus()
      ]);
      
      setContractState(prev => ({
        ...prev,
        ticketPrice: price.toString(),
        blockStatus: {
          blocksUntilClose: blockStatusData.blocksUntilClose.toString(),
          blocksUntilDraw: blockStatusData.blocksUntilDraw.toString()
        }
      }));
      
      setTickets(playerTickets);
    } catch (error) {
      console.error('Error refreshing dashboard data:', error);
      setUiState(prev => ({
        ...prev,
        status: `Error refreshing data: ${error.message}`
      }));
    }
  }, [account, contractState.isContractReady]);
  
  // Auto-refresh when account changes
  useEffect(() => {
    if (contractState.isContractReady && account) {
      refreshDashboardData();
    }
  }, [contractState.isContractReady, account, refreshDashboardData]);
  
  // Lottery action handlers
  const handleDrawWinner = async () => {
    setIsLoading('lotteryAction', true);
    setUiState(prev => ({ ...prev, lotteryControlError: '', status: 'Drawing lottery winner...' }));
    
    try {
      const result = await contractService.drawLotteryWinner();
      
      if (!result.success) {
        setUiState(prev => ({
          ...prev,
          lotteryControlError: result.message,
          status: result.message
        }));
        return;
      }
      
      await refreshDashboardData();
      setUiState(prev => ({ ...prev, status: 'Lottery winners have been drawn!' }));
      window.dispatchEvent(new CustomEvent('drawLotteryComplete'));
    } catch (error) {
      console.error('Error drawing winner:', error);
      setUiState(prev => ({
        ...prev,
        lotteryControlError: `Failed to draw winner: ${error.message}`,
        status: `Error drawing winner: ${error.message}`
      }));
    } finally {
      setIsLoading('lotteryAction', false);
    }
  };
  
  const handleCloseLottery = async () => {
    setIsLoading('lotteryAction', true);
    setUiState(prev => ({ ...prev, lotteryControlError: '', status: 'Closing lottery round...' }));
    
    try {
      const result = await contractService.closeLotteryRound();
      
      if (!result.success) {
        setUiState(prev => ({
          ...prev,
          lotteryControlError: result.message,
          status: result.message
        }));
        return;
      }
      
      await refreshDashboardData();
      setUiState(prev => ({ ...prev, status: 'Lottery round closed successfully!' }));
    } catch (error) {
      console.error('Error closing lottery:', error);
      setUiState(prev => ({
        ...prev,
        lotteryControlError: `Failed to close lottery: ${error.message}`,
        status: `Error closing lottery: ${error.message}`
      }));
    } finally {
      setIsLoading('lotteryAction', false);
    }
  };
  
  const handlePurchase = async () => {
    if (!contractState.isContractReady) {
      setUiState(prev => ({
        ...prev,
        status: 'Contract not initialized yet. Please try again later.'
      }));
      return;
    }
    
    setIsLoading('purchase', true);
    setUiState(prev => ({ ...prev, status: 'Purchasing ticket...' }));
    
    try {
      const purchaseResult = await contractService.purchaseTicket();
      
      if (purchaseResult.success) {
        await refreshDashboardData();
        setUiState(prev => ({ ...prev, status: 'Ticket purchased successfully!' }));
      }
    } catch (error) {
      console.error('Purchase failed:', error);
      setUiState(prev => ({ ...prev, status: `Purchase failed: ${error.message}` }));
    } finally {
      setIsLoading('purchase', false);
    }
  };
  
  const handleSelectForLottery = async (ticketId) => {
    if (!contractState.isContractReady) {
      setUiState(prev => ({
        ...prev,
        status: 'Contract not initialized yet. Please try again later.'
      }));
      return;
    }
    
    const ticketKey = `ticket-${ticketId}`;
    setIsLoading(ticketKey, true);
    setUiState(prev => ({
      ...prev,
      status: 'Entering ticket into lottery...',
      selectedTicketId: ticketId,
      isSelectingNumbers: true
    }));
    setIsLoading(ticketKey, false);
  };
  
  const closeSelectNumbers = () => {
    setUiState(prev => ({ ...prev, isSelectingNumbers: false }));
  };
  
  const setTicketCategory = (category) => {
    setUiState(prev => ({ ...prev, ticketCategory: category }));
  };
  
  // Value to provide to consumers
  const value = {
    contractState: {
      ticketPrice: contractState.ticketPrice,
      isLotteryActive: contractState.isLotteryActive,
      isContractReady: contractState.isContractReady,
      blockStatus: contractState.blockStatus
    },
    tickets,
    uiState: {
      status: uiState.status,
      isSelectingNumbers: uiState.isSelectingNumbers,
      selectedTicketId: uiState.selectedTicketId,
      ticketCategory: uiState.ticketCategory,
      lotteryControlError: uiState.lotteryControlError,
      isLoading: uiState.isLoading
    },
    actions: {
      handleDrawWinner,
      handleCloseLottery,
      handlePurchase,
      handleSelectForLottery,
      refreshDashboardData,
      closeSelectNumbers,
      setTicketCategory
    }
  };
  
  return <LotteryContext.Provider value={value}>{children}</LotteryContext.Provider>;
};