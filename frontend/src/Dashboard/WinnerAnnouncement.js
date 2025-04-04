import React, { useState, useEffect, useRef } from 'react';
import './WinnerAnnouncement.css';

const WinnerAnnouncement = ({ account, contractService }) => {
    const [winnerStatus, setWinnerStatus] = useState({
        isSmallPrizeWinner: false,
        isBigPrizeWinner: false,
        visible: false
    });
    
    // Track initialization and checks
    const isInitializedRef = useRef(false);
    const hasCheckedWinnersRef = useRef(false);
    // Store contract service reference to avoid unnecessary effect runs
    const contractServiceRef = useRef(contractService);
    const accountRef = useRef(account);
    
    // Update refs when props change
    useEffect(() => {
        contractServiceRef.current = contractService;
        accountRef.current = account;
    }, [contractService, account]);

    // First effect - Set up listeners ONCE
    useEffect(() => {
        // Skip if already initialized or missing dependencies
        if (isInitializedRef.current || !contractService || !contractService.initialized || !account) {
            return;
        }
        
        console.log('Setting up WinnerAnnouncement listeners with account:', account);
        isInitializedRef.current = true;

        // Function to check if user is a winner - with more debugging
        const checkWinnerStatus = (smallPrizeWinners, bigPrizeWinners) => {
            const currentAccount = accountRef.current;
            if (!currentAccount) return false;
            
            console.log('Checking if user is winner. Account:', currentAccount);
            console.log('Small prize winners:', smallPrizeWinners);
            console.log('Big prize winners:', bigPrizeWinners);
            
            const normalizedAccount = currentAccount.toLowerCase();
            
            const isSmallPrizeWinner = Array.isArray(smallPrizeWinners) && 
                smallPrizeWinners.some(winner => winner && winner.toLowerCase() === normalizedAccount);
            
            const isBigPrizeWinner = Array.isArray(bigPrizeWinners) && 
                bigPrizeWinners.some(winner => winner && winner.toLowerCase() === normalizedAccount);
            
            console.log('User is small prize winner:', isSmallPrizeWinner);
            console.log('User is big prize winner:', isBigPrizeWinner);
            
            if (isSmallPrizeWinner || isBigPrizeWinner) {
                console.log('Setting winner status to visible');
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
            console.log('Winners Announced Event Received:', winnersData);
            const smallPrizeWinners = winnersData.smallPrizeWinners || [];
            const bigPrizeWinners = winnersData.bigPrizeWinners || [];
            checkWinnerStatus(smallPrizeWinners, bigPrizeWinners);
        };

        // Handler for custom DOM event
        const handleWinnerAnnouncementEvent = (event) => {
            console.log('Winners Announced Custom Event Received', event.detail);
            if (!event.detail) return;
            
            const { smallPrizeWinners, bigPrizeWinners } = event.detail;
            checkWinnerStatus(smallPrizeWinners, bigPrizeWinners);
        };

        // Handler for draw complete event
        const handleDrawComplete = async () => {
            console.log("Draw complete event detected");
            try {
                const currentContractService = contractServiceRef.current;
                if (currentContractService && currentContractService.initialized) {
                    const { smallPrizeWinners, bigPrizeWinners } = await currentContractService.getCurrentWinners();
                    checkWinnerStatus(smallPrizeWinners, bigPrizeWinners);
                }
            } catch (error) {
                console.error("Error checking winners after draw:", error);
            }
        };

        // Set up all event listeners
        const unsubscribe = contractService.addWinnersAnnouncedListener(handleWinnerAnnouncement);
        window.addEventListener('drawLotteryComplete', handleDrawComplete);
        window.addEventListener('winnersAnnounced', handleWinnerAnnouncementEvent);
        
        // Cleanup function
        return () => {
            console.log('Cleaning up WinnerAnnouncement event listeners');
            if (unsubscribe) unsubscribe();
            window.removeEventListener('drawLotteryComplete', handleDrawComplete);
            window.removeEventListener('winnersAnnounced', handleWinnerAnnouncementEvent);
        };
    }, [account, contractService]);  // Add the dependencies here

    // Second effect - Check winners ONCE when contract and account are ready
    useEffect(() => {
        // Skip if already checked or missing dependencies
        if (hasCheckedWinnersRef.current || !contractService || !contractService.initialized || !account) {
            return;
        }
        
        const checkCurrentWinners = async () => {
            try {
                console.log('Fetching current winners from contract');
                const { smallPrizeWinners, bigPrizeWinners } = await contractService.getCurrentWinners();
                console.log('Current winners fetched:', { smallPrizeWinners, bigPrizeWinners });
                
                const normalizedAccount = account.toLowerCase();
                
                const isSmallPrizeWinner = Array.isArray(smallPrizeWinners) && 
                    smallPrizeWinners.some(winner => winner && winner.toLowerCase() === normalizedAccount);
                
                const isBigPrizeWinner = Array.isArray(bigPrizeWinners) && 
                    bigPrizeWinners.some(winner => winner && winner.toLowerCase() === normalizedAccount);
                
                if (isSmallPrizeWinner || isBigPrizeWinner) {
                    console.log('Setting winner status to visible');
                    setWinnerStatus({
                        isSmallPrizeWinner,
                        isBigPrizeWinner,
                        visible: true
                    });
                }
                
                hasCheckedWinnersRef.current = true; // Mark as checked no matter the result
            } catch (error) {
                console.error("Error checking current winners:", error);
            }
        };
        
        checkCurrentWinners();
        
    }, [account, contractService]);

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