# YTPayouts

Backend + smart-contract MVP for creator sponsorship escrow.

This repo models sponsorships as generic agreements instead of hardcoded YouTube contracts. The backend stores the rich agreement terms and metric/payout logic; the Solidity contract stores a terms hash, escrows the full earning cap in ERC-20 USDC-style tokens, and only lets an authorized backend/operator release payouts. Local development uses mock USDC; Base runs use native Circle USDC.

## Local Stack

- TypeScript, Fastify, Prisma, SQLite
- Solidity, Foundry, Anvil
- Mock USDC for local escrow testing

## Base Sepolia/Mainnet

Base deployment uses the same `SponsorshipEscrow` contract with native Circle USDC. Rehearse on Base Sepolia before Base mainnet:

```powershell
npm run contracts:build
npm run deploy:base-sepolia
npm run check:base-sepolia
```

Mainnet commands are available as `npm run deploy:base-mainnet` and `npm run check:base-mainnet`. Read [docs/base-deployment.md](docs/base-deployment.md) before using real funds.

## Setup

```powershell
npm install
Copy-Item .env.example .env
npm run prisma:generate
npm run db:init
npm run contracts:test
```

In another terminal, start a local chain:

```powershell
npm run anvil
```

Build and deploy the local contracts:

```powershell
npm run contracts:build
npm run deploy:local
```

Set the printed `ESCROW_CONTRACT_ADDRESS` and `USDC_CONTRACT_ADDRESS` values in `.env`, or keep the generated `deployments/local.json` file. The API prefers `.env` and falls back to `deployments/local.json`. The deploy script also mints mock USDC to Anvil account #1 and approves the escrow contract for local agreement funding.

Seed the fake brand workspace:

```powershell
npm run seed:demo
```

Start the API:

```powershell
npm run dev
```

In another terminal, install and start the frontend:

```powershell
npm install --prefix web
npm run web:dev
```

Open `http://localhost:5173`. The entry page lets you continue as the seeded sponsor (Stellar Snacks) or as Maya, Kevin, or Lena. Creating contracts, funding escrow, and releasing payouts still require Anvil plus a local deploy.

## Demo frontend

The UI talks to the demo APIs:

- Sponsor: `/demo/brand/*`
- Creator: `/demo/creator/:creatorId/*`
- Account picker: `/demo/profiles`

Delivery approval is a manual operator action. Video content is not checked in this demo. Use **Record performance** on an active contract to submit integer metric values and release bonuses.

## Demo Brand API

The demo APIs feed the local frontend. You can still call them with curl:

Dashboard:

```bash
curl http://localhost:3000/demo/profiles
curl http://localhost:3000/demo/brand/dashboard
curl http://localhost:3000/demo/creator/demo_creator_maya/dashboard
```

Contract builder metadata:

```bash
curl http://localhost:3000/demo/brand/contract-builder
```

List demo brand contracts:

```bash
curl http://localhost:3000/demo/brand/contracts
```

Create and immediately fund a new demo contract:

```bash
curl -X POST http://localhost:3000/demo/brand/contracts \
  -H "Content-Type: application/json" \
  --data @examples/demo-create-contract.json
```

## API Flow

Create an agreement:

```bash
curl -X POST http://localhost:3000/agreements \
  -H "Content-Type: application/json" \
  --data @examples/create-agreement.json
```

Accept it and create the on-chain escrow:

```bash
curl -X POST http://localhost:3000/agreements/{agreementId}/accept
```

Release the base payout after manual delivery approval:

```bash
curl -X POST http://localhost:3000/agreements/{agreementId}/approve-delivery
```

Submit simulated metric data and release eligible bonus payouts:

```bash
curl -X POST http://localhost:3000/agreements/{agreementId}/metrics \
  -H "Content-Type: application/json" \
  --data @examples/metric-update.json
```

Fetch current agreement, escrow, metric, and payout status:

```bash
curl http://localhost:3000/agreements/{agreementId}
```

## Agreement Shape

Amounts are stored as integer token units, so mock USDC uses 6 decimals:

- `2000000000` = 2,000 USDC
- `500000000` = 500 USDC

Metric thresholds are also integer strings. Inputs like `100K` or `1M` are intentionally rejected.
