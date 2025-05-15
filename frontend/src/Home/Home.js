import React from "react";
import MetaMaskConnect from "../MetaMaskConnect/MetaMaskConnect";
import "./Home.css"; 
import "../MetaMaskConnect/MetaMaskConnect.css";
import InfoButton from '../Dashboard/InfoButton';
// import ExchangeButton from "../Dashboard/ExchangeButton";
import HowToPlay from "./HowToPlay"; 

const Home = ({ onConnect }) => {  
  const features = [
    {
      icon: "🔒",
      title: "Transparent & Secure",
      description: "Every transaction is recorded on the blockchain, ensuring complete fairness and security"
    },
    {
      icon: "💎",
      title: "Easy to Play",
      description: "Connect your MetaMask wallet and start purchasing tickets instantly using Ethereum (ETH)"
    },
    {
      icon: "🎯",
      title: "Better Odds",
      description: "Increase your winning chances by purchasing multiple tickets"
    },
    {
      icon: "🤖",
      title: "Smart Contract Powered",
      description: "Automated, transparent, tamper-proof, and distributed lottery draws guarantee fair and transparent results for all players"
    }
  ];
  const steps = [
    {
      icon: "👛",
      title: "Connect Wallet",
      description: "Use the Login with MetaMask button to connect your wallet securely"
    },
    {
      icon: "🎟️",
      title: "Buy Ticket",
      description: "You can buy tickets any time"
    },
    {
      icon: "🔢",
      title: "Choose Numbers",
      description: "Pick 6 numbers between 1–37 and 1 strong number between 1–7 and your ticket is ready! you can choose numbers only when the lottery is open"
    },
    {
      icon: "⏳",
      title: "Trigger Close",
      description: "Any user can close the lottery if the block number is eligible"
    },
    {
      icon: "🚫",
      title: "Lottery Closes",
      description: "Once the lottery closes, no more entries are accepted for this round"
    },
    {
      icon: "🎰",
      title: "Draw Numbers",
      description: "After a set number of blocks, anyone can trigger the draw to pick winners"
    },
    {
      icon: "🏆",
      title: "Win Big",
      description: "Match all 6 numbers and the strong number to win the big prize !"
    },
    {
      icon: "🥈",
      title: "Small Prize",
      description: "Match 6 numbers (without the strong number) to win the small prize !"
    },
    {
      icon: "🥉",
      title: "mini Prize",
      description: "In every round, a mini prize is awarded, even if no one guesses the winning numbers. This prize is distributed randomly among players who did not win any other prize. The distribution uses a softmax function to assign higher chances to tickets that have been purchased earlier."
    },
    {
      icon: "💸",
      title: "Automatic Payout",
      description: "The prize pool is transparent from the start. If you win, the smart contract sends your prize directly to your wallet."
  
  // Function to connect the user to MetaMask
  const handleStartPlaying = () => {
    // Find the MetaMaskConnect component and trigger its connectToMetaMask function
    const metamaskButton = document.querySelector(".nav-button.register");
    if (metamaskButton) {
      metamaskButton.click();
    }
  };
  
  return (
    <div className="main">
      <h1 className="title">🎰 Lottery Chain Game</h1>
      <p className="subtitle">Experience the Future of Fair Gaming</p>

      <div className="explanation-text">
        <p>
          Welcome to a revolutionary gaming experience powered by{" "}
          <span className="highlight">blockchain technology</span> and secured
          by <span className="highlight">smart contracts</span>.
        </p>
        
        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-item">
              <div className="feature-icon">{feature.icon}</div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="cta-container">
        <MetaMaskConnect onConnect={onConnect} />
      </div>
    
      <HowToPlay />
      
      {/* Bottom CTA Button */}
      <div className="bottom-cta-container">
        <p className="ready-text">Ready to try your luck?</p>
        <button onClick={handleStartPlaying} className="start-game-button">
          Start Playing Now! 
        </button>
      </div>
      
      <div className="floating-buttons">
        <InfoButton />
//         <ExchangeButton />
      </div>
    </div>
  );
};

export default Home;