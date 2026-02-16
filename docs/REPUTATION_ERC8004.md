# Reputation (ERC-8004)

Legasi exposes on-chain agent reputation via a minimal ERC-8004-style registry.

## Contract
`ReputationRegistry.sol`

## Fields
- `score`
- `successfulRepayments`
- `totalRepaidUsd6`
- `gadEvents`
- `lastUpdate`

## Updates
- `updateOnRepay(agent, amountUsd6)`
- `updateOnGad(agent)`

The registry is updated by `LegasiLending` after repayments and GAD events.
