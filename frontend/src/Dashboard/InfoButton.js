import React, { useState, useEffect } from 'react';
import './InfoButton.css';
import contractService from '../services/contractService';


const InfoButton = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [contractData, setContractData] = useState({
    BLOCKS_TO_WAIT_FOR_CLOSE: null,
    BLOCKS_TO_WAIT_FOR_DRAW: null,
    commission: null,
    percentage_small: null,
    percentage_mini: null,
    percentage_big: null,
  });

  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
  };

  // Fetch contract data on mount
  useEffect(() => {
    const fetchContractData = async () => {
      try {
        // Fetch block wait data
        const blockData = await contractService.getBlocksWait();
        // Fetch commission and prize percentages
        const [commission, percentage_small, percentage_mini] = await Promise.all([
          contractService.getFLEX_COMMISSION(),
          contractService.getSMALL_PRIZE_PERCENTAGE(),
          contractService.getMINI_PRIZE_PERCENTAGE(),
        ]);
        // Calculate percentage_big
        const commissionNum = Number(commission);
        const smallNum = Number(percentage_small);
        const miniNum = Number(percentage_mini);
        const percentage_big = commission && percentage_small && percentage_mini ? 100 - commissionNum - smallNum - miniNum : null;
        setContractData({
          BLOCKS_TO_WAIT_FOR_CLOSE: blockData.BLOCKS_TO_WAIT_fOR_CLOSE ?? null,
          BLOCKS_TO_WAIT_FOR_DRAW: blockData.BLOCKS_TO_WAIT_fOR_DRAW ?? null,
          commission: commission ? commission.toString() : null,
          percentage_small: percentage_small ? percentage_small.toString() : null,
          percentage_mini: percentage_mini ? percentage_mini.toString() : null,
          percentage_big: percentage_mini&&percentage_small&&commission ? percentage_big.toString() : null,
        });
      } catch (err) {
        setContractData({
          BLOCKS_TO_WAIT_FOR_CLOSE: null,
          BLOCKS_TO_WAIT_FOR_DRAW: null,
          commission: null,
          percentage_small: null,
          percentage_mini: null,
          percentage_big: null,
        });
      }
    };
    fetchContractData();
  }, []);

  return (
    <div className="info-button-container">
      <button 
        className="info-button"
        onClick={toggleModal}
        aria-label="Information"
      >
        ℹ️
      </button>

      {isModalOpen && (
        <div className="info-modal" onClick={toggleModal}>       
          <div className="info-modal-content" onClick={(e) => e.stopPropagation()} >
            <div className="info-modal-header">
              <button 
                className="close-button" 
                onClick={toggleModal}
                aria-label="Close"
              >
                ✖️
              </button>
            </div>

            <div className="info-modal-body">
            <h2 className="section-title">🧾 How to Play</h2>
            <div className="explanation-text">
            <p>
              This is a blockchain-based lottery game where the flow of each round is strictly governed by block numbers:
            </p>
            <ol>
              <li><strong>Lottery Start</strong><br />
                When a new lottery round begins, the smart contract records the current block number as the starting point.
              </li>
              <li><strong>Entry Window (BLOCKS_TO_WAIT_FOR_CLOSE)</strong><br />
                From the starting block, users have a limited number of blocks defined by <strong>BLOCKS_TO_WAIT_FOR_CLOSE {contractData.BLOCKS_TO_WAIT_FOR_CLOSE !== null 
                      ? `= ${contractData.BLOCKS_TO_WAIT_FOR_CLOSE}` : ''} </strong>) to enter the lottery by selecting 6 numbers between 1–37 and 1 strong number between 1–7.
              </li>
              <li><strong>Lottery Closing</strong><br />
                Once the current block exceeds the entry period, the lottery can be closed. This can be done:
                <ul>
                  <li>Manually by any user.</li>
                  <li>Automatically by the contract, triggered by specific user actions (see below).</li>
                </ul>
              </li>
              <li><strong>Draw Window (BLOCKS_TO_WAIT_FOR_DRAW)</strong><br />
                     After the lottery is closed, there is a second waiting period (defined by <strong>BLOCKS_TO_WAIT_FOR_DRAW {contractData.BLOCKS_TO_WAIT_FOR_DRAW !== null 
                      ? `= ${contractData.BLOCKS_TO_WAIT_FOR_DRAW}` : ''}</strong> ) before the draw. Once this period has passed, anyone can trigger the draw to pick the winning numbers.
              </li>
              <li><strong>Prize Distribution</strong><br />
                Winners are determined based on how many numbers they matched, and prizes are paid automatically by the smart contract. The prize pool is transparent from the start, with a fee deducted for the smart contract owner  
                <strong>{contractData.commission !== null ? ` (${(contractData.commission)}% of the prize pool)` : ''}</strong>
                . Players who correctly guess all 6 numbers and the <strong>strong number</strong> win the <strong>big prize</strong> 
                <strong>{contractData.percentage_big !== null ? ` (${(contractData.percentage_big)}% of the prize pool)` : ''}</strong>
                       , while those who guess only the 6 numbers win a <strong>small prize</strong> 
                       <strong>{contractData.percentage_small !== null ? ` (${(contractData.percentage_small)}% of the prize pool)` : ''}</strong>
                       . If multiple winners exist for a prize tier, the prize is divided equally among them.
                    <p>
                    <strong>Mini Prize : </strong>
                      In every round, a <strong>mini prize</strong> is awarded, even if no one guesses the winning numbers. This prize is distributed among players who did not win any other prize 
                      <strong>{contractData.percentage_mini !== null ? ` (${(contractData.percentage_mini)}% of the prize pool)` : ''}</strong>
                      . The distribution uses a <strong>softmax function</strong> to assign higher chances to tickets that have been purchased earlier (based on the timestamp when the ticket was purchased).
                    </p>
                      <p>
                    <strong>Claim Prize : </strong>
                      Players can check their pending prizes and claim them at any time after the draw.
                    </p>
              </li>
            </ol>

            <h3>🔒 Security and Number Handling</h3>
            <ul>
              <li>
              As part of the design to ensure fairness and prevent manipulation, each player's selected numbers (6 regular and 1 strong) are not stored in plaintext on-chain. Instead, when a user buys a ticket, the chosen numbers are converted into a <strong>hashed value</strong> (using a secure hash function) and this hash is stored on the smart contract. This prevents anyone from seeing or tampering with the selections before the draw.
            </li>
            <li>
              On the server side, the winning numbers are generated using a secure AWS or cloud function (Lambda). This function returns only the <strong>hashed value</strong> of the winning combination. The comparison between the user’s ticket and the drawn numbers is then done via matching these hash values, ensuring <strong>integrity and security</strong> throughout the process.
            </li>
            <li>
              In addition, since the entire process is governed by <strong>block numbers</strong>, the system is resistant to <strong>front-running attacks</strong> or <strong>brute-force attempts</strong> to guess the winning combination hash. The timing and sequence of each phase are deterministic and verifiable on-chain.
            </li>
            </ul>

            <h3>⚠️ Special Cases and Automatic Behavior</h3>
            <ul>
              <li>Users can <strong>buy a ticket</strong> at any time, even after the entry window has closed.
                <ul>
                  <li>If a user buys a ticket after BLOCKS_TO_WAIT_FOR_CLOSE, the ticket is purchased successfully, but the lottery is <strong>automatically closed immediately afterward</strong>.</li>
                </ul>
              </li>
              <li>If a user tries to <strong>enter a ticket</strong> (select numbers) after the entry window has closed, the ticket is rejected and the lottery is <strong>automatically closed</strong>.</li>
            </ul>

            <p>This ensures the system always progresses without requiring manual intervention.</p>
          </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InfoButton;