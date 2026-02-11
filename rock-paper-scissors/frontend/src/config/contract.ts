export const CONTRACT_ABI = [
  {
    "inputs": [{ "internalType": "address", "name": "_feeRecipient", "type": "address" }],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      { "internalType": "bytes32", "name": "_commitment", "type": "bytes32" },
      { "internalType": "uint256", "name": "_wagerAmount", "type": "uint256" },
      { "internalType": "address", "name": "_wagerToken", "type": "address" }
    ],
    "name": "createGame",
    "outputs": [{ "internalType": "uint256", "name": "gameId", "type": "uint256" }],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "_gameId", "type": "uint256" },
      { "internalType": "bytes32", "name": "_commitment", "type": "bytes32" }
    ],
    "name": "joinGame",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "_gameId", "type": "uint256" },
      { "internalType": "uint8", "name": "_move", "type": "uint8" },
      { "internalType": "uint256", "name": "_nonce", "type": "uint256" }
    ],
    "name": "revealMove",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "_gameId", "type": "uint256" }],
    "name": "claimTimeout",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "_gameId", "type": "uint256" }],
    "name": "getGame",
    "outputs": [{
      "components": [
        { "internalType": "address", "name": "player1", "type": "address" },
        { "internalType": "address", "name": "player2", "type": "address" },
        { "internalType": "bytes32", "name": "commitment1", "type": "bytes32" },
        { "internalType": "bytes32", "name": "commitment2", "type": "bytes32" },
        { "internalType": "uint8", "name": "move1", "type": "uint8" },
        { "internalType": "uint8", "name": "move2", "type": "uint8" },
        { "internalType": "uint256", "name": "wagerAmount", "type": "uint256" },
        { "internalType": "address", "name": "wagerToken", "type": "address" },
        { "internalType": "uint256", "name": "commitDeadline", "type": "uint256" },
        { "internalType": "uint256", "name": "revealDeadline", "type": "uint256" },
        { "internalType": "uint8", "name": "state", "type": "uint8" },
        { "internalType": "address", "name": "winner", "type": "address" },
        { "internalType": "bool", "name": "player1Revealed", "type": "bool" },
        { "internalType": "bool", "name": "player2Revealed", "type": "bool" }
      ],
      "internalType": "struct RockPaperScissors.Game",
      "name": "",
      "type": "tuple"
    }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "COMMIT_TIMEOUT",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "REVEAL_TIMEOUT",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "nextGameId",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
] as const

// ERC-20 Token ABI for allowance/balance checks
export const ERC20_ABI = [
  {
    "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "spender", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "owner", "type": "address" },
      { "internalType": "address", "name": "spender", "type": "address" }
    ],
    "name": "allowance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
] as const

// UPDATE THIS AFTER DEPLOYMENT
export const CONTRACT_ADDRESS = {
  103698795: '0xF6FdB8627203632FA6bA16aD7F22E21A900Dc505', // SKALE Testnet
} as const

// Mock SKL Token - UPDATE THIS AFTER DEPLOYMENT
export const TOKEN_ADDRESS = {
  103698795: '0x...', // SKALE Testnet - UPDATE AFTER DEPLOYMENT
} as const

export const TOKEN_DECIMALS = 18
