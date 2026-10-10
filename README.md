# SwarmTrace

> **A torrent-native verification and forensics layer that checks downloaded files against authenticated releases, compares suspicious variants, and explains security evidence, backed by an auditable release registry on Monad.**

Built for the **Monad Blitz Hackathon** on **Monad Testnet (Chain ID 10143)**.

---

## 1. Project Overview

SwarmTrace helps users assess whether a downloaded file or torrent matches an authentic publisher release, understand how it relates to known variants or older versions, and inspect available security evidence before trusting it.

Peer-to-peer distribution is fast and scalable, but filenames, torrent tracker listings, and swarm peer counts do not prove that a file was produced by the legitimate vendor. Cryptographic hashes detect byte-level modifications only when compared against an authentic reference. SwarmTrace bridges this gap by anchoring publisher authorizations and release commitments on Monad.

### Three Connected Features
1. **Live Swarm Integrity (`/verify`)**: Client-side whole-file SHA-256 and piece/chunk hashing, verified against canonical RFC 8785 manifest envelopes and publisher Ed25519 signatures.
2. **Release DNA (`/dna`)**: Cross-variant forensics distinguishing files that share identical filenames, tracing release supersession and revocation relationships.
3. **Swarm Risk Intelligence (`/risk`)**: Transparent multi-source security panel separating publisher provenance from active malware scanner reports (with honest `SCANNER_UNAVAILABLE` reporting).

---

## 2. Core Security & Honesty Guarantees

- **Integrity $\neq$ Benign:** A matching hash proves byte-level equivalence to the publisher reference. It does **not** prove the software is malware-free.
- **Mismatch $\neq$ Malware:** A mismatched hash indicates the downloaded bytes differ from the reference (e.g. repacked installer, alternate build, or corrupted download).
- **Filename $\neq$ Identity:** Filenames are informational display hints and are never trusted as identity proof.
- **Honest Scanner Reporting:** When no scanner API is configured, SwarmTrace reports `SCANNER_UNAVAILABLE` or `NOT_SCANNED`. We never fabricate a clean or 0-detection result.
- **Local File Processing:** File bytes are hashed strictly in the browser using the Web Crypto API. File contents are **never** uploaded to a server.
- **No Mock P2P Activity:** We do not claim live BitTorrent wire-protocol monitoring without an active, tested client integration.

---

## 3. Technology Stack

- **Frontend:** Next.js 15 (App Router), TypeScript 5.9 (Strict Mode, `target: ES2020`), Tailwind CSS, Lucide icons.
- **Smart Contracts:** Solidity 0.8.28, OpenZeppelin Contracts v5, Foundry v1.8.5.
- **Blockchain:** Monad Testnet (Chain ID `10143`, EVM `cancun`).
- **Web3 Integration:** `viem` v2.23 and `wagmi` v2.14.
- **Cryptography:**
  - Hashing: Web Crypto API (`crypto.subtle.digest("SHA-256")`).
  - Manifest Serialization: RFC 8785 JSON Canonicalization Scheme (JCS).
  - Digital Signatures: Ed25519 via `@noble/curves/ed25519`.
- **Testing:** Foundry (`forge test`) and Vitest (`vitest run`).

---

## 4. Frozen Architecture & Agent Ownership

Development is strictly partitioned across three specialized implementation agents coordinated by the Technical Lead:

| Agent | Scope | Owned Directories | Quality Gate |
|---|---|---|---|
| **Agent A** | Smart Contracts | `contracts/src/`, `contracts/test/`, `contracts/script/` | `npm run contracts:test` |
| **Agent B** | Cryptographic & Risk Engine | `lib/crypto/`, `lib/manifests/`, `lib/risk/`, `tests/` | `npm test` (`vitest run`) |
| **Agent C** | Frontend & User Experience | `app/`, `components/`, `public/` | `npm run typecheck && npm run build` |
| **Lead** | Shared Types & ABI Sync | `lib/verification/types.ts`, `lib/chain/`, `docs/` | Single source of truth |

### Shared Data Contracts
All agents import interfaces directly from `@/lib/verification/types`:
- `PublisherIdentity`: Publisher reverse-DNS ID, address, and Ed25519 public key.
- `ReleaseManifestPayload` & `SignedReleaseManifest`: Canonical release manifest.
- `FileIntegrityResult`: Whole-file and piece-by-piece hash match results.
- `SignatureVerificationResult`: Ed25519 verification against authorized publisher keys.
- `EvidenceFinding`: Multi-source findings (`PUBLISHER`, `STATIC_SCANNER`, `COMMUNITY_VERIFIER`).
- `VerificationVerdict`: Explanations, caveats, and overall verdict status.

---

## 5. Solidity Contract Specification

The canonical registry contract is `SwarmTraceRegistry.sol` (`ISwarmTraceRegistry.sol`):
- **`authorizePublisher(address publisher, string publisherId, bytes32 ed25519PubKey)`**: Admin-only publisher onboarding.
- **`registerRelease(string productId, string releaseVersion, bytes32 fileHash, bytes32 manifestDigest, bytes32 previousReleaseDigest)`**: Publisher-authenticated release commitment. Automatically marks `previousReleaseDigest` as `Superseded`.
- **`revokeRelease(bytes32 releaseDigest, string reason)`**: Revokes an active release (callable only by the registering publisher or emergency admin).
- **`rotateSigningKey(bytes32 newEd25519PubKey)`**: Publisher updates their authorized Ed25519 signing key.
- **Read Methods**: `getRelease`, `getReleaseByFileHash`, `getPublisher`, `isAuthorizedPublisher`, `getReleaseStatus`.

---

## 6. Monad Testnet Configuration

- **Network Name:** Monad Testnet
- **Chain ID:** `10143`
- **RPC Endpoint:** `https://testnet-rpc.monad.xyz`
- **Block Explorer:** `https://testnet.monadscan.com`
- **Currency Symbol:** `MON`

### Testing Transactions Safely (Without Leaking Private Keys)
1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. When deploying or broadcasting via Foundry, supply `PRIVATE_KEY` directly via environment variable in your terminal session or use an interactive cast wallet keystore:
   ```bash
   # Option A: Interactive prompt (safest)
   cast send --rpc-url https://testnet-rpc.monad.xyz --interactive <CONTRACT> "registerRelease(...)"

   # Option B: Terminal session variable (never committed to git)
   PRIVATE_KEY=0x... forge script script/DeploySwarmTrace.s.sol --rpc-url monad_testnet --broadcast
   ```
3. Never prefix deployer private keys with `NEXT_PUBLIC_`.

---

## 7. Development & Verification Commands

All toolchains and integration gates are configured and tested:

```bash
# 1. Run unit & cryptographic verification tests (Vitest)
npm test

# 2. Run smart contract unit & access control tests (Foundry)
npm run contracts:test

# 3. Typecheck codebase with strict TypeScript
npm run typecheck

# 4. Compile Next.js production build
npm run build
```

---

## 8. Current Phase Status

- **Phase 0 (Setup & Dependencies):** Complete.
- **Phase 1 (Architecture Freeze & Integration Contracts):** Complete.
  - Frozen shared types: `lib/verification/types.ts`
  - Frozen crypto protocol: `docs/cryptographic-protocol.md`
  - Frozen contract interface: `contracts/src/interfaces/ISwarmTraceRegistry.sol`
  - Frozen agent integration contract: `docs/agent-integration-contract.md`
- **Phase 2 (Implementation of All Three Core Features):** Complete.
  - **Agent A (Smart Contracts):** `SwarmTraceRegistry.sol` implemented with access control, replay protection, monotonic status progression (`Active` -> `Superseded`/`Revoked`), and batch queries. 18 Foundry adversarial tests passing (`18 passed; 0 failed`).
  - **Agent B (Cryptographic & Risk Intelligence):** Full RFC 8785 canonical JSON serializer, Web Crypto SHA-256 whole-file & piece hashing, `@noble/curves/ed25519` detached signature verifier, `compareArtifacts` Release DNA forensic comparator, and `aggregateRiskIntelligence` honest evidence aggregator. 35 Vitest tests passing (`35 passed; 0 failed`).
  - **Agent C (Frontend & Web3 Integration):** Interactive UI for `/verify` (file & piece verifier with chunk matrix), `/dna` (side-by-side artifact comparator & lineage graph), `/risk` (multi-source evidence dashboard with honest `SCANNER_UNAVAILABLE` reporting), and `/publisher` (publisher registration & revocation on Monad Testnet). 5 cryptographically signed demo fixtures created and badged. Next.js build passes cleanly (`8/8` static pages).
- **Phase 3 (Testnet Deployment):** Ready for deployment upon user authorization and credential configuration.
