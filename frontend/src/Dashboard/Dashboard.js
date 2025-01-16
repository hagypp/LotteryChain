import React, { useState, useEffect } from 'react';
import contractService from '../services/contractService';

const Dashboard = ({ account }) => {
    const [contractBalance, setContractBalance] = useState('0');
    const [ticketPrice, setTicketPrice] = useState('0');
    const [totalPlayers, setTotalPlayers] = useState('0');
    const [registeredPlayers, setRegisteredPlayers] = useState([]);
    const [status, setStatus] = useState('');
    const [isContractReady, setIsContractReady] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [newTicketPrice, setNewTicketPrice] = useState('');
    const [totalTicketsSold, setTotalTicketsSold] = useState('0');
    const [activeTickets, setActiveTickets] = useState([]);

    useEffect(() => {
        const loadData = async () => {
            try {
                await contractService.init();
                setIsContractReady(true);

                const balance = await contractService.getContractBalance();
                const price = await contractService.getTicketPrice();
                const players = await contractService.getTotalRegisteredPlayers();
                const allPlayers = await contractService.getAllRegisteredPlayers();
                const tickets = await contractService.getActiveTickets();
                const soldTickets = await contractService.getTotalTicketsSold();

                setContractBalance(balance);
                setTicketPrice(price);
                setTotalPlayers(players);
                setRegisteredPlayers(allPlayers);
                setActiveTickets(tickets);
                setTotalTicketsSold(soldTickets);
            } catch (error) {
                setStatus(`Error initializing contract: ${error.message}`);
            }
        };
        loadData();
    }, []);

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
                const balance = await contractService.getContractBalance();
                const players = await contractService.getTotalRegisteredPlayers();
                const soldTickets = await contractService.getTotalTicketsSold();
                setContractBalance(balance);
                setTotalPlayers(players);
                setTotalTicketsSold(soldTickets);
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
                const players = await contractService.getTotalRegisteredPlayers();
                setTotalPlayers(players);
                setStatus('Player registered successfully!');
            }
        } catch (error) {
            setStatus(`Registration failed: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStartLottery = async () => {
        if (!isContractReady) {
            setStatus('Contract not initialized yet. Please try again later.');
            return;
        }
        try {
            setIsLoading(true);
            setStatus('Starting lottery...');
            const result = await contractService.drawLotteryWinner();
            if (result.success) {
                setStatus('Lottery started successfully!');
            }
        } catch (error) {
            setStatus(`Failed to start lottery: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenLottery = async () => {
        if (!isContractReady) {
            setStatus('Contract not initialized yet. Please try again later.');
            return;
        }
        try {
            setIsLoading(true);
            setStatus('Opening lottery...');
            const result = await contractService.startNewLotteryRound();
            if (result.success) {
                setStatus('Lottery opened successfully!');
            }
        } catch (error) {
            setStatus(`Failed to open lottery: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSetTicketPrice = async () => {
        if (!isContractReady) {
            setStatus('Contract not initialized yet. Please try again later.');
            return;
        }
        try {
            setIsLoading(true);
            setStatus('Updating ticket price...');
            const result = await contractService.setTicketPrice(newTicketPrice);
            if (result.success) {
                const price = await contractService.getTicketPrice();
                setTicketPrice(price);
                setStatus('Ticket price updated successfully!');
            }
        } catch (error) {
            setStatus(`Failed to update ticket price: ${error.message}`);
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
                setStatus('Ticket entered into lottery successfully!');
            }
        } catch (error) {
            setStatus(`Failed to enter ticket into lottery: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <h2>Lottery Dashboard</h2>
            <div>
                <p><strong>Contract Balance:</strong> {contractBalance} ETH</p>
                <p><strong>Ticket Price:</strong> {ticketPrice} ETH</p>
                <p><strong>Total Registered Players:</strong> {totalPlayers}</p>
                <p><strong>Total Tickets Sold:</strong> {totalTicketsSold}</p>
            </div>

            <div>
                <h3>Registered Players:</h3>
                <ul>
                    {registeredPlayers.length > 0 ? (
                        registeredPlayers.map((player, index) => (
                            <li key={index}>{player}</li>
                        ))
                    ) : (
                        <p>No registered players yet</p>
                    )}
                </ul>
            </div>

            <div>
                <button onClick={handlePurchase} disabled={isLoading}>
                    {isLoading ? 'Processing...' : 'Buy Ticket'}
                </button>
                <button onClick={handleRegister} disabled={isLoading}>
                    {isLoading ? 'Processing...' : 'Register'}
                </button>
                <button onClick={handleStartLottery} disabled={isLoading}>
                    {isLoading ? 'Processing...' : 'Start Lottery'}
                </button>
                <button onClick={handleOpenLottery} disabled={isLoading}>
                    {isLoading ? 'Processing...' : 'Open Lottery'}
                </button>
            </div>

            <div>
                <h3>Set New Ticket Price</h3>
                <input
                    type="number"
                    value={newTicketPrice}
                    onChange={(e) => setNewTicketPrice(e.target.value)}
                    placeholder="Enter new ticket price"
                />
                <button onClick={handleSetTicketPrice} disabled={isLoading || !newTicketPrice}>
                    {isLoading ? 'Processing...' : 'Set Price'}
                </button>
            </div>

            <div>
                <h3>Active Tickets:</h3>
                <ul>
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

            {status && <p style={{ color: 'red' }}>{status}</p>}
        </div>
    );
};

export default Dashboard;
