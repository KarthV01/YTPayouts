# Base Deployment Guide

This guide moves the MVP from local Anvil to Base Sepolia first, then Base mainnet. The Solidity contract does not need Base-specific changes because Base is EVM-compatible.

References:

- Base network docs: https://docs.base.org/base-chain/quickstart/connecting-to-base
- Base RPC overview: https://docs.base.org/base-chain/api-reference/rpc-overview
- Circle USDC addresses: https://developers.circle.com/stablecoins/usdc-contract-addresses

## Technical Breakdown

`SponsorshipEscrow` is an ERC-20 escrow contract. It stores the agreement `totalCap`, agreement parties, token address, and terms hash. When the backend calls `createEscrow(...)`, the contract pulls the full cap from the sponsor wallet into escrow with `transferFrom(brand, address(this), totalCap)`.

That means Base has one extra operational step compared with the local script: the sponsor must approve the deployed escrow contract to spend at least the cap amount of USDC before the backend tries to create the escrow.

The backend operator signs `createEscrow(...)` and `releasePayout(...)`. The sponsor funds escrow through ERC-20 allowance and balance. Later, delivery approval or metric observations cause backend-signed payout releases from escrow to the creator wallet.

Use native Circle USDC on Base mainnet, not bridged USDbC.

## Network Values

| Network | Chain ID | RPC | USDC |
| --- | ---: | --- | --- |
| Base Sepolia | `84532` | `https://sepolia.base.org` | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| Base Mainnet | `8453` | `https://mainnet.base.org` | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |

The public RPC endpoints are fine for setup tests. Use a dedicated RPC provider for production traffic.

## Base Sepolia Rehearsal

1. Build and test locally.

```powershell
npm run contracts:build
npm run contracts:test
npm run build
npm test
```

2. Fund wallets.

- Deployer/backend wallet: Base Sepolia ETH for gas.
- Sponsor wallet: Base Sepolia ETH for approval gas and Base Sepolia USDC for the cap.
- Creator wallet: any EVM address you control for payout checks.

3. Deploy the escrow contract.

```powershell
$env:BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"
$env:DEPLOYER_PRIVATE_KEY="0x..."
$env:BACKEND_PRIVATE_KEY="0x..."
npm run deploy:base-sepolia
```

The script deploys only `SponsorshipEscrow`. It does not deploy `MockUSDC`, mint tokens, or approve sponsor funds. It writes `deployments/base-sepolia.json`.

4. Configure `.env` for the API.

```dotenv
RPC_URL="https://sepolia.base.org"
CHAIN_ID=84532
ESCROW_CONTRACT_ADDRESS="<deployed escrow>"
USDC_CONTRACT_ADDRESS="0x036CbD53842c5426634e7929541eC2318f3dCF7e"
BACKEND_PRIVATE_KEY="0x..."
DEMO_BRAND_WALLET_ADDRESS="<sponsor wallet>"
DEMO_CREATOR_MAYA_WALLET_ADDRESS="<creator wallet>"
```

5. Approve the exact cap from the sponsor wallet.

Amounts use USDC token units with 6 decimals. For example, `1000000` is 1 USDC and `2500000000` is 2,500 USDC.

```powershell
$env:RPC_URL="https://sepolia.base.org"
$env:USDC_CONTRACT_ADDRESS="0x036CbD53842c5426634e7929541eC2318f3dCF7e"
$env:ESCROW_CONTRACT_ADDRESS="<deployed escrow>"
$env:READINESS_TOTAL_CAP_AMOUNT="2500000"
cast send $env:USDC_CONTRACT_ADDRESS "approve(address,uint256)" $env:ESCROW_CONTRACT_ADDRESS $env:READINESS_TOTAL_CAP_AMOUNT --rpc-url $env:RPC_URL --private-key 0xSPONSOR_PRIVATE_KEY
```

6. Run the readiness check.

```powershell
$env:SPONSOR_WALLET_ADDRESS="<sponsor wallet>"
$env:READINESS_TOTAL_CAP_AMOUNT="2500000"
npm run check:base-sepolia
```

Do not create/fund an agreement until every readiness check prints `OK`.

7. Create and fund a test agreement.

Start the API:

```powershell
npm run dev
```

Then use the demo brand contract endpoint or frontend to create a contract whose `totalCapAmount` is less than or equal to the approved amount. Contract creation calls `createEscrow(...)`, and the escrow contract immediately locks the cap from the sponsor wallet.

8. Verify the flow.

- Confirm the escrow contract's USDC balance increased by the cap.
- Approve delivery to release the base payout.
- Submit a metric update to release a bonus.
- Confirm the creator wallet receives USDC.

## Base Mainnet Run

Repeat the Sepolia flow with mainnet values only after the rehearsal passes.

```powershell
$env:BASE_MAINNET_RPC_URL="https://mainnet.base.org"
$env:DEPLOYER_PRIVATE_KEY="0x..."
$env:BACKEND_PRIVATE_KEY="0x..."
npm run deploy:base-mainnet
```

Mainnet `.env`:

```dotenv
RPC_URL="https://mainnet.base.org"
CHAIN_ID=8453
ESCROW_CONTRACT_ADDRESS="<deployed escrow>"
USDC_CONTRACT_ADDRESS="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
BACKEND_PRIVATE_KEY="0x..."
DEMO_BRAND_WALLET_ADDRESS="<real sponsor wallet>"
```

Before any mainnet agreement, confirm:

- `CHAIN_ID` is exactly `8453`.
- `USDC_CONTRACT_ADDRESS` is native Circle USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`.
- `ESCROW_CONTRACT_ADDRESS` matches the deployed contract.
- Sponsor wallet, creator wallet, cap amount, and allowance are correct.
- `npm run check:base-mainnet` prints only `OK` checks.

## Rollback And Safety

- If deployment fails, do not update `.env`.
- If readiness fails, do not create/fund an agreement.
- If sponsor allowance is too low, submit another sponsor approval before creating the agreement.
- Keep `BACKEND_PRIVATE_KEY` private. It can release escrow payouts.
- Do not run funded demo seed data on Base unless intentional. `seed:demo` refuses non-local funded seeding unless `ALLOW_NON_LOCAL_DEMO_SEED=true`.
- For production, use separate deployer, backend operator, sponsor, and creator wallets.
