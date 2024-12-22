# app.py
import streamlit as st
from web3 import Web3
import json

# Connect to local network
w3 = Web3(Web3.HTTPProvider('http://127.0.0.1:8545'))

# Load contract data
with open('contract_data.json', 'r') as f:
    contract_data = json.load(f)

contract = w3.eth.contract(
    address=contract_data['address'],
    abi=contract_data['abi']
)

st.title("Lottery Ticket System")

# Account Management
if 'accounts' not in st.session_state:
    st.session_state.accounts = w3.eth.accounts

# Account selector
selected_account = st.selectbox(
    "Select Account",
    st.session_state.accounts,
    format_func=lambda x: f"{x[:6]}...{x[-4:]}"
)

# Get owner address
owner_address = contract.functions.getOwner().call()
is_owner = selected_account.lower() == owner_address.lower()

if is_owner:
    st.info("🔑 You are the contract owner")

# Display account balance
balance = w3.eth.get_balance(selected_account)
st.write(f"Balance: {Web3.from_wei(balance, 'ether')} ETH")

# Main Tabs
tab1, tab2, tab3 = st.tabs(["Player Actions", "Lottery Actions", "Admin Panel"])

with tab1:
    st.header("Player Management")
    
    # Check registration status
    is_registered = contract.functions.isPlayerRegistered(selected_account).call()
    
    if not is_registered:
        if st.button("Register as Player"):
            try:
                tx_hash = contract.functions.registerPlayer().transact({
                    'from': selected_account
                })
                st.success(f"Registration successful! Transaction: {tx_hash.hex()}")
            except Exception as e:
                st.error(f"Registration failed: {str(e)}")
    else:
        st.success("You are registered!")
        
        # Ticket Purchase Section
        st.subheader("Purchase Tickets")
        ticket_price = contract.functions.getTicketPrice().call()
        st.write(f"Ticket Price: {Web3.from_wei(ticket_price, 'ether')} ETH")
        
        if st.button("Purchase Ticket"):
            try:
                tx_hash = contract.functions.purchaseTicket().transact({
                    'from': selected_account,
                    'value': ticket_price
                })
                st.success(f"Ticket purchased! Transaction: {tx_hash.hex()}")
            except Exception as e:
                st.error(f"Purchase failed: {str(e)}")
        
        # View Active Tickets
        st.subheader("Your Active Tickets")
        try:
            active_tickets = contract.functions.getActiveTickets().call({
                'from': selected_account
            })
            if active_tickets:
                st.write("Active ticket IDs:", active_tickets)
            else:
                st.info("You have no active tickets")
        except Exception as e:
            st.error(f"Error fetching tickets: {str(e)}")

with tab2:
    st.header("Lottery Management")
    
    if is_registered:
        st.subheader("Select Tickets for Lottery")
        
        # Get active tickets for selection
        active_tickets = contract.functions.getActiveTickets().call({
            'from': selected_account
        })
        
        if active_tickets:
            # Create checkboxes for ticket selection
            selected_tickets = []
            st.write("Select tickets to enter in lottery:")
            for ticket_id in active_tickets:
                if st.checkbox(f"Ticket #{ticket_id}"):
                    selected_tickets.append(ticket_id)
            
            if selected_tickets and st.button("Enter Selected Tickets in Lottery"):
                try:
                    tx_hash = contract.functions.selectTicketsForLottery(selected_tickets).transact({
                        'from': selected_account
                    })
                    st.success(f"Tickets entered in lottery! Transaction: {tx_hash.hex()}")
                except Exception as e:
                    st.error(f"Failed to enter lottery: {str(e)}")
        else:
            st.info("You need to purchase tickets first")
    else:
        st.warning("You need to register first to participate in lottery")

with tab3:
    st.header("Admin Functions")
    
    if is_owner:
        col1, col2 = st.columns(2)
        
        with col1:
            if st.button("Start New Lottery Round"):
                try:
                    tx_hash = contract.functions.startNewLotteryRound().transact({
                        'from': selected_account
                    })
                    st.success(f"New lottery round started! Transaction: {tx_hash.hex()}")
                except Exception as e:
                    st.error(f"Failed to start new round: {str(e)}")
        
        with col2:
            if st.button("Draw Lottery Winner"):
                try:
                    tx_hash = contract.functions.drawLotteryWinner().transact({
                        'from': selected_account
                    })
                    st.success(f"Winner drawn! Transaction: {tx_hash.hex()}")
                except Exception as e:
                    st.error(f"Failed to draw winner: {str(e)}")
        
        # Ticket Price Management
        st.subheader("Manage Ticket Price")
        current_price = Web3.from_wei(contract.functions.getTicketPrice().call(), 'ether')
        new_price = st.number_input("New Ticket Price (ETH)", min_value=0.0, value=float(current_price))
        
        if st.button("Update Ticket Price"):
            try:
                new_price_wei = Web3.to_wei(new_price, 'ether')
                tx_hash = contract.functions.setTicketPrice(new_price_wei).transact({
                    'from': selected_account
                })
                st.success(f"Price updated! Transaction: {tx_hash.hex()}")
            except Exception as e:
                st.error(f"Failed to update price: {str(e)}")
    else:
        st.warning("Only the contract owner can access admin functions")

# System Statistics
st.sidebar.header("System Statistics")
try:
    total_players = contract.functions.getTotalRegisteredPlayers().call()
    total_tickets = contract.functions.getTotalTicketsSold().call()
    contract_balance = contract.functions.getContractBalance().call()
    
    st.sidebar.metric("Total Registered Players", total_players)
    st.sidebar.metric("Total Tickets Sold", total_tickets)
    st.sidebar.metric("Contract Balance", f"{Web3.from_wei(contract_balance, 'ether')} ETH")
except Exception as e:
    st.sidebar.error("Error loading statistics")