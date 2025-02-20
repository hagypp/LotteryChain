import React, { useState, useEffect } from 'react';
import contractService from '../services/contractService';
import AdminDashboard from './AdminDashboard';
import "./Dashboard.css";

const Dashboard = ({ account }) => {
    const [ticketPrice, setTicketPrice] = useState('0');
    const [status, setStatus] = useState('');
    const [isContractReady, setIsContractReady] = useState(false);
    const [isLoading, setIsLoading] = useState({});
    const [activeTickets, setActiveTickets] = useState([]);
    const [isOwner, setIsOwner] = useState(false);
    const [ticketStatuses, setTicketStatuses] = useState({});
    const [ticketPurchaseTimes, setTicketPurchaseTimes] = useState({});
    const [isLotteryActive, setIsLotteryActive] = useState(false);


const refreshDashboardData = async () => {
    try {
        // Get all data except isLotteryActive first
        const [
            price,
            tickets,
            owner
        ] = await Promise.all([
            contractService.getTicketPrice(),
            contractService.getActiveTickets(account),  // Pass account here
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

        // Get ticket purchase times - make sure to pass the account
        const purchaseTimes = {};
        for (const ticket of tickets) {
            try {
                const purchaseTime = await contractService.getTicketPurchaseTime(ticket, account);  // Pass account here
                purchaseTimes[ticket] = new Date(Number(purchaseTime) * 1000).toLocaleString();
            } catch (timeError) {
                console.warn(`Could not get purchase time for ticket ${ticket}:`, timeError.message);
                purchaseTimes[ticket] = 'Unknown';
            }
        }
        setTicketPurchaseTimes(purchaseTimes);

        // Initialize ticket statuses
        const statuses = {};
        tickets.forEach(ticket => {
            statuses[ticket] = 'Active';
        });
        setTicketStatuses(statuses);
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
                setTicketStatuses(prev => ({
                    ...prev,
                    [ticketId]: 'In Lottery'
                }));
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
                                <div key={index} className="ticket-item">
                                    <div className="ticket-info">
                                        <span className="ticket-number">Ticket {ticket}</span>
                                        <span className="ticket-time">Purchased: {ticketPurchaseTimes[ticket] || 'Loading...'}</span>
                                        <span className={`ticket-status ${
                                            ticketStatuses[ticket]?.toLowerCase().replace(' ', '-')
                                        }`}>
                                            {ticketStatuses[ticket]}
                                        </span>
                                    </div>
                                    <button 
                                        onClick={() => handleSelectForLottery(ticket)}
                                        disabled={isLoading[ticket] || ticketStatuses[ticket] === 'In Lottery' || !isLotteryActive}
                                        className="lottery-button"
                                    >
                                        {isLoading[ticket] ? (
                                            <>
                                                <span className="loading-indicator"></span>
                                                Processing...
                                            </>
                                        ) : !isLotteryActive ? 'No Active Lottery' : 'Enter into Lottery'}
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
        </div>
    );
};

export default Dashboard;