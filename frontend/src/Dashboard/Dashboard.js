import React, { useState, useEffect } from 'react';
import contractService from '../services/contractService';

const Dashboard = ({ account }) => {
  const [playerData, setPlayerData] = useState({
    balance: '0',
    activeTickets: [],
    ticketPrice: '0'
  });
  const [status, setStatus] = useState('');
  const [isRegistered, setIsRegistered] = useState(false); // New state to track registration status

  useEffect(() => {
    loadPlayerData();
  }, [account]);

  const loadPlayerData = async () => {
    try {
      const [balance, ticketPrice, activeTickets] = await Promise.all([
        contractService.web3.eth.getBalance(account),
        contractService.getTicketPrice(),
        contractService.getActiveTickets()
      ]);

      setPlayerData({
        balance: contractService.web3.utils.fromWei(balance, 'ether'),
        activeTickets,
        ticketPrice
      });

      // Check if the player is registered
      const registrationStatus = await contractService.isPlayerRegistered(account);
      setIsRegistered(registrationStatus); // Update registration status
    } catch (error) {
      setStatus('Error loading player data: ' + error.message);
    }
  };

  const handlePurchaseTicket = async () => {
    if (!isRegistered) {
      setStatus('You must register before purchasing a ticket.');
      return;
    }

    try {
      setStatus('Purchasing ticket...');
      await contractService.purchaseTicket();
      setStatus('Ticket purchased successfully!');
      await loadPlayerData();
    } catch (error) {
      setStatus('Purchase failed: ' + error.message);
    }
  };

  const handleRegister = async () => {
    try {
      setStatus('Registering...');
      await contractService.registerPlayer(); // Assumes there's a register function in the contractService
      setStatus('Registration successful!');
      setIsRegistered(true); // Update registration status
      await loadPlayerData(); // Reload player data after registration
    } catch (error) {
      setStatus('Registration failed: ' + error.message);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>🎰 Lottery Dashboard</h2>
        <div className="account-details">
          <p className="account-info">
            Connected Wallet: {account.substring(0, 6)}...{account.slice(-4)}
          </p>
          <p className="balance-info">Balance: {Number(playerData.balance).toFixed(4)} ETH</p>
        </div>
      </div>

      <div className="main-content">
        <div className="purchase-section">
          <h3>Purchase Lottery Tickets</h3>
          <div className="price-info">
            <p>Ticket Price: {playerData.ticketPrice} ETH</p>
            <button onClick={handlePurchaseTicket} className="primary-button">
              Buy Ticket 🎫
            </button>
          </div>
        </div>

        <div className="tickets-section">
          <h3>Your Lottery Tickets</h3>
          {playerData.activeTickets.length > 0 ? (
            <div className="tickets-grid">
              {playerData.activeTickets.map((ticketId) => (
                <div key={ticketId} className="ticket-card">
                  <span className="ticket-number">#{ticketId.toString()}</span>
                  <span className="ticket-label">Lottery Ticket</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-tickets">You don't have any active tickets yet</p>
          )}
        </div>

        {/* Add Register Button if not registered */}
        {!isRegistered && (
          <div className="register-section">
            <h3>Register to Play</h3>
            <button onClick={handleRegister} className="secondary-button">
              Register 🎲
            </button>
          </div>
        )}
      </div>

      {status && <p className="status-message">{status}</p>}
    </div>
  );
};

export default Dashboard;