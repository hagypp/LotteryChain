import pytest
from brownie import MainTicketSystem, accounts, web3
from brownie import exceptions
import brownie

@pytest.fixture
def main_ticket_system():
    """Fixture to deploy the MainTicketSystem contract before each test"""
    print("Deploying MainTicketSystem contract...")
    return MainTicketSystem.deploy({'from': accounts[0]})

# def test_contract_deployment(main_ticket_system):
#     """Test contract deployment and initial state"""
#     # Check owner is set correctly
#     assert main_ticket_system.i_owner() == accounts[0].address
def test_player_registration(main_ticket_system):
    """Test player registration functionality"""
    # Register player for the first time
    tx = main_ticket_system.registerPlayer({'from': accounts[1], 'gas_price': 'auto'})
    tx.wait(1)
    
    assert main_ticket_system.isPlayerRegistered(accounts[1].address) == True

def test_player_registration_twice(main_ticket_system):
    """Test player registration functionality"""
    # Register player for the first time
    tx = main_ticket_system.registerPlayer({'from': accounts[1], 'gas_price': 'auto'})
    tx.wait(1)
    
    assert main_ticket_system.isPlayerRegistered(accounts[1].address) == True
    # Verify registration prevents duplicate registrations
    try:
        main_ticket_system.registerPlayer({'from': accounts[1], 'gas_price': 'auto'})
        pytest.fail("Expected a revert for duplicate registration")
    except Exception as e:
        assert "Registration failed" in str(e)
        

def test_ticket_purchase(main_ticket_system):
    """Test ticket purchase process"""
    # First, register player
    main_ticket_system.registerPlayer({'from': accounts[1], 'gas_price': 'auto'})
    assert main_ticket_system.isPlayerRegistered(accounts[1].address) == True
    
    # Get ticket price
    ticket_price = main_ticket_system.getTicketPrice()

    # Purchase ticket
    tx = main_ticket_system.purchaseTicket({'from': accounts[1], 'value': ticket_price, 'gas_price': 'auto'})
    tx.wait(1)

    # Check ticket details
    active_tickets = main_ticket_system.getActiveTickets({'from': accounts[1]})
    assert len(active_tickets) == 1
    assert main_ticket_system.getTotalTicketsSold() == 1

def test_ticket_purchase_insufficient_funds(main_ticket_system):
    """Test ticket purchase with insufficient funds"""
    # Register player
    main_ticket_system.registerPlayer({'from': accounts[1], 'gas_price': 'auto'})
    assert main_ticket_system.isPlayerRegistered(accounts[1].address) == True

    # Get the ticket price from the contract
    ticket_price = main_ticket_system.getTicketPrice()
    
    # Attempt to purchase a ticket with insufficient funds
    try:
        main_ticket_system.purchaseTicket({'from': accounts[1], 'value': ticket_price - 1, 'gas_price': 'auto'})
        pytest.fail("Expected a revert for insufficient funds")
    except Exception as e:
        assert "Insufficient payment for ticket" in str(e)


def test_unregistered_ticket_purchase(main_ticket_system):
    """Test ticket purchase by an unregistered player"""
    # Get the ticket price from the contract
    ticket_price = main_ticket_system.getTicketPrice()
    
    # Attempt to purchase a ticket as an unregistered player
    try:
        main_ticket_system.purchaseTicket({'from': accounts[1], 'value': ticket_price, 'gas_price': 'auto'})
        pytest.fail("Expected a revert for unregistered player")
    except Exception as e:
        assert "Not a registered player" in str(e)


def test_lottery_round_management(main_ticket_system):
    """Test lottery round start and management"""
    # Register multiple players
    for account in accounts[1:4]:
        main_ticket_system.registerPlayer({'from': account, 'gas_price': 'auto'})
        ticket_price = main_ticket_system.getTicketPrice()
        main_ticket_system.purchaseTicket({'from': account, 'value': ticket_price, 'gas_price': 'auto'})

    # Start a new lottery round
    tx = main_ticket_system.startNewLotteryRound({'from': accounts[0], 'gas_price': 'auto'})
    tx.wait(1)

    # Select tickets for the lottery
    for account in accounts[1:4]:
        active_tickets = main_ticket_system.getActiveTickets({'from': account})
        assert len(active_tickets) > 0, "No active tickets found for the player"
        main_ticket_system.selectTicketsForLottery(active_tickets, {'from': account, 'gas_price': 'auto'})  # Pass the entire list

    # Verify contract balance after ticket purchases
    assert main_ticket_system.getContractBalance() == 3 * main_ticket_system.getTicketPrice()

    # Draw the lottery winner
    tx = main_ticket_system.drawLotteryWinner({'from': accounts[0], 'gas_price': 'auto'})
    tx.wait(1)

    # Verify contract balance after lottery round
    assert main_ticket_system.getContractBalance() == 0, "Contract balance is not cleared after the lottery"

    winner = tx.return_value  # Capture the winner address from the function return

    # Verify the winner
    assert winner != "0x0000000000000000000000000000000000000000", "Winner address is not set correctly"
    assert winner in [account.address for account in accounts[1:4]], "Winner is not one of the registered players"


def test_lottery_winner_selection(main_ticket_system):
    """Test lottery winner selection"""
    # Prepare lottery
    ticket_price = main_ticket_system.getTicketPrice()
    
    # Register and purchase tickets
    main_ticket_system.registerPlayer({'from': accounts[1], 'gas_price': 'auto'})
    main_ticket_system.purchaseTicket({'from': accounts[1], 'value': ticket_price, 'gas_price': 'auto'})
    
    # Start lottery round
    main_ticket_system.startNewLotteryRound({'from': accounts[0], 'gas_price': 'auto'})
    
    # Select ticket for lottery
    tickets = main_ticket_system.getActiveTickets({'from': accounts[1]})
    main_ticket_system.selectTicketsForLottery(tickets, {'from': accounts[1], 'gas_price': 'auto'})
    
    # Draw winner (should be possible with one participant)
    tx = main_ticket_system.drawLotteryWinner({'from': accounts[0], 'gas_price': 'auto'})
    tx.wait(1)
    
    # Retrieve the winner address from the transaction return value
    winner = tx.return_value

    # Compare the winner address with accounts[1]'s address
    assert winner == accounts[1].address, f"Expected {accounts[1].address}, got {winner}"


def test_ticket_price_changes(main_ticket_system):
    """Test ability to change ticket price"""
    original_price = main_ticket_system.getTicketPrice()
    new_price = original_price * 2

    # Change ticket price
    tx = main_ticket_system.setTicketPrice(new_price, {'from': accounts[0], 'gas_price': 'auto'})
    tx.wait(1)

    assert main_ticket_system.getTicketPrice() == new_price


def test_unauthorized_price_change(main_ticket_system):
    """Test unauthorized ticket price change"""
    # Try to change the ticket price by a non-owner (should fail)
    try:
        main_ticket_system.setTicketPrice(1, {'from': accounts[1], 'gas_price': 'auto'})
        pytest.fail("Expected a revert for unauthorized price change")
    except Exception as e:
        assert "Only the contract owner can call this function" in str(e)

def test_contract_balance(main_ticket_system):
    """Test contract balance tracking"""
    # Register and purchase tickets
    main_ticket_system.registerPlayer({'from': accounts[1], 'gas_price': 'auto'})
    ticket_price = main_ticket_system.getTicketPrice()
    main_ticket_system.purchaseTicket({'from': accounts[1], 'value': ticket_price, 'gas_price': 'auto'})

    # Check contract balance
    balance = main_ticket_system.getContractBalance()
    assert balance == ticket_price


def test_draw_lottery_no_participants(main_ticket_system):
    # Start a new lottery round
    main_ticket_system.startNewLotteryRound({'from': accounts[0], 'gas_price': 'auto'})
    
    # Attempt to draw a winner with no participants
    try:
        main_ticket_system.drawLotteryWinner({'from': accounts[0], 'gas_price': 'auto'})
        pytest.fail("Expected a revert for no participants")
    except Exception as e:
        assert "No participants in this round" in str(e)


def test_owner_only_functions(main_ticket_system):
    """Test functions that can only be called by the owner"""
    
    # Ensure only the owner can start a new lottery round
    tx = main_ticket_system.startNewLotteryRound({'from': accounts[0], 'gas_price': 'auto'})
    tx.wait(1)

    # Ensure only the owner can set the ticket price
    new_ticket_price = main_ticket_system.getTicketPrice() + 1
    tx = main_ticket_system.setTicketPrice(new_ticket_price, {'from': accounts[0], 'gas_price': 'auto'})
    tx.wait(1)

    # Check that non-owners cannot start a lottery round
    try:
        main_ticket_system.startNewLotteryRound({'from': accounts[1], 'gas_price': 'auto'})
        pytest.fail("Expected a revert for unauthorized lottery round start")
    except Exception as e:
        assert "Only the contract owner can call this function" in str(e)

    # Check that non-owners cannot set the ticket price
    try:
        main_ticket_system.setTicketPrice(new_ticket_price, {'from': accounts[1], 'gas_price': 'auto'})
        pytest.fail("Expected a revert for unauthorized ticket price change")
    except Exception as e:
        assert "Only the contract owner can call this function" in str(e)

    # Check that non-owners cannot draw a lottery winner
    try:
        main_ticket_system.drawLotteryWinner({'from': accounts[1], 'gas_price': 'auto'})
        pytest.fail("Expected a revert for unauthorized lottery winner draw")
    except Exception as e:
        assert "Only the contract owner can call this function" in str(e)


def test_registered_player_functions(main_ticket_system):
    """Test functions that can only be called by registered players"""
    ticket_price = main_ticket_system.getTicketPrice()

    # Non-registered player cannot purchase a ticket
    try:
        main_ticket_system.purchaseTicket({'from': accounts[1], 'value': ticket_price, 'gas_price': 'auto'})
        pytest.fail("Expected a revert for unregistered player ticket purchase")
    except Exception as e:
        assert "Not a registered player" in str(e)

    # Register a player and test ticket purchase function
    main_ticket_system.registerPlayer({'from': accounts[1], 'gas_price': 'auto'})
    tx = main_ticket_system.purchaseTicket({'from': accounts[1], 'value': ticket_price, 'gas_price': 'auto'})
    assert main_ticket_system.getTotalTicketsSold() == 1, "Ticket purchase failed"

    # Non-registered player cannot select tickets
    try:
        main_ticket_system.selectTicketsForLottery([0,1], {'from': accounts[2], 'gas_price': 'auto'})
        pytest.fail("Expected a revert for unregistered player ticket selection")
    except Exception as e:
        assert "Not a registered player" in str(e)