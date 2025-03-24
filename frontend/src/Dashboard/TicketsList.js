import React, { useRef, useEffect, useState } from 'react';
import "./TicketsList.css";

const TicketsList = ({ tickets, ticketCategory, setTicketCategory, STATUS_MAP, isLoading, isLotteryActive, handleSelectForLottery }) => {
    const scrollContainerRef = useRef(null);
    const [showLeftButton, setShowLeftButton] = useState(false);
    const [showRightButton, setShowRightButton] = useState(false);
    
    // בדיקה אם צריך להציג את כפתורי הגלילה
    useEffect(() => {
        const checkForScrollButtons = () => {
            if (scrollContainerRef.current) {
                const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
                setShowLeftButton(scrollLeft > 10);
                setShowRightButton(scrollLeft < scrollWidth - clientWidth - 10);
            }
        };

        // בדיקה ראשונית
        checkForScrollButtons();

        // מוסיף את בדיקת הכפתורים בזמן גלילה
        const scrollContainer = scrollContainerRef.current;
        if (scrollContainer) {
            scrollContainer.addEventListener('scroll', checkForScrollButtons);
            // יצירת בדיקה לאחר שהנתונים נטענו
            window.setTimeout(checkForScrollButtons, 100);
            
            // מנקה את האירוע כשהקומפוננטה מתנתקת
            return () => {
                scrollContainer.removeEventListener('scroll', checkForScrollButtons);
            };
        }
    }, [tickets, ticketCategory]);

    const handleScroll = (direction) => {
        if (scrollContainerRef.current) {
            const scrollAmount = 920; // גלילה של קבוצה של 4 כרטיסים ברוחב
            const currentScroll = scrollContainerRef.current.scrollLeft;
            scrollContainerRef.current.scrollTo({
                left: direction === 'left' ? currentScroll - scrollAmount : currentScroll + scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    const getFilteredTickets = () => {
        switch(ticketCategory) {
            case 'all':
                return tickets;
            case 'active':
                return tickets.filter(ticket => Number(ticket.status) === 0);
            case 'inLottery':
                return tickets.filter(ticket => Number(ticket.status) === 1);
            case 'USED':
                return tickets.filter(ticket => Number(ticket.status) === 2);
            default:
                return tickets;
        }
    };

    const filteredTickets = getFilteredTickets();
    const hasMoreThanEightTickets = filteredTickets.length > 8; // בדיקה אם יש יותר מ-8 כרטיסים (2 שורות של 4)

    return (
        <div className="tickets-container">
            {/* כפתורי סינון */}
            <div className="ticket-category-tabs">
                {[
                    { key: 'all', label: 'All Tickets' },
                    { key: 'active', label: 'Active' },
                    { key: 'inLottery', label: 'In Lottery' },
                    { key: 'USED', label: 'USED' }
                ].map(category => (
                    <button
                        key={category.key}
                        className={`ticket-category-tab ${ticketCategory === category.key ? 'active' : ''}`}
                        onClick={() => setTicketCategory(category.key)}
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
                                        {Number(ticket.lotteryRound) > 0 && (
                                            <span className="text-sm text-gray-400">
                                                Lottery Round: {ticket.lotteryRound.toString()}
                                            </span>
                                        )}
                                    </div>
                                    <button 
                                        onClick={() => handleSelectForLottery(ticket.id)}
                                        disabled={
                                            isLoading[ticket.id] || 
                                            Number(ticket.status) !== 0 || 
                                            !isLotteryActive
                                        }
                                        className="lottery-button"
                                    >
                                        {isLoading[ticket.id] ? (
                                            <>
                                                <span className="loading-indicator"></span>
                                                Processing...
                                            </>
                                        ) : !isLotteryActive ? (
                                            'No Active Lottery'
                                        ) : Number(ticket.status) === 0 ? (
                                            'Enter into Lottery'
                                        ) : (
                                            STATUS_MAP[ticket.status]
                                        )}
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="empty-state">
                                No {STATUS_MAP[
                                    {'active': 0, 'inLottery': 1, 'USED': 2}[ticketCategory]
                                ] || ''} tickets found.
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
};

export default TicketsList;