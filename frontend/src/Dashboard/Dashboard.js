import React, { useState, useEffect } from 'react';
import contractService from '../services/contractService';
import AdminDashboard from './AdminDashboard';
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
    const [isOwner, setIsOwner] = useState(false);
    const [isSelectingNumbers, setIsSelectingNumbers] = useState(false);
    const [selectedTicketId, setSelectedTicketId] = useState(null);
    const [isLotteryActive, setIsLotteryActive] = useState(false);
    const [ticketCategory, setTicketCategory] = useState('active');

    const today = new Date().toLocaleDateString('en-US', {
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
    });

    // Status mapping for ticket states
    const STATUS_MAP = {
        0: 'Active',
        1: 'In Lottery',
        2: 'Won',
        3: 'Expired'
    };

    const refreshDashboardData = async () => {
        try {
            const [
                price,
                tickets,
                owner
            ] = await Promise.all([
                contractService.getTicketPrice(),
                contractService.getPlayerTickets(account),
                contractService.getOwner()
            ]);

            setTicketPrice(price.toString());
            setActiveTickets(tickets);
            setIsOwner(owner.toLowerCase() === account.toLowerCase());

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
            {/* Updated Header Row with Purchase Button */}
            <div className="dashboard-header-row">
                <div className="header-info-container">
                    <div className="header-info-item">
                        <span className="header-info-label">Today</span>
                        <span className="header-info-value">{today}</span>
                    </div>
                    <div className="header-divider"></div>
                    <div className="header-info-item">
                        <span className="header-info-label">Lottery Status</span>
                        <span className={`header-info-value ${isLotteryActive ? 'lottery-active' : 'lottery-inactive'}`}>
                            {isLotteryActive ? 'Open' : 'Closed'}
                        </span>
                    </div>
                    <div className="header-divider"></div>
                    <div className="header-info-item">
                        <span className="header-info-label">Ticket Price</span>
                        <span className="header-info-value">{ticketPrice} ETH</span>
                    </div>
                    <div className="header-divider"></div>
                    <div className="header-info-item">
                        <span className="header-info-label">Active Tickets</span>
                        <span className="header-info-value">{activeTickets.length}</span>
                    </div>
                    <div className="header-divider"></div>
                    <div className="header-info-item">
                        <button 
                            onClick={handlePurchase} 
                            disabled={isLoading.purchase}
                            className="header-purchase-button"
                        >
                            {isLoading.purchase ? "Processing..." : "Buy Ticket"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Two-Column Layout */}
            <div className="dashboard-content-grid">
                <div className="dashboard-tickets-column">
                    {/* Tickets Section */}
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

            {/* Admin Panel */}
            {isOwner && (
                <div className="dashboard-section admin-section">
                    <AdminDashboard onActionComplete={refreshDashboardData} />
                </div>
            )}

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