import React, { useState } from 'react';
import contractService from '../services/contractService';
import { useLottery } from '../contexts/LotteryContext';
import './SelectNumbers.css';
const { sha3_256 } = require('js-sha3');  // Note: using sha3_256 instead of keccak_256

const SelectNumbers = ({ onClose, ticketId, onTicketAdded }) => {
    const { showNotification } = useLottery();
    const [selectedNumbers, setSelectedNumbers] = useState([]);
    const [strongestNumber, setStrongestNumber] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Maximum of 6 numbers can be selected
    const MAX_SELECTED = 6;
    
    // Total numbers available (1-37)
    const TOTAL_NUMBERS = 37;
    
    // We'll now use a different approach to create rows
    // Using rows of 10 numbers each to maximize width usage
    const NUMBERS_PER_ROW = 14;
    
    // Generate rows of numbers
    const generateRows = () => {
        const rows = [];
        let currentRow = [];
        
        for (let i = 1; i <= TOTAL_NUMBERS; i++) {
            currentRow.push(i);
            
            if (currentRow.length === NUMBERS_PER_ROW || i === TOTAL_NUMBERS) {
                rows.push([...currentRow]);
                currentRow = [];
            }
        }
        
        return rows;
    };
    
    const numberRows = generateRows();
    
    const toggleNumber = (number) => {
        if (selectedNumbers.includes(number)) {
            setSelectedNumbers(selectedNumbers.filter(num => num !== number));
        } else if (selectedNumbers.length < MAX_SELECTED) {
            setSelectedNumbers([...selectedNumbers, number]);
        }
    };
    
    const toggleStrongestNumber = (number) => {
        setStrongestNumber(strongestNumber === number ? null : number);
    };
    
    const handleSubmit = async () => {
        if (selectedNumbers.length !== MAX_SELECTED) {
            showNotification(`Please select exactly ${MAX_SELECTED} numbers.`, 'warning');
            return;
        }
    
        if (strongestNumber === null) {
            showNotification('Please select your strongest number (1-7).', 'warning');
            return;
        }
    
        try {
            setIsSubmitting(true);
            showNotification('Entering ticket into lottery...', 'info');
    
            if (ticketId === undefined || ticketId === null || ticketId === "") {
                throw new Error('No ticket ID provided');
            }

            // Create a string representation of the selected numbers (6 numbers) without commas
            const numbersString = [...selectedNumbers.sort((a, b) => a - b)].join('');
    
            // Hash the selected numbers (6 numbers)
            const numbersHash = sha3_256(numbersString).toString('hex');
           
            // Now, include the strongest number in the string for ticketHashWithStrong
            const ticketNumbersString = [...selectedNumbers.sort((a, b) => a - b), strongestNumber].join('');
            const ticketHashWithStrong = sha3_256(ticketNumbersString).toString('hex');  // Hash the 7 numbers (6 + strongest)

            // Send the hash to the contract
            const result = await contractService.selectTicketsForLottery(
                ticketId,
                numbersHash,
                ticketHashWithStrong
            );
                        
            if (result.success) {
                const outcome = result.resultFromEvent;
            
                if (outcome === false) {
                    showNotification("Ticket submitted failed - cant do it now .", 'error');
                } else if (outcome === true) {
                    showNotification("Ticket submitted successfully!", 'success');
                } else {
                    showNotification("Ticket submitted, but the outcome is unknown.", 'info');
                }
            
                onTicketAdded();
                onClose();
            } else {
                showNotification("Ticket submission failed.", 'error');
            }
            
        } catch (error) {
            showNotification(`Failed to enter ticket into lottery: ${error.message}`, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };
       
    
    return (
        <div className="select-numbers-overlay">
            <div className="select-numbers-modal">
                <div className="select-numbers-header">
                    <h2>Select Your Lucky Numbers</h2>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>
                
                <div className="select-numbers-content">
                    <div className="selection-info">
                        <p>Choose exactly 6 numbers from 1 to 37 for Ticket #{ticketId}</p>
                        <div className="selected-count">
                            <span>{selectedNumbers.length}/{MAX_SELECTED} Selected</span>
                        </div>
                    </div>
                    
                    <div className="numbers-grid">
                        {numberRows.map((row, rowIndex) => (
                            <div key={`row-${rowIndex}`} className="numbers-row">
                                {row.map((number) => (
                                    <button
                                        key={number}
                                        className={`number-button ${selectedNumbers.includes(number) ? 'selected' : ''}`}
                                        onClick={() => toggleNumber(number)}
                                        disabled={isSubmitting || (selectedNumbers.length >= MAX_SELECTED && !selectedNumbers.includes(number))}
                                    >
                                        {number}
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>
                    
                    <div className="strongest-number-section">
                        <h3>Select Your Strongest Number (1-7)</h3>
                        <div className="strongest-numbers-row">
                            {[1, 2, 3, 4, 5, 6, 7].map((number) => (
                                <button
                                    key={`strongest-${number}`}
                                    className={`strongest-number-button ${strongestNumber === number ? 'selected' : ''}`}
                                    onClick={() => toggleStrongestNumber(number)}
                                    disabled={isSubmitting}
                                >
                                    {number}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="selected-numbers">
                        <h3>Your Selection</h3>
                        <div className="selected-numbers-display">
                            {[...Array(MAX_SELECTED)].map((_, index) => (
                                <div key={`selection-${index}`} className="number-placeholder">
                                    {selectedNumbers[index] || ''}
                                </div>
                            ))}
                            
                            {strongestNumber !== null && (
                                <div className="strongest-placeholder">
                                    {strongestNumber}
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="selection-actions">
                        <button 
                            className="selection-cancel" 
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button 
                            className="selection-submit" 
                            onClick={handleSubmit}
                            disabled={selectedNumbers.length !== MAX_SELECTED || strongestNumber === null || isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="loading-indicator"></span>
                                    Processing...
                                </>
                            ) : (
                                'Enter Lottery'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SelectNumbers;