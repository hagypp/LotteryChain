import React, { useState, useEffect, useCallback, useRef } from 'react';
import contractService from '../services/contractService';
import LotteryRounds from './LotteryRounds';
import SelectNumbers from './SelectNumbers';
import TicketsList from './TicketsList';
import WinnerAnnouncement from './WinnerAnnouncement';
import "./Dashboard.css";

// Utility function for conditional logging
const isDev = process.env.NODE_ENV === 'development';
const logDev = (message, data) => {
    if (isDev) {
        if (data) {
            console.log(message, data);
        } else {
            console.log(message);
        }
    }
};

const Dashboard = ({ account }) => {
    // Only log once when component actually mounts, not on re-renders
    const initialRenderRef = useRef(true);
    useEffect(() => {
        if (initialRenderRef.current) {
            logDev('🔍 Dashboard component mounted with account:', account);
            initialRenderRef.current = false;
        }
    }, [account]);
    
    // States - group related states
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
        isLoading: {}
    });
    
    // Consolidate isLoading state
    const setIsLoading = useCallback((key, value) => {
        setUiState(prev => ({
            ...prev,
            isLoading: {
                ...prev.isLoading,
                [key]: value
            }
        }));
    }, []);
    
    // Refs to track state without re-renders
    const initializationDoneRef = useRef(false);
    const listenerRegisteredRef = useRef(false);
    const initAttemptedRef = useRef(false);
    
    // Initialize contract and fetch data - COMBINED into one effect
    useEffect(() => {
        // Skip if already initialized or initialization was attempted
        if (initializationDoneRef.current || initAttemptedRef.current) {
            logDev('🔄 Skipping initialization - already done or attempted');
            return;
        }
        
        // Mark that we've attempted initialization
        initAttemptedRef.current = true;
        
        logDev('🚀 Starting contract initialization');
        
        const initialize = async () => {
            try {
                await contractService.init();
                logDev('✅ Contract initialized successfully');
                
                // Get initial data in parallel
                const [lotteryStatus, blockStatusData, price, tickets] = await Promise.all([
                    contractService.isLotteryActive(),
                    contractService.getLotteryBlockStatus(),
                    contractService.getTicketPrice(),
                    account ? contractService.getPlayerTickets(account) : []
                ]);
                
                logDev('✅ Initial data loaded:', {
                    lotteryStatus,
                    blockStatus: blockStatusData,
                    ticketPrice: price.toString(),
                    ticketsCount: tickets.length
                });
                
                // Set all contract state at once to reduce renders
                setContractState({
                    ticketPrice: price.toString(),
                    isLotteryActive: lotteryStatus,
                    isContractReady: true,
                    blockStatus: {
                        blocksUntilClose: blockStatusData.blocksUntilClose.toString(),
                        blocksUntilDraw: blockStatusData.blocksUntilDraw.toString()
                    }
                });
                
                setTickets(tickets);
                setUiState(prev => ({
                    ...prev,
                    status: `Lottery is ${lotteryStatus ? 'open' : 'closed'}`
                }));
                
                initializationDoneRef.current = true;
                
                // Set up event listeners immediately after initialization
                if (!listenerRegisteredRef.current) {
                    logDev('🔔 Registering event listeners');
                    
                    // Handle lottery status changes
                    const unsubscribeLotteryStatus = contractService.addLotteryStatusListener((isActive) => {
                        logDev('🎰 Lottery status changed to:', isActive);
                        setContractState(prev => ({
                            ...prev,
                            isLotteryActive: isActive
                        }));
                        setUiState(prev => ({
                            ...prev,
                            status: `Lottery is now ${isActive ? 'open' : 'closed'}`
                        }));
                    });
                    
                    // Handle block status changes
                    const unsubscribeBlockStatus = contractService.addBlockStatusListener((blocksUntilClose, blocksUntilDraw) => {
                        logDev('🧱 Block status changed:', { blocksUntilClose, blocksUntilDraw });
                        setContractState(prev => ({
                            ...prev,
                            blockStatus: {
                                blocksUntilClose,
                                blocksUntilDraw
                            }
                        }));
                    });
                    
                    // Cleanup function that will run when component unmounts
                    window.addEventListener('beforeunload', () => {
                        logDev('🧹 Cleaning up event listeners');
                        unsubscribeLotteryStatus();
                        unsubscribeBlockStatus();
                    });
                    
                    listenerRegisteredRef.current = true;
                }
            } catch (error) {
                console.error('❌ Error initializing contract:', error);
                setUiState(prev => ({
                    ...prev,
                    status: `Error initializing contract: ${error.message}`
                }));
            }
        };
        
        initialize();
    }, [account]); // Include account for initial data load when component mounts
    
    // Refresh data when account changes (but only after contract is ready)
    const refreshDashboardData = useCallback(async () => {
        if (!contractState.isContractReady || !account) {
            logDev('⚠️ Cannot refresh: contract ready =', contractState.isContractReady + ', account =' + !!account);
            return;
        }
        
        logDev('🔄 Refreshing dashboard data for account:', account);
        
        try {
            // Fetch data in parallel
            const [price, playerTickets, blockStatusData] = await Promise.all([
                contractService.getTicketPrice(),
                contractService.getPlayerTickets(account),
                contractService.getLotteryBlockStatus()
            ]);
            
            logDev('✅ Dashboard data refreshed:', {
                ticketPrice: price.toString(),
                ticketsCount: playerTickets.length,
                blockStatus: blockStatusData
            });
            
            // Update state in batch
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
            console.error('❌ Error refreshing dashboard data:', error);
            setUiState(prev => ({
                ...prev,
                status: `Error refreshing data: ${error.message}`
            }));
        }
    }, [account, contractState.isContractReady]);
    
    // Refreshes data when account changes or contract becomes ready
    useEffect(() => {
        if (contractState.isContractReady && account) {
            refreshDashboardData();
        }
    }, [contractState.isContractReady, account, refreshDashboardData]);
    
    // Action Handlers
    const handleDrawWinner = async () => {
        logDev('🏆 Drawing lottery winner');
        setIsLoading('lotteryAction', true);
        setUiState(prev => ({ ...prev, lotteryControlError: '', status: 'Drawing lottery winner...' }));
        
        try {
            await contractService.drawLotteryWinner();
            window.dispatchEvent(new CustomEvent('drawLotteryComplete'));
            await refreshDashboardData();
            setUiState(prev => ({ ...prev, status: 'Lottery winners have been drawn!' }));
        } catch (error) {
            console.error('❌ Error drawing winner:', error);
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
        logDev('🔒 Closing lottery round');
        setIsLoading('lotteryAction', true);
        setUiState(prev => ({ ...prev, lotteryControlError: '', status: 'Closing lottery round...' }));
        
        try {
            await contractService.closeLotteryRound();
            await refreshDashboardData();
            setUiState(prev => ({ ...prev, status: 'Lottery round closed successfully!' }));
        } catch (error) {
            console.error('❌ Error closing lottery:', error);
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
        logDev('💰 Purchasing ticket');
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
            console.error('❌ Purchase failed:', error);
            setUiState(prev => ({ ...prev, status: `Purchase failed: ${error.message}` }));
        } finally {
            setIsLoading('purchase', false);
        }
    };
    
    const handleSelectForLottery = async (ticketId) => {
        logDev('🎯 Selecting ticket for lottery:', ticketId);
        if (!contractState.isContractReady) {
            setUiState(prev => ({
                ...prev,
                status: 'Contract not initialized yet. Please try again later.'
            }));
            return;
        }
        
        setIsLoading(`ticket-${ticketId}`, true);
        setUiState(prev => ({
            ...prev,
            status: 'Entering ticket into lottery...',
            selectedTicketId: ticketId,
            isSelectingNumbers: true
        }));
        setIsLoading(`ticket-${ticketId}`, false);
    };
    
    // Log only meaningful state changes, not on every render
    const prevIsLotteryActive = useRef(contractState.isLotteryActive);
    useEffect(() => {
        if (prevIsLotteryActive.current !== contractState.isLotteryActive) {
            logDev('📊 Lottery status changed:', contractState.isLotteryActive);
            prevIsLotteryActive.current = contractState.isLotteryActive;
        }
    }, [contractState.isLotteryActive]);
    
    // Destructure for cleaner JSX
    const { ticketPrice, isLotteryActive, blockStatus } = contractState;
    const { status, isSelectingNumbers, selectedTicketId, ticketCategory, lotteryControlError, isLoading: loadingState } = uiState;
    
    return (
        <div className="dashboard-container">
            {/* Header Row */}
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
                
                {/* Block Status Section */}
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
                
                {/* Button Container */}
                <div className="button-container">
                    <button 
                        onClick={handlePurchase} 
                        disabled={loadingState.purchase}
                        className="header-purchase-button"
                    >
                        {loadingState.purchase ? "Processing..." : "BUY TICKET"}
                    </button>
                    
                    <button 
                        onClick={isLotteryActive ? handleCloseLottery : handleDrawWinner}
                        disabled={loadingState.lotteryAction}
                        className={`header-purchase-button ${isLotteryActive ? 'close-lottery' : 'draw-winner'}`}
                    >
                        {loadingState.lotteryAction ? "Processing..." : isLotteryActive ? "CLOSE LOTTERY" : "DRAW WINNER"}
                    </button>
                </div>
                
                {lotteryControlError && (
                    <div className={lotteryControlError.includes("successfully") ? "success-message" : "error-message"}>
                        {lotteryControlError}
                    </div>
                )}
            </div>
            
            <div className="dashboard-content-grid">
                <div className="dashboard-tickets-column">
                    <TicketsList 
                        tickets={tickets}
                        ticketCategory={ticketCategory}
                        setTicketCategory={(category) => setUiState(prev => ({ ...prev, ticketCategory: category }))}
                        isLoading={loadingState}
                        isLotteryActive={isLotteryActive}
                        handleSelectForLottery={handleSelectForLottery}
                    />
                </div>
                
                <div className="dashboard-lottery-column">
                    <LotteryRounds isContractReady={contractState.isContractReady} />
                </div>
            </div>

            {/* Status Message */}
            {status && (
                <div className="status-message">
                    {status}
                </div>
            )}

            {isSelectingNumbers && (
                <SelectNumbers 
                    onClose={() => setUiState(prev => ({ ...prev, isSelectingNumbers: false }))} 
                    account={account} 
                    ticketId={selectedTicketId} 
                    onTicketAdded={refreshDashboardData} 
                />
            )}

        <WinnerAnnouncement 
            account={account} 
            contractService={contractService} 
        />
        </div>
    );
};

export default Dashboard;