# ChainProof

ChainProof is an academic prototype for registering PDF SHA-256 digests on a local blockchain and checking later copies against the registered bytes. It proves byte-level integrity only. It does not establish that the claims in a document are true or that its issuer is trustworthy.

## Prerequisites

- Node.js 20.6 or newer and npm.
- MetaMask is optional; the local demo uses disposable Hardhat test keys through explicitly labelled development API roles.

## Install and configure

```powershell
npm install
Copy-Item .env.example .env
npm run db:generate
npm run db:push
```

Set `DEMO_ADMIN_PRIVATE_KEY` and `DEMO_ISSUER_PRIVATE_KEY` in `.env` to accounts printed by the local Hardhat node. Set distinct, private `DEMO_ADMIN_TOKEN` and `DEMO_ISSUER_TOKEN` values for the demo sign-in page. These keys are public development keys funded only on the local chain; never use them for real funds. Keep `.env` private.

## Start the local demo

Open three PowerShell terminals in the project directory:

1. Start the local chain: `npm run chain`. Keep this terminal running. It prints disposable accounts and keys.
2. Deploy the contract: `npm run deploy:local`. The generated deployment address is written to ignored `deployments/localhost.json`. Put that address in `.env` as `CONTRACT_ADDRESS=0x...`. The local chain must remain running. Restarting Hardhat resets its state; redeploy and reauthorize the issuer.
3. Start the site: `npm run dev`, then open <http://localhost:3000>.

Run `npm run demo:pdf` to generate `samples/demo-certificate.pdf`, a clearly labelled one-page demo file. For QR scanning from another device, set `APP_URL` in `.env` to the computer's reachable LAN URL (for example `http://192.168.1.20:3000`) and restart Next.js.

Because Next reads environment values on process start, restart the web server after changing `.env`.

### Demo sequence

1. Open **Demo sign-in**, sign in with the administrator token, authorize the address corresponding to `DEMO_ISSUER_PRIVATE_KEY`; see the confirmed transaction.
2. Sign in with the issuer token. Open **Register**, select a PDF, enter a title and category, and register it. Wait for confirmation; note ID, SHA-256, issuer and transaction hash.
3. Open the document detail page and download its verification QR, or go to Verify and upload the same PDF with its ID. Expect `VALID`.
4. Change one byte or re-save a copy, then upload the changed copy with the same ID. Expect `HASH_MISMATCH`. PDF re-saving or metadata changes can change its byte hash even when it looks the same.
5. On the document details page choose revoke while signed in as the issuer (or sign in as admin). Verify the original again; expect `REVOKED`.
6. Verify an unknown ID; expect `NOT_FOUND`. A stopped chain produces a verification error, not `VALID`.
7. Scan the downloaded QR; it opens the verification page for that document ID.
8. Try registration after suspending the issuer; the contract rejects it.

The local demo uses role-specific `.env` tokens to issue short-lived HttpOnly sessions and server-side development signers. This is a local prototype login, not production identity or key custody. Never expose the dev server or tokens to an untrusted network.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Next.js development server |
| `npm run build` | Production build |
| `npm run lint` | Next.js lint command |
| `npm test` | Hardhat contract tests and application integrity tests |
| `npm run chain` | Local Hardhat JSON-RPC chain (31337) |
| `npm run deploy:local` | Deploy contract to running local chain |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Initialize/update SQLite schema |
| `npm run demo:pdf` | Generate a clearly labelled sample PDF |
| `npm run demo:smoke` | Exercise real-chain registration/verification/revocation, access checks, and private-file non-exposure against running local services |

## Storage and security notes

PDFs are stored under `private-uploads/` (configurable with `UPLOAD_DIR`), outside `public/`, with random names and restrictive file permissions. The API requires either the PDF MIME type or a `.pdf` filename, checks the `%PDF-` signature and upload size (10 MB default), and computes SHA-256 from the exact bytes. Public verification uses contract state, not the metadata database. The local SQLite database stores metadata and a storage reference, not publicly downloadable document links. Contract revocation is permanent; suspending an issuer affects future registrations only.

See [docs/PROJECT_REPORT.md](docs/PROJECT_REPORT.md), [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md), and [docs/SECURITY_AND_LIMITATIONS.md](docs/SECURITY_AND_LIMITATIONS.md).

## Optional Polygon Amoy

Testnet deployment is not required for the local demo and has not been performed. The current scripts configure only chain 31337; Amoy support requires a chain-specific deploy script and explicit RPC/key settings before use. No external credentials are needed for Mode A.
