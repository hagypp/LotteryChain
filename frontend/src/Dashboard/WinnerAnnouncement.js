import React, { useState, useEffect, useRef } from 'react';
import './WinnerAnnouncement.css';

const WinnerAnnouncement = ({ account, contractService }) => {
    const [winnerStatus, setWinnerStatus] = useState({
        isSmallPrizeWinner: false,
        isBigPrizeWinner: false,
        isMiniPrizeWinner: false,
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
        const checkWinnerStatus = async (smallPrizeWinners, bigPrizeWinners, miniPrizeWinners) => {
            if (!account) return false;
            
            const normalizedAccount = account.toLowerCase();
            
            const isSmallPrizeWinner = Array.isArray(smallPrizeWinners) && 
                smallPrizeWinners.some(winner => winner && winner.toLowerCase() === normalizedAccount);
            
            const isBigPrizeWinner = Array.isArray(bigPrizeWinners) && 
                bigPrizeWinners.some(winner => winner && winner.toLowerCase() === normalizedAccount);
            
            const isMiniPrizeWinner = Array.isArray(miniPrizeWinners) && 
                miniPrizeWinners.some(winner => winner && winner.toLowerCase() === normalizedAccount);
            
            if (isSmallPrizeWinner || isBigPrizeWinner || isMiniPrizeWinner) {
                // Get current round to use for the "don't show again" feature
                const currentRound = await contractService.getCurrentRound();
                
                // Check if user has chosen to hide this announcement for this round
                const hiddenRound = localStorage.getItem('hiddenWinnerAnnouncement');
                
                // Only show if the user hasn't chosen to hide for this specific round
                const shouldShow = hiddenRound !== currentRound.toString();
                
                setWinnerStatus({
                    isSmallPrizeWinner,
                    isBigPrizeWinner,
                    isMiniPrizeWinner,
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
                const { smallPrizeWinners, bigPrizeWinners, miniPrizeWinners } = await contractService.getCurrentWinners();
                await checkWinnerStatus(smallPrizeWinners, bigPrizeWinners, miniPrizeWinners);
            } catch (error) {
                console.error("Error checking current winners:", error);
            }
        };
        
        // Check winners immediately
        checkCurrentWinners();

        // Cleanup function
        return () => {  };
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

    // Determine which type of prize to display
    // Priority: Big Prize > Small Prize > Mini Prize
    let winnerType = 'MINI PRIZE';
    if (winnerStatus.isBigPrizeWinner) {
        winnerType = 'BIG PRIZE';
    } else if (winnerStatus.isSmallPrizeWinner) {
        winnerType = 'SMALL PRIZE';
    }
    
    // Set button class based on prize type
    let buttonClass = 'continue-button';
    if (winnerStatus.isBigPrizeWinner) {
        buttonClass = 'continue-button big-prize-button';
    } else if (winnerStatus.isSmallPrizeWinner) {
        buttonClass = 'continue-button small-prize-button';
    } else {
        buttonClass = 'continue-button mini-prize-button';
    }
    
    // Set prize class for styling
    let prizeClass = 'mini-prize';
    if (winnerStatus.isBigPrizeWinner) {
        prizeClass = 'big-prize';
    } else if (winnerStatus.isSmallPrizeWinner) {
        prizeClass = 'small-prize';
    }
    
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
                    <div className={`prize-type ${prizeClass}`}>
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