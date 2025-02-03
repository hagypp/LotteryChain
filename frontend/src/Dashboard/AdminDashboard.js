import React, { useState } from 'react';
import contractService from '../services/contractService';

const AdminDashboard = ({ onActionComplete }) => {
    const [newTicketPrice, setNewTicketPrice] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState('');

    const handleSetTicketPrice = async () => {
        try {
            setIsLoading(true);
            setStatus('Updating ticket price...');
            const result = await contractService.setTicketPrice(newTicketPrice);
            if (result.success) {
                setNewTicketPrice('');
                setStatus('Ticket price updated successfully!');
                if (onActionComplete) onActionComplete();
            }
        } catch (error) {
            setStatus(`Failed to update ticket price: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStartLottery = async () => {
        try {
            setIsLoading(true);
            setStatus('Starting lottery...');
            const result = await contractService.drawLotteryWinner();
            if (result.success) {
                setStatus('Lottery winner drawn successfully!');
                if (onActionComplete) onActionComplete();
            }
        } catch (error) {
            setStatus(`Failed to start lottery: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenLottery = async () => {
        try {
            setIsLoading(true);
            setStatus('Opening new lottery round...');
            const result = await contractService.startNewLotteryRound();
            if (result.success) {
                setStatus('New lottery round opened successfully!');
                if (onActionComplete) onActionComplete();
            }
        } catch (error) {
            setStatus(`Failed to open lottery: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="admin-dashboard">
            <h2>Admin Controls</h2>
            
            <div className="admin-grid">
                <div className="section-card">
                    <h3 className="section-title">Lottery Management</h3>
                    <div className="admin-actions">
                        <button 
                            onClick={handleStartLottery} 
                            disabled={isLoading}
                            className="admin-button"
                        >
                            {isLoading ? 'Processing...' : 'Draw Winner'}
                        </button>
                        <button 
                            onClick={handleOpenLottery} 
                            disabled={isLoading}
                            className="admin-button"
                        >
                            {isLoading ? 'Processing...' : 'Start New Round'}
                        </button>
                    </div>
                </div>

                <div className="section-card">
                    <h3 className="section-title">Ticket Price Management</h3>
                    <div className="price-control">
                        <input
                            type="number"
                            value={newTicketPrice}
                            onChange={(e) => setNewTicketPrice(e.target.value)}
                            placeholder="Enter new ticket price (ETH)"
                            className="admin-input"
                        />
                        <button 
                            onClick={handleSetTicketPrice} 
                            disabled={isLoading || !newTicketPrice}
                            className="admin-button"
                        >
                            {isLoading ? 'Processing...' : 'Update Price'}
                        </button>
                    </div>
                </div>
            </div>

            {status && <div className="admin-status-message">{status}</div>}
        </div>
    );
};

export default AdminDashboard;