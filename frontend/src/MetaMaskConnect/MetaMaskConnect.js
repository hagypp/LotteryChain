import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import contractService from "../services/contractService"; // Make sure the path is correct

const MetaMaskConnect = ({ onConnect }) => {
  const [status, setStatus] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const navigate = useNavigate();

  const connectMetaMask = async () => {
    try {
      if (!window.ethereum) {
        throw new Error("MetaMask is not installed!");
      }
      
      await contractService.init();
      setIsConnected(true);
      setStatus(`Connected: ${contractService.account.substring(0, 6)}...${contractService.account.slice(-4)}`);
      onConnect(contractService.account);
      navigate('/dashboard');
    } catch (error) {
      console.error(error);
      setStatus(error.message);
      setIsConnected(false);
    }
  };

  return (
    <div style={{ textAlign: "center" }}>
      <button
        onClick={connectMetaMask}
        style={{
          background: "linear-gradient(45deg, #3498DB, #2980B9)",
          color: "white",
          padding: "12px 30px",
          border: "none",
          borderRadius: "12px",
          cursor: "pointer",
          fontFamily: "'Poppins', sans-serif",
          fontSize: "1.2rem",
          fontWeight: "500",
          width: "300px",
          margin: "20px auto",
          display: "block",
          transition: "all 0.3s ease",
        }}
      >
        {isConnected ? "Connected" : "Connect MetaMask"}
      </button>
      <p>{status}</p>
    </div>
  );
};

export default MetaMaskConnect;