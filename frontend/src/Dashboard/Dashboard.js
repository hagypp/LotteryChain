import React, { useState, useEffect } from 'react';
import contractService from '../services/contractService';

const Dashboard = ({ account }) => {
    const [contractBalance, setContractBalance] = useState('0');
    const [ticketPrice, setTicketPrice] = useState('0');
    const [totalPlayers, setTotalPlayers] = useState('0');
    const [registeredPlayers, setRegisteredPlayers] = useState([]);
    const [status, setStatus] = useState('');
    const [isContractReady, setIsContractReady] = useState(false); // Add a state for contract readiness

    useEffect(() => {
        const loadData = async () => {
            try {
                await contractService.init(); // Initialize the contract
                setIsContractReady(true); // Set contract as ready once initialized
                const balance = await contractService.getContractBalance();
                const price = await contractService.getTicketPrice();
                const players = await contractService.getTotalRegisteredPlayers();
                const allPlayers = await contractService.getAllRegisteredPlayers();
                setContractBalance(balance);
                setTicketPrice(price);
                setTotalPlayers(players);
                setRegisteredPlayers(allPlayers);
            } catch (error) {
                setStatus(`Error loading data: ${error.message}`);
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
            setStatus('Purchasing ticket...');
            const purchaseResult = await contractService.purchaseTicket();

            if (purchaseResult.success) {
                const balance = await contractService.getContractBalance();
                const players = await contractService.getTotalRegisteredPlayers();
                setContractBalance(balance);
                setTotalPlayers(players);
                setStatus('Ticket purchased successfully!');
            }
        } catch (error) {
            setStatus(`Purchase failed: ${error.message}`);
        }
    };

    const handleRegister = async () => {
        if (!isContractReady) {
            setStatus('Contract not initialized yet. Please try again later.');
            return;
        }
        try {
            setStatus('Registering player...');
            const registerResult = await contractService.registerPlayer();

            if (registerResult.success) {
                const players = await contractService.getTotalRegisteredPlayers();
                setTotalPlayers(players);
                setStatus('Player registered successfully!');
            }
        } catch (error) {
            setStatus(`Registration failed: ${error.message}`);
        }
    };

    return (
        <div>
            <h2>Lottery Dashboard</h2>
            <p>Contract Balance: {contractBalance} ETH</p>
            <p>Ticket Price: {ticketPrice} ETH</p>
            <p>Total Registered Players: {totalPlayers}</p>

            {/* Displaying the list of registered players */}
            <h3>Registered Players:</h3>
            <ul>
                {registeredPlayers.length > 0 ? (
                    registeredPlayers.map((player, index) => (
                        <li key={index}>{player}</li>
                    ))
                ) : (
                    <p>No registered players</p>
                )}
            </ul>

            <button onClick={handlePurchase}>Buy Ticket</button>
            <button onClick={handleRegister}>Register</button> 
            {status && <p>{status}</p>}
        </div>
    );
};

export default Dashboard;
