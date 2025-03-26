// Updated contractService.js
import Web3 from 'web3';
import ABI from '../contracts/contractABI.json';

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

class ContractService {
    constructor() {
        this.web3 = null;
        this.contract = null;
        this.account = null;
        this.eventSubscription = null;
        this.listeners = [];
        this.blockStatusListeners = [];
        this.initialized = false; // Track initialization state
        this.initPromise = null; // Store the initialization promise   
    }

    // Add a method to register lottery status listeners
    addLotteryStatusListener(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(listener => listener !== callback);
        };
    }

    // Add a method to register block status listeners
    addBlockStatusListener(callback) {
        this.blockStatusListeners.push(callback);
        return () => {
            this.blockStatusListeners = this.blockStatusListeners.filter(listener => listener !== callback);
        };
    }

    // Notify all registered listeners
    notifyLotteryStatusListeners(isOpen) {
        this.listeners.forEach(listener => {
            try {
                listener(isOpen);
            } catch (error) {
                console.error("Error in lottery status listener:", error);
            }
        });
        
        // Also dispatch a custom event for cross-tab synchronization
        const event = new CustomEvent('lotteryStatusUpdated', { 
            detail: { isOpen },
            bubbles: true
        });
        window.dispatchEvent(event);
    }

    // Notify all block status listeners
    notifyBlockStatusListeners( blocksUntilClose, blocksUntilDraw) {
        this.blockStatusListeners.forEach(listener => {
            try {
                listener( blocksUntilClose, blocksUntilDraw);
            } catch (error) {
                console.error("Error in block status listener:", error);
            }
        });
        
        // Also dispatch a custom event for cross-tab synchronization
        const event = new CustomEvent('blockStatusUpdated', { 
            detail: { blocksUntilClose, blocksUntilDraw },
            bubbles: true
        });
        window.dispatchEvent(event);
    }

    // In the init method, reduce verbose logging
    async init() {
        // If already initialized, return the existing promise or true if completed
        if (this.initialized) return true;
        if (this.initPromise) return this.initPromise;

        // Create a new initialization promise
        this.initPromise = new Promise(async (resolve, reject) => {
            if (window.ethereum) {
                try {
                    this.web3 = new Web3(window.ethereum);
                    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                    this.account = accounts[0];

                    this.contract = new this.web3.eth.Contract(ABI, CONTRACT_ADDRESS);

                    window.ethereum.on('accountsChanged', (accounts) => {
                        this.account = accounts[0];
                        window.location.reload();
                    });

                    try {
                        await this.setupEventListeners();
                        
                        // Check and notify current lottery status on initialization
                        try {
                            const currentLotteryStatus = await this.isLotteryActive();
                            this.notifyLotteryStatusListeners(currentLotteryStatus);
                        } catch (statusError) {
                            console.warn("Failed to get initial lottery status:", statusError);
                        }
                        
                    } catch (eventError) {
                        console.warn("Event setup failed:", eventError.message);
                    }

                    this.initialized = true;
                    resolve(true);
                } catch (error) {
                    this.initPromise = null; // Clear promise on failure
                    reject(new Error(`Initialization failed: ${error.message}`));
                }
            } else {
                this.initPromise = null; // Clear promise on failure
                reject(new Error("MetaMask is not installed"));
            }
        });

        return this.initPromise;
    }
    
    // In the setupEventListeners method
    async setupEventListeners() {
        if (this.contract && this.contract.events) {
            // Check if we already have active subscriptions
            if (this._blockStatusSubscription || this._lotteryStatusSubscription) {
                console.warn("Event listeners already set up, skipping duplicate setup");
                return;
            }
            
            try {
                // Listen for BlockStatusUpdated events
                this._blockStatusSubscription = this.contract.events.BlockStatusUpdated({
                    fromBlock: 'latest'
                })
                .on('data', (event) => {
                    const blocksUntilClose = event.returnValues.blocksUntilClose || event.returnValues[0];
                    const blocksUntilDraw = event.returnValues.blocksUntilDraw || event.returnValues[1];
                    
                    this.notifyBlockStatusListeners(
                        blocksUntilClose.toString(), 
                        blocksUntilDraw.toString()
                    );
                    
                    // Also check lottery status when block updates
                    this.checkAndUpdateLotteryStatus();
                })
                .on('error', (error) => {
                    console.error("Error in BlockStatusUpdated event:", error);
                    this._blockStatusSubscription = null; // Reset subscription on error
                });
                
                // Listen for LotteryRoundStatusChanged events
                this._lotteryStatusSubscription = this.contract.events.LotteryRoundStatusChanged({
                    fromBlock: 'latest'
                })
                .on('data', (event) => {
                    // Extract the isOpen value correctly, handling both named and positional return values
                    let isOpen;
                    if (event.returnValues.hasOwnProperty('isOpen')) {
                        isOpen = event.returnValues.isOpen;
                    } else if (event.returnValues[0] !== undefined) {
                        isOpen = event.returnValues[0];
                    } else {
                        console.error("Unable to extract isOpen value from event:", event);
                        return;
                    }
                    
                    // Notify all listeners of the status change
                    this.notifyLotteryStatusListeners(isOpen);
                })
                .on('error', (error) => {
                    console.error("Error in LotteryRoundStatusChanged event:", error);
                    this._lotteryStatusSubscription = null; // Reset subscription on error
                });
                
            } catch (error) {
                console.error("Failed to set up event listeners:", error);
                this._blockStatusSubscription = null;
                this._lotteryStatusSubscription = null;
            }
        } else {
            console.warn("Contract events not available, skipping event setup");
        }
    }

    // New method to check and update lottery status
    async checkAndUpdateLotteryStatus() {
        try {
            const isActive = await this.isLotteryActive();
            // Only log status changes or in development mode with low frequency
            if (this._lastLotteryStatus !== isActive || 
                (process.env.NODE_ENV === 'development' && Math.random() < 0.1)) {
                this._lastLotteryStatus = isActive;
            }
            this.notifyLotteryStatusListeners(isActive);
        } catch (error) {
            console.error("Failed to check lottery status:", error);
        }
    }
        
    async isLotteryActive() {
        try {
            const isActive = await this.contract.methods.isLotteryActive().call();
            return isActive;
        } catch (error) {
            throw new Error(`Error checking if lottery is active: ${error.message}`);
        }
    }

    async getAllLotteryRoundsInfo() {
        try {
            const result = await this.contract.methods.getAllLotteryRoundsInfo().call();
            
            // Process the result to ensure proper handling of complex types
            return {
                roundNumbers: Array.isArray(result.roundNumbers) 
                    ? result.roundNumbers.map(num => num.toString()) 
                    : [],
                totalPrizePools: Array.isArray(result.totalPrizePools) 
                    ? result.totalPrizePools.map(pool => pool.toString()) 
                    : [],
                participantsList: Array.isArray(result.participantsList) 
                    ? result.participantsList.map(list => Array.isArray(list) ? list : []) 
                    : [],
                winners: Array.isArray(result.winners) ? result.winners : [],
                Statuses: Array.isArray(result.Statuses) 
                    ? result.Statuses.map(status => parseInt(status)) 
                    : []
            };
        } catch (error) {
            console.error("Error in getAllLotteryRoundsInfo:", error);
            throw new Error(`Error fetching lottery rounds info: ${error.message}`);
        }
    }

    async getLotteryBlockStatus() {
        try {
            const result = await this.contract.methods.getLotteryBlockStatus().call();
            return {
                blocksUntilClose: parseInt(result.blocksUntilClose, 10),
                blocksUntilDraw: parseInt(result.blocksUntilDraw, 10)
            };
        } catch (error) {
            throw new Error(`Error fetching lottery block status: ${error.message}`);
        }
}

    async getTicketPrice() {
        try {
            const price = await this.contract.methods.getTicketPrice().call();
            return this.web3.utils.fromWei(price.toString(), 'ether');
        } catch (error) {
            throw new Error(`Error fetching ticket price: ${error.message}`);
        }
    }

    async purchaseTicket() {
        try {
            const ticketPrice = await this.contract.methods.getTicketPrice().call();
            await this.contract.methods.purchaseTicket().send({
                from: this.account,
                value: ticketPrice
            });
    
            return { success: true };
        } catch (error) {
            throw new Error(`Ticket purchase failed: ${error.message}`);
        }
    }


    async getActiveTickets() {
        try {
            const tickets = await this.contract.methods.getActiveTickets().call({ from: this.account });
            return tickets;
        } catch (error) {
            throw new Error(`Error fetching active tickets: ${error.message}`);
        }
    }

    async closeLotteryRound() {
        try {
            const result = await this.contract.methods.closeLotteryRound().send({ from: this.account });
            // Force immediate status check
            await this.checkAndUpdateLotteryStatus();
            // And check again after a delay to ensure it propagates
            setTimeout(() => this.checkAndUpdateLotteryStatus(), 2000);
            return { success: true, transactionHash: result.transactionHash };
        } catch (error) {
            throw new Error(`Failed to close lottery: ${error.message}`);
        }
    }

    async selectTicketsForLottery(ticketId, ticketHash, ticketHashWithStrong) {
        try {
            // Convert the first ticket ID to a string to handle BigInt
            ticketHash = "0x" + ticketHash;
            ticketHashWithStrong = "0x" + ticketHashWithStrong;
            await this.contract.methods.selectTicketsForLottery(ticketId, ticketHash, ticketHashWithStrong).send({ from: this.account });
            return { success: true };
        } catch (error) {
            throw new Error(`Error selecting tickets for lottery: ${error.message}`);
        }
    }   

    async drawLotteryWinner() {
        try {
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
            // Send transaction to the smart contract with hashes as arguments
            const result = await this.contract.methods.drawLotteryWinner(keccak256HashNumbers, keccak256HashFull)
                .send({ from: this.account });
    
            return { success: true, result };
        } catch (error) {
            throw new Error(`Error drawing lottery winner: ${error.message}`);
        }
    }
    

    async setTicketPrice(newPrice) {
        try {
            const weiPrice = this.web3.utils.toWei(newPrice.toString(), 'ether');
            await this.contract.methods.setTicketPrice(weiPrice).send({ from: this.account });
            return { success: true };
        } catch (error) {
            throw new Error(`Error setting ticket price: ${error.message}`);
        }
    }
    
    async getPlayerTickets(playerAddress) {
        try {
            const tickets = await this.contract.methods.getPlayerTickets(playerAddress).call();
            return tickets; 
        } catch (error) {
            throw new Error(`Failed to get player tickets: ${error.message}`);
        }
    }    
}

const contractService = new ContractService();
export default contractService;