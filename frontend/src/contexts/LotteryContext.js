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
    },
    currentPrizePool: '0',
    totalTickets: '0' ,
    currentRound: '0',
    commission: '0',
    percentage_small: '0',
    percentage_mini: '0'
  });
  
  const [tickets, setTickets] = useState([]);
  const [uiState, setUiState] = useState({
    isSelectingNumbers: false,
    selectedTicketId: null,
    ticketCategory: 'all',
    isLoading: {
      purchase: false,
      lotteryAction: false
      // Ticket-specific loading states will be added dynamically
    }
  });
  
  // New notification state
  const [notification, setNotification] = useState(null);
  
  // Reference to store timeout ID for auto-clearing notifications
  const notificationTimeoutRef = useRef(null);
  
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
  
  // Notification management with auto-clearing
  const showNotification = useCallback((message, type = 'info', duration = 5000) => {
    // Clear any existing timeout to prevent race conditions
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
      notificationTimeoutRef.current = null;
    }
    
    // Set the new notification
    setNotification({ message, type });
    
    // Set up auto-clearing timeout
    if (duration > 0) {
      notificationTimeoutRef.current = setTimeout(() => {
        setNotification(null);
        notificationTimeoutRef.current = null;
      }, duration);
    }
  }, []);
  
  const clearNotification = useCallback(() => {
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
      notificationTimeoutRef.current = null;
    }
    setNotification(null);
  }, []);
  
  // Clean up notification timeout on unmount
  useEffect(() => {
    return () => {
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
    };
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
        const [lotteryStatus, blockStatusData, price, userTickets, currentPrizePool, totalTickets, currentRound, commission, percentage_small, percentage_mini] = await Promise.all([
          contractService.isLotteryActive(),
          contractService.getLotteryBlockStatus(),
          contractService.getTicketPrice(),
          account ? contractService.getPlayerTickets(account) : [],
          contractService.getCurrentPrizePool(),
          contractService.getCurrentTotalTickets(),
          contractService.getCurrentRound(),
          contractService.getFLEX_COMMISSION(),
          contractService.getSMALL_PRIZE_PERCENTAGE(),
          contractService.getMINI_PRIZE_PERCENTAGE()
        ]);
        setContractState({
          ticketPrice: price.toString(),
          isLotteryActive: lotteryStatus,
          isContractReady: true,
          blockStatus: {
            blocksUntilClose: blockStatusData.blocksUntilClose.toString(),
            blocksUntilDraw: blockStatusData.blocksUntilDraw.toString()
          },
          currentPrizePool: currentPrizePool.toString(),
          totalTickets: totalTickets.toString(),
          currentRound: currentRound.toString(),
          commission: commission.toString(),
          percentage_small: percentage_small.toString(),
          percentage_mini: percentage_mini.toString()
        });
        
        setTickets(userTickets);
        showNotification(`Lottery is ${lotteryStatus ? 'open' : 'closed'}`, 'info');
        
        initializationDoneRef.current = true;
        
// Set up event listeners
        if (!listenerRegisteredRef.current) {
          const unsubscribeLotteryStatus = contractService.addLotteryStatusListener((isActive) => {
            setContractState(prev => ({
              ...prev,
              isLotteryActive: isActive
            }));
            showNotification(`Lottery is now ${isActive ? 'open' : 'closed'}`, 'info');
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
          
          // Add ticket entered listener
          const unsubscribeTicketEntered = contractService.addTicketEnteredListener(({ roundNumber, totalTickets, prizePool }) => {
            setContractState(prev => ({
              ...prev,
              totalTickets: totalTickets,
              currentPrizePool: prizePool,
              currentRound: roundNumber
            }));
            //showNotification(`New ticket entered! Total tickets: ${totalTickets}`, 'info');
          });
          
          window.addEventListener('beforeunload', () => {
            unsubscribeLotteryStatus();
            unsubscribeBlockStatus();
            unsubscribeTicketEntered();
          });
          
          listenerRegisteredRef.current = true;
        }
      } catch (error) {
        console.error('Error initializing contract:', error);
        showNotification(`Error initializing contract: ${error.message}`, 'error');
      }
    };
    
    initialize();
  }, [account, showNotification]);
  
  // Refresh dashboard data
  const refreshDashboardData = useCallback(async () => {
    if (!contractState.isContractReady || !account) {
      return;
    }
    
    try {
      const [price, playerTickets, blockStatusData, currentPrizePool, totalTickets, currentRound, commission, percentage_small, percentage_mini] = await Promise.all([
        contractService.getTicketPrice(),
        contractService.getPlayerTickets(account),
        contractService.getLotteryBlockStatus(),
        contractService.getCurrentPrizePool(),
        contractService.getCurrentTotalTickets(),
        contractService.getCurrentRound(),
        contractService.getFLEX_COMMISSION(),
        contractService.getSMALL_PRIZE_PERCENTAGE(),
        contractService.getMINI_PRIZE_PERCENTAGE()
      ]);
      setContractState(prev => ({
        ...prev,
        ticketPrice: price.toString(),
        blockStatus: {
          blocksUntilClose: blockStatusData.blocksUntilClose.toString(),
          blocksUntilDraw: blockStatusData.blocksUntilDraw.toString()
        },
        currentPrizePool: currentPrizePool.toString(),
        totalTickets: totalTickets.toString(),
        currentRound: currentRound.toString(),
        commission: commission.toString(),
        percentage_small: percentage_small.toString(),
        percentage_mini: percentage_mini.toString()
      }));
      
      setTickets(playerTickets);
    } catch (error) {
      console.error('Error refreshing dashboard data:', error);
      showNotification(`Error refreshing data: ${error.message}`, 'error');
    }
  }, [account, contractState.isContractReady, showNotification]);
  
  // Auto-refresh when account changes
  useEffect(() => {
    if (contractState.isContractReady && account) {
      refreshDashboardData();
    }
  }, [contractState.isContractReady, account, refreshDashboardData]);
  
  // Lottery action handlers
  const handleDrawWinner = async () => {
    setIsLoading('lotteryAction', true);
    showNotification('Drawing lottery winner...', 'info');
    
    try {
      const result = await contractService.drawLotteryWinner();
      
      if (!result.success) {
        showNotification(result.message, 'error');
        return;
      }
      
      await refreshDashboardData();
      showNotification('Lottery winners have been drawn!', 'success');
      window.dispatchEvent(new CustomEvent('drawLotteryComplete'));
    } catch (error) {
      console.error('Error drawing winner:', error);
      showNotification(`Failed to draw winner: ${error.message}`, 'error');
    } finally {
      setIsLoading('lotteryAction', false);
    }
  };
  
  const handleCloseLottery = async () => {
    setIsLoading('lotteryAction', true);
    showNotification('Closing lottery round...', 'info');
    
    try {
      const result = await contractService.closeLotteryRound();
      
      if (!result.success) {
        showNotification(result.message, 'error');
        return;
      }
      
      await refreshDashboardData();
      showNotification('Lottery round closed successfully!', 'success');
    } catch (error) {
      console.error('Error closing lottery:', error);
      showNotification(`Failed to close lottery: ${error.message}`, 'error');
    } finally {
      setIsLoading('lotteryAction', false);
    }
  };
  
  const handlePurchase = async () => {
    if (!contractState.isContractReady) {
      showNotification('Contract not initialized yet. Please try again later.', 'warning');
      return;
    }
    
    setIsLoading('purchase', true);
    showNotification('Purchasing ticket...', 'info');
    
    try {
      const purchaseResult = await contractService.purchaseTicket();
      
      if (purchaseResult.success) {
        await refreshDashboardData();
        showNotification('Ticket purchased successfully!', 'success');
      }
    } catch (error) {
      console.error('Purchase failed:', error);
      showNotification(`Purchase failed: ${error.message}`, 'error');
    } finally {
      setIsLoading('purchase', false);
    }
  };
  
  const handleSelectForLottery = async (ticketId) => {
    if (!contractState.isContractReady) {
      showNotification('Contract not initialized yet. Please try again later.', 'warning');
      return;
    }
    
    const ticketKey = `ticket-${ticketId}`;
    setIsLoading(ticketKey, true);
    setUiState(prev => ({
      ...prev,
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
      blockStatus: contractState.blockStatus,
      currentPrizePool: contractState.currentPrizePool,
      totalTickets: contractState.totalTickets,
      currentRound: contractState.currentRound,
      commission: contractState.commission,
      percentage_small: contractState.percentage_small,
      percentage_mini: contractState.percentage_mini
    },
    tickets,
    uiState: {
      isSelectingNumbers: uiState.isSelectingNumbers,
      selectedTicketId: uiState.selectedTicketId,
      ticketCategory: uiState.ticketCategory,
      isLoading: uiState.isLoading
    },
    notification,
    account,
    actions: {
      handleDrawWinner,
      handleCloseLottery,
      handlePurchase,
      handleSelectForLottery,
      refreshDashboardData,
      closeSelectNumbers,
      setTicketCategory
    },
    showNotification,
    clearNotification
  };
  
  return <LotteryContext.Provider value={value}>{children}</LotteryContext.Provider>;
};