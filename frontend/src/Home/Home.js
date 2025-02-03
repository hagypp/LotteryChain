import React from "react";
import MetaMaskConnect from "../MetaMaskConnect/MetaMaskConnect";
import "./Home.css"; 

const Home = ({ onConnect }) => {  
  const features = [
    {
      icon: "🔒",
      title: "Transparent & Secure",
      description: "Every transaction is recorded on the blockchain, ensuring complete fairness and security."
    },
    {
      icon: "💎",
      title: "Easy to Play",
      description: "Connect your MetaMask wallet and start purchasing tickets instantly using Ethereum (ETH)."
    },
    {
      icon: "🎯",
      title: "Better Odds",
      description: "Increase your winning chances by purchasing multiple tickets."
    },
    {
      icon: "🤖",
      title: "Smart Contract Powered",
      description: "Automated and tamper-proof lottery draws guarantee fair results for all players."
    }
  ];

  return (
    <div className="main">
      <h1 className="title">🎰 Lottery Ticket Game</h1>
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

        <p className="ready-text">Ready to Try Your Luck? 🍀</p>
      </div>

      <MetaMaskConnect onConnect={onConnect} />

      <footer className="footer">
        <p>Powered by Blockchain Technology 🌐</p>
        <p>Designed for Fun and Fairness!</p>
      </footer>
    </div>
  );
};

export default Home;