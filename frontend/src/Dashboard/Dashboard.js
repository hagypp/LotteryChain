import React, { useState, useEffect } from 'react';
import contractService from '../services/contractService';
import AdminDashboard from './AdminDashboard';
import "./Dashboard.css";

const Dashboard = ({ account }) => {
    const [contractBalance, setContractBalance] = useState('0');
    const [ticketPrice, setTicketPrice] = useState('0');
    const [totalPlayers, setTotalPlayers] = useState('0');
    const [registeredPlayers, setRegisteredPlayers] = useState([]);
    const [status, setStatus] = useState('');
    const [isContractReady, setIsContractReady] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [totalTicketsSold, setTotalTicketsSold] = useState('0');
    const [activeTickets, setActiveTickets] = useState([]);
    const [isOwner, setIsOwner] = useState(false);

    const refreshDashboardData = async () => {
        try {
            const [
                balance,
                price,
                players,
                allPlayers,
                tickets,
                soldTickets,
                owner
            ] = await Promise.all([
                contractService.getContractBalance(),
                contractService.getTicketPrice(),
                contractService.getTotalRegisteredPlayers(),
                contractService.getAllRegisteredPlayers(),
                contractService.getActiveTickets(),
                contractService.getTotalTicketsSold(),
                contractService.getOwner()
            ]);

            setContractBalance(balance);
            setTicketPrice(price);
            setTotalPlayers(players);
            setRegisteredPlayers(allPlayers);
            setActiveTickets(tickets);
            setTotalTicketsSold(soldTickets);
            setIsOwner(owner.toLowerCase() === account.toLowerCase());
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
            setIsLoading(true);
            setStatus('Purchasing ticket...');
            const purchaseResult = await contractService.purchaseTicket();

            if (purchaseResult.success) {
                await refreshDashboardData();
                setStatus('Ticket purchased successfully!');
            }
        } catch (error) {
            setStatus(`Purchase failed: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegister = async () => {
        if (!isContractReady) {
            setStatus('Contract not initialized yet. Please try again later.');
            return;
        }
        try {
            setIsLoading(true);
            setStatus('Registering player...');
            const registerResult = await contractService.registerPlayer();

            if (registerResult.success) {
                await refreshDashboardData();
                setStatus('Player registered successfully!');
            }
        } catch (error) {
            setStatus(`Registration failed: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectForLottery = async (ticketId) => {
        if (!isContractReady) {
            setStatus('Contract not initialized yet. Please try again later.');
            return;
        }
        try {
            setIsLoading(true);
            setStatus('Entering ticket into lottery...');
            const result = await contractService.selectTicketsForLottery([ticketId]);
            if (result.success) {
                await refreshDashboardData();
                setStatus('Ticket entered into lottery successfully!');
            }
        } catch (error) {
            setStatus(`Failed to enter ticket into lottery: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="dashboard">
            <h2>Lottery Dashboard</h2>
            
            {isOwner && (
                <AdminDashboard onActionComplete={refreshDashboardData} />
            )}
            
            <div className="stats-grid">
                <div className="stat-card">
                    <strong>Contract Balance</strong>
                    <p>{contractBalance} ETH</p>
                </div>
                <div className="stat-card">
                    <strong>Ticket Price</strong>
                    <p>{ticketPrice} ETH</p>
                </div>
                <div className="stat-card">
                    <strong>Total Players</strong>
                    <p>{totalPlayers}</p>
                </div>
                <div className="stat-card">
                    <strong>Tickets Sold</strong>
                    <p>{totalTicketsSold}</p>
                </div>
            </div>

            <div className="dashboard-grid">
                <div className="dashboard-main">
                    <div className="section-card">
                        <h3 className="section-title">Active Tickets</h3>
                        <ul className="tickets-list">
                            {activeTickets.length > 0 ? (
                                activeTickets.map((ticket, index) => (
                                    <li key={index}>
                                        {ticket}
                                        <button onClick={() => handleSelectForLottery(ticket)} disabled={isLoading}>
                                            {isLoading ? 'Processing...' : 'Enter into Lottery'}
                                        </button>
                                    </li>
                                ))
                            ) : (
                                <p>No active tickets found</p>
                            )}
                        </ul>
                    </div>
                </div>

                <div className="dashboard-sidebar">
                    <div className="section-card">
                        <h3 className="section-title">Quick Actions</h3>
                        <div className="action-buttons">
                            <button onClick={handlePurchase} disabled={isLoading}>
                                {isLoading ? 'Processing...' : 'Buy Ticket'}
                            </button>
                            <button onClick={handleRegister} disabled={isLoading}>
                                {isLoading ? 'Processing...' : 'Register'}
                            </button>
                        </div>
                    </div>

                    <div className="section-card">
                        <h3 className="section-title">Registered Players</h3>
                        <ul className="players-list">
                            {registeredPlayers.length > 0 ? (
                                registeredPlayers.map((player, index) => (
                                    <li key={index}>{player}</li>
                                ))
                            ) : (
                                <p>No registered players yet</p>
                            )}
                        </ul>
                    </div>
                </div>
            </div>

            {status && <div className="status-message">{status}</div>}
        </div>
    );
};

export default Dashboard;