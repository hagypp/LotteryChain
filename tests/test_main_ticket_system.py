import pytest
from brownie import MainTicketSystem, accounts, web3, reverts, chain, Wei
from brownie import exceptions


BLOCKS_TO_WAIT_fOR_CLOSE = 4; # Number of blocks to wait for lottery to close

@pytest.fixture
def main_ticket_system():
    """Fixture to deploy the MainTicketSystem contract before each test"""
    print("Deploying MainTicketSystem contract...")
    return MainTicketSystem.deploy({'from': accounts[0]})

def test_contract_deployment(main_ticket_system, owner_account):
    """Test contract deployment and basic functionality"""
    # Check contract has a balance method
    assert hasattr(main_ticket_system, 'getContractBlance')
    
    # Check initial contract balance
    assert main_ticket_system.getContractBlance() == 0

def test_ticket_purchase(main_ticket_system):
    """Test ticket purchase process"""
    # Get ticket price
    ticket_price = main_ticket_system.getTicketPrice()
    account1_balance_before = accounts[1].balance()
    # Purchase ticket
    tx = main_ticket_system.purchaseTicket({'from': accounts[1], 'value': ticket_price+1, 'gas_price': 'auto'})
    tx.wait(1)
    
    gas_used = tx.gas_used * tx.gas_price
    # Check ticket details
    active_tickets = main_ticket_system.getActiveTickets({'from': accounts[1]})
    assert len(active_tickets) == 1
    
    # Verify ticket data
    player_tickets = main_ticket_system.getPlayerTickets(accounts[1])
    assert len(player_tickets) == 1
    assert len(main_ticket_system.getActiveTickets({'from': accounts[1]})) == 1  # No active tickets should exist
    
    assert account1_balance_before - ticket_price - gas_used == accounts[1].balance()  # Player's balance should decrease by ticket price

def test_ticket_purchase_auto_close(main_ticket_system):
    """Test ticket purchase process with automatic lottery close"""
    # Get ticket price
    ticket_price = main_ticket_system.getTicketPrice()

    # Purchase ticket
    for _ in range(BLOCKS_TO_WAIT_fOR_CLOSE+1): #the last one is to close the lottery
        tx = main_ticket_system.purchaseTicket({'from': accounts[1], 'value': ticket_price, 'gas_price': 'auto'})
        tx.wait(1)
    
    assert main_ticket_system.isLotteryActive() == False  # Lottery should be closed

def test_select_tickets_for_lottery_when_closed(main_ticket_system):
    ticket_price = main_ticket_system.getTicketPrice()

    # Purchase ticket
    for _ in range(BLOCKS_TO_WAIT_fOR_CLOSE+1): #the last one is to close the lottery
        tx = main_ticket_system.purchaseTicket({'from': accounts[1], 'value': ticket_price, 'gas_price': 'auto'})
        tx.wait(1)
    ticket_id = tx.return_value
    assert main_ticket_system.isLotteryActive() == False  # Lottery should be closed
    with reverts("Current lottery round is not open"):
        main_ticket_system.closeLotteryRound({'from': accounts[0], 'gas_price': 'auto'})
    # Attempt to select tickets for lottery when closed
    ticket_hash = web3.keccak(text="example_hash")
    ticket_hash_with_strong = web3.keccak(text="example_hash_with_strong")
    with reverts("Current lottery round is closed"):
        tx = main_ticket_system.selectTicketsForLottery(
            ticket_id,  # Assuming ticket ID is 1
            ticket_hash,
            ticket_hash_with_strong,
            {'from': accounts[1], 'gas_price': 'auto'}
        )
        tx.return_value == False  # Selection should be unsuccessful
      

def test_ticket_purchase_insufficient_funds(main_ticket_system):
    """Test ticket purchase with insufficient funds"""
    # Get the ticket price from the contract
    ticket_price = main_ticket_system.getTicketPrice()
    
    # Attempt to purchase a ticket with insufficient funds
    with reverts("Insufficient payment for ticket"):
        main_ticket_system.purchaseTicket({'from': accounts[1], 'value': ticket_price - 1, 'gas_price': 'auto'})
    assert main_ticket_system.getPlayerTickets(accounts[1]) == []  # No tickets should be purchased
    assert main_ticket_system.getActiveTickets({'from': accounts[1]}) == []  # No active tickets should exist
    
    assert main_ticket_system.getContractBlance() == 0  # Contract balance should remain unchanged


def test_ticket_purchase_with_refund(main_ticket_system):
    """Test ticket purchase with excess funds that should be refunded"""
    ticket_price = main_ticket_system.getTicketPrice()
    excess_amount = ticket_price * 3  # Send 3x ticket price
    
    account1_balance_before = accounts[1].balance()
    
    # Purchase ticket with excess value
    tx = main_ticket_system.purchaseTicket({'from': accounts[1], 'value': excess_amount})
    gas_cost = tx.gas_used * tx.gas_price
    
    # Verify balance after purchase
    account1_balance_after = accounts[1].balance()
    
    # Should only deduct ticket price + gas, excess should be refunded
    expected_balance = account1_balance_before - ticket_price - gas_cost
    
    # Allow for some deviation due to gas estimation
    balance_diff = abs(account1_balance_after - expected_balance)
    assert balance_diff == 0 , f"Balance diff too high: {balance_diff}"
    
    # Verify ticket was issued
    player_tickets = main_ticket_system.getPlayerTickets(accounts[1])
    assert len(player_tickets) == 1, "Player should have 1 ticket"
    assert main_ticket_system.getContractBlance() == ticket_price, "Contract balance should equal ticket price after purchase"

def test_lottery_round_status(main_ticket_system):
    """Test lottery round status"""
    # Check initial lottery status
    is_active = main_ticket_system.isLotteryActive()
    assert isinstance(is_active, bool)
    
    assert is_active == True  # Lottery should be active at the start
    
    # Check lottery block status
    blocks_until_close, blocks_until_draw = main_ticket_system.getLotteryBlockStatus()
    assert isinstance(blocks_until_close, int)
    assert isinstance(blocks_until_draw, int)

def test_select_tickets_for_lottery(main_ticket_system):
    """Test selecting tickets for lottery"""
    # Get ticket price
    ticket_price = main_ticket_system.getTicketPrice()

    # Purchase ticket
    tx = main_ticket_system.purchaseTicket({'from': accounts[1], 'value': ticket_price, 'gas_price': 'auto'})
    ticket_id = tx.return_value
    
    # Create hash values for the ticket (using some example values)
    ticket_hash = web3.keccak(text="example_hash")
    ticket_hash_with_strong = web3.keccak(text="example_hash_with_strong")
    
    # Select ticket for lottery
    if main_ticket_system.isLotteryActive():
        tx = main_ticket_system.selectTicketsForLottery(
            ticket_id, 
            ticket_hash, 
            ticket_hash_with_strong, 
            {'from': accounts[1], 'gas_price': 'auto'}
        )
        
        # Check if the event was emitted
        assert 'TicketSelected' in tx.events
        assert tx.return_value == True  # Selection should be successful
        with reverts("Invalid ticket status"):
            main_ticket_system.selectTicketsForLottery(ticket_id, ticket_hash, ticket_hash_with_strong, {'from': accounts[1], 'gas_price': 'auto'})
        assert len(main_ticket_system.getPlayerTickets(accounts[1])) == 1  # Player should have one ticket selected
        assert len(main_ticket_system.getActiveTickets({'from': accounts[1]})) == 0  # No active tickets should exist
        assert main_ticket_system.getCurrentPrizePool() == ticket_price  # Prize pool should be updated
        assert main_ticket_system.getContractBlance() == ticket_price  # Contract balance should be 0 after selection

def test_select_tickets_for_lottery_close(main_ticket_system):
    """Test selecting tickets for lottery when lottery is closed"""
    # Get ticket price
    ticket_price = main_ticket_system.getTicketPrice()

    # Purchase ticket
    tx = main_ticket_system.purchaseTicket({'from': accounts[1], 'value': ticket_price, 'gas_price': 'auto'})
    ticket_id = tx.return_value
    
    assert len(main_ticket_system.getPlayerTickets(accounts[1])) == 1  # Player should have one ticket
    assert len(main_ticket_system.getActiveTickets({'from': accounts[1]})) == 1
    
    # Create hash values for the ticket (using some example values)
    ticket_hash = web3.keccak(text="example_hash")
    ticket_hash_with_strong = web3.keccak(text="example_hash_with_strong")
    
    # simulate spend time to close the lottery
    chain.mine(BLOCKS_TO_WAIT_fOR_CLOSE)

    # Close the lottery
    main_ticket_system.closeLotteryRound({'from': accounts[0], 'gas_price': 'auto'})
    
    is_active = main_ticket_system.isLotteryActive()
    assert is_active == False  # Lottery should be closed
    
    # Attempt to select tickets for lottery when closed
    
    with reverts("Current lottery round is closed"):
        main_ticket_system.selectTicketsForLottery(ticket_id, ticket_hash, ticket_hash_with_strong, {'from': accounts[1], 'gas_price': 'auto'})
    assert len(main_ticket_system.getPlayerTickets(accounts[1])) == 1  # Player should have one ticket
    assert len(main_ticket_system.getActiveTickets({'from': accounts[1]})) == 1
    assert main_ticket_system.getContractBlance() == ticket_price  # Contract balance should be 0 after closing lottery

def test_select_tickets_for_lottery_auto_close(main_ticket_system):
    """Test selecting tickets for lottery when lottery is closed"""
    # Get ticket price
    ticket_price = main_ticket_system.getTicketPrice()

    # Purchase ticket
    tx = main_ticket_system.purchaseTicket({'from': accounts[1], 'value': ticket_price, 'gas_price': 'auto'})
    ticket_id = tx.return_value
    
    assert len(main_ticket_system.getPlayerTickets(accounts[1])) == 1  # Player should have one ticket
    assert len(main_ticket_system.getActiveTickets({'from': accounts[1]})) == 1
    
    # Create hash values for the ticket (using some example values)
    ticket_hash = web3.keccak(text="example_hash")
    ticket_hash_with_strong = web3.keccak(text="example_hash_with_strong")
    
    # simulate spend time to close the lottery
    chain.mine(BLOCKS_TO_WAIT_fOR_CLOSE)
    
    # Attempt to select tickets for lottery when closed
    tx = main_ticket_system.selectTicketsForLottery(ticket_id, ticket_hash, ticket_hash_with_strong, {'from': accounts[1], 'gas_price': 'auto'})
    returned_value = tx.return_value
    assert returned_value == False  # Lottery should be closed
    
    assert len(main_ticket_system.getPlayerTickets(accounts[1])) == 1  # Player should have one ticket
    assert len(main_ticket_system.getActiveTickets({'from': accounts[1]})) == 1
    assert main_ticket_system.getContractBlance() == ticket_price  # Prize pool should be updated
    
def test_draw_lottery_winner(main_ticket_system, owner_account):
    """Test drawing lottery winner"""
    # Get ticket price
    ticket_price = main_ticket_system.getTicketPrice()

    player_addresses = []
    # Multiple players purchase tickets
    for account in accounts[1:3]:
        player_addresses.append(account.address)
        tx = main_ticket_system.purchaseTicket({'from': account, 'value': ticket_price, 'gas_price': 'auto'})
        ticket_id = tx.return_value
        
        # Create hash values for the ticket
        ticket_hash = web3.keccak(text=f"hash_{account.address}")
        ticket_hash_with_strong = web3.keccak(text=f"strong_hash_{account.address}")
        print(f"ticket_hash: {ticket_hash}, ticket_hash_with_strong: {ticket_hash_with_strong}")
        # Select ticket for lottery if lottery is active
        if main_ticket_system.isLotteryActive():
            main_ticket_system.selectTicketsForLottery(
                ticket_id, 
                ticket_hash, 
                ticket_hash_with_strong, 
                {'from': account, 'gas_price': 'auto'}
            )
    main_ticket_system.closeLotteryRound({'from': owner_account, 'gas_price': 'auto'})
    
    chain.mine(1)  # Wait for the lottery to can be drawn
    
    # Create hash values for the drawing
    keccak_hash_numbers = web3.keccak(text=f"hash_{accounts[2].address}")
    keccak_hash_full = web3.keccak(text=f"strong_hash_{accounts[1].address}")
    print(f"keccak_hash_numbers: {keccak_hash_numbers}, keccak_hash_full: {keccak_hash_full}")
    
    player1_blance_before = accounts[1].balance()
    player2_blance_before = accounts[2].balance()
    owener_blance_before = owner_account.balance()
    
    # Draw lottery winner
    tx = main_ticket_system.drawLotteryWinner(
        keccak_hash_numbers, 
        keccak_hash_full, 
        {'from': owner_account, 'gas_price': 'auto'}
    )
    gas_used = tx.gas_used * tx.gas_price
   # Get lottery round info and verify data
    round_info = main_ticket_system.getLotteryRoundInfo(1)
    
    print(f"Round info: {round_info}")
    # Unpack returned data
    round_number, total_prize_pool, addressArrays,  status, big_prize, small_prize, mini_prize, commission, total_tickets = round_info
    participants = addressArrays[0]
    small_prize_winners = addressArrays[1]
    big_prize_winners = addressArrays[2]
    mini_prize_winners = addressArrays[3]
    # Verify round data
    assert round_number == 1, "Round number should be 1"
    assert total_prize_pool == 2 * ticket_price, f"Prize pool should be {2 * ticket_price}"
    
    # Verify participants
    assert len(participants) == 2, "Should have 2 participants"
    for addr in player_addresses:
        assert addr in participants, f"Player {addr} should be in participants list"
    
    # Verify winners (at least one winner should be present)
    assert len(small_prize_winners) > 0 or len(big_prize_winners) > 0, "Should have at least one winner"
    
    # Verify each winner is a participant
    for winner in small_prize_winners:
        assert winner in participants, f"Small prize winner {winner} should be a participant"
    
    for winner in big_prize_winners:
        assert winner in participants, f"Big prize winner {winner} should be a participant"
    
    assert accounts[1] in big_prize_winners, "Account 1 should be a big prize winner"
    assert accounts[2] in small_prize_winners, "Account 2 should be a small prize winner"
    
    assert len(big_prize_winners) == 1, "Should have 1 big prize winner"
    assert len(small_prize_winners) == 1, "Should have 1 small prize winner"
    
    assert status == 2, "Lottery status should be finished"
    
    # Verify prize distribution
    assert big_prize + small_prize + commission == total_prize_pool, "Prize distribution should equal total prize pool"
    
    # Verify total tickets
    assert total_tickets == 2, "Should have 2 tickets total"
    
    assert main_ticket_system.getPendingPrize({'from': accounts[1]}) == big_prize, f"Account {account} should have pending prize"
    assert main_ticket_system.getPendingPrize({'from': accounts[2]}) == small_prize, f"Account {account} should have pending prize"
    assert main_ticket_system.getPendingPrize({'from': owner_account}) == commission, f"Owner should have pending commission"
    
    tx = main_ticket_system.claimPrize({'from': accounts[1], 'gas_price': 'auto'})
    gas1 = (tx.gas_used * tx.gas_price) 
    assert accounts[1].balance() == player1_blance_before + big_prize - gas1, "Account 1 should receive the big prize"
    
    tx = main_ticket_system.claimPrize({'from': accounts[2], 'gas_price': 'auto'})
    gas2 = (tx.gas_used * tx.gas_price)
    assert accounts[2].balance() == player2_blance_before + small_prize - gas2, "Account 2 should receive the small prize"
    
    tx = main_ticket_system.claimPrize({'from': owner_account, 'gas_price': 'auto'})
    gas_used += tx.gas_used * tx.gas_price

    assert owener_blance_before + commission - gas_used  == owner_account.balance(), "Owner should receive the commission"
    # Check lottery status after drawing (new round should be active)
    assert main_ticket_system.isLotteryActive() == True, "New round should be active"
    assert main_ticket_system.getContractBlance() == 0 , "Contract balance should be 0 after drawing"

def test_contract_balance(main_ticket_system):
    """Test contract balance tracking"""
    # Get initial balance
    initial_balance = main_ticket_system.getContractBlance()
    
    # Purchase tickets
    ticket_price = main_ticket_system.getTicketPrice()
    main_ticket_system.purchaseTicket({'from': accounts[1], 'value': ticket_price, 'gas_price': 'auto'})

    # Check updated contract balance
    new_balance = main_ticket_system.getContractBlance()
    assert new_balance == initial_balance + ticket_price

def test_get_player_tickets(main_ticket_system):
    """Test retrieving player tickets"""
    # Purchase a ticket
    ticket_price = main_ticket_system.getTicketPrice()
    main_ticket_system.purchaseTicket({'from': accounts[1], 'value': ticket_price, 'gas_price': 'auto'})
    
    # Get player tickets
    player_tickets = main_ticket_system.getPlayerTickets(accounts[1])
    assert len(player_tickets) == 1  # Player should have one ticket
    assert main_ticket_system.getContractBlance() == ticket_price  # Contract balance should equal ticket price after purchase

def test_select_tickets_for_lottery_not_found(main_ticket_system):
    """Test selecting tickets for lottery with invalid data."""
    ticket_hash = web3.keccak(text="example_hash")
    ticket_hash_with_strong = web3.keccak(text="example_hash_with_strong")

    # Use clearly invalid ticket IDs, including negative and large values
    invalid_ticket_ids = list(range(0, 11))  # from -10 to 10 inclusive
    for ticket_id in invalid_ticket_ids:
        try:
            result = main_ticket_system.selectTicketsForLottery(
                ticket_id,
                ticket_hash,
                ticket_hash_with_strong,
                {'from': accounts[1], 'gas_price': 'auto'}
            )
            assert result.return_value is False, f"Expected False, but got {result} for ticket_id {ticket_id}"
        except Exception as e:
            assert "Ticket not found" in str(e), f"Unexpected revert reason: {str(e)}"
    assert main_ticket_system.getContractBlance() == 0, "Contract balance should be 0 after invalid selections"



def test_multiple_lottery_rounds_with_varied_participants(main_ticket_system, owner_account):
    """Test multiple lottery rounds with varying participants, ensuring prize, ticket, and state accuracy."""

    def simulate_round(round_num, participant_indexes):
        ticket_price = main_ticket_system.getTicketPrice()
        participant_addresses = []

        ticket_ids = []
        for idx in participant_indexes:
            acc = accounts[idx]
            participant_addresses.append(acc.address)

            tx = main_ticket_system.purchaseTicket({'from': acc, 'value': ticket_price, 'gas_price': 'auto'})
            ticket_id = tx.return_value
            ticket_ids.append(ticket_id)

            ticket_hash = web3.keccak(text=f"hash_{acc.address}_r{round_num}")
            ticket_hash_strong = web3.keccak(text=f"strong_hash_{acc.address}_r{round_num}")

            if main_ticket_system.isLotteryActive():
                main_ticket_system.selectTicketsForLottery(
                    ticket_id,
                    ticket_hash,
                    ticket_hash_strong,
                    {'from': acc, 'gas_price': 'auto'}
                )
        
        chain.mine(BLOCKS_TO_WAIT_fOR_CLOSE)
        # Owner closes the round
        if main_ticket_system.isLotteryActive():
            main_ticket_system.closeLotteryRound({'from': owner_account, 'gas_price': 'auto'})
        chain.mine(1)

        # Pick some hashes from current players to simulate drawing randomness
        draw_hash_1 = web3.keccak(text=f"hash_{accounts[participant_indexes[-1]].address}_r{round_num}")
        draw_hash_2 = web3.keccak(text=f"strong_hash_{accounts[participant_indexes[0]].address}_r{round_num}")

        # Capture balances before
        balances_before = {idx: accounts[idx].balance() for idx in participant_indexes}
        owner_balance_before = owner_account.balance()

        tx = main_ticket_system.drawLotteryWinner(draw_hash_1, draw_hash_2, {'from': owner_account, 'gas_price': 'auto'})
        gas_used = tx.gas_used * tx.gas_price

        # Validate round info
        round_info = main_ticket_system.getLotteryRoundInfo(round_num)
        round_number, total_prize_pool, addressArrays,  status, big_prize, small_prize, mini_prize, commission, total_tickets = round_info
        participants = addressArrays[0]
        small_prize_winners = addressArrays[1]
        big_prize_winners = addressArrays[2]
        mini_prize_winners = addressArrays[3]
        assert round_number == round_num
        assert status == 2  # Finished

        # Validate winners are participants
        for winner in small_prize_winners + big_prize_winners:
            assert winner in participants
        print(f"round info: {round_info}")
        # Validate prize math
        if len(big_prize_winners) == 0:
            big_prize = 0
        if len(small_prize_winners) == 0:
            small_prize = 0
        prize_distribution = (big_prize + small_prize + commission)
        assert prize_distribution == total_prize_pool

        # Validate balances
        for idx in participant_indexes:
            acc = accounts[idx]
            if acc.address in big_prize_winners:
                assert main_ticket_system.getPendingPrize({'from': acc}) == big_prize
                gas = 0
                if main_ticket_system.getPendingPrize({'from': acc}) > 0:
                    tx= main_ticket_system.claimPrize({'from': acc, 'gas_price': 'auto'})
                    gas = tx.gas_used * tx.gas_price
                assert acc.balance() == balances_before[idx] + big_prize - gas
            elif acc.address in small_prize_winners:
                assert main_ticket_system.getPendingPrize({'from': acc}) == small_prize
                gas = 0
                if main_ticket_system.getPendingPrize({'from': acc}) > 0:
                    tx = main_ticket_system.claimPrize({'from': acc, 'gas_price': 'auto'})
                    gas = tx.gas_used * tx.gas_price
                assert acc.balance() == balances_before[idx] + small_prize - gas
            else:
                assert acc.balance() == balances_before[idx]
        
        assert main_ticket_system.getPendingPrize({'from': owner_account}) == commission
        if main_ticket_system.getPendingPrize({'from': owner_account}) > 0:
            tx = main_ticket_system.claimPrize({'from': owner_account, 'gas_price': 'auto'})
            gas_used += tx.gas_used * tx.gas_price
        assert owner_account.balance() == owner_balance_before + commission - gas_used
        # New round should start
        assert main_ticket_system.isLotteryActive()

    # Run through 3 simulated rounds with different setups
    simulate_round(1, [1, 2])       # 2 players
    simulate_round(2, [3, 4, 5])    # 3 players
    simulate_round(3, [6])          # Single player (edge case)
    # simulate_round(4, [1, 1])



def test_draw_lottery_with_no_players(main_ticket_system, owner_account):
    """Test drawing lottery when no players have entered"""
    # Check that lottery is active
    assert main_ticket_system.isLotteryActive() == True, "Lottery should be active"
    
    chain.mine(BLOCKS_TO_WAIT_fOR_CLOSE)  # Simulate time passing for lottery to close
    # Close the lottery round with no players
    main_ticket_system.closeLotteryRound({'from': owner_account, 'gas_price': 'auto'})
    
    chain.mine(1)  # Wait for the lottery to be drawable
    
    # Create hash values for the drawing
    keccak_hash_numbers = web3.keccak(text="random_numbers_hash")
    keccak_hash_full = web3.keccak(text="random_full_hash")
    
    owner_balance_before = owner_account.balance()
    
    # Draw lottery winner even though there are no players
    tx = main_ticket_system.drawLotteryWinner(
        keccak_hash_numbers, 
        keccak_hash_full, 
        {'from': owner_account, 'gas_price': 'auto'}
    )
    gas_used = tx.gas_used * tx.gas_price
    
    # Get lottery round info and verify data
    round_info = main_ticket_system.getLotteryRoundInfo(1)
    
    print(f"Round info: {round_info}")
    # Unpack returned data
    round_number, total_prize_pool, addressArrays,  status, big_prize, small_prize, mini_prize, commission, total_tickets = round_info
    participants = addressArrays[0]
    small_prize_winners = addressArrays[1]
    big_prize_winners = addressArrays[2]
    mini_prize_winners = addressArrays[3]
        
    # Verify round data
    assert round_number == 1, "Round number should be 1"
    assert total_prize_pool == 0, "Prize pool should be 0"
    
    # Verify participants
    assert len(participants) == 0, "Should have 0 participants"
    
    # Verify winners (should be none)
    assert len(small_prize_winners) == 0, "Should have no small prize winners"
    assert len(big_prize_winners) == 0, "Should have no big prize winners"
    assert len(mini_prize_winners) == 0, "Should have no mini prize winners"
    
    assert status == 2, "Lottery status should be finished"
    
    # Verify prize distribution
    assert big_prize == 0, "Big prize should be 0"
    assert small_prize == 0, "Small prize should be 0"
    assert commission == 0, "Commission should be 0"
    assert mini_prize == 0, "Mini prize should be 0"
    
    # Verify total tickets
    assert total_tickets == 0, "Should have 0 tickets total"
    
    # Verify owner balance (should only be reduced by gas costs)
    assert owner_balance_before - gas_used == owner_account.balance(), "Owner balance should only decrease by gas used"
    
    # Check that a new lottery round is active
    assert main_ticket_system.isLotteryActive() == True, "New round should be active"
    assert main_ticket_system.getContractBlance() == 0 , "Contract balance should be 0 after drawing with no players"


def test_draw_lottery_with_same_hashes(main_ticket_system, owner_account):
    """Test drawing lottery with players using the same hash values"""
    # Get ticket price
    ticket_price = main_ticket_system.getTicketPrice()

    player_addresses = []
    
    # Common hash values that both players will use
    common_ticket_hash = web3.keccak(text="common_hash_value")
    common_ticket_hash_with_strong = web3.keccak(text="common_strong_hash_value")
    print(f"Common ticket_hash: {common_ticket_hash}, common ticket_hash_with_strong: {common_ticket_hash_with_strong}")
    
    # Multiple players purchase tickets and use the same hash values
    for account in accounts[1:3]:
        player_addresses.append(account.address)
        tx = main_ticket_system.purchaseTicket({'from': account, 'value': ticket_price, 'gas_price': 'auto'})
        ticket_id = tx.return_value
        
        # Both players select tickets using the same hash values
        if main_ticket_system.isLotteryActive():
            main_ticket_system.selectTicketsForLottery(
                ticket_id, 
                common_ticket_hash, 
                common_ticket_hash_with_strong, 
                {'from': account, 'gas_price': 'auto'}
            )
    if main_ticket_system.isLotteryActive():
        main_ticket_system.closeLotteryRound({'from': owner_account, 'gas_price': 'auto'})
    
    chain.mine(1)  # Wait for the lottery to be drawable
    
    # Create hash values for the drawing (using the same common values)
    keccak_hash_numbers = common_ticket_hash
    keccak_hash_full = common_ticket_hash_with_strong
    
    player1_balance_before = accounts[1].balance()
    player2_balance_before = accounts[2].balance()
    owner_balance_before = owner_account.balance()
    
    # Draw lottery winner
    tx = main_ticket_system.drawLotteryWinner(
        keccak_hash_numbers, 
        keccak_hash_full, 
        {'from': owner_account, 'gas_price': 'auto'}
    )
    gas_used = tx.gas_used * tx.gas_price
    
    # Get lottery round info and verify data
    round_info = main_ticket_system.getLotteryRoundInfo(1)
    
    print(f"Round info: {round_info}")
    # Unpack returned data
    round_number, total_prize_pool, addressArrays,  status, big_prize, small_prize, mini_prize, commission, total_tickets = round_info
    participants = addressArrays[0]
    small_prize_winners = addressArrays[1]
    big_prize_winners = addressArrays[2]
    mini_prize_winners = addressArrays[3]
        
    # Verify round data
    assert round_number == 1, "Round number should be 1"
    assert total_prize_pool == 2 * ticket_price, f"Prize pool should be {2 * ticket_price}"
    
    # Verify participants
    assert len(participants) == 2, "Should have 2 participants"
    for addr in player_addresses:
        assert addr in participants, f"Player {addr} should be in participants list"
    
    # Since both players used the same hash, both should be either big prize winners or small prize winners
    # depending on contract implementation for ties
    
    # This is a unique case - both players have matching hashes
    # Both could win big prize if the contract allows it
    assert len(big_prize_winners) == 2
    # Both players win big prize
    assert accounts[1].address in big_prize_winners, "Account 1 should be a big prize winner"
    assert accounts[2].address in big_prize_winners, "Account 2 should be a big prize winner"
    
    assert len(small_prize_winners) == 0, "Should have no small prize winners"
    assert len(mini_prize_winners) == 0, "Should have no mini prize winners"
    
    assert big_prize == (100 - main_ticket_system.getMINI_PRIZE_PERCENTAGE() - main_ticket_system.getSMALL_PRIZE_PERCENTAGE() - main_ticket_system.getFLEX_COMMISSION()) * total_prize_pool / 100, "Big prize should be calculated correctly"
    
    # Verify both received big prize (might be split)
    big_prize_per_player = big_prize / len(big_prize_winners)
    
    assert main_ticket_system.getPendingPrize({'from': accounts[1]}) == big_prize_per_player, f"Account 1 should have pending prize of {big_prize_per_player}"
    assert main_ticket_system.getPendingPrize({'from': accounts[2]}) == big_prize_per_player, f"Account 2 should have pending prize of {big_prize_per_player}"
    
    tx1 = main_ticket_system.claimPrize({'from': accounts[1], 'gas_price': 'auto'})
    gas1 = tx1.gas_used * tx1.gas_price
    tx2 = main_ticket_system.claimPrize({'from': accounts[2], 'gas_price': 'auto'})
    gas2 = tx2.gas_used * tx2.gas_price
    
    assert player1_balance_before + big_prize_per_player - gas1 == accounts[1].balance(), "Account 1 should receive split big prize"
    assert player2_balance_before + big_prize_per_player - gas2 == accounts[2].balance(), "Account 2 should receive split big prize"

    assert status == 2, "Lottery status should be finished"
    
    commissionCheck = (main_ticket_system.getFLEX_COMMISSION() * total_prize_pool)/100 + (main_ticket_system.getSMALL_PRIZE_PERCENTAGE() * total_prize_pool)/100 + (main_ticket_system.getMINI_PRIZE_PERCENTAGE() * total_prize_pool)/100
    assert commission == commissionCheck, "Commission should be calculated correctly"
    
    # Verify prize distribution
    assert big_prize + small_prize + commission + mini_prize == total_prize_pool, "Prize distribution should equal total prize pool"
    
    assert mini_prize == 0, "Mini prize should be 0"
    assert small_prize == 0, "Small prize should be 0"
    
    # Verify total tickets
    assert total_tickets == 2, "Should have 2 tickets total"
    
    # Verify owner commission
    assert main_ticket_system.getPendingPrize({'from': owner_account}) == commission, f"Owner should have pending commission of {commission}"
    tx = main_ticket_system.claimPrize({'from': owner_account, 'gas_price': 'auto'})
    gas_used += tx.gas_used * tx.gas_price
    assert owner_balance_before + commission - gas_used == owner_account.balance(), "Owner should receive the commission"
    
    # Check that a new lottery round is active
    assert main_ticket_system.isLotteryActive() == True, "New round should be active"
    assert main_ticket_system.getContractBlance() == 0
    
def test_concurrent_ticket_purchases(main_ticket_system):
    """Test many users purchasing tickets simultaneously"""
    ticket_price = main_ticket_system.getTicketPrice()
    
    assert main_ticket_system.getContractBlance() == 0  # Initial contract balance should be 0
    # Track initial balances
    initial_balances = {}
    for i in range(1, 6):
        initial_balances[accounts[i].address] = accounts[i].balance()
    
    # Simulate concurrent purchases (as close as possible in blockchain time)
    transactions = []
    for i in range(1, 6):
        tx = main_ticket_system.purchaseTicket({'from': accounts[i], 'value': ticket_price})
        transactions.append(tx)
    
    # Verify all transactions succeeded
    for tx in transactions:
        assert tx.status == 1, "Transaction failed"
    
    # Verify all users received tickets
    for i in range(1, 6):
        tickets = main_ticket_system.getPlayerTickets(accounts[i])
        assert len(tickets) == 1, f"Account {i} should have 1 ticket"
        
        # Verify the contract balance increased correctly
        expected_balance_decrease = ticket_price + transactions[i-1].gas_used * transactions[i-1].gas_price
        actual_balance = accounts[i].balance()
        assert abs(initial_balances[accounts[i].address] - actual_balance - expected_balance_decrease) < Wei("0.0001 ether"), "Balance didn't decrease correctly"

    assert main_ticket_system.getContractBlance() == 5 * ticket_price, "Contract balance should be updated correctly"


def test_purchase_multiple_tickets_same_account(main_ticket_system):
    """Test one user purchasing multiple tickets across different rounds"""
    ticket_price = main_ticket_system.getTicketPrice()
    initial_balance = accounts[1].balance()
    
    # First round
    tx1 = main_ticket_system.purchaseTicket({'from': accounts[1], 'value': ticket_price})
    ticket_id1 = tx1.return_value
    
    # Create hash values and select for lottery
    ticket_hash1 = web3.keccak(text="multi_test_hash_1")
    ticket_hash_with_strong1 = web3.keccak(text="multi_test_strong_hash_1")
    
    tx11 = main_ticket_system.selectTicketsForLottery(
        ticket_id1, 
        ticket_hash1, 
        ticket_hash_with_strong1, 
        {'from': accounts[1]}
    )
    
    # Close lottery and draw
    chain.mine(4)  # Mine blocks to close lottery
    tx111=main_ticket_system.closeLotteryRound({'from': accounts[0]})
    chain.mine(1)
    tx1111=main_ticket_system.drawLotteryWinner(
        web3.keccak(text="draw_hash_1"), 
        web3.keccak(text="draw_strong_hash_1"), 
        {'from': accounts[0]}
    )
    
    # Second round
    tx2 = main_ticket_system.purchaseTicket({'from': accounts[1], 'value': ticket_price})
    ticket_id2 = tx2.return_value
    
    # Create hash values and select for lottery
    ticket_hash2 = web3.keccak(text="multi_test_hash_2")
    ticket_hash_with_strong2 = web3.keccak(text="multi_test_strong_hash_2")
    
    tx22=main_ticket_system.selectTicketsForLottery(
        ticket_id2, 
        ticket_hash2, 
        ticket_hash_with_strong2, 
        {'from': accounts[1]}
    )
    
    # Verify player has tickets from different rounds
    tickets = main_ticket_system.getPlayerTickets(accounts[1])
    assert len(tickets) == 2, "Player should have 2 tickets from different rounds"
    
    # Verify the round numbers are different
    assert tickets[0][0] != tickets[1][0], "Tickets should be in different rounds"
    
    # Calculate expected balance decrease (2 tickets + gas costs)
    gas_cost1 = tx1.gas_used * tx1.gas_price
    gas_cost11 = tx11.gas_used * tx11.gas_price
    gas_cost111 = tx1111.gas_used * tx1111.gas_price
    gas_cost1111= tx1111.gas_price*tx1111.gas_used
    gas_cost2 = tx2.gas_used * tx2.gas_price
    gas_cost22=tx22.gas_used*tx22.gas_price
    expected_balance_decrease = 2 * ticket_price + gas_cost1 + gas_cost11 + gas_cost111 + gas_cost1111 + gas_cost2 + gas_cost22
    
    # Allow for any lottery winnings
    assert accounts[1].balance() >= initial_balance - expected_balance_decrease, "Balance decreased more than expected"

def test_race_conditions_ticket_selection(main_ticket_system):
    """Test for potential race conditions during ticket selection"""
    ticket_price = main_ticket_system.getTicketPrice()
    
    # Purchase two tickets with different accounts
    tx1 = main_ticket_system.purchaseTicket({'from': accounts[1], 'value': ticket_price})
    ticket_id1 = tx1.return_value
    
    tx2 = main_ticket_system.purchaseTicket({'from': accounts[2], 'value': ticket_price})
    ticket_id2 = tx2.return_value
    
    # Create hash values
    ticket_hash1 = web3.keccak(text="race_hash_1")
    ticket_hash_with_strong1 = web3.keccak(text="race_strong_hash_1")
    
    ticket_hash2 = web3.keccak(text="race_hash_2")
    ticket_hash_with_strong2 = web3.keccak(text="race_strong_hash_2")
    
    # First account tries to select both tickets (should fail for ticket2)
    main_ticket_system.selectTicketsForLottery(
        ticket_id1, 
        ticket_hash1, 
        ticket_hash_with_strong1, 
        {'from': accounts[1]}
    )
    
    with reverts():  # Should fail since account1 doesn't own ticket2
        main_ticket_system.selectTicketsForLottery(
            ticket_id2, 
            ticket_hash2, 
            ticket_hash_with_strong2, 
            {'from': accounts[1]}
        )
    
    # Second account selects their own ticket
    main_ticket_system.selectTicketsForLottery(
        ticket_id2, 
        ticket_hash2, 
        ticket_hash_with_strong2, 
        {'from': accounts[2]}
    )
    
    # Check tickets are assigned to correct accounts
    tickets1 = main_ticket_system.getPlayerTickets(accounts[1])
    tickets2 = main_ticket_system.getPlayerTickets(accounts[2])
    
    assert len(tickets1) == 1, "Account 1 should have 1 ticket"
    assert len(tickets2) == 1, "Account 2 should have 1 ticket"
    
def test_mini_prize(main_ticket_system, owner_account):
    """Test drawing lottery winner"""
    # Get ticket price
    ticket_price = main_ticket_system.getTicketPrice()

    player_addresses = []
    # Multiple players purchase tickets
    for account in accounts[1:3]:
        player_addresses.append(account.address)
        tx = main_ticket_system.purchaseTicket({'from': account, 'value': ticket_price, 'gas_price': 'auto'})
        ticket_id = tx.return_value
        
        # Create hash values for the ticket
        ticket_hash = web3.keccak(text=f"hash_{account.address}")
        ticket_hash_with_strong = web3.keccak(text=f"strong_hash_{account.address}")
        print(f"ticket_hash: {ticket_hash}, ticket_hash_with_strong: {ticket_hash_with_strong}")
        # Select ticket for lottery if lottery is active
        if main_ticket_system.isLotteryActive():
            main_ticket_system.selectTicketsForLottery(
                ticket_id, 
                ticket_hash, 
                ticket_hash_with_strong, 
                {'from': account, 'gas_price': 'auto'}
            )
    main_ticket_system.closeLotteryRound({'from': owner_account, 'gas_price': 'auto'})
    
    chain.mine(1)  # Wait for the lottery to can be drawn
    
    # Create hash values for the drawing
    keccak_hash_numbers = web3.keccak(text=f"hash_{accounts[5].address}")
    keccak_hash_full = web3.keccak(text=f"strong_hash_{accounts[5].address}")
    print(f"keccak_hash_numbers: {keccak_hash_numbers}, keccak_hash_full: {keccak_hash_full}")
    
    player1_blance_before = accounts[1].balance()
    player2_blance_before = accounts[2].balance()
    owener_blance_before = owner_account.balance()
    
    # Draw lottery winner
    tx = main_ticket_system.drawLotteryWinner(
        keccak_hash_numbers, 
        keccak_hash_full, 
        {'from': owner_account, 'gas_price': 'auto'}
    )
    gas_used = tx.gas_used * tx.gas_price
   # Get lottery round info and verify data
    round_info = main_ticket_system.getLotteryRoundInfo(1)
    
    print(f"Round info: {round_info}")
    # Unpack returned data
    round_number, total_prize_pool, addressArrays,  status, big_prize, small_prize, mini_prize, commission, total_tickets = round_info
    participants = addressArrays[0]
    small_prize_winners = addressArrays[1]
    big_prize_winners = addressArrays[2]
    mini_prize_winners = addressArrays[3]
    # Verify round data
    assert round_number == 1, "Round number should be 1"
    assert total_prize_pool == 2 * ticket_price, f"Prize pool should be {2 * ticket_price}"
    
    # Verify participants
    assert len(participants) == 2, "Should have 2 participants"
    for addr in player_addresses:
        assert addr in participants, f"Player {addr} should be in participants list"
    
    # Verify winners (at least one winner should be present)
    assert len(small_prize_winners) == 0 and  len(big_prize_winners) == 0, "Should have no winner"
    

    assert status == 2, "Lottery status should be finished"
    
    # Verify prize distribution
    assert big_prize + small_prize + commission + mini_prize == total_prize_pool, "Prize distribution should equal total prize pool"
    
    # Verify total tickets
    assert total_tickets == 2, "Should have 2 tickets total"
    
    assert accounts[1] in mini_prize_winners or accounts[2] in mini_prize_winners, "Account 1 or Account 2 should be a mini prize winner"
    
    assert len(mini_prize_winners) == 1, "Should have 1 mini prize winner"
    
    assert mini_prize > 0, "Mini prize should be greater than 0"
    
    if accounts[1] in mini_prize_winners:
        assert main_ticket_system.getPendingPrize({'from': accounts[1]}) == mini_prize, f"Account 1 should have pending mini prize of {mini_prize}"
        tx = main_ticket_system.claimPrize({'from': accounts[1], 'gas_price': 'auto'})
        gas1 = tx.gas_used * tx.gas_price
        assert player1_blance_before + mini_prize - gas1 == accounts[1].balance(), "Account 1 should receive the mini prize"
        assert player2_blance_before == accounts[2].balance(), "Account 2 should not receive any prize"
    else:
        assert main_ticket_system.getPendingPrize({'from': accounts[2]}) == mini_prize, f"Account 2 should have pending mini prize of {mini_prize}"
        tx = main_ticket_system.claimPrize({'from': accounts[2], 'gas_price': 'auto'})
        gas2 = tx.gas_used * tx.gas_price
        assert player2_blance_before + mini_prize - gas2 == accounts[2].balance(), "Account 2 should receive the mini prize"
        assert player1_blance_before == accounts[1].balance(), "Account 1 should not receive any prize"
    
    assert main_ticket_system.getPendingPrize({'from': owner_account}) == commission, f"Owner should have pending commission of {commission}"
    tx = main_ticket_system.claimPrize({'from': owner_account, 'gas_price': 'auto'})
    gas_used += tx.gas_used * tx.gas_price
    assert owener_blance_before + commission - gas_used  == owner_account.balance(), "Owner should receive the commission"
    # Check lottery status after drawing (new round should be active)
    assert main_ticket_system.isLotteryActive() == True, "New round should be active"
    
    assert main_ticket_system.getContractBlance() == 0, "Contract balance should be 0 after drawing"
    


def test_mini_prize_with_one_player(main_ticket_system, owner_account):
    """Test drawing lottery winner"""
    # Get ticket price
    ticket_price = main_ticket_system.getTicketPrice()
    
    assert main_ticket_system.getContractBlance() == 0, "Contract balance should be 0 before ticket purchase"
    
    player_addresses = []
    # Multiple players purchase tickets
    tx = main_ticket_system.purchaseTicket({'from': accounts[1], 'value': ticket_price, 'gas_price': 'auto'})
    ticket_id = tx.return_value
    for account in accounts[2:4]:
        player_addresses.append(account.address)
        tx = main_ticket_system.purchaseTicket({'from': account, 'value': ticket_price, 'gas_price': 'auto'})
        
    assert main_ticket_system.getContractBlance() == 3*ticket_price, "Contract balance should be 3"

    # Create hash values for the ticket
    ticket_hash = web3.keccak(text=f"hash_{account.address}")
    ticket_hash_with_strong = web3.keccak(text=f"strong_hash_{account.address}")
        # Select ticket for lottery if lottery is active
    if main_ticket_system.isLotteryActive():
            main_ticket_system.selectTicketsForLottery(
                ticket_id, 
                ticket_hash, 
                ticket_hash_with_strong, 
                {'from': accounts[1], 'gas_price': 'auto'}
            )
    main_ticket_system.closeLotteryRound({'from': owner_account, 'gas_price': 'auto'})
    
    chain.mine(1)  # Wait for the lottery to can be drawn
    
    # Create hash values for the drawing
    keccak_hash_numbers = web3.keccak(text=f"hash_{accounts[5].address}")
    keccak_hash_full = web3.keccak(text=f"strong_hash_{accounts[5].address}")
    print(f"keccak_hash_numbers: {keccak_hash_numbers}, keccak_hash_full: {keccak_hash_full}")
    
    player1_blance_before = accounts[1].balance()
    player2_blance_before = accounts[2].balance()
    owener_blance_before = owner_account.balance()
    
    # Draw lottery winner
    tx = main_ticket_system.drawLotteryWinner(
        keccak_hash_numbers, 
        keccak_hash_full, 
        {'from': owner_account, 'gas_price': 'auto'}
    )
    gas_used = tx.gas_used * tx.gas_price
   # Get lottery round info and verify data
    round_info = main_ticket_system.getLotteryRoundInfo(1)
    
    print(f"Round info: {round_info}")
    # Unpack returned data
    round_number, total_prize_pool, addressArrays,  status, big_prize, small_prize, mini_prize, commission, total_tickets = round_info
    participants = addressArrays[0]
    small_prize_winners = addressArrays[1]
    big_prize_winners = addressArrays[2]
    mini_prize_winners = addressArrays[3]
    # Verify round data
    assert round_number == 1, "Round number should be 1"
    assert total_prize_pool ==  ticket_price, f"Prize pool should be {ticket_price}"
    
    # Verify participants
    assert len(participants) == 1, "Should have 1 participants"
    assert accounts[1] in participants, f"Player {accounts[1]} should be in participants list"
    
    # Verify winners (at least one winner should be present)
    assert len(small_prize_winners) == 0 and  len(big_prize_winners) == 0, "Should have no winner"
    

    assert status == 2, "Lottery status should be finished"
    
    # Verify prize distribution
    assert big_prize + small_prize + commission + mini_prize == total_prize_pool, "Prize distribution should equal total prize pool"
    assert big_prize == 0, "Big prize should be 0"
    assert small_prize == 0, "Small prize should be 0"
    assert commission == total_prize_pool-mini_prize, "Commission should be equal to total prize pool minus mini prize"
    assert mini_prize == (main_ticket_system.getMINI_PRIZE_PERCENTAGE() * total_prize_pool)/100, "Mini prize should be equal to mini prize percentage of total prize pool"
    
    # Verify total tickets
    assert total_tickets == 1, "Should have 2 tickets total"
    
    assert accounts[1] in mini_prize_winners , "Account 1 should be a mini prize winner"
    
    assert len(mini_prize_winners) == 1, "Should have 1 mini prize winner"
    
    assert mini_prize > 0, "Mini prize should be greater than 0"
    
    assert main_ticket_system.getPendingPrize({'from': accounts[1]}) == mini_prize, f"Account 1 should have pending mini prize of {mini_prize}"
    tx = main_ticket_system.claimPrize({'from': accounts[1], 'gas_price': 'auto'})
    gas1 = tx.gas_used * tx.gas_price
    assert player1_blance_before + mini_prize - gas1 == accounts[1].balance(), "Account 1 should receive the mini prize"
    assert player2_blance_before == accounts[2].balance(), "Account 2 should not receive any prize"
    
    assert main_ticket_system.getPendingPrize({'from': owner_account}) == commission, f"Owner should have pending commission of {commission}"
    tx = main_ticket_system.claimPrize({'from': owner_account, 'gas_price': 'auto'})
    gas_used += tx.gas_used * tx.gas_price
    assert owener_blance_before + commission - gas_used  == owner_account.balance(), "Owner should receive the commission"
    
    assert main_ticket_system.getContractBlance() == 2*ticket_price, "Contract balance should be 2 after drawing"

    # Check lottery status after drawing (new round should be active)
    assert main_ticket_system.isLotteryActive() == True, "New round should be active"   

def test_mini_prize_and_big(main_ticket_system, owner_account):
    """Test drawing lottery winner with mini prize and big prize"""
    # Get ticket price
    ticket_price = main_ticket_system.getTicketPrice()

    player_addresses = []
    
    # Multiple players purchase tickets
    for account in accounts[1:3]:
        player_addresses.append(account.address)
        tx = main_ticket_system.purchaseTicket({'from': account, 'value': ticket_price, 'gas_price': 'auto'})
        ticket_id = tx.return_value
        
        # Create hash values for the ticket
        ticket_hash = web3.keccak(text=f"hash_{account.address}")
        ticket_hash_with_strong = web3.keccak(text=f"strong_hash_{account.address}")
        print(f"ticket_hash: {ticket_hash}, ticket_hash_with_strong: {ticket_hash_with_strong}")
        # Select ticket for lottery if lottery is active
        if main_ticket_system.isLotteryActive():
            main_ticket_system.selectTicketsForLottery(
                ticket_id, 
                ticket_hash, 
                ticket_hash_with_strong, 
                {'from': account, 'gas_price': 'auto'}
            )
    main_ticket_system.closeLotteryRound({'from': owner_account, 'gas_price': 'auto'})
    
    chain.mine(1)  # Wait for the lottery to can be drawn
    
    # Create hash values for the drawing
    keccak_hash_numbers = web3.keccak(text=f"hash_{accounts[3].address}")
    keccak_hash_full = web3.keccak(text=f"strong_hash_{accounts[2].address}")
    print(f"keccak_hash_numbers: {keccak_hash_numbers}, keccak_hash_full: {keccak_hash_full}")
    
    player1_blance_before = accounts[1].balance()
    player2_blance_before = accounts[2].balance()
    owener_blance_before = owner_account.balance()
    
    # Draw lottery winner
    tx = main_ticket_system.drawLotteryWinner(
        keccak_hash_numbers, 
        keccak_hash_full, 
        {'from': owner_account, 'gas_price': 'auto'}
    )
    gas_used = tx.gas_used * tx.gas_price
   # Get lottery round info and verify data
    round_info = main_ticket_system.getLotteryRoundInfo(1)
    
    print(f"Round info: {round_info}")
    round_number, total_prize_pool, addressArrays,  status, big_prize, small_prize, mini_prize, commission, total_tickets = round_info
    participants = addressArrays[0]
    small_prize_winners = addressArrays[1]
    big_prize_winners = addressArrays[2]
    mini_prize_winners = addressArrays[3]
    # Verify round data
    assert round_number == 1, "Round number should be 1"
    assert total_prize_pool == 2 * ticket_price, f"Prize pool should be {2 * ticket_price}"
    # Verify participants
    assert len(participants) == 2, "Should have 2 participants"
    for addr in player_addresses:
        assert addr in participants, f"Player {addr} should be in participants list"
    assert len(small_prize_winners) == 0 and  len(big_prize_winners) == 1, "Should have 1 big prize winner"
    assert accounts[2] in big_prize_winners, "Account 2 should be a big prize winner"
    assert status == 2, "Lottery status should be finished"
    assert accounts[1] in mini_prize_winners, "Account 1 should be a mini prize winner"
    assert len(mini_prize_winners) == 1, "Should have 1 mini prize winner"

def test_no_win(main_ticket_system, owner_account):
    """Test drawing lottery winner with no winners"""
    # Get ticket price
    ticket_price = main_ticket_system.getTicketPrice()

    player_addresses = []
    
    # Multiple players purchase tickets
    for account in accounts[1:3]:
        player_addresses.append(account.address)
        tx = main_ticket_system.purchaseTicket({'from': account, 'value': ticket_price, 'gas_price': 'auto'})
        ticket_id = tx.return_value
        
        # Create hash values for the ticket
        ticket_hash = web3.keccak(text=f"hash_{account.address}")
        ticket_hash_with_strong = web3.keccak(text=f"strong_hash_{account.address}")
        print(f"ticket_hash: {ticket_hash}, ticket_hash_with_strong: {ticket_hash_with_strong}")
        # Select ticket for lottery if lottery is active
        if main_ticket_system.isLotteryActive():
            main_ticket_system.selectTicketsForLottery(
                ticket_id, 
                ticket_hash, 
                ticket_hash_with_strong, 
                {'from': account, 'gas_price': 'auto'}
            )
    main_ticket_system.closeLotteryRound({'from': owner_account, 'gas_price': 'auto'})
    
    chain.mine(1)  # Wait for the lottery to can be drawn
    
    # Create hash values for the drawing
    keccak_hash_numbers = web3.keccak(text=f"hash_{accounts[4].address}")
    keccak_hash_full = web3.keccak(text=f"strong_hash_{accounts[4].address}")
    print(f"keccak_hash_numbers: {keccak_hash_numbers}, keccak_hash_full: {keccak_hash_full}")
    
    # Draw lottery winner
    tx = main_ticket_system.drawLotteryWinner(
        keccak_hash_numbers, 
        keccak_hash_full, 
        {'from': owner_account, 'gas_price': 'auto'}
    )
    gas_used = tx.gas_used * tx.gas_price
   # Get lottery round info and verify data
    round_info = main_ticket_system.getLotteryRoundInfo(1)
    
    print(f"Round info: {round_info}")
    round_number, total_prize_pool, addressArrays,  status, big_prize, small_prize, mini_prize, commission, total_tickets = round_info
    participants = addressArrays[0]
    small_prize_winners = addressArrays[1]
    big_prize_winners = addressArrays[2]
    mini_prize_winners = addressArrays[3]
    assert round_number == 1, "Round number should be 1"
    assert total_prize_pool == 2 * ticket_price, f"Prize pool should be {2 * ticket_price}"
    # Verify participants
    assert len(participants) == 2, "Should have 2 participants"
    for addr in player_addresses:
        assert addr in participants, f"Player {addr} should be in participants list"
    assert len(small_prize_winners) == 0 and  len(big_prize_winners) == 0, "Should have no winners"
    assert status == 2, "Lottery status should be finished"
    assert len(mini_prize_winners) == 1, "Should have 1 mini prize winner"
    assert accounts[1] in mini_prize_winners or accounts[2] in mini_prize_winners, "Account 1 or Account 2 should be a mini prize winner"