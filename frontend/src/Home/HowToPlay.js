import React, { useRef, useState } from "react";
import "./HowToPlay.css";

const HowToPlay = () => {
  const stepsContainerRef = useRef(null);
  const [currentStep] = useState(0);
  
  // Simplified steps with clearer descriptions
  const steps = [
    {
      icon: "👛",
      title: "Connect Wallet",
      description: "Connect your MetaMask wallet with one click to get started"
    },
    {
      icon: "🎟️",
      title: "Purchase Tickets",
      description: "Buy tickets using ETH from your wallet"
    },
    {
      icon: "🔢",
      title: "Pick Your Numbers",
      description: "Select 6 main numbers (1-37) and 1 strong number (1-7)"
    },
    {
      icon: "⏳",
      title: "Wait for Draw",
      description: "Lottery closes automatically/manually when time limit is reached"
    },
    {
      icon: "🎰",
      title: "Draw Results",
      description: "Winning numbers are selected using verifiable random function"
    },
    {
      icon: "🏆",
      title: "Claim Prizes",
      description: "Match all numbers for jackpot or partial matches for smaller prizes"
    }
  ];

  return (
    <div className="how-to-play-section" id="how-to-play">
      <h2 className="section-title">How to Play</h2>

      <div className="elegant-flow">
        <div className="flow-line"></div>
        
        <div className="steps-container" ref={stepsContainerRef}>
          {steps.map((step, index) => (
            <div 
              key={index} 
              className={`process-step ${index === currentStep ? 'active' : ''}`}
            >
              <div className="step-node">
                <span className="step-number">{index + 1}</span>
                <span className="step-icon">{step.icon}</span>
              </div>
              
              <div className="step-content">
                <h3 className="step-title">{step.title}</h3>
                <p className="step-description">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

      </div>

    </div>
  );
};

export default HowToPlay;