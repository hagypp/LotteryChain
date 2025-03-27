// Updated contractService.js with Dual Providers (MetaMask + WebSocket)
import Web3 from 'web3';
import ABI from '../contracts/contractABI.json';

// Contract address (update this when moving to testnet/mainnet)
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

const WS_PROVIDER_URL = 'ws://127.0.0.1:8545';

class ContractService {
    constructor() {
        this.web3MM = null; // Metamask Web3
        this.web3WS = null; // WebSocket Web3

        this.contractMM = null; // Contract instance for MetaMask
        this.contractWS = null; // Contract instance for WebSocket

        this.account = null;

        this.listeners = [];
        this.blockStatusListeners = [];

        this.initialized = false;
        
        // Initialize Web3 with a fallback HTTP provider to ensure utils is always available
        this.web3 = new Web3('http://localhost:8545');
    }

    // Listener management
    addLotteryStatusListener(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(listener => listener !== callback);
        };
    }

    addBlockStatusListener(callback) {
        this.blockStatusListeners.push(callback);
        return () => {
            this.blockStatusListeners = this.blockStatusListeners.filter(listener => listener !== callback);
        };
    }

    notifyLotteryStatusListeners(isOpen) {
        this.listeners.forEach(listener => {
            try {
                listener(isOpen);
            } catch (error) {
                console.error("Error in lottery status listener:", error);
            }
        });

        const event = new CustomEvent('lotteryStatusUpdated', { 
            detail: { isOpen },
            bubbles: true
        });
        window.dispatchEvent(event);
    }

    notifyBlockStatusListeners(blocksUntilClose, blocksUntilDraw) {
        this.blockStatusListeners.forEach(listener => {
            try {
                listener(blocksUntilClose, blocksUntilDraw);
            } catch (error) {
                console.error("Error in block status listener:", error);
            }
        });

        const event = new CustomEvent('blockStatusUpdated', { 
            detail: { blocksUntilClose, blocksUntilDraw },
            bubbles: true
        });
        window.dispatchEvent(event);
    }

    // Initialization: MetaMask + WebSocket
    async init() {
        if (this.initialized) return true;

        try {
            // 1. Initialize MetaMask Provider
            if (window.ethereum) {
                this.web3MM = new Web3(window.ethereum);
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                this.account = accounts[0];

                this.contractMM = new this.web3MM.eth.Contract(ABI, CONTRACT_ADDRESS);
                
                // Use MetaMask's Web3 instance as the main web3 object
                this.web3 = this.web3MM;

                window.ethereum.on('accountsChanged', (accounts) => {
                    this.account = accounts[0];
                    window.location.reload();
                });
            } else {
                console.warn("MetaMask is not installed, some features may not work");
            }

            // 2. Initialize WebSocket Provider - with error handling
            await this.initWebSocketProvider();

            this.initialized = true;
            return true;
        } catch (error) {
            console.error("❌ Initialization failed:", error);
            throw error;
        }
    }
    
    async initWebSocketProvider() {
        try {
            // Create a new WebSocketProvider
            const wsProvider = new Web3.providers.WebsocketProvider(WS_PROVIDER_URL);
            
            // Add event handlers to the provider
            wsProvider.on('connect', () => {
                console.log('✅ WebSocket connected');
            });
            
            wsProvider.on('error', (error) => {
                console.error('❌ WebSocket error:', error);
            });
            
            wsProvider.on('end', () => {
                console.log('WebSocket connection ended');
                setTimeout(() => this.reconnectWebSocket(), 5000);
            });
            
            // Create Web3 instance with websocket provider
            this.web3WS = new Web3(wsProvider);
            
            // Create contract instance
            this.contractWS = new this.web3WS.eth.Contract(ABI, CONTRACT_ADDRESS);
            
            // Test if the contract exists and has necessary methods
            const isActive = await this.contractWS.methods.isLotteryActive().call();
            console.log("Contract connection test - isLotteryActive:", isActive);
            
            // If WebSocketProvider is working but MetaMask isn't, use it as main web3
            if (!this.web3MM) {
                this.web3 = this.web3WS;
            }
            
            // Only proceed to set up event listeners if we got this far
            await this.setupEventListeners();
            
            return true;
        } catch (wsError) {
            console.error("❌ WebSocket initialization failed:", wsError);
            console.log("Continuing with MetaMask provider only");
            return false;
        }
    }

    async reconnectWebSocket() {
        console.log("Attempting to reconnect WebSocket...");
        await this.initWebSocketProvider();
    }

    async setupEventListeners() {
        if (!this.contractWS) {
            console.warn("WebSocket contract not available");
            return false;
        }

        try {
            // Set up individual event subscriptions manually instead of using
            // the contract.events property directly
            
            // For BlockStatusUpdated
            const blockStatusSubscription = await this.web3WS.eth.subscribe('logs', {
                address: CONTRACT_ADDRESS,
                topics: [this.web3WS.utils.sha3('BlockStatusUpdated(uint256,uint256)')]
            });
            
            console.log('BlockStatusUpdated subscription ID:', blockStatusSubscription.id);
            
            blockStatusSubscription.on('data', (log) => {
                // Decode the log data
                const decodedLog = this.web3WS.eth.abi.decodeLog(
                    [
                        { indexed: false, name: 'blocksUntilClose', type: 'uint256' },
                        { indexed: false, name: 'blocksUntilDraw', type: 'uint256' }
                    ],
                    log.data,
                    log.topics.slice(1)
                );
                
                console.log("BlockStatusUpdated:", decodedLog.blocksUntilClose, decodedLog.blocksUntilDraw);
                this.notifyBlockStatusListeners(
                    decodedLog.blocksUntilClose, 
                    decodedLog.blocksUntilDraw
                );
            });
            
            blockStatusSubscription.on('error', (error) => {
                console.error("BlockStatusUpdated subscription error:", error);
            });
            
            // For LotteryRoundStatusChanged
            const lotteryStatusSubscription = await this.web3WS.eth.subscribe('logs', {
                address: CONTRACT_ADDRESS,
                topics: [this.web3WS.utils.sha3('LotteryRoundStatusChanged(bool)')]
            });
            
            console.log('LotteryRoundStatusChanged subscription ID:', lotteryStatusSubscription.id);
            
            lotteryStatusSubscription.on('data', (log) => {
                // Decode the log data
                const decodedLog = this.web3WS.eth.abi.decodeLog(
                    [{ indexed: false, name: 'isOpen', type: 'bool' }],
                    log.data,
                    log.topics.slice(1)
                );
                
                console.log("LotteryRoundStatusChanged:", decodedLog.isOpen);
                this.notifyLotteryStatusListeners(decodedLog.isOpen);
            });
            
            lotteryStatusSubscription.on('error', (error) => {
                console.error("LotteryRoundStatusChanged subscription error:", error);
            });
    
            console.log("✅ Event listeners set on WebSocketProvider");
            return true;
        } catch (error) {
            console.error("❌ Failed to set up event listeners on WebSocketProvider:", error);
            return false;
        }
    }

    disconnectWebSocket() {
        if (this.web3WS && this.web3WS.currentProvider) {
            this.web3WS.currentProvider.disconnect();
            console.log("Disconnected WebSocket Provider");
        }
    }

    // Utility method to get the best available web3 instance
    getWeb3() {
        return this.web3MM || this.web3WS || this.web3;
    }

    // Contract method wrappers (MetaMask account required for writes)
    // Use getWeb3() to ensure we always have a valid Web3 instance with utils

    async isLotteryActive() {
        try {
            const contract = this.contractMM || this.contractWS;
            if (!contract) {
                throw new Error("No contract instance available");
            }
            const isActive = await contract.methods.isLotteryActive().call();
            return isActive;
        } catch (error) {
            throw new Error(`Error checking if lottery is active: ${error.message}`);
        }
    }

    async getTicketPrice() {
        try {
            const contract = this.contractMM || this.contractWS;
            const web3 = this.getWeb3();
            
            if (!contract || !web3) {
                throw new Error("No contract or Web3 instance available");
            }
            
            const price = await contract.methods.getTicketPrice().call();
            return web3.utils.fromWei(price.toString(), 'ether');
        } catch (error) {
            throw new Error(`Error fetching ticket price: ${error.message}`);
        }
    }

    async purchaseTicket() {
        try {
            if (!this.contractMM || !this.account) {
                throw new Error("Contract not initialized or account not connected");
            }
            const ticketPrice = await this.contractMM.methods.getTicketPrice().call();
            await this.contractMM.methods.purchaseTicket().send({
                from: this.account,
                value: ticketPrice
            });
            return { success: true };
        } catch (error) {
            throw new Error(`Ticket purchase failed: ${error.message}`);
        }
    }

    async openLotteryRound() {
        try {
            if (!this.contractMM || !this.account) {
                throw new Error("Contract not initialized or account not connected");
            }
            const result = await this.contractMM.methods.startNewLotteryRound().send({ from: this.account });
            return { success: true, transactionHash: result.transactionHash };
        } catch (error) {
            throw new Error(`Error starting a new lottery round: ${error.message}`);
        }
    }

    async closeLotteryRound() {
        try {
            if (!this.contractMM || !this.account) {
                throw new Error("Contract not initialized or account not connected");
            }
            const result = await this.contractMM.methods.closeLotteryRound().send({ from: this.account });
            return { success: true, transactionHash: result.transactionHash };
        } catch (error) {
            throw new Error(`Failed to close lottery: ${error.message}`);
        }
    }

    async selectTicketsForLottery(ticketId, ticketHash, ticketHashWithStrong) {
        try {
            if (!this.contractMM || !this.account) {
                throw new Error("Contract not initialized or account not connected");
            }
            // Ensure proper hex formatting
            if (!ticketHash.startsWith('0x')) {
                ticketHash = "0x" + ticketHash;
            }
            if (!ticketHashWithStrong.startsWith('0x')) {
                ticketHashWithStrong = "0x" + ticketHashWithStrong;
            }
            await this.contractMM.methods.selectTicketsForLottery(ticketId, ticketHash, ticketHashWithStrong).send({ from: this.account });
            return { success: true };
        } catch (error) {
            throw new Error(`Error selecting tickets for lottery: ${error.message}`);
        }
    }

    async drawLotteryWinner() {
        try {
            if (!this.contractMM || !this.account) {
                throw new Error("Contract not initialized or account not connected");
            }
    
            // Fetch random number data from API
            const response = await fetch("https://h431j7ev85.execute-api.eu-north-1.amazonaws.com/randomNum/random");
            const data = await response.json();
    
            // Parse the response body (since it's double-stringified in the API response)
            const parsedBody = JSON.parse(data.body);
    
            let keccak256HashNumbers = parsedBody.keccak256_hash_numbers;
            let keccak256HashFull = parsedBody.keccak256_hash_full;
            keccak256HashNumbers = "0x" + keccak256HashNumbers;
            keccak256HashFull = "0x" + keccak256HashFull;
            console.log('Hashes:', keccak256HashNumbers, keccak256HashFull);
    
            // Use contractMM for the transaction
            const result = await this.contractMM.methods.drawLotteryWinner(keccak256HashNumbers, keccak256HashFull)
                .send({ from: this.account });
    
            return { success: true, result };
        } catch (error) {
            throw new Error(`Error drawing lottery winner: ${error.message}`);
        }
    }
    
    

    async setTicketPrice(newPrice) {
        try {
            if (!this.contractMM || !this.account) {
                throw new Error("Contract not initialized or account not connected");
            }
            
            const web3 = this.getWeb3();
            const weiPrice = web3.utils.toWei(newPrice.toString(), 'ether');
            
            await this.contractMM.methods.setTicketPrice(weiPrice).send({ from: this.account });
            return { success: true };
        } catch (error) {
            throw new Error(`Error setting ticket price: ${error.message}`);
        }
    }

    async getPlayerTickets(playerAddress) {
        try {
            const contract = this.contractMM || this.contractWS;
            if (!contract) {
                throw new Error("No contract instance available");
            }
            const tickets = await contract.methods.getPlayerTickets(playerAddress).call();
            return tickets; 
        } catch (error) {
            throw new Error(`Failed to get player tickets: ${error.message}`);
        }
    }

    async getLotteryBlockStatus() {
        try {
            const contract = this.contractMM || this.contractWS;
            if (!contract) {
                throw new Error("No contract instance available");
            }
            const status = await contract.methods.getLotteryBlockStatus().call();
            return {
                blocksUntilClose: status.blocksUntilClose.toString(),
                blocksUntilDraw: status.blocksUntilDraw.toString()
            };
        } catch (error) {
            throw new Error(`Failed to get lottery block status: ${error.message}`);
        }
    }

    async getAllLotteryRoundsInfo() {
        try {
            const contract = this.contractMM || this.contractWS;
            const web3 = this.getWeb3();
            
            if (!contract) {
                throw new Error("No contract instance available");
            }
            
            if (!web3 || !web3.utils) {
                throw new Error("Web3 utils not available");
            }
            
            const result = await contract.methods.getAllLotteryRoundsInfo().call();
            console.log("Raw rounds:", result);
            
            // Ensure we have at least the basic required structure
            const processedResult = {
                roundNumbers: [],
                totalPrizePools: [],
                participantsList: [],
                smallPrizeWinnersList: [],
                bigPrizeWinnersList: [],
                statuses: []
            };
    
            // Safely access and process data
            if (result.roundNumbers && result.roundNumbers.length > 0) {
                processedResult.roundNumbers = result.roundNumbers.map(num => num.toString());
                processedResult.totalPrizePools = result.totalPrizePools.map(pool => pool.toString());
                processedResult.statuses = result.Statuses ? result.Statuses.map(status => status.toString()) : [];
                
                // Safely process lists with fallback to empty arrays
                processedResult.participantsList = result.participantsList 
                    ? result.participantsList.map(list => Array.isArray(list) ? list : []) 
                    : [];
                
                processedResult.smallPrizeWinnersList = result.smallPrizeWinnersList
                    ? result.smallPrizeWinnersList.map(list => Array.isArray(list) ? list : [])
                    : [];
                
                processedResult.bigPrizeWinnersList = result.bigPrizeWinnersList
                    ? result.bigPrizeWinnersList.map(list => Array.isArray(list) ? list : [])
                    : [];
            }
    
            console.log("Processed rounds info:", processedResult);
            return processedResult;
        } catch (error) {
            console.error("Error in getAllLotteryRoundsInfo:", error);
            throw new Error(`Error fetching lottery rounds info: ${error.message}`);
        }
    }
}

const contractService = new ContractService();
export default contractService;