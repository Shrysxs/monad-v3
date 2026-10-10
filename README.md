# Penguin Trace

> **Verify software integrity. Trace release provenance.**

A security-focused Web3 verification and forensics layer that checks downloaded files against authenticated releases, compares suspicious variants, and explains security evidence, backed by an auditable release registry on Monad.

Built for the **Monad Blitz Hackathon** on **Monad Testnet (Chain ID 10143)**.

---

## 1. Project Overview

Peer-to-peer distribution is fast and resilient, but torrent tracker listings, swarm peer counts, and filenames do not prove that downloaded software was produced by the legitimate vendor. Cryptographic hashes only detect byte modifications when compared against an authentic, tamper-proof reference.

**Penguin Trace** bridges this trust gap by anchoring publisher authorizations, release commitments, and revocation statuses on **Monad Testnet**. All file hashing occurs client-side in the browser, ensuring file privacy while cryptographically proving integrity against on-chain publisher records in the deployed `SwarmTraceRegistry` contract.

### Four Integrated Capabilities

1. **Live Integrity (`/verify`)**
   - Client-side whole-file SHA-256 and piece/chunk hashing using the Web Crypto API.
   - Detached **Ed25519 signature verification** against RFC 8785 canonical JSON manifests.
   - Real-time on-chain release querying against `SwarmTraceRegistry` on Monad Testnet.
   - Visual chunk/piece matrix displaying corruption or tamper boundaries down to specific pieces.

2. **Release DNA (`/dna`)**
   - Side-by-side forensic comparator distinguishing files that share identical filenames.
   - Detects repackaged releases, unofficial rebuilds, and version supersession.
   - Monotonic lineage visualization tracking active, superseded, and revoked release lifecycles.

3. **Risk Intelligence (`/risk`)**
   - Multi-source risk evidence aggregator separating publisher provenance from malware scans.
   - Strictly honest reporting: displays `SCANNER_UNAVAILABLE` or `NOT_SCANNED` rather than pretending scans ran or reporting clean verdicts without evidence.
   - Multi-factor risk scoring with caveats and detailed forensic explanations.

4. **Publisher Portal & Governance (`/publisher`)**
   - Web3 wallet connection with automatic chain switching to Monad Testnet (Chain ID `10143`).
   - Publisher Ed25519 public key registration, release publishing (`registerRelease`), key rotation (`rotateSigningKey`), and emergency revocation (`revokeRelease`).

---

## 2. Core Security & Honesty Guarantees

Penguin Trace adheres to six fundamental security and honesty principles:

1. **Integrity $\neq$ Benign:** A matching hash proves byte-level equivalence to the publisher's reference release. It does **not** prove the software is malware-free.
2. **Mismatch $\neq$ Malware:** A mismatched hash indicates the downloaded bytes differ from the reference (e.g. repacked installer, alternate build, or corrupted download). It does not prove malicious intent.
3. **Filename $\neq$ Identity:** Filenames are purely informational display hints and are never trusted as identity proof.
4. **Honest Scanner Reporting:** When no external antivirus/scanner API is active, Penguin Trace explicitly reports `SCANNER_UNAVAILABLE` or `NOT_SCANNED`. We never fabricate a clean or 0-detection result.
5. **Local File Processing:** File bytes are hashed strictly in the user's browser using the Web Crypto API. File contents are **never** uploaded to any server.
6. **No Mock Wire Protocol:** We do not claim live BitTorrent wire-protocol monitoring without an active, tested client integration.

---

## 3. Deployment & Network Information

| Parameter | Configuration / Value |
|---|---|
| **Network Name** | Monad Testnet |
| **Chain ID** | `10143` (`0x279f`) |
| **RPC Endpoint** | `https://testnet-rpc.monad.xyz` |
| **Currency Symbol** | `MON` |
| **Block Explorer** | `https://testnet.monadscan.com` |
| **Registry Contract** | `0xeB3Ef45368cf0A28679FC6F037295fC2607deF01` |
| **Contract on Explorer** | [View on MonadScan](https://testnet.monadscan.com/address/0xeB3Ef45368cf0A28679FC6F037295fC2607deF01) |
| **Deployment Tx Hash** | `0x037d4996320061039d5632c7cede5bb021fcdb29446ddbcf3e10fea63ff820f9` |
| **Deployer / Owner** | `0xB9BA425A04E8BbDD74eeDa5c668e8F5f32A1eA97` |

---

## 4. Environment Variables

Create `.env.local` based on `.env.example`:

```bash
cp .env.example .env.local
```

| Variable | Scope | Description | Default / Example |
|---|---|---|---|
| `NEXT_PUBLIC_MONAD_CHAIN_ID` | Client | Chain ID for Monad Testnet | `10143` |
| `NEXT_PUBLIC_MONAD_RPC_URL` | Client | Public RPC endpoint | `https://testnet-rpc.monad.xyz` |
| `NEXT_PUBLIC_MONAD_EXPLORER_URL` | Client | Block explorer base URL | `https://testnet.monadscan.com` |
| `NEXT_PUBLIC_SWARMTRACE_REGISTRY_ADDRESS` | Client | Deployed `SwarmTraceRegistry` address | `0x...` |
| `PRIVATE_KEY` | Server / CLI | Deployer private key (**Never prefix with `NEXT_PUBLIC_`**) | Terminal / Keystore only |

> [!CAUTION]
> Never commit `PRIVATE_KEY` or put sensitive credentials in client-accessible `NEXT_PUBLIC_*` variables.

---

## 5. Getting Started & Local Setup

### Prerequisites
- **Node.js**: `v20.x` or higher
- **npm**: `v10.x` or higher
- **Foundry**: `forge` and `cast` (`forge 1.8.5` or higher)

### Installation

1. **Clone the repository and install root dependencies:**
   ```bash
   git clone https://github.com/Shrysxs/monad-v3.git
   cd monad-v3
   npm install
   ```

2. **Install Foundry contract dependencies:**
   ```bash
   cd contracts
   forge install
   cd ..
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env.local
   ```

4. **Start the local Next.js development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 6. Verification & Test Suite

All quality gates, adversarial security tests, and build artifacts pass cleanly:

```bash
# 1. Run smart contract test suite (18 adversarial Foundry tests)
npm run contracts:test

# 2. Run cryptographic & risk intelligence tests (38 Vitest tests)
npm test

# 3. Strict TypeScript typechecking (target ES2020)
npm run typecheck

# 4. Production Next.js build (8 static prerendered routes)
npm run build
```

### Test Coverage Summary
- **Smart Contracts (Foundry):** 18 passing tests covering publisher authorization, cross-publisher access denial, duplicate release rejection, monotonic status progressions (`Active` $\to$ `Superseded` $\to$ `Revoked`), key rotation, and batch queries.
- **Cryptographic Engine (Vitest):** 38 passing tests covering RFC 8785 canonical JSON serialization, SHA-256 chunking, detached Ed25519 signatures, binding attack defenses, cross-publisher spoofing defenses, and honest evidence aggregation.
- **Frontend (Next.js):** 0 TypeScript errors, 8 cleanly pre-rendered static routes (`/`, `/verify`, `/dna`, `/risk`, `/publisher`, `/_not-found`).

---

## 7. Smart Contract Deployment Guide

The deployment script is located at `contracts/script/DeploySwarmTrace.s.sol`.

### Dry-Run Simulation (No Gas Spent)
Simulate deployment against live Monad Testnet RPC without broadcasting:

```bash
cd contracts
PRIVATE_KEY=0x... forge script script/DeploySwarmTrace.s.sol:DeploySwarmTrace \
  --rpc-url https://testnet-rpc.monad.xyz
cd ..
```

- **Gas Estimate:** ~3,101,013 gas units
- **Cost Estimate:** ~0.63 MON at ~100 gwei base fee + 3 gwei priority fee

### Live Testnet Broadcast (Requires Approval & Funding)
Once deployer wallet is funded with $\ge 0.65$ testnet MON:

```bash
cd contracts
PRIVATE_KEY=0x... forge script script/DeploySwarmTrace.s.sol:DeploySwarmTrace \
  --rpc-url https://testnet-rpc.monad.xyz \
  --broadcast
cd ..
```

After broadcast:
1. Copy the deployed contract address from the Foundry console output.
2. Update `NEXT_PUBLIC_SWARMTRACE_REGISTRY_ADDRESS` in `.env.local` and your hosting provider (e.g. Vercel).
3. Verify on MonadScan at `https://testnet.monadscan.com/address/<DEPLOYED_ADDRESS>`.

---

## 8. Known Limitations & Roadmap

- **BitTorrent Wire Protocol:** Penguin Trace currently processes downloaded payloads and `.torrent` chunk manifests in the browser. Direct TCP/uTP peer wire inspection requires a local native desktop daemon or WebRTC-based torrent client integration.
- **External Antivirus Integration:** Commercial scanners (e.g. VirusTotal API) require paid API keys and file uploads, which violate zero-knowledge file privacy. Penguin Trace defaults to transparent `SCANNER_UNAVAILABLE` unless an explicit privacy-preserving hash-lookup API is connected.
- **Browser Memory Limits:** In-browser Web Crypto API processing buffers file chunks in memory. Files larger than 2 GB should be verified piece-by-piece or via CLI tools.

---

## 9. Technology Stack

- **Frontend:** Next.js 15 (App Router), TypeScript 5.9, Tailwind CSS, Lucide icons.
- **Smart Contracts:** Solidity 0.8.28, OpenZeppelin Contracts v5, Foundry.
- **Blockchain:** Monad Testnet (Chain ID `10143`, EVM `cancun`).
- **Web3 Integration:** `viem` v2.23 and `wagmi` v2.14.
- **Cryptography:**
  - Hashing: Web Crypto API (`crypto.subtle.digest("SHA-256")`).
  - Manifest Serialization: RFC 8785 JSON Canonicalization Scheme (JCS).
  - Digital Signatures: Ed25519 via `@noble/curves/ed25519`.
