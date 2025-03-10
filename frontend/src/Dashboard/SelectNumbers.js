import React, { useState, useEffect } from 'react';
import contractService from '../services/contractService';
import './SelectNumbers.css';
import { keccak256 } from 'js-sha3';


const SelectNumbers = ({ onClose, account, ticketId, onTicketAdded }) => {

    const [selectedNumbers, setSelectedNumbers] = useState([]);
    const [strongestNumber, setStrongestNumber] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [status, setStatus] = useState('');
    
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
            setStatus(`Please select exactly ${MAX_SELECTED} numbers.`);
            return;
        }
    
        if (strongestNumber === null) {
            setStatus('Please select your strongest number (1-7).');
            return;
        }
    
        try {
            setIsSubmitting(true);
            setStatus('Entering ticket into lottery...');
    
            if (ticketId === undefined || ticketId === null || ticketId === "") {
                throw new Error('No ticket ID provided');
            }
    
            // Create a string representation of the selected numbers (6 numbers) without commas
            const numbersString = [...selectedNumbers.sort((a, b) => a - b)].join('');
    
            // Hash the selected numbers (6 numbers)
            const numbersHash = keccak256(numbersString);
            console.log('Numbers hash:', numbersHash);
    
            // Now, include the strongest number in the string for ticketHashWithStrong
            const ticketNumbersString = [...selectedNumbers.sort((a, b) => a - b), strongestNumber].join('');
            const ticketHashWithStrong = keccak256(ticketNumbersString);  // Hash the 7 numbers (6 + strongest)
            console.log('Ticket hash with strongest number:', ticketHashWithStrong);
    
            // Send the hash to the contract
            const result = await contractService.selectTicketsForLottery(
                ticketId,  // Pass ticketId directly instead of an array
                numbersHash, // Send the hash of 6 numbers
                ticketHashWithStrong // Send the hash of 7 numbers (including the strongest)
            );
    
            if (result.success) {
                setStatus("Ticket submitted successfully!");
                onTicketAdded();
                onClose();
            }
        } catch (error) {
            console.error('Full error details:', error);
            setStatus(`Failed to enter ticket into lottery: ${error.message}`);
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
                    
                    {status && <div className="selection-status">{status}</div>}
                    
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