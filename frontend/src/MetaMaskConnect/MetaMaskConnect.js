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
            setStatus("Registering player...");
            const registerResult = await contractService.registerPlayer();
            if (registerResult.success) {
                setStatus("Player registered successfully!");
                onConnect(contractService.account);
                navigate('/dashboard');
            }
        } catch (error) {
            setStatus(`Error: ${error.message}`);
        } finally {
            setIsConnecting(false);
        }
    };

    const loginToMetaMask = async () => {
        if (isConnecting) return;
        setIsConnecting(true);
        setStatus("Checking registration status...");

        try {
            await contractService.init();
            const isRegistered = await contractService.isPlayerRegistered(contractService.account);
            if (isRegistered) {
                setStatus("Login successful!");
                onConnect(contractService.account);
                navigate('/dashboard');
            } else {
                setStatus("Player not registered. Please sign up first.");
            }
        } catch (error) {
            setStatus(`Error: ${error.message}`);
        } finally {
            setIsConnecting(false);
        }
    };

    return (
        <div className="auth-nav">
            <button
                onClick={loginToMetaMask}
                disabled={isConnecting}
                className="nav-button login"
            >
                {isConnecting ? "Connecting..." : "Login"}
            </button>
            <button
                onClick={connectToMetaMask}
                disabled={isConnecting}
                className="nav-button register"
            >
                {isConnecting ? "Connecting..." : "Sign Up"}
            </button>
            {status && <div className="status-tooltip">{status}</div>}
        </div>
    );
};

export default MetaMaskConnect;