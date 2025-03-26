import React, { useState, useEffect, useCallback, useRef } from 'react';
import contractService from '../services/contractService';
import LotteryRounds from './LotteryRounds';
import SelectNumbers from './SelectNumbers';
import TicketsList from './TicketsList';
import "./Dashboard.css";

const Dashboard = ({ account }) => {
    const [ticketPrice, setTicketPrice] = useState('0');
    const [status, setStatus] = useState('');
    const [isContractReady, setIsContractReady] = useState(false);
    const [isLoading, setIsLoading] = useState({});
    const [activeTickets, setActiveTickets] = useState([]);
    const [isSelectingNumbers, setIsSelectingNumbers] = useState(false);
    const [selectedTicketId, setSelectedTicketId] = useState(null);
    const [isLotteryActive, setIsLotteryActive] = useState(false);
    const [ticketCategory, setTicketCategory] = useState('active');
    const [lotteryControlError, setLotteryControlError] = useState('');
    const [isLotteryActionLoading, setIsLotteryActionLoading] = useState(false);
    
    // Use a ref to track the current lottery status to prevent redundant updates
    const lotteryStatusRef = useRef(false);
    
    // Block status state
    const [blockStatus, setBlockStatus] = useState({
        blocksUntilClose: 'unknown',
        blocksUntilDraw: 'unknown'
    });

    // Status mapping for ticket states
    const STATUS_MAP = {
        0: 'Active',
        1: 'In Lottery',
        2: 'Won'
    };

    // Single source of truth for refreshing dashboard data
    const refreshDashboardData = useCallback(async () => {
        // Skip if contract not ready
        if (!isContractReady) {
            return;
        }
        
        try {
            const [
                price,
                tickets,
                blockStatusData
            ] = await Promise.all([
                contractService.getTicketPrice(),
                contractService.getPlayerTickets(account),
                contractService.getLotteryBlockStatus()
            ]);

            setTicketPrice(price.toString());
            setActiveTickets(tickets);
            setBlockStatus({
                blocksUntilClose: blockStatusData.blocksUntilClose.toString(),
                blocksUntilDraw: blockStatusData.blocksUntilDraw.toString()
            });
        } catch (error) {
            setStatus(`Error refreshing dashboard data: ${error.message}`);
        }
    }, [account, isContractReady]);

    // Pure lottery status handler - only updates UI, doesn't trigger refreshes
    const handleLotteryStatusChange = useCallback((isActive) => {
        // Skip if no change in status
        if (isActive === lotteryStatusRef.current) return;
        lotteryStatusRef.current = isActive;
        setIsLotteryActive(isActive);
        setStatus(`Lottery is now ${isActive ? 'open' : 'closed'}`);
    }, []);
    
    // Handler for block status updates
    const handleBlockStatusChange = useCallback((blocksUntilClose, blocksUntilDraw) => {
        setBlockStatus({
            blocksUntilClose,
            blocksUntilDraw
        });
    }, []);

    // Initial contract setup and listener registration
    useEffect(() => {
        const initialize = async () => {
            try {
                await contractService.init();
                setIsContractReady(true);
                
                // Turn off any automatic polling in contractService
                if (typeof contractService.stopLotteryStatusPolling === 'function') {
                    contractService.stopLotteryStatusPolling();
                }
                
                // Get initial lottery status only once
                const status = await contractService.isLotteryActive();
                lotteryStatusRef.current = status;
                setIsLotteryActive(status);
                
                // Get initial block status
                const blockStatusData = await contractService.getLotteryBlockStatus();
                setBlockStatus({
                    blocksUntilClose: blockStatusData.blocksUntilClose.toString(),
                    blocksUntilDraw: blockStatusData.blocksUntilDraw.toString()
                });
                
                // Register listeners after initialization
                const unsubscribeLotteryStatus = contractService.addLotteryStatusListener(handleLotteryStatusChange);
                const unsubscribeBlockStatus = contractService.addBlockStatusListener(handleBlockStatusChange);
                
                return () => {
                    unsubscribeLotteryStatus();
                    unsubscribeBlockStatus();
                };
            } catch (error) {
                setStatus(`Error initializing contract: ${error.message}`);
            }
        };
        
        initialize();
    }, [handleBlockStatusChange, handleLotteryStatusChange]);

    // Only refresh data once when contract becomes ready or account changes
    useEffect(() => {
        if (isContractReady && account) {
            refreshDashboardData();
        }
    }, [isContractReady, account, refreshDashboardData]);
    
    // Draw winner handler
    const handleDrawWinner = async () => {
        setIsLotteryActionLoading(true);
        setLotteryControlError('');
        try {
            await contractService.drawLotteryWinner();
            // Manually refresh data after successful action
            await refreshDashboardData();
            setStatus('Lottery winner drawn successfully!');
        } catch (error) {
            setLotteryControlError(`Failed to draw winner: ${error.message}`);
            console.error("Failed to draw lottery winner:", error);
        } finally {
            setIsLotteryActionLoading(false);
        }
    };

    const handleCloseLottery = async () => {
        setIsLotteryActionLoading(true);
        setLotteryControlError('');
        try {
            await contractService.closeLotteryRound();
            // Manually refresh data after successful action
            await refreshDashboardData();
        } catch (error) {
            setLotteryControlError(`Failed to close lottery: ${error.message}`);
        } finally {
            setIsLotteryActionLoading(false);
        }
    };

    const handlePurchase = async () => {
        if (!isContractReady) {
            setStatus('Contract not initialized yet. Please try again later.');
            return;
        }
        try {
            setIsLoading(prev => ({ ...prev, purchase: true }));
            setStatus('Purchasing ticket...');
            const purchaseResult = await contractService.purchaseTicket();

            if (purchaseResult.success) {
                await refreshDashboardData();
                setStatus('Ticket purchased successfully!');
            }
        } catch (error) {
            setStatus(`Purchase failed: ${error.message}`);
        } finally {
            setIsLoading(prev => ({ ...prev, purchase: false }));
        }
    };

    const handleTicketAdded = async () => {
        await refreshDashboardData();
    };
    
    const handleSelectForLottery = async (ticketId) => {
        if (!isContractReady) {
            setStatus('Contract not initialized yet. Please try again later.');
            return;
        }
        try {
            setIsLoading(prev => ({ ...prev, [ticketId]: true }));
            setStatus('Entering ticket into lottery...');
            setSelectedTicketId(ticketId);
            setIsSelectingNumbers(true);
        } catch (error) {
            setStatus(`Failed to enter ticket into lottery: ${error.message}`);
        } finally {
            setIsLoading(prev => ({ ...prev, [ticketId]: false }));
        }
    };

    return (
        <div className="dashboard-container">
            {/* Updated Header Row with more consistent sizing */}
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
                        <span className="header-info-value">{activeTickets.length}</span>
                    </div>
                </div>
                
                {/* Block Status Section without refresh button */}
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
                
                {/* Button Container with consistent sizing */}
                <div className="button-container">
                    <button 
                        onClick={handlePurchase} 
                        disabled={isLoading.purchase}
                        className="header-purchase-button"
                    >
                        {isLoading.purchase ? "Processing..." : "BUY TICKET"}
                    </button>
                    
                    <button 
                        onClick={isLotteryActive ? handleCloseLottery : handleDrawWinner}
                        disabled={isLotteryActionLoading}
                        className={`header-purchase-button ${isLotteryActive ? 'close-lottery' : 'draw-winner'}`}
                    >
                        {isLotteryActionLoading ? "Processing..." : isLotteryActive ? "CLOSE LOTTERY" : "DRAW WINNER"}
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
                        tickets={activeTickets}
                        ticketCategory={ticketCategory}
                        setTicketCategory={setTicketCategory}
                        STATUS_MAP={STATUS_MAP}
                        isLoading={isLoading}
                        isLotteryActive={isLotteryActive}
                        handleSelectForLottery={handleSelectForLottery}
                    />
                </div>
                
                <div className="dashboard-lottery-column">
                    <LotteryRounds />
                </div>
            </div>

            {/* Status Message */}
            {status && (
                <div className="status-message">
                    {status}
                </div>
            )}

            {isSelectingNumbers && <SelectNumbers 
                onClose={() => setIsSelectingNumbers(false)} 
                account={account} 
                ticketId={selectedTicketId} 
                onTicketAdded={handleTicketAdded} 
            />}
        </div>
    );
};

export default Dashboard;