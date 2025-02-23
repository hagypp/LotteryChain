import React, { useState, useEffect } from 'react';
import contractService from '../services/contractService';
import AdminDashboard from './AdminDashboard';
import LotteryRounds from './LotteryRounds';
import "./Dashboard.css";

const Dashboard = ({ account }) => {
    const [ticketPrice, setTicketPrice] = useState('0');
    const [status, setStatus] = useState('');
    const [isContractReady, setIsContractReady] = useState(false);
    const [isLoading, setIsLoading] = useState({});
    const [activeTickets, setActiveTickets] = useState([]);
    const [isOwner, setIsOwner] = useState(false);
   
   
    const [isLotteryActive, setIsLotteryActive] = useState(false);

    // Status mapping for ticket states
    const STATUS_MAP = {
        0: 'Active',
        1: 'In Lottery',
        2: 'Won',
        3: 'Expired'
    };

    const refreshDashboardData = async () => {
        try {
            // Get all data except isLotteryActive first
            const [
                price,
                tickets,
                owner
            ] = await Promise.all([
                contractService.getTicketPrice(),
                contractService.getPlayerTickets(account),
                contractService.getOwner()
            ]);

            // Set states from first batch of queries
            setTicketPrice(price.toString());
            setActiveTickets(tickets);
            setIsOwner(owner.toLowerCase() === account.toLowerCase());

            // Try to get isLotteryActive separately with error handling
            try {
                const lotteryActiveStatus = await contractService.isLotteryActive();
                setIsLotteryActive(lotteryActiveStatus);
            } catch (lotteryError) {
                console.warn("Could not determine lottery status:", lotteryError.message);
                setIsLotteryActive(false);
            }
        } catch (error) {
            setStatus(`Error refreshing dashboard data: ${error.message}`);
        }
    };

    useEffect(() => {
        const loadData = async () => {
            try {
                await contractService.init();
                setIsContractReady(true);
                await refreshDashboardData();
            } catch (error) {
                setStatus(`Error initializing contract: ${error.message}`);
            }
        };
        loadData();
    }, [account]);

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

    const handleSelectForLottery = async (ticketId) => {
        if (!isContractReady) {
            setStatus('Contract not initialized yet. Please try again later.');
            return;
        }
        try {
            setIsLoading(prev => ({ ...prev, [ticketId]: true }));
            setStatus('Entering ticket into lottery...');
            const result = await contractService.selectTicketsForLottery([ticketId]);
            if (result.success) {
           
                await refreshDashboardData();
                setStatus('Ticket entered into lottery successfully!');
            }
        } catch (error) {
            setStatus(`Failed to enter ticket into lottery: ${error.message}`);
        } finally {
            setIsLoading(prev => ({ ...prev, [ticketId]: false }));
        }
    };

    return (
        <div className="dashboard-container">
            {/* Admin Panel */}
            {isOwner && (
                <div className="dashboard-section admin-section">
                    <AdminDashboard onActionComplete={refreshDashboardData} />
                </div>
            )}

            {/* Statistics Section */}
            <div className="dashboard-section">
                <div className="stats-grid">
                    <div className="stat-card">
                        <h3 className="stat-title">Current Ticket Price</h3>
                        <p className="stat-value">{ticketPrice} ETH</p>
                    </div>
                    <div className="stat-card">
                        <h3 className="stat-title">Active Tickets</h3>
                        <p className="stat-value">{activeTickets.length}</p>
                    </div>
                    <div className="stat-card">
                        <p className="stat-value">{isLotteryActive ? 'Lottery Round Active' : 'No Active Lottery'}</p>
                    </div>
                </div>
            </div>

            {/* Tickets List */}
            <div className="dashboard-section">
                <div className="tickets-container">
                    <h3 className="tickets-header">
                        <span className="flex items-center gap-2">
                            Your Tickets
                        </span>
                        <button 
                            onClick={handlePurchase}
                            disabled={isLoading.purchase}
                            className="purchase-button flex items-center gap-2 justify-center"
                        >
                            {isLoading.purchase ? (
                                <>
                                    <span className="loading-indicator"></span>
                                    Processing...
                                </>
                            ) : (
                                <>
                                    Buy New Ticket
                                </>
                            )}
                        </button>
                    </h3>
                    <div className="tickets-list">
                        {activeTickets.length > 0 ? (
                            activeTickets.map((ticket, index) => (
                                <div key={ticket.id} className="ticket-item">
                                    <div className="ticket-info">
                                        <span className="ticket-number">Ticket #{ticket.id.toString()}</span>
                                        <span className="ticket-time">
                                            Purchased: {new Date(Number(ticket.creationTimestamp) * 1000).toLocaleString() || 'Loading...'}
                                        </span>
                                        <span className={`ticket-status ${
                                            STATUS_MAP[ticket.status]?.toLowerCase().replace(' ', '-')
                                        }`}>
                                            {STATUS_MAP[ticket.status]}
                                        </span>
                                        {Number(ticket.lotteryRound) > 0 && (
                                            <span className="ticket-round">
                                                Round: {ticket.lotteryRound.toString()}
                                            </span>
                                        )}
                                    </div>
                                    <button 
                                        onClick={() => handleSelectForLottery(ticket.id)}
                                        disabled={
                                            isLoading[ticket.id] || 
                                            Number(ticket.status) !== 0 || // Only ACTIVE tickets (status 0) can enter lottery
                                            !isLotteryActive
                                        }
                                        className="lottery-button"
                                    >
                                        {isLoading[ticket.id] ? (
                                            <>
                                                <span className="loading-indicator"></span>
                                                Processing...
                                            </>
                                        ) : !isLotteryActive ? (
                                            'No Active Lottery'
                                        ) : Number(ticket.status) === 0 ? (
                                            'Enter into Lottery'  // Changed this condition
                                        ) : (
                                            STATUS_MAP[ticket.status]  // Show the actual status
                                        )}
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="empty-state">
                                No active tickets found. Purchase a ticket to get started!
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Status Message */}
            {status && (
                <div className="status-message">
                    {status}
                </div>
            )}
             <LotteryRounds />
        </div>
        
    );

   
};

export default Dashboard;