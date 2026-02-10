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
    "inputs": [
      { "internalType": "uint8", "name": "_move", "type": "uint8" },
      { "internalType": "uint256", "name": "_nonce", "type": "uint256" }
    ],
    "name": "generateCommitment",
    "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }],
    "stateMutability": "pure",
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
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "gameId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "player1", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "wagerAmount", "type": "uint256" },
      { "indexed": false, "internalType": "address", "name": "wagerToken", "type": "address" }
    ],
    "name": "GameCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "gameId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "player2", "type": "address" }
    ],
    "name": "PlayerJoined",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "gameId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "player", "type": "address" },
      { "indexed": false, "internalType": "bytes32", "name": "commitment", "type": "bytes32" }
    ],
    "name": "MoveCommitted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "gameId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "player", "type": "address" },
      { "indexed": false, "internalType": "uint8", "name": "move", "type": "uint8" }
    ],
    "name": "MoveRevealed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "gameId", "type": "uint256" },
      { "indexed": false, "internalType": "address", "name": "winner", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "payout", "type": "uint256" }
    ],
    "name": "GameFinished",
    "type": "event"
  }
] as const

export const CONTRACT_ADDRESS = {
  103698795: '0x...', // SKALE Testnet - update after deployment
} as const