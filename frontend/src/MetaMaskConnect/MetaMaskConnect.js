import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import contractService from "../services/contractService";
import "./MetaMaskConnect.css";

const MetaMaskConnect = ({ onConnect }) => {
  const [status, setStatus] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const navigate = useNavigate();

  const connectToMetaMask = async () => {
    if (isConnecting) return;

    setIsConnecting(true);
    setStatus("Connecting to MetaMask...");

    try {
      await contractService.init();
      setStatus("Connected to MetaMask!");

      // Pass the account to the parent component and navigate to the dashboard
      onConnect(contractService.account);
      navigate('/dashboard');
    } catch (error) {
      setStatus(`Error: ${error.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="metamask-container">
      <button
        onClick={connectToMetaMask}
        disabled={isConnecting}
        className="connect-button"
      >
        {isConnecting ? "Connecting..." : "Connect to MetaMask"}
      </button>
      <p className="status-message">{status}</p>
    </div>
  );
};

export default MetaMaskConnect;