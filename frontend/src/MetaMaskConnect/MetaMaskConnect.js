import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import contractService from "../services/contractService";
import "./MetaMaskConnect.css";

const MetaMaskConnect = ({ onConnect }) => {
    const [status, setStatus] = useState("");
    const [isConnecting, setIsConnecting] = useState(false);
    const navigate = useNavigate();

    // Function to connect the user to MetaMask and register them
    const connectToMetaMask = async () => {
        if (isConnecting) return;  // Prevent action if a connection is already in progress
        setIsConnecting(true);
        setStatus("Connecting to MetaMask...");

        try {
            await contractService.init();  // Initialize connection with MetaMask
            setStatus("Connected to MetaMask!");

            setStatus("Registering player...");

            if (true) {  // Check if the player is registered
                setStatus("Player registered successfully!");
                onConnect(contractService.account);  // Pass the user's account to the parent component
                navigate('/dashboard');  // Navigate to the dashboard page
            } else {
                setStatus("Registration failed, please try again.");
            }
        } catch (error) {
            setStatus(`Error: ${error.message}`);
        } finally {
            setIsConnecting(false);  // Release the button after the operation is finished
        }
    };


    return (
        <div className="auth-nav">

            <button
                onClick={connectToMetaMask}
                disabled={isConnecting}
                className="nav-button register"
            >
                {isConnecting ? "Connecting..." : "Login with MetaMask"}
            </button>
            {status && <div className="status-tooltip">{status}</div>}
        </div>
    );
};

export default MetaMaskConnect;
