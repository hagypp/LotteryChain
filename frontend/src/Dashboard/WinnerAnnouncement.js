import React, { useState, useEffect, useRef } from 'react';
import './WinnerAnnouncement.css';

const WinnerAnnouncement = ({ account, contractService }) => {
    const [winnerStatus, setWinnerStatus] = useState({
        isSmallPrizeWinner: false,
        isBigPrizeWinner: false,
        visible: false,
        currentRound: '0'
    });
    
    const [dontShowAgain, setDontShowAgain] = useState(false);
    
    // Use a ref to track initialization
    const initialized = useRef(false);
    
    useEffect(() => {
        // Skip if already initialized or missing dependencies
        if (initialized.current || !contractService || !contractService.initialized || !account) {
            return;
        }
        
        initialized.current = true;

        // Function to check if user is a winner
        const checkWinnerStatus = async (smallPrizeWinners, bigPrizeWinners) => {
            if (!account) return false;
            
            const normalizedAccount = account.toLowerCase();
            
            const isSmallPrizeWinner = Array.isArray(smallPrizeWinners) && 
                smallPrizeWinners.some(winner => winner && winner.toLowerCase() === normalizedAccount);
            
            const isBigPrizeWinner = Array.isArray(bigPrizeWinners) && 
                bigPrizeWinners.some(winner => winner && winner.toLowerCase() === normalizedAccount);
            
            if (isSmallPrizeWinner || isBigPrizeWinner) {
                // Get current round to use for the "don't show again" feature
                const currentRound = await contractService.getCurrentRound();
                
                // Check if user has chosen to hide this announcement for this round
                const hiddenRound = localStorage.getItem('hiddenWinnerAnnouncement');
                
                // Only show if the user hasn't chosen to hide for this specific round
                const shouldShow = hiddenRound !== currentRound.toString();
                
                setWinnerStatus({
                    isSmallPrizeWinner,
                    isBigPrizeWinner,
                    visible: shouldShow,
                    currentRound: currentRound.toString()
                });
                return true;
            }
            return false;
        };

        // Check current winners immediately
        const checkCurrentWinners = async () => {
            try {
                const { smallPrizeWinners, bigPrizeWinners } = await contractService.getCurrentWinners();
                await checkWinnerStatus(smallPrizeWinners, bigPrizeWinners);
            } catch (error) {
                console.error("Error checking current winners:", error);
            }
        };
        
        // Set up all event listeners
        const handleWinnerAnnouncement = async (winnersData) => {
            const smallPrizeWinners = winnersData.smallPrizeWinners || [];
            const bigPrizeWinners = winnersData.bigPrizeWinners || [];
            await checkWinnerStatus(smallPrizeWinners, bigPrizeWinners);
        };

        const handleWinnerAnnouncementEvent = async (event) => {
            if (!event.detail) return;
            
            const { smallPrizeWinners, bigPrizeWinners } = event.detail;
            await checkWinnerStatus(smallPrizeWinners, bigPrizeWinners);
        };

        const handleDrawComplete = async () => {
            try {
                if (contractService && contractService.initialized) {
                    const { smallPrizeWinners, bigPrizeWinners } = await contractService.getCurrentWinners();
                    await checkWinnerStatus(smallPrizeWinners, bigPrizeWinners);
                }
            } catch (error) {
                console.error("Error checking winners after draw:", error);
            }
        };
        
        // Check winners immediately
        checkCurrentWinners();

        // Set up event listeners
        const unsubscribe = contractService.addWinnersAnnouncedListener(handleWinnerAnnouncement);
        window.addEventListener('drawLotteryComplete', handleDrawComplete);
        window.addEventListener('winnersAnnounced', handleWinnerAnnouncementEvent);
        
        // Cleanup function
        return () => {
            if (unsubscribe) unsubscribe();
            window.removeEventListener('drawLotteryComplete', handleDrawComplete);
            window.removeEventListener('winnersAnnounced', handleWinnerAnnouncementEvent);
        };
    }, [account, contractService]);

    const handleClose = () => {
        // If "don't show again" is checked, store the current round in localStorage
        if (dontShowAgain) {
            localStorage.setItem('hiddenWinnerAnnouncement', winnerStatus.currentRound);
        }
        
        setWinnerStatus(prev => ({ ...prev, visible: false }));
    };

    const handleDontShowAgainChange = (e) => {
        setDontShowAgain(e.target.checked);
    };

    if (!winnerStatus.visible) {
        return null;
    }

    const winnerType = winnerStatus.isBigPrizeWinner ? 'BIG PRIZE' : 'SMALL PRIZE';
    const buttonClass = winnerStatus.isBigPrizeWinner ? 'continue-button big-prize-button' : 'continue-button';
    
    // Create multiple confetti types for a richer effect
    const renderConfetti = () => {
        const confettiCount = 20;
        const shapes = ['square', 'circle', 'rect'];
        const colors = ['gold', 'blue', 'orange', 'white', 'purple'];
        
        const confetti = [];
        
        for (let i = 0; i < confettiCount; i++) {
            const shape = shapes[Math.floor(Math.random() * shapes.length)];
            const color = colors[Math.floor(Math.random() * colors.length)];
            const left = `${Math.random() * 100}%`;
            const delay = `${Math.random() * 1.5}s`;
            const duration = `${3 + Math.random() * 2}s`;
            
            confetti.push(
                <div 
                    key={i}
                    className={`confetti confetti-${shape} confetti-${color}`}
                    style={{
                        left,
                        '--fall-delay': delay,
                        '--fall-duration': duration
                    }}
                />
            );
        }
        
        return confetti;
    };

    return (
        <div className="winner-announcement-overlay">
            <div className="winner-announcement-container">
                <div className="winner-announcement-header"></div>
                <button className="close-button" onClick={handleClose}>×</button>
                
                <div className="winner-announcement-content">
                    <div className="trophy-icon">🏆</div>
                    <h2>CONGRATULATIONS!</h2>
                    <div className="prize-label">You've won the</div>
                    <div className={`prize-type ${winnerStatus.isBigPrizeWinner ? 'big-prize' : 'small-prize'}`}>
                        {winnerType}
                    </div>
                    <div className="round-info">Lottery Round #{winnerStatus.currentRound -1}</div>
                </div>
                
                <div className="confetti-container">
                    {renderConfetti()}
                </div>
                
                <div className="light-rays">
                    <div className="light-ray"></div>
                    <div className="light-ray"></div>
                </div>
                
                <div className="announcement-footer">
                    <button className={buttonClass} onClick={handleClose}>
                    Continue Playing
                    </button>
                    <label className="dont-show-again-label">
                        <input 
                            type="checkbox"
                            className="dont-show-again-checkbox"
                            checked={dontShowAgain}
                            onChange={handleDontShowAgainChange}
                        />
                        Don't show this message again for this round
                    </label>
                </div>
            </div>
        </div>
    );  
};

export default WinnerAnnouncement;