import React from "react";
import MetaMaskConnect from "../MetaMaskConnect/MetaMaskConnect";
import "./Home.css"; 

const Home = ({ onConnect }) => {  
  return (
    <div className="main">
      <h1 className="title">🎰 Lottery Ticket Game</h1>
      <p className="subtitle">Experience the Future of Fair Gaming</p>

      <div className="explanation-text">
        <p>
          Welcome to a revolutionary gaming experience powered by{" "}
          <span className="highlight">blockchain technology</span> and secured
          by <span className="highlight">smart contracts</span>. Our platform
          offers:
        </p>
        <div className="feature-item">
          🔒 <span className="highlight">Transparent & Secure:</span> Every
          transaction is recorded on the blockchain, ensuring complete fairness
          and security.
        </div>
        <div className="feature-item">
          💎 <span className="highlight">Easy to Play:</span> Connect your
          MetaMask wallet and start purchasing tickets instantly using Ethereum
          (ETH).
        </div>
        <div className="feature-item">
          🎯 <span className="highlight">Better Odds:</span> Increase your
          winning chances by purchasing multiple tickets, with all odds clearly
          displayed.
        </div>
        <div className="feature-item">
          🤖 <span className="highlight">Smart Contract Powered:</span> Automated
          and tamper-proof lottery draws guarantee fair results for all players.
        </div>
        <p className="ready-text">Ready to Try Your Luck? 🍀</p>
      </div>

      <MetaMaskConnect onConnect={onConnect} />  {/* העברנו את ה-prop הלאה */}

      <footer className="footer">
        <p>Powered by Blockchain Technology 🌐</p>
        <p>Designed for Fun and Fairness!</p>
      </footer>
    </div>
  );
};

export default Home;