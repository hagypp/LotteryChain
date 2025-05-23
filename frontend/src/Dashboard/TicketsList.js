import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import "./TicketsList.css";

// Only enable detailed logging when debugging specific issues
const DETAILED_LOGGING = false;

const TicketsList = React.memo(({ tickets, ticketCategory, setTicketCategory, isLoading, isLotteryActive, handleSelectForLottery }) => {

    const prevTicketsLengthRef = useRef(tickets.length);
    const prevCategoryRef = useRef(ticketCategory);
    
    useEffect(() => {
        const ticketsChanged = prevTicketsLengthRef.current !== tickets.length;
        const categoryChanged = prevCategoryRef.current !== ticketCategory;
        
        if (DETAILED_LOGGING || ticketsChanged || categoryChanged) {
            prevTicketsLengthRef.current = tickets.length;
            prevCategoryRef.current = ticketCategory;
        }
    });
    
    const scrollContainerRef = useRef(null);
    const [showLeftButton, setShowLeftButton] = useState(false);
    const [showRightButton, setShowRightButton] = useState(false);
    
    // Define STATUS_MAP outside of render function to prevent recreation on each render
    const STATUS_MAP = useMemo(() => ({
        0: 'Active',
        1: 'In Lottery',
        2: 'USED',
        3: 'WON_SMALL_PRIZE',
        4: 'WON_BIG_PRIZE',
        5: 'WON_MINI_PRIZE',
    }), []);
    
    // Memoize the scroll checking function
    const checkForScrollButtons = useCallback(() => {
        if (scrollContainerRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
            setShowLeftButton(scrollLeft > 10);
            setShowRightButton(scrollLeft < scrollWidth - clientWidth - 10);
        }
    }, []);

    // Effect to add scroll event listener - only depends on the checkForScrollButtons function
    useEffect(() => {

        checkForScrollButtons();
        
        const scrollContainer = scrollContainerRef.current;
        if (scrollContainer) {
            scrollContainer.addEventListener('scroll', checkForScrollButtons);
            
            return () => {
                scrollContainer.removeEventListener('scroll', checkForScrollButtons);
            };
        }
    }, [checkForScrollButtons]);

    // Separate effect to check scroll buttons when tickets or category changes
    useEffect(() => {
        // Add a small delay to ensure DOM has updated
        const timer = setTimeout(() => {
            checkForScrollButtons();
        }, 100);
        
        return () => clearTimeout(timer);
    }, [tickets.length, ticketCategory, checkForScrollButtons]);

    // Memoize the scroll handler
    const handleScroll = useCallback((direction) => {
   
        if (scrollContainerRef.current) {
            const scrollAmount = 920; 
            const currentScroll = scrollContainerRef.current.scrollLeft;
            scrollContainerRef.current.scrollTo({
                left: direction === 'left' ? currentScroll - scrollAmount : currentScroll + scrollAmount,
                behavior: 'smooth'
            });
        }
    }, []);

    // Memoize the filtered tickets calculation to avoid recalculating on every render
    const filteredTickets = useMemo(() => {
        switch(ticketCategory) {
            case 'all':
                return tickets;
            case 'active':
                return tickets.filter(ticket => Number(ticket.status) === 0);
            case 'inLottery':
                return tickets.filter(ticket => Number(ticket.status) === 1);
            case 'USED':
                return tickets.filter(ticket => Number(ticket.status) === 2);
            case 'WON_SMALL_PRIZE':
                return tickets.filter(ticket => Number(ticket.status) === 3);
            case 'WON_BIG_PRIZE':
                return tickets.filter(ticket => Number(ticket.status) === 4);
            case 'WON_MINI_PRIZE':
                return tickets.filter(ticket => Number(ticket.status) === 5);        
            default:
                return tickets;
        }
    }, [tickets, ticketCategory]);

    // Memoize this calculation
    const hasMoreThanEightTickets = useMemo(() => filteredTickets.length > 8, [filteredTickets.length]);
    
    // Memoize category tabs to prevent recreation on each render
    const categoryTabs = useMemo(() => [
        { key: 'all', label: 'All Tickets' },
        { key: 'active', label: 'Active' },
        { key: 'inLottery', label: 'In Lottery' },
        { key: 'USED', label: 'USED' },
        { key: 'WON_SMALL_PRIZE', label: 'WON SMALL PRIZE' },
        { key: 'WON_BIG_PRIZE', label: 'WON BIG PRIZE' },
        { key: 'WON_MINI_PRIZE', label: 'WON MINI PRIZE' },
    ], []);

    // Create memoized handler for ticket category selection
    const handleCategoryClick = useCallback((category) => {
        setTicketCategory(category);
    }, [setTicketCategory]);

    return (
        <div className="tickets-container">
            <div className="ticket-category-tabs">
                {categoryTabs.map(category => (
                    <button
                        key={category.key}
                        className={`ticket-category-tab ${ticketCategory === category.key ? 'active' : ''}`}
                        onClick={() => handleCategoryClick(category.key)}
                    >
                        {category.label}
                    </button>
                ))}
            </div>

            <div className="fixed-height-container">
                {hasMoreThanEightTickets && showLeftButton && (
                    <button 
                        className="scroll-button scroll-left"
                        onClick={() => handleScroll('left')}
                        aria-label="Scroll left"
                    >
                        &lt;
                    </button>
                )}
                
                <div 
                    className="scroll-container" 
                    ref={scrollContainerRef}
                >
                <div className="tickets-list">
                    {filteredTickets.length > 0 ? (
                        filteredTickets.map((ticket) => (
                            <div key={ticket.id} className="ticket-item">
                                <div className="ticket-info">
                                    <div className="ticket-info-header">
                                        <span className="ticket-number">Ticket #{ticket.id.toString()}</span>
                                        <span className={`ticket-status ${
                                            STATUS_MAP[ticket.status]?.toLowerCase().replace(' ', '-')
                                        }`}>
                                            {STATUS_MAP[ticket.status]}
                                        </span>
                                    </div>
                                    <span className="ticket-time">
                                        Purchased: {new Date(Number(ticket.creationTimestamp) * 1000).toLocaleString() || 'Loading...'}
                                    </span>
                                    <span className="text-sm text-gray-400">
                                        Lottery Round: {Number(ticket.lotteryRound) > 0 ? ticket.lotteryRound.toString() : '—'}
                                    </span>
                                </div>
                                {Number(ticket.status) === 0 ? (
                                    <div className="tooltip-wrapper">
                                        <button 
                                            onClick={() => handleSelectForLottery(ticket.id)}
                                            disabled={
                                                isLoading[`ticket-${ticket.id}`] || 
                                                Number(ticket.status) !== 0 || 
                                                !isLotteryActive
                                            }
                                            className="lottery-button"
                                        >
                                            {isLoading[`ticket-${ticket.id}`] ? (
                                                <>
                                                    <span className="loading-indicator"></span>
                                                    Processing...
                                                </>
                                            ) : !isLotteryActive ? (
                                                'No Active Lottery'
                                            ) : (
                                                'Enter into Lottery'
                                            )}
                                        </button>
                                        <span className="tooltip-text">
                                            Enter this ticket into the current lottery round by selecting 6 numbers between 1–37 and 1 strong number between 1–7.<br/>
                                            <span className="tooltip-highlight"><strong>Note : </strong> if we reach 0 blocks until close this action may close the lottery and the ticket will not enter to the current lottery round.</span>
                                        </span>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => handleSelectForLottery(ticket.id)}
                                        disabled={
                                            isLoading[`ticket-${ticket.id}`] || 
                                            Number(ticket.status) !== 0 || 
                                            !isLotteryActive
                                        }
                                        className="lottery-button"
                                    >
                                        {isLoading[`ticket-${ticket.id}`] ? (
                                            <>
                                                <span className="loading-indicator"></span>
                                                Processing...
                                            </>
                                        ) : !isLotteryActive ? (
                                            'No Active Lottery'
                                        ) : (
                                            STATUS_MAP[ticket.status]
                                        )}
                                    </button>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="empty-state">
                            No {ticketCategory !== 'all' ? STATUS_MAP[
                                {'active': 0, 'inLottery': 1, 'USED': 2, 'WON_SMALL_PRIZE' : 3 , 'WON_BIG_PRIZE' : 4, 'WON_MINI_PRIZE' : 5}[ticketCategory]
                            ] || '' : ''} tickets found.
                        </div>
                    )}
                </div>
                </div>
                
                {hasMoreThanEightTickets && showRightButton && (
                    <button 
                        className="scroll-button scroll-right"
                        onClick={() => handleScroll('right')}
                        aria-label="Scroll right"
                    >
                        &gt;
                    </button>
                )}
            </div>
        </div>
    );
});

export default TicketsList;