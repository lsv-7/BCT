# Security Safeguards and Limitations

## Implemented safeguards

- Administrator-only issuer authorization/suspension/reactivation in Solidity.
- Registration requires an authorized, active issuer; duplicate IDs and zero hashes are rejected.
- Issuer/admin-only permanent revocation; suspension does not rewrite historical records.
- SHA-256 is computed server-side from exact PDF bytes; client digests are not accepted.
- PDF extension/MIME, `%PDF-` signature, empty-file, and configurable size checks.
- Random server-generated storage names; private storage outside `public/`; path derived from configured storage root.
- Blockchain is queried during verification; network errors return errors, and revoked records are never valid.
- Transaction receipt is checked before metadata is finalized or success is shown.
- No private document or personally identifying details are written on-chain.
- `.env.local`, SQLite files, uploads, deployment output and build products are ignored by Git.

## Remaining risks and production work

- Local demo tokens issue signed, role-specific, eight-hour HttpOnly cookies with SameSite protection and same-origin sign-in/sign-out checks. They are not identity proof. The development API uses private keys from environment variables and must only run locally. Production needs institutional identity or wallet-signature authentication, production-grade session and CSRF controls, rate limiting, and secure key custody.
- File/database/chain writes are not a distributed atomic transaction. A failure after a confirmed chain transaction but before SQLite save can leave an on-chain record without app metadata. Recovery/reconciliation tooling is needed.
- Local storage has no backup, encryption-at-rest, malware scanning, retention policy, or multi-user isolation. Registered PDFs are kept in the configured private directory under randomized names; verification uploads are hashed in memory and discarded.
- The prototype has not received an independent security audit or production load test.
- Hash matching cannot establish issuer legitimacy or document truth, and exact-byte hashing can differ after visually innocuous PDF re-saving.
- Local Hardhat state is ephemeral. Restarting the node resets contract state; redeploy and reauthorize.
- No Polygon Amoy deployment is included. Do not infer that local transactions were recorded on Polygon.
