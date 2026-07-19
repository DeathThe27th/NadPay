import { ACTIVE_NETWORK } from "./network";

export const NADPAY_ADDRESS = ACTIVE_NETWORK.nadpayAddress;

export const NADPAY_ABI = [
  {
    type: "function",
    name: "allocationOf",
    inputs: [
      { name: "roundId", type: "uint256" },
      { name: "who", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "claim",
    inputs: [{ name: "roundId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "claimAndSwap",
    inputs: [
      { name: "roundId", type: "uint256" },
      { name: "minUsdcOut", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "createRound",
    inputs: [{ name: "claimWindowSeconds", type: "uint256" }],
    outputs: [{ name: "roundId", type: "uint256" }],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "createRoundCustom",
    inputs: [
      { name: "recipients", type: "address[]" },
      { name: "amounts", type: "uint256[]" },
      { name: "claimWindowSeconds", type: "uint256" },
    ],
    outputs: [{ name: "roundId", type: "uint256" }],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "getRecipients",
    inputs: [{ name: "payer", type: "address" }],
    outputs: [
      { name: "", type: "address[]" },
      { name: "", type: "uint256[]" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getRound",
    inputs: [{ name: "roundId", type: "uint256" }],
    outputs: [
      { name: "payer", type: "address" },
      { name: "totalFunded", type: "uint256" },
      { name: "totalClaimed", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "closed", type: "bool" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getRoundRecipients",
    inputs: [{ name: "roundId", type: "uint256" }],
    outputs: [
      { name: "recipients", type: "address[]" },
      { name: "amounts", type: "uint256[]" },
      { name: "claimedFlags", type: "bool[]" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "hasClaimed",
    inputs: [
      { name: "roundId", type: "uint256" },
      { name: "who", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "nextRoundId",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "reclaim",
    inputs: [{ name: "roundId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setRecipients",
    inputs: [
      { name: "recipients", type: "address[]" },
      { name: "amounts", type: "uint256[]" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "Claimed",
    inputs: [
      { name: "roundId", type: "uint256", indexed: true },
      { name: "recipient", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "ClaimedAsUsdc",
    inputs: [
      { name: "roundId", type: "uint256", indexed: true },
      { name: "recipient", type: "address", indexed: true },
      { name: "amountMon", type: "uint256", indexed: false },
      { name: "usdcOut", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "RecipientsSaved",
    inputs: [
      { name: "payer", type: "address", indexed: true },
      { name: "count", type: "uint256", indexed: false },
      { name: "total", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Reclaimed",
    inputs: [
      { name: "roundId", type: "uint256", indexed: true },
      { name: "payer", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "RoundCreated",
    inputs: [
      { name: "roundId", type: "uint256", indexed: true },
      { name: "payer", type: "address", indexed: true },
      { name: "totalFunded", type: "uint256", indexed: false },
      { name: "deadline", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  { type: "error", name: "AlreadyClaimed", inputs: [] },
  { type: "error", name: "DeadlineNotPassed", inputs: [] },
  { type: "error", name: "DeadlinePassed", inputs: [] },
  { type: "error", name: "EmptyList", inputs: [] },
  { type: "error", name: "LengthMismatch", inputs: [] },
  { type: "error", name: "NoTemplate", inputs: [] },
  { type: "error", name: "NotPayer", inputs: [] },
  { type: "error", name: "NothingToClaim", inputs: [] },
  { type: "error", name: "NothingToReclaim", inputs: [] },
  { type: "error", name: "Reentrancy", inputs: [] },
  { type: "error", name: "RoundClosed", inputs: [] },
  { type: "error", name: "SwapUnavailable", inputs: [] },
  {
    type: "error",
    name: "WrongValue",
    inputs: [
      { name: "expected", type: "uint256" },
      { name: "provided", type: "uint256" },
    ],
  },
  { type: "error", name: "ZeroAddress", inputs: [] },
  { type: "error", name: "ZeroAmount", inputs: [] },
] as const;
