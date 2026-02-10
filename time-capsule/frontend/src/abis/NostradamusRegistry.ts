import type { Abi } from 'viem';

export const NOSTRADAMUS_REGISTRY_ABI: Abi = [
  {
    type: 'function',
    name: 'submitPrediction',
    stateMutability: 'payable',
    inputs: [
      { name: 'encryptedPrediction', type: 'bytes', internalType: 'bytes' },
      { name: 'revealDelay', type: 'uint256', internalType: 'uint256' },
      { name: 'description', type: 'string', internalType: 'string' }
    ],
    outputs: [{ name: 'predictionId', type: 'uint256', internalType: 'uint256' }]
  },
  {
    type: 'function',
    name: 'triggerReveal',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'predictionId', type: 'uint256', internalType: 'uint256' }
    ],
    outputs: []
  },
  {
    type: 'function',
    name: 'cancelPrediction',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'predictionId', type: 'uint256', internalType: 'uint256' }
    ],
    outputs: []
  },
  {
    type: 'function',
    name: 'getPrediction',
    stateMutability: 'view',
    inputs: [
      { name: 'predictionId', type: 'uint256', internalType: 'uint256' }
    ],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'predictor', type: 'address', internalType: 'address' },
          { name: 'encryptedPrediction', type: 'bytes', internalType: 'bytes' },
          { name: 'metadataHash', type: 'bytes32', internalType: 'bytes32' },
          { name: 'revealBlock', type: 'uint256', internalType: 'uint256' },
          { name: 'description', type: 'string', internalType: 'string' },
          { name: 'active', type: 'bool', internalType: 'bool' },
          { name: 'revealed', type: 'bool', internalType: 'bool' },
          { name: 'revealedValue', type: 'string', internalType: 'string' }
        ],
        internalType: 'struct NostradamusRegistry.Prediction'
      }
    ]
  },
  {
    type: 'function',
    name: 'canReveal',
    stateMutability: 'view',
    inputs: [
      { name: 'predictionId', type: 'uint256', internalType: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }]
  },
  {
    type: 'function',
    name: 'getTotalPredictions',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }]
  },
  {
    type: 'function',
    name: 'CTX_GAS_COST',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }]
  },
  {
    type: 'event',
    name: 'PredictionSubmitted',
    inputs: [
      { name: 'predictionId', type: 'uint256', indexed: true, internalType: 'uint256' },
      { name: 'predictor', type: 'address', indexed: true, internalType: 'address' },
      { name: 'encryptedPrediction', type: 'bytes', indexed: false, internalType: 'bytes' },
      { name: 'revealBlock', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'description', type: 'string', indexed: false, internalType: 'string' }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'PredictionRevealed',
    inputs: [
      { name: 'predictionId', type: 'uint256', indexed: true, internalType: 'uint256' },
      { name: 'revealedValue', type: 'string', indexed: false, internalType: 'string' }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'RevealTriggered',
    inputs: [
      { name: 'predictionId', type: 'uint256', indexed: true, internalType: 'uint256' }
    ],
    anonymous: false
  }
] as const;

export type Prediction = readonly [
  predictor: `0x${string}`,
  encryptedPrediction: `0x${string}`,
  metadataHash: `0x${string}`,
  revealBlock: bigint,
  description: string,
  active: boolean,
  revealed: boolean,
  revealedValue: string,
];

export function parsePrediction(tuple: unknown): Prediction {
  const t = tuple as readonly [
    `0x${string}`,
    `0x${string}`,
    `0x${string}`,
    bigint,
    string,
    boolean,
    boolean,
    string
  ];
  return t;
}
