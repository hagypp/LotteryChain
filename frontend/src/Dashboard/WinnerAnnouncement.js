import React, { useState, useEffect, useRef } from 'react';
import './WinnerAnnouncement.css';

const WinnerAnnouncement = ({ account, contractService }) => {
    const [winnerStatus, setWinnerStatus] = useState({
        isSmallPrizeWinner: false,
        isBigPrizeWinner: false,
        visible: false
    });
    
    // Use a single ref to track initialization
    const initialized = useRef(false);
    
    useEffect(() => {
        // Skip if already initialized or missing dependencies
        if (initialized.current || !contractService || !contractService.initialized || !account) {
            return;
        }
        
        initialized.current = true;

        // Function to check if user is a winner
        const checkWinnerStatus = (smallPrizeWinners, bigPrizeWinners) => {
            if (!account) return false;
                        
            const normalizedAccount = account.toLowerCase();
            
            const isSmallPrizeWinner = Array.isArray(smallPrizeWinners) && 
                smallPrizeWinners.some(winner => winner && winner.toLowerCase() === normalizedAccount);
            
            const isBigPrizeWinner = Array.isArray(bigPrizeWinners) && 
                bigPrizeWinners.some(winner => winner && winner.toLowerCase() === normalizedAccount);
            
    
            if (isSmallPrizeWinner || isBigPrizeWinner) {
                setWinnerStatus({
                    isSmallPrizeWinner,
                    isBigPrizeWinner,
                    visible: true
                });
                return true;
            }
            return false;
        };

        // Handler for winners announced event
        const handleWinnerAnnouncement = (winnersData) => {
            const smallPrizeWinners = winnersData.smallPrizeWinners || [];
            const bigPrizeWinners = winnersData.bigPrizeWinners || [];
            checkWinnerStatus(smallPrizeWinners, bigPrizeWinners);
        };

        // Handler for custom DOM event
        const handleWinnerAnnouncementEvent = (event) => {
            if (!event.detail) return;
            
            const { smallPrizeWinners, bigPrizeWinners } = event.detail;
            checkWinnerStatus(smallPrizeWinners, bigPrizeWinners);
        };

        // Handler for draw complete event
        const handleDrawComplete = async () => {
            try {
                if (contractService && contractService.initialized) {
                    const { smallPrizeWinners, bigPrizeWinners } = await contractService.getCurrentWinners();
                    checkWinnerStatus(smallPrizeWinners, bigPrizeWinners);
                }
            } catch (error) {
                console.error("Error checking winners after draw:", error);
            }
        };

        // Check current winners immediately
        const checkCurrentWinners = async () => {
            try {
                const { smallPrizeWinners, bigPrizeWinners } = await contractService.getCurrentWinners();
                checkWinnerStatus(smallPrizeWinners, bigPrizeWinners);
            } catch (error) {
                console.error("Error checking current winners:", error);
            }
        };
        
        // Check winners immediately
        checkCurrentWinners();

        // Set up all event listeners
        const unsubscribe = contractService.addWinnersAnnouncedListener(handleWinnerAnnouncement);
        window.addEventListener('drawLotteryComplete', handleDrawComplete);
        window.addEventListener('winnersAnnounced', handleWinnerAnnouncementEvent);
        
        // Cleanup function
        return () => {
            if (unsubscribe) unsubscribe();
            window.removeEventListener('drawLotteryComplete', handleDrawComplete);
            window.removeEventListener('winnersAnnounced', handleWinnerAnnouncementEvent);
        };
    }, [account, contractService]);  // Dependencies

    const handleClose = () => {
        setWinnerStatus(prev => ({ ...prev, visible: false }));
    };

    if (!winnerStatus.visible) {
        return null;
    }

    const winnerType = winnerStatus.isBigPrizeWinner ? 'BIG PRIZE' : 'SMALL PRIZE';

    return (
        <div className="winner-announcement-overlay">
            <div className="winner-announcement-container">
                <button className="close-button" onClick={handleClose}>×</button>
                <div className="winner-announcement-content">
                    <h2>🎉 CONGRATULATIONS! 🎉</h2>
                    <p>You won the {winnerType} in this lottery round!</p>
                    <button className="claim-button">CLAIM PRIZE</button>
                </div>
            </div>
        </div>
    );  
};

export default WinnerAnnouncement;