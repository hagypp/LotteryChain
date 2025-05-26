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
        this.winnersAnnouncedListeners = [];
        this.ticketEnteredListeners = []; // New listener array for ticket entry events

        this.initialized = false;
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

    addWinnersAnnouncedListener(callback) {
        this.winnersAnnouncedListeners.push(callback);
        return () => {
            this.winnersAnnouncedListeners = this.winnersAnnouncedListeners.filter(listener => listener !== callback);
        };
    }

    // New method to add ticket entered listeners
    addTicketEnteredListener(callback) {
        this.ticketEnteredListeners.push(callback);
        return () => {
            this.ticketEnteredListeners = this.ticketEnteredListeners.filter(listener => listener !== callback);
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


    notifyWinnersAnnouncedListeners(smallPrizeWinners, bigPrizeWinners) {    
        this.winnersAnnouncedListeners.forEach(listener => {
            try {
                listener({ smallPrizeWinners, bigPrizeWinners });
            } catch (error) {
                console.error("Error in winners announced listener:", error);
            }
        });

        const event = new CustomEvent('winnersAnnounced', { 
            detail: { smallPrizeWinners, bigPrizeWinners },
            bubbles: true
        });
        window.dispatchEvent(event);
    }
    
    // New method to notify ticket entered listeners
    notifyTicketEnteredListeners(roundNumber, totalTickets, prizePool) {    
        this.ticketEnteredListeners.forEach(listener => {
            try {
                listener({ roundNumber, totalTickets, prizePool });
            } catch (error) {
                console.error("Error in ticket entered listener:", error);
            }
        });
    
        const event = new CustomEvent('ticketEntered', { 
            detail: { roundNumber, totalTickets, prizePool },
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
            console.error("Initialization failed:", error);
            throw error;
        }
    }
    
    async initWebSocketProvider() {
        try {
            // Create a new WebSocketProvider
            const wsProvider = new Web3.providers.WebsocketProvider(WS_PROVIDER_URL);
                    
            wsProvider.on('error', (error) => {
                console.error('WebSocket error:', error);
            });
            
            wsProvider.on('end', () => {
                setTimeout(() => this.reconnectWebSocket(), 5000);
            });
            
            // Create Web3 instance with websocket provider
            this.web3WS = new Web3(wsProvider);
            
            // Create contract instance
            this.contractWS = new this.web3WS.eth.Contract(ABI, CONTRACT_ADDRESS);
            
            // If WebSocketProvider is working but MetaMask isn't, use it as main web3
            if (!this.web3MM) {
                this.web3 = this.web3WS;
            }
            
            // Only proceed to set up event listeners if we got this far
            await this.setupEventListeners();
            
            return true;
        } catch (wsError) {
            console.error("WebSocket initialization failed:", wsError);
            return false;
        }
    }

    async reconnectWebSocket() {
        await this.initWebSocketProvider();
    }

    async setupEventListeners() {
        if (!this.contractWS) {
            console.warn("WebSocket contract not available");
            return false;
        }

        try {
            const blockStatusSubscription = await this.web3WS.eth.subscribe('logs', {
                address: CONTRACT_ADDRESS,
                topics: [this.web3WS.utils.sha3('BlockStatusUpdated(uint256,uint256)')]
            });
            
            
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

            lotteryStatusSubscription.on('data', (log) => {
                // Decode the log data
                const decodedLog = this.web3WS.eth.abi.decodeLog(
                    [{ indexed: false, name: 'isOpen', type: 'bool' }],
                    log.data,
                    log.topics.slice(1)
                );
         
                this.notifyLotteryStatusListeners(decodedLog.isOpen);
            });
            
            lotteryStatusSubscription.on('error', (error) => {
                console.error("LotteryRoundStatusChanged subscription error:", error);
            });

            // For WinnersAnnounced
            const winnersAnnouncedSubscription = await this.web3WS.eth.subscribe('logs', {
                address: CONTRACT_ADDRESS,
                topics: [this.web3WS.utils.sha3('WinnersAnnounced(address[],address[])')]
            });
            
            winnersAnnouncedSubscription.on('data', async (log) => {
                const decodedLog = this.web3WS.eth.abi.decodeLog(
                    [
                        { indexed: false, name: 'smallPrizeWinners', type: 'address[]' },
                        { indexed: false, name: 'bigPrizeWinners', type: 'address[]' }
                    ],
                    log.data,
                    log.topics.slice(1)
                );

                this.notifyWinnersAnnouncedListeners(
                    decodedLog.smallPrizeWinners, 
                    decodedLog.bigPrizeWinners
                );
            });
            
            winnersAnnouncedSubscription.on('error', (error) => {
                console.error("WinnersAnnounced subscription error:", error);
            });

            // For TicketEnteredLottery - updated with roundNumber
            const ticketEnteredSubscription = await this.web3WS.eth.subscribe('logs', {
                address: CONTRACT_ADDRESS,
                topics: [this.web3WS.utils.sha3('TicketEnteredLottery(uint256,uint256,uint256)')]
            });

            ticketEnteredSubscription.on('data', (log) => {
                // Decode the log data
                const decodedLog = this.web3WS.eth.abi.decodeLog(
                    [
                        { indexed: false, name: 'roundNumber', type: 'uint256' },
                        { indexed: false, name: 'totalTickets', type: 'uint256' },
                        { indexed: false, name: 'prizePool', type: 'uint256' }
                    ],
                    log.data,
                    log.topics.slice(1)
                );

                this.notifyTicketEnteredListeners(
                    decodedLog.roundNumber.toString(),
                    decodedLog.totalTickets.toString(),
                    decodedLog.prizePool.toString()
                );
            });

            ticketEnteredSubscription.on('error', (error) => {
                console.error("TicketEnteredLottery subscription error:", error);
            });

            return true;
            } catch (error) {
                console.error("Failed to set up event listeners on WebSocketProvider:", error);
                return false;
            }
    }

    disconnectWebSocket() {
        if (this.web3WS && this.web3WS.currentProvider) {
            this.web3WS.currentProvider.disconnect();
        }
    }

    // Utility method to get the best available web3 instance
    getWeb3() {
        return this.web3MM || this.web3WS || this.web3;
    }

    // Helper method to get the best available contract instance and validate
    getReadContract() {
        const contract = this.contractMM || this.contractWS;
        if (!contract) {
            throw new Error("No contract instance available");
        }
        return contract;
    }

    // Helper method to validate write operations requirements
    validateWriteRequirements() {
        if (!this.contractMM || !this.account) {
            throw new Error("Contract not initialized or account not connected");
        }
        return this.contractMM;
    }

    // Contract READ method wrappers (any web3 instance)
    async isLotteryActive() {
        try {
            const contract = this.getReadContract();
            const isActive = await contract.methods.isLotteryActive().call();
            return isActive;
        } catch (error) {
            throw new Error(`Error checking if lottery is active: ${error.message}`);
        }
    }

    async getTicketPrice() {
        try {
            const contract = this.getReadContract();
            const web3 = this.getWeb3();
            
            const price = await contract.methods.getTicketPrice().call();
            return web3.utils.fromWei(price.toString(), 'ether');
        } catch (error) {
            throw new Error(`Error fetching ticket price: ${error.message}`);
        }
    }

    async purchaseTicket() {
        try {
            const contract = this.validateWriteRequirements();
            const ticketPrice = await contract.methods.getTicketPrice().call();
            await contract.methods.purchaseTicket().send({
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
            const contract = this.validateWriteRequirements();
            const result = await contract.methods.startNewLotteryRound().send({ from: this.account });
            return { success: true, transactionHash: result.transactionHash };
        } catch (error) {
            throw new Error(`Error starting a new lottery round: ${error.message}`);
        }
    }

    async closeLotteryRound() 
    {
        try 
        {
            const contract = this.validateWriteRequirements();
            
            const blockStatus = await this.getLotteryBlockStatus();
    
            if (blockStatus.blocksUntilClose === "0") {
                const result = await contract.methods.closeLotteryRound().send({ from: this.account });
                return { success: true, transactionHash: result.transactionHash };
            }
            
            // For all other values, do both call and send
            const canClose = await contract.methods.closeLotteryRound().call({ from: this.account })
                .then(() => true)
                .catch(err => {
                    const revertReason = err.data.message.match(/reverted with reason string '([^']+)'/)?.[1] || err.message;
                    return { error: revertReason };
                });
    
            if (canClose !== true) {
                return { success: false, message: `Cannot close lottery: ${canClose.error}` };
            }
            
            const result = await contract.methods.closeLotteryRound().send({ from: this.account });
            return { success: true, transactionHash: result.transactionHash };
        } 
        catch (error) 
        {
            console.error("Transaction error:", error);
            const revertReason = error.message.match(/reverted with reason string '([^']+)'/)?.[1] || error.message;
            return { success: false, message: `Failed to close lottery: ${revertReason}` };
        }
    }

    async drawLotteryWinner() {
        try {
            const contract = this.validateWriteRequirements();
            
            const blockStatus = await this.getLotteryBlockStatus();
            
            if (blockStatus.blocksUntilDraw === "0") {
                // Go straight to send when keysUntilClose is 0
                const response = await fetch("https://h431j7ev85.execute-api.eu-north-1.amazonaws.com/randomNum/random");
                const data = await response.json();
                const parsedBody = JSON.parse(data.body);
        
                let keccak256HashNumbers = "0x" + parsedBody.keccak256_hash_numbers;
                let keccak256HashFull = "0x" + parsedBody.keccak256_hash_full;
                
                const tx = await contract.methods.drawLotteryWinner(keccak256HashNumbers, keccak256HashFull)
                    .send({ from: this.account });
                
                const winners = await this.getCurrentWinners();
                this.notifyWinnersAnnouncedListeners(winners.smallPrizeWinners, winners.bigPrizeWinners);
                
                return { success: true, result: tx };
            }
            
            // For all other values, do both call and send
            const dummyHash = "0x0000000000000000000000000000000000000000000000000000000000000000";
            const canDraw = await contract.methods.drawLotteryWinner(dummyHash, dummyHash)
                .call({ from: this.account })
                .then(() => true)
                .catch(err => {
                    const revertReason = err.data.message.match(/reverted with reason string '([^']+)'/)?.[1] || err.message;
                    return { error: revertReason };
                });
        
            if (canDraw !== true) {
                return { success: false, message: `Cannot draw winner: ${canDraw.error}` };
            }
        
            const response = await fetch("https://h431j7ev85.execute-api.eu-north-1.amazonaws.com/randomNum/random");
            const data = await response.json();
            const parsedBody = JSON.parse(data.body);
        
            let keccak256HashNumbers = "0x" + parsedBody.keccak256_hash_numbers;
            let keccak256HashFull = "0x" + parsedBody.keccak256_hash_full;
            
            const tx = await contract.methods.drawLotteryWinner(keccak256HashNumbers, keccak256HashFull)
                .send({ from: this.account });
            
            const winners = await this.getCurrentWinners();
            this.notifyWinnersAnnouncedListeners(winners.smallPrizeWinners, winners.bigPrizeWinners);
            
            return { success: true, result: tx };
        } catch (error) {
            console.error("Transaction error:", error);
            const revertReason = error.message.match(/reverted with reason string '([^']+)'/)?.[1] || error.message;
            throw new Error(`Failed to draw lottery winner: ${revertReason}`);
        }
    }

    async getPlayerTickets(playerAddress) {
        try {
            const contract = this.getReadContract();
            const tickets = await contract.methods.getPlayerTickets(playerAddress).call();
            return tickets; 
        } catch (error) {
            throw new Error(`Failed to get player tickets: ${error.message}`);
        }
    }

    async getLotteryBlockStatus() {
        try {
            const contract = this.getReadContract();
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
            const contract = this.getReadContract();
            
            const result = await contract.methods.getAllLotteryRoundsInfo().call();
            
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
    
            return processedResult;
        } catch (error) {
            console.error("Error in getAllLotteryRoundsInfo:", error);
            throw new Error(`Error fetching lottery rounds info: ${error.message}`);
        }
    }

    async getLotteryRoundInfo(roundIndex) {
        try {

        if (roundIndex <= 0) {
            throw new Error("Invalid round index.");
        }
        const currentRound = await this.getCurrentRound();
        if (roundIndex > currentRound) {
            throw new Error("Round index exceeds current round.");
        }
        console.log("Fetching round info for index:", roundIndex);
        console.log("Current round:", await this.getCurrentRound());

          const contract = this.getReadContract();
          const result = await contract.methods.getLotteryRoundInfo(roundIndex).call();
          console.log("Result from contract:", result);
          // This is the correct way to access the named values
          return {
            roundNumber: Number(result.roundNumber),
            totalPrizePool: result.totalPrizePool.toString(),
            addressArrays: result.addressArrays || [], 
            status: Number(result.status),
            bigPrize: result.bigPrize.toString(),
            smallPrize: result.smallPrize.toString(),
            miniPrize: result.miniPrize.toString(),
            commission: result.commission.toString(),
            totalTickets: Number(result.totalTickets)
          };
        } catch (error) {
          console.error(`Error fetching round ${roundIndex}:`, error);
          throw new Error(`Error fetching round ${roundIndex}: ${error.message}`);
        }
      }
      
      
    async getCurrentWinners() {
        try {
            const contract = this.getReadContract();
            const winners = await contract.methods.getCurrentWinners().call();
            return {
                smallPrizeWinners: winners[0],
                bigPrizeWinners: winners[1]
            };
        } catch (error) {
            throw new Error(`Error fetching winners: ${error.message}`);
        }
    }

    async getCurrentPrizePool() {
        try {
            const contract = this.getReadContract();
            const prizePool = await contract.methods.getCurrentPrizePool().call();
            return prizePool;
        } catch (error) {
            throw new Error(`Error fetching current prize pool: ${error.message}`);
        }
    }

    async getCurrentTotalTickets() {
        try {
            const contract = this.getReadContract();
            const totalTickets = await contract.methods.getCurrentTotalTickets().call();
            return totalTickets;
        } catch (error) {
            throw new Error(`Error fetching total tickets: ${error.message}`);
        }
    }


    async selectTicketsForLottery(ticketId, ticketHash, ticketHashWithStrong) {
        try {
            const contract = this.validateWriteRequirements();
    
            // Ensure proper hex formatting
            if (!ticketHash.startsWith('0x')) {
                ticketHash = "0x" + ticketHash;
            }
            if (!ticketHashWithStrong.startsWith('0x')) {
                ticketHashWithStrong = "0x" + ticketHashWithStrong;
            }
    
            // Send transaction
            const receipt = await contract.methods
                .selectTicketsForLottery(ticketId, ticketHash, ticketHashWithStrong)
                .send({ from: this.account });

            // Extract the event result
            const event = receipt.events?.TicketSelected;
    
            let successFromEvent = null;
            if (event && event.returnValues) {
                successFromEvent = event.returnValues.success;
            }
    
            return {
                success: true,
                resultFromEvent: successFromEvent, // true, false, or null if missing
                txHash: receipt.transactionHash,
            };
        } catch (error) {
            throw new Error(`Error selecting tickets for lottery: ${error.message}`);
        }
    }

    async getCurrentRound() {
    try {
        const contract = this.getReadContract();
        const currentRound = await contract.methods.getCurrentRound().call();
        return currentRound;
    } catch (error) {
        throw new Error(`Error fetching current round: ${error.message}`);
    }
    }

    async getFLEX_COMMISSION() {
        try {
            const contract = this.getReadContract();
            const commission = await contract.methods.getFLEX_COMMISSION().call();
            return commission;
        } catch (error) {
            throw new Error(`Error fetching FLEX_COMMISSION: ${error.message}`);
        }
    }

    async getSMALL_PRIZE_PERCENTAGE() {
        try {
            const contract = this.getReadContract();
            const percentage = await contract.methods.getSMALL_PRIZE_PERCENTAGE().call();
            return percentage;
        } catch (error) {
            throw new Error(`Error fetching SMALL_PRIZE_PERCENTAGE: ${error.message}`);
        }
    }

    async getMINI_PRIZE_PERCENTAGE() {
        try {
            const contract = this.getReadContract();
            const percentage = await contract.methods.getMINI_PRIZE_PERCENTAGE().call();
            return percentage;
        } catch (error) {
            throw new Error(`Error fetching getMINI_PRIZE_PERCENTAGE: ${error.message}`);
        }
    }

    async getBlocksWait()
    {
        try {
            const contract = this.getReadContract();
            const result = await contract.methods.getBlocksWait().call();
            return {
                BLOCKS_TO_WAIT_fOR_CLOSE: result.BLOCKS_TO_WAIT_fOR_CLOSE.toString(),
                BLOCKS_TO_WAIT_fOR_DRAW: result.BLOCKS_TO_WAIT_fOR_DRAW.toString()};
        } catch (error) {
            throw new Error(`Error fetching getBlocksWait: ${error.message}`);
        }
    }
    async getPendingPrize(playerAddress) {
        try {
            const contract = this.getReadContract();
            const pendingPrize = await contract.methods.getPendingPrize(playerAddress).call();
            return pendingPrize;
        } catch (error) {
            throw new Error(`Error fetching pending prize: ${error.message}`);
        }
    }
    async claimPrize(playerAddress) {
        try {
            const contract = this.validateWriteRequirements();
            const result = await contract.methods.claimPrize(playerAddress).send({ from: this.account });
            return { success: true, transactionHash: result.transactionHash };
        } catch (error) {
            throw new Error(`Error claiming prize: ${error.message}`);
        }
    }
}

const contractService = new ContractService();
export default contractService;