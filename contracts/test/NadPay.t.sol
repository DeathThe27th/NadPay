// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {NadPay} from "../src/NadPay.sol";

contract Reenterer {
    NadPay private nadPay;
    uint256 private roundId;
    bool private attacked;

    constructor(NadPay _nadPay) {
        nadPay = _nadPay;
    }

    function attack(uint256 _roundId) external {
        roundId = _roundId;
        nadPay.claim(_roundId);
    }

    receive() external payable {
        if (!attacked) {
            attacked = true;
            nadPay.claim(roundId);
        }
    }
}

contract NadPayTest is Test {
    NadPay internal nadPay;

    address internal payer = makeAddr("payer");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal carol = makeAddr("carol");
    address internal stranger = makeAddr("stranger");

    uint256 internal constant WINDOW = 7 days;

    function setUp() public {
        nadPay = new NadPay();
        vm.deal(payer, 100 ether);
    }

    function _team() internal view returns (address[] memory recipients, uint256[] memory amounts) {
        recipients = new address[](3);
        amounts = new uint256[](3);
        recipients[0] = alice;
        recipients[1] = bob;
        recipients[2] = carol;
        amounts[0] = 1 ether;
        amounts[1] = 2 ether;
        amounts[2] = 3 ether;
    }

    function _createFundedRound() internal returns (uint256 roundId) {
        (address[] memory recipients, uint256[] memory amounts) = _team();
        vm.startPrank(payer);
        nadPay.setRecipients(recipients, amounts);
        roundId = nadPay.createRound{value: 6 ether}(WINDOW);
        vm.stopPrank();
    }

    function test_SetAndGetRecipients() public {
        (address[] memory recipients, uint256[] memory amounts) = _team();
        vm.prank(payer);
        nadPay.setRecipients(recipients, amounts);

        (address[] memory gotRecipients, uint256[] memory gotAmounts) = nadPay.getRecipients(payer);
        assertEq(gotRecipients.length, 3);
        assertEq(gotRecipients[1], bob);
        assertEq(gotAmounts[2], 3 ether);
    }

    function test_SetRecipients_RevertsOnBadInput() public {
        address[] memory recipients = new address[](1);
        uint256[] memory amounts = new uint256[](2);
        vm.expectRevert(NadPay.LengthMismatch.selector);
        nadPay.setRecipients(recipients, amounts);

        vm.expectRevert(NadPay.EmptyList.selector);
        nadPay.setRecipients(new address[](0), new uint256[](0));

        recipients = new address[](1);
        amounts = new uint256[](1);
        amounts[0] = 1 ether;
        vm.expectRevert(NadPay.ZeroAddress.selector);
        nadPay.setRecipients(recipients, amounts);

        recipients[0] = alice;
        amounts[0] = 0;
        vm.expectRevert(NadPay.ZeroAmount.selector);
        nadPay.setRecipients(recipients, amounts);
    }

    function test_CreateRound_ExactFunding() public {
        uint256 roundId = _createFundedRound();
        (address roundPayer, uint256 funded, uint256 claimed, uint256 deadline, bool closed) = nadPay.getRound(roundId);
        assertEq(roundPayer, payer);
        assertEq(funded, 6 ether);
        assertEq(claimed, 0);
        assertEq(deadline, block.timestamp + WINDOW);
        assertFalse(closed);
        assertEq(nadPay.allocationOf(roundId, bob), 2 ether);
        assertEq(address(nadPay).balance, 6 ether);
    }

    function test_CreateRound_RevertsOnWrongValue() public {
        (address[] memory recipients, uint256[] memory amounts) = _team();
        vm.startPrank(payer);
        nadPay.setRecipients(recipients, amounts);
        vm.expectRevert(abi.encodeWithSelector(NadPay.WrongValue.selector, 6 ether, 5 ether));
        nadPay.createRound{value: 5 ether}(WINDOW);
        vm.stopPrank();
    }

    function test_CreateRound_RevertsWithoutTemplate() public {
        vm.prank(payer);
        vm.expectRevert(NadPay.NoTemplate.selector);
        nadPay.createRound{value: 1 ether}(WINDOW);
    }

    function test_CreateRoundCustom() public {
        (address[] memory recipients, uint256[] memory amounts) = _team();
        vm.prank(payer);
        uint256 roundId = nadPay.createRoundCustom{value: 6 ether}(recipients, amounts, WINDOW);
        assertEq(nadPay.allocationOf(roundId, carol), 3 ether);
    }

    function test_CreateRound_DuplicateRecipientsAccumulate() public {
        address[] memory recipients = new address[](2);
        uint256[] memory amounts = new uint256[](2);
        recipients[0] = alice;
        recipients[1] = alice;
        amounts[0] = 1 ether;
        amounts[1] = 2 ether;
        vm.prank(payer);
        uint256 roundId = nadPay.createRoundCustom{value: 3 ether}(recipients, amounts, WINDOW);
        assertEq(nadPay.allocationOf(roundId, alice), 3 ether);
    }

    function test_Claim() public {
        uint256 roundId = _createFundedRound();
        vm.prank(bob);
        nadPay.claim(roundId);

        assertEq(bob.balance, 2 ether);
        assertTrue(nadPay.hasClaimed(roundId, bob));
        (,, uint256 claimed,,) = nadPay.getRound(roundId);
        assertEq(claimed, 2 ether);
    }

    function test_Claim_RevertsOnDoubleClaim() public {
        uint256 roundId = _createFundedRound();
        vm.startPrank(bob);
        nadPay.claim(roundId);
        vm.expectRevert(NadPay.AlreadyClaimed.selector);
        nadPay.claim(roundId);
        vm.stopPrank();
    }

    function test_Claim_RevertsForNonRecipient() public {
        uint256 roundId = _createFundedRound();
        vm.prank(stranger);
        vm.expectRevert(NadPay.NothingToClaim.selector);
        nadPay.claim(roundId);
    }

    function test_Claim_RevertsAfterDeadline() public {
        uint256 roundId = _createFundedRound();
        vm.warp(block.timestamp + WINDOW + 1);
        vm.prank(alice);
        vm.expectRevert(NadPay.DeadlinePassed.selector);
        nadPay.claim(roundId);
    }

    function test_Claim_ReentrancyBlocked() public {
        Reenterer reenterer = new Reenterer(nadPay);
        address[] memory recipients = new address[](1);
        uint256[] memory amounts = new uint256[](1);
        recipients[0] = address(reenterer);
        amounts[0] = 1 ether;
        vm.prank(payer);
        uint256 roundId = nadPay.createRoundCustom{value: 1 ether}(recipients, amounts, WINDOW);

        // Inner claim reverts with Reentrancy, which makes receive() revert,
        // which makes the outer transfer fail.
        vm.expectRevert("transfer failed");
        reenterer.attack(roundId);
    }

    function test_Reclaim() public {
        uint256 roundId = _createFundedRound();
        vm.prank(alice);
        nadPay.claim(roundId);

        vm.warp(block.timestamp + WINDOW + 1);
        uint256 balanceBefore = payer.balance;
        vm.prank(payer);
        nadPay.reclaim(roundId);

        assertEq(payer.balance, balanceBefore + 5 ether);
        (,,,, bool closed) = nadPay.getRound(roundId);
        assertTrue(closed);
    }

    function test_Reclaim_RevertsBeforeDeadline() public {
        uint256 roundId = _createFundedRound();
        vm.prank(payer);
        vm.expectRevert(NadPay.DeadlineNotPassed.selector);
        nadPay.reclaim(roundId);
    }

    function test_Reclaim_RevertsForNonPayer() public {
        uint256 roundId = _createFundedRound();
        vm.warp(block.timestamp + WINDOW + 1);
        vm.prank(stranger);
        vm.expectRevert(NadPay.NotPayer.selector);
        nadPay.reclaim(roundId);
    }

    function test_Reclaim_RevertsWhenClosedOrEmpty() public {
        uint256 roundId = _createFundedRound();
        vm.warp(block.timestamp + WINDOW + 1);
        vm.startPrank(payer);
        nadPay.reclaim(roundId);
        vm.expectRevert(NadPay.RoundClosed.selector);
        nadPay.reclaim(roundId);
        vm.stopPrank();
    }

    function test_Claim_RevertsWhenClosed() public {
        uint256 roundId = _createFundedRound();
        vm.warp(block.timestamp + WINDOW + 1);
        vm.prank(payer);
        nadPay.reclaim(roundId);
        vm.prank(alice);
        vm.expectRevert(NadPay.RoundClosed.selector);
        nadPay.claim(roundId);
    }

    function test_GetRoundRecipients() public {
        uint256 roundId = _createFundedRound();
        vm.prank(carol);
        nadPay.claim(roundId);

        (address[] memory recipients, uint256[] memory amounts, bool[] memory claimedFlags) =
            nadPay.getRoundRecipients(roundId);
        assertEq(recipients.length, 3);
        assertEq(amounts[2], 3 ether);
        assertFalse(claimedFlags[0]);
        assertTrue(claimedFlags[2]);
    }

    function test_RoundIdsIncrement() public {
        uint256 first = _createFundedRound();
        vm.prank(payer);
        uint256 second = nadPay.createRound{value: 6 ether}(WINDOW);
        assertEq(second, first + 1);
    }

    function testFuzz_ClaimExactAllocation(uint96 amount) public {
        vm.assume(amount > 0);
        address[] memory recipients = new address[](1);
        uint256[] memory amounts = new uint256[](1);
        recipients[0] = alice;
        amounts[0] = amount;
        vm.deal(payer, uint256(amount));
        vm.prank(payer);
        uint256 roundId = nadPay.createRoundCustom{value: amount}(recipients, amounts, WINDOW);

        vm.prank(alice);
        nadPay.claim(roundId);
        assertEq(alice.balance, amount);
        assertEq(address(nadPay).balance, 0);
    }
}
