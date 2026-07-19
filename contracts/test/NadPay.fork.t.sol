// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {NadPay} from "../src/NadPay.sol";

interface IERC20 {
    function balanceOf(address) external view returns (uint256);
}

/// @dev Runs only against a Monad mainnet fork:
///      forge test --match-contract Fork --fork-url https://rpc.monad.xyz
contract NadPayForkTest is Test {
    address constant ROUTER = 0xfE31F71C1b106EAc32F1A19239c9a9A72ddfb900;
    address constant WMON = 0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A;
    address constant USDC = 0x754704Bc059F8C67012fEd69BC8A327a5aafb603;

    function test_ClaimAndSwap_AgainstRealRouter() public {
        if (block.chainid != 143) return; // no fork, nothing to test

        NadPay nadPay = new NadPay(ROUTER, WMON, USDC, 3000);
        address payer = makeAddr("payer");
        address payee = makeAddr("payee");
        vm.deal(payer, 1 ether);

        address[] memory recipients = new address[](1);
        uint256[] memory amounts = new uint256[](1);
        recipients[0] = payee;
        amounts[0] = 0.05 ether;
        vm.prank(payer);
        uint256 roundId = nadPay.createRoundCustom{value: 0.05 ether}(recipients, amounts, 7 days);

        vm.prank(payee);
        nadPay.claimAndSwap(roundId, 1);

        assertEq(payee.balance, 0); // never touched MON
        assertGt(IERC20(USDC).balanceOf(payee), 0); // got USDC
        assertTrue(nadPay.hasClaimed(roundId, payee));
    }
}
