# ChainProof 3–5 Minute Demo Script

Before recording: follow README startup steps, deploy to the running Hardhat node, initialize SQLite, set local demo keys/tokens and run the site. Generate the sample with `npm run demo:pdf` or use a PDF of your own. Start from the landing page.

| Time | Narration and action | Expected output / capture |
| --- | --- | --- |
| 0:00–0:25 | “ChainProof checks whether a PDF's bytes match a previously registered version. It does not prove that the claims are true.” Show landing page and note. | Landing page, value proposition, integrity caveat. |
| 0:25–0:55 | Sign in with the administrator token. Open Admin, enter the disposable issuer wallet address and authorize. | Confirmed transaction and ACTIVE status. Capture issuer authorization. |
| 0:55–1:40 | Sign in with the issuer token. Open Register, select the sample PDF, enter title and category, submit. Explain SHA-256 is calculated from file bytes and only digest/metadata is on-chain. | Registration success with document ID, digest, issuer, network and transaction hash. Capture. |
| 1:40–2:10 | Open Verify, upload the exact original with its ID. | `VALID`; capture result. |
| 2:10–2:40 | Alter one byte or re-save a copy and upload it with same ID. | `HASH_MISMATCH`; point out different uploaded digest. Capture. |
| 2:40–3:15 | Open details, download QR, then revoke while signed in as issuer. | QR points to ID verification; confirmed permanent revocation transaction. Capture QR/details. |
| 3:15–3:40 | Verify the original again. | `REVOKED`, never VALID. Capture. |
| 3:40–4:00 | Search an unknown ID. | `NOT_FOUND`. Mention RPC outage maps to verification error. |
| 4:00–4:25 | In Admin, suspend the demo issuer. Try a registration. | Contract rejects it; no success message or metadata row. Capture the error. |
| 4:25–4:45 | Stop the Hardhat node and retry verification. | `VERIFICATION ERROR`; never `VALID`. This ends the recording because restarting the local node resets its in-memory chain state. |

Screenshots to capture: landing, authorization confirmation, registration result, valid match, mismatch, QR/details, revoked result, unknown ID, suspended-issuer rejection, and network-error state.
