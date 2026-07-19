// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @dev Minimal Uniswap SwapRouter02 surface used by claimAndSwap. The router
///      wraps the native MON sent as msg.value into WMON before swapping.
interface ISwapRouter02 {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

/// @title NadPay — one-click recurring payroll on Monad
/// @notice A payer saves a reusable recipient template, funds a payout round
///         with native MON in one transaction, and shares a single claim link.
///         Each whitelisted recipient claims their preset allocation exactly
///         once; unclaimed funds are reclaimable by the payer after the
///         round's deadline. Recipients may claim as USDC atomically via a
///         fixed Uniswap route baked in at deployment.
contract NadPay {
    struct Round {
        address payer;
        uint256 totalFunded;
        uint256 totalClaimed;
        uint256 deadline;
        bool closed;
    }

    uint256 public nextRoundId;

    mapping(uint256 => Round) private rounds;
    mapping(uint256 => address[]) private roundRecipients;
    mapping(uint256 => mapping(address => uint256)) private allocations;
    mapping(uint256 => mapping(address => bool)) private claims;

    // Reusable per-payer recipient template.
    mapping(address => address[]) private templateRecipients;
    mapping(address => uint256[]) private templateAmounts;

    uint256 private locked = 1;

    // Fixed MON->USDC swap route, set once at deployment. A zero router
    // disables claimAndSwap (e.g. networks without a Uniswap deployment).
    address public immutable swapRouter;
    address public immutable swapWmon;
    address public immutable swapUsdc;
    uint24 public immutable swapPoolFee;

    constructor(address router, address wmon, address usdc, uint24 poolFee) {
        swapRouter = router;
        swapWmon = wmon;
        swapUsdc = usdc;
        swapPoolFee = poolFee;
    }

    event RecipientsSaved(address indexed payer, uint256 count, uint256 total);
    event RoundCreated(uint256 indexed roundId, address indexed payer, uint256 totalFunded, uint256 deadline);
    event Claimed(uint256 indexed roundId, address indexed recipient, uint256 amount);
    event ClaimedAsUsdc(uint256 indexed roundId, address indexed recipient, uint256 amountMon, uint256 usdcOut);
    event Reclaimed(uint256 indexed roundId, address indexed payer, uint256 amount);

    error LengthMismatch();
    error EmptyList();
    error ZeroAddress();
    error ZeroAmount();
    error WrongValue(uint256 expected, uint256 provided);
    error NoTemplate();
    error NothingToClaim();
    error AlreadyClaimed();
    error RoundClosed();
    error DeadlinePassed();
    error DeadlineNotPassed();
    error NotPayer();
    error NothingToReclaim();
    error Reentrancy();
    error SwapUnavailable();

    modifier nonReentrant() {
        if (locked != 1) revert Reentrancy();
        locked = 2;
        _;
        locked = 1;
    }

    /// @notice Save or overwrite the caller's reusable recipient template.
    function setRecipients(address[] calldata recipients, uint256[] calldata amounts) external {
        uint256 total = _validateList(recipients, amounts);
        templateRecipients[msg.sender] = recipients;
        templateAmounts[msg.sender] = amounts;
        emit RecipientsSaved(msg.sender, recipients.length, total);
    }

    /// @notice A payer's saved template, for the UI to prefill.
    function getRecipients(address payer) external view returns (address[] memory, uint256[] memory) {
        return (templateRecipients[payer], templateAmounts[payer]);
    }

    /// @notice Fund a payout round from the caller's saved template.
    ///         msg.value must equal the template's exact total.
    function createRound(uint256 claimWindowSeconds) external payable returns (uint256 roundId) {
        address[] memory recipients = templateRecipients[msg.sender];
        if (recipients.length == 0) revert NoTemplate();
        return _createRound(recipients, templateAmounts[msg.sender], claimWindowSeconds);
    }

    /// @notice Fund a one-off payout round from an ad-hoc list without saving it.
    function createRoundCustom(
        address[] calldata recipients,
        uint256[] calldata amounts,
        uint256 claimWindowSeconds
    ) external payable returns (uint256 roundId) {
        _validateList(recipients, amounts);
        return _createRound(recipients, amounts, claimWindowSeconds);
    }

    /// @notice Claim the caller's allocation in a round. One time, exact amount.
    function claim(uint256 roundId) external nonReentrant {
        uint256 amount = _claimEffects(roundId);

        (bool ok,) = payable(msg.sender).call{value: amount}("");
        require(ok, "transfer failed");
        emit Claimed(roundId, msg.sender, amount);
    }

    /// @notice Claim the caller's allocation and atomically swap it to USDC;
    ///         the caller receives USDC only, never touching the MON. If the
    ///         swap can't deliver minUsdcOut the whole transaction reverts and
    ///         the allocation stays claimable (as MON or another swap attempt).
    function claimAndSwap(uint256 roundId, uint256 minUsdcOut) external nonReentrant {
        if (swapRouter == address(0)) revert SwapUnavailable();
        uint256 amount = _claimEffects(roundId);

        uint256 usdcOut = ISwapRouter02(swapRouter).exactInputSingle{value: amount}(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: swapWmon,
                tokenOut: swapUsdc,
                fee: swapPoolFee,
                recipient: msg.sender,
                amountIn: amount,
                amountOutMinimum: minUsdcOut,
                sqrtPriceLimitX96: 0
            })
        );
        emit Claimed(roundId, msg.sender, amount);
        emit ClaimedAsUsdc(roundId, msg.sender, amount, usdcOut);
    }

    /// @dev Shared claim checks + state effects; interactions stay in callers.
    function _claimEffects(uint256 roundId) private returns (uint256 amount) {
        Round storage round = rounds[roundId];
        if (round.closed) revert RoundClosed();
        if (block.timestamp > round.deadline) revert DeadlinePassed();
        amount = allocations[roundId][msg.sender];
        if (amount == 0) revert NothingToClaim();
        if (claims[roundId][msg.sender]) revert AlreadyClaimed();

        claims[roundId][msg.sender] = true;
        round.totalClaimed += amount;
    }

    /// @notice After the deadline, the payer takes back whatever went unclaimed.
    function reclaim(uint256 roundId) external nonReentrant {
        Round storage round = rounds[roundId];
        if (msg.sender != round.payer) revert NotPayer();
        if (block.timestamp <= round.deadline) revert DeadlineNotPassed();
        if (round.closed) revert RoundClosed();

        uint256 amount = round.totalFunded - round.totalClaimed;
        if (amount == 0) revert NothingToReclaim();
        round.closed = true;

        (bool ok,) = payable(msg.sender).call{value: amount}("");
        require(ok, "transfer failed");
        emit Reclaimed(roundId, msg.sender, amount);
    }

    function getRound(uint256 roundId)
        external
        view
        returns (address payer, uint256 totalFunded, uint256 totalClaimed, uint256 deadline, bool closed)
    {
        Round storage round = rounds[roundId];
        return (round.payer, round.totalFunded, round.totalClaimed, round.deadline, round.closed);
    }

    function allocationOf(uint256 roundId, address who) external view returns (uint256) {
        return allocations[roundId][who];
    }

    function hasClaimed(uint256 roundId, address who) external view returns (bool) {
        return claims[roundId][who];
    }

    /// @notice Full recipient breakdown of a round, for the payer's status view.
    function getRoundRecipients(uint256 roundId)
        external
        view
        returns (address[] memory recipients, uint256[] memory amounts, bool[] memory claimedFlags)
    {
        recipients = roundRecipients[roundId];
        uint256 len = recipients.length;
        amounts = new uint256[](len);
        claimedFlags = new bool[](len);
        for (uint256 i = 0; i < len; i++) {
            amounts[i] = allocations[roundId][recipients[i]];
            claimedFlags[i] = claims[roundId][recipients[i]];
        }
    }

    function _validateList(address[] memory recipients, uint256[] memory amounts) private pure returns (uint256 total) {
        if (recipients.length != amounts.length) revert LengthMismatch();
        if (recipients.length == 0) revert EmptyList();
        for (uint256 i = 0; i < recipients.length; i++) {
            if (recipients[i] == address(0)) revert ZeroAddress();
            if (amounts[i] == 0) revert ZeroAmount();
            total += amounts[i];
        }
    }

    function _createRound(
        address[] memory recipients,
        uint256[] memory amounts,
        uint256 claimWindowSeconds
    ) private returns (uint256 roundId) {
        uint256 total;
        for (uint256 i = 0; i < amounts.length; i++) {
            total += amounts[i];
        }
        if (msg.value != total) revert WrongValue(total, msg.value);

        roundId = nextRoundId++;
        Round storage round = rounds[roundId];
        round.payer = msg.sender;
        round.totalFunded = total;
        round.deadline = block.timestamp + claimWindowSeconds;
        roundRecipients[roundId] = recipients;

        for (uint256 i = 0; i < recipients.length; i++) {
            // A duplicate address in the list would let one wallet claim only the
            // last entry while the round is funded for the sum — accumulate instead.
            allocations[roundId][recipients[i]] += amounts[i];
        }

        emit RoundCreated(roundId, msg.sender, total, round.deadline);
    }
}
