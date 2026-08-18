export const sponsorshipEscrowAbi = [
  {
    type: "function",
    name: "createEscrow",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agreementId", type: "bytes32" },
      { name: "brand", type: "address" },
      { name: "creator", type: "address" },
      { name: "token", type: "address" },
      { name: "totalCap", type: "uint256" },
      { name: "termsHash", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "releasePayout",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agreementId", type: "bytes32" },
      { name: "payoutId", type: "bytes32" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

export const mockUsdcAbi = [
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;
