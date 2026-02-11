export const CONTRACT_ABI = [
  {
    "inputs": [
      { "internalType": "bytes", "name": "_encryptedMove", "type": "bytes" },
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
      { "internalType": "bytes", "name": "_encryptedMove", "type": "bytes" }
    ],
    "name": "joinGame",
    "outputs": [],
    "stateMutability": "payable",
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
        { "internalType": "bytes", "name": "encryptedMove1", "type": "bytes" },
        { "internalType": "bytes", "name": "encryptedMove2", "type": "bytes" },
        { "internalType": "uint8", "name": "move1", "type": "uint8" },
        { "internalType": "uint8", "name": "move2", "type": "uint8" },
        { "internalType": "uint256", "name": "wagerAmount", "type": "uint256" },
        { "internalType": "address", "name": "wagerToken", "type": "address" },
        { "internalType": "uint8", "name": "state", "type": "uint8" },
        { "internalType": "uint256", "name": "joinDeadline", "type": "uint256" },
        { "internalType": "address", "name": "winner", "type": "address" }
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

export const CONTRACT_ADDRESS = {
  2090472038: '0x9be779b1136e1f5f75edeb0469b74921c39f5167',
} as const

// Mock SKL Token
export const TOKEN_ADDRESS = {
  2090472038: '0x8d4d0c04f45652dfc3ac95f9f0d4116bc0620f4f',
} as const

export const TOKEN_DECIMALS = 18

// BITE V2 Precompile addresses
export const ENCRYPT_TE_ADDRESS = '0x000000000000000000000000000000000000001C' as const
