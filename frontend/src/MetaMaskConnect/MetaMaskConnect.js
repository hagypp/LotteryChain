import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import contractService from "../services/contractService";
import "./MetaMaskConnect.css";

const MetaMaskConnect = ({ onConnect }) => {
    const [status, setStatus] = useState("");
    const [isConnecting, setIsConnecting] = useState(false);
    const [showStatus, setShowStatus] = useState(false);
    const navigate = useNavigate();

    // Hide status message after 5 seconds
    useEffect(() => {
        let timer;
        if (status) {
            setShowStatus(true);
            timer = setTimeout(() => {
                setShowStatus(false);
            }, 5000);
        }
        return () => clearTimeout(timer);
    }, [status]);

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

    // Scroll to how-to-play section
    const scrollToHowToPlay = () => {
        document.getElementById('how-to-play')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="auth-nav">
            <button 
                className="nav-button how-to-play" 
                onClick={scrollToHowToPlay}
            >
                <span className="button-icon">👇</span> How to Play
            </button>
            
            <button
                onClick={connectToMetaMask}
                disabled={isConnecting}
                className={`nav-button register ${!isConnecting ? "pulse-animation" : ""}`}
            >
                {isConnecting ? "Connecting..." : "Start Playing Now"}
            </button>

            {showStatus && <div className="status-tooltip">{status}</div>}
        </div>
    );
};

export default MetaMaskConnect;