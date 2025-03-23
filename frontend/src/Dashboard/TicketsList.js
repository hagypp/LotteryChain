import React from 'react';
import "./TicketsList.css";

const TicketsList = ({ tickets, ticketCategory, setTicketCategory, STATUS_MAP, isLoading, isLotteryActive, handleSelectForLottery }) => {
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

            <div className="tickets-list">
                {getFilteredTickets().length > 0 ? (
                    getFilteredTickets().map((ticket) => (
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
                        ]} tickets found.
                    </div>
                )}
            </div>
        </div>
    );
};

export default TicketsList;
