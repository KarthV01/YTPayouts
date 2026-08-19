# YTPayouts

Backend + smart-contract MVP for creator sponsorship escrow.

This repo models sponsorships as generic agreements instead of hardcoded YouTube contracts. The backend stores the rich agreement terms and metric/payout logic; the Solidity contract stores a terms hash, escrows the full earning cap in mock USDC, and only lets an authorized backend/operator release payouts.

## Local Stack

- TypeScript, Fastify, Prisma, SQLite
- Solidity, Foundry, Anvil
- Mock USDC for local escrow testing

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

## Demo Brand API

The demo layer is backend-only. It gives a future frontend enough fake data to render a brand dashboard, contract lists, and a contract builder without creating a UI in this repo.

Dashboard:

```bash
curl http://localhost:3000/demo/brand/dashboard
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
