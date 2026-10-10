# Penguin Trace

> Verify software integrity. Trace provenance.

Penguin Trace is a local verification tool and release registry client. It addresses a straightforward problem: when you download a software binary or installer, there is rarely a direct way to prove that the file matches what the publisher built, that the publisher's signing key was authorized, or that the release has not been revoked.

The application computes file digests locally in the browser, checks detached Ed25519 signatures across canonical RFC 8785 manifests, and inspects release commitments recorded on Monad Testnet.

## What it does

- **Local file hashing:** Computes full-file SHA-256 digests and piece-level chunk hashes entirely in the browser using the Web Crypto API. File contents are never uploaded to a server.
- **Detached signature verification:** Validates publisher Ed25519 signatures against RFC 8785 JSON Canonicalization Scheme (JCS) release manifests.
- **Piece-level tamper localization:** Matches individual piece hashes against manifest declarations to pinpoint altered or corrupted byte ranges.
- **On-chain release commitments:** Queries an EVM registry contract on Monad Testnet for publisher authorization, version lineage, and revocation status.
- **Variant forensics (Release DNA):** Compares two artifacts that share the same filename to determine whether they share an origin, represent distinct builds, or indicate an untrusted repack.
- **Honest evidence reporting:** Separates publisher identity from runtime safety. When no antivirus or external scanner is configured, the tool reports `SCANNER_UNAVAILABLE` rather than fabricating a clean result.

## How verification works

Verification follows a five-step sequence:

1. **File selection and local hashing:** The user drops or selects a file. The browser reads the bytes through the Web Crypto API and computes its whole-file SHA-256 digest, along with sequential piece hashes if a chunk size is defined.
2. **Digest comparison:** The computed hash is compared against the expected digest declared in the release manifest. If they differ, the verification halts with a `HASH_MISMATCH` status and highlights the altered pieces.
3. **Manifest validation and signature check:** The manifest JSON is parsed and canonicalized according to RFC 8785. The detached Ed25519 signature is verified against the publisher's declared public key. If the signature does not match the canonical bytes, the result returns `INVALID_MANIFEST_SIGNATURE`.
4. **On-chain registry inspection:** The registry contract on Monad Testnet is queried by publisher ID and file hash. The check verifies whether the signing key is authorized, whether the release commitment exists, whether an older version was superseded, or whether the release was marked `REVOKED`.
5. **Verdict classification:** The engine returns one of seven discrete states:
   - `MATCHING_AUTHENTICATED_RELEASE`
   - `HASH_MISMATCH`
   - `INVALID_MANIFEST_SIGNATURE`
   - `UNAUTHORIZED_KEY`
   - `REVOKED_RELEASE`
   - `UNKNOWN_RELEASE`
   - `NETWORK_ERROR`

### Core security boundaries

- **Integrity is not safety:** A matching SHA-256 hash proves byte-level equivalence to the publisher's reference artifact. It does not prove that the code is free of bugs, backdoors, or malicious logic.
- **A mismatch is not proof of malware:** An altered hash indicates the file differs from the reference (due to bit rot, an unofficial repack, or a modified installer). It does not identify the intent behind the change.
- **Signatures verify authorship, not behavior:** A valid Ed25519 signature proves the manifest was created by the holder of the private key. It does not inspect what the binary does when executed.
- **Blockchain records do not scan binaries:** The registry records cryptographic commitments. Monad does not execute, analyze, or sanitize software payloads.

## Why Monad?

File hashing and Ed25519 signature checks can be performed entirely offline. However, static checksums published on standard HTTP mirrors or vendor websites share the same single point of failure as the download itself: if the mirror or DNS is compromised, the posted hashes and public keys can be swapped simultaneously.

Penguin Trace uses Monad Testnet to run an immutable, append-only registry contract (`SwarmTraceRegistry`). The contract stores:

- Authorized publisher IDs and their corresponding Ed25519 public keys
- Deterministic release digests (`keccak256(publisherId, productId, releaseVersion, fileHash, manifestDigest)`)
- Version lineage pointers (`previousReleaseDigest`) to track supersession
- Permanent revocation flags and explanations

This creates an independently verifiable public ledger of release history that a compromised download mirror cannot retroactively modify. Monad was selected for its EVM compatibility, sub-second block finality, and low transaction costs for recording high-frequency releases.

- **Contract Address:** [`0xeB3Ef45368cf0A28679FC6F037295fC2607deF01`](https://testnet.monadscan.com/address/0xeB3Ef45368cf0A28679FC6F037295fC2607deF01)
- **Deployment Transaction:** [`0x037d4996320061039d5632c7cede5bb021fcdb29446ddbcf3e10fea63ff820f9`](https://testnet.monadscan.com/tx/0x037d4996320061039d5632c7cede5bb021fcdb29446ddbcf3e10fea63ff820f9)
- **Network:** Monad Testnet (Chain ID `10143`)

*Note: The contract bytecode is deployed and verified on testnet. Live publisher authorizations and production release commitments have not yet been broadcast to this contract instance; the application uses local fixtures for demonstration.*

## Tech stack

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript 5.7, Tailwind CSS, Lucide icons
- **Smart Contracts:** Solidity 0.8.28, OpenZeppelin Contracts v5, Foundry (`forge`, `cast`)
- **Web3 Integration:** `viem` 2.23, `wagmi` 2.14
- **Cryptography:**
  - Web Crypto API (`crypto.subtle.digest("SHA-256")`) for in-browser file hashing
  - `@noble/curves` (`ed25519`) for Ed25519 signature verification
  - RFC 8785 JSON Canonicalization Scheme (JCS) for deterministic manifest payloads
- **Testing:** Vitest 3.0 (frontend & cryptographic engine), Foundry (Solidity contracts)

## Getting started

### Prerequisites

- Node.js 20.x or higher
- npm 10.x or higher
- Foundry (`forge` and `cast`), if you plan to compile or test the Solidity contracts

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Shrysxs/monad-v3.git
   cd monad-v3
   ```

2. Install Node dependencies:
   ```bash
   npm install
   ```

3. (Optional) Install Foundry dependencies:
   ```bash
   cd contracts
   forge install
   cd ..
   ```

### Configuration

Copy the example environment file:

```bash
cp .env.example .env.local
```

The default `.env.local` is preconfigured for Monad Testnet and the deployed registry contract:

```ini
NEXT_PUBLIC_MONAD_CHAIN_ID=10143
NEXT_PUBLIC_MONAD_RPC_URL=https://testnet-rpc.monad.xyz
NEXT_PUBLIC_MONAD_EXPLORER_URL=https://testnet.monadscan.com
NEXT_PUBLIC_SWARMTRACE_REGISTRY_ADDRESS=0xeB3Ef45368cf0A28679FC6F037295fC2607deF01
```

*Never store private keys or signing secrets in `.env.local` or any file tracked by version control.*

### Running locally

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

To create a production build and test it locally:

```bash
npm run build
npm run start
```

## Running tests

The repository includes test suites for both frontend cryptographic logic and smart contracts.

### Frontend and cryptographic tests (Vitest)

```bash
npm test
```

Runs 42 tests across 6 test suites:
- `tests/crypto/manifest-crypto.test.ts`: RFC 8785 canonicalization, key ordering, SHA-256 digests, and detached Ed25519 signature verification.
- `tests/verification/engine.test.ts`: Local file hashing, piece matching, status outcome resolution, and corrupt chunk isolation.
- `tests/risk/release-dna.test.ts`: Variant comparison rules, chunk diff calculations, and lineage graph generation.
- `tests/risk/evidence.test.ts`: Multi-source evidence scoring and honest scanner-unavailable state handling.
- `tests/integration/e2e-verification.test.ts`: Full verification path linking file bytes, manifests, signatures, and registry records.
- `tests/demo-data/fixtures.test.ts`: Integrity and cryptographic consistency of sample fixtures.

### Smart contract tests (Foundry)

```bash
npm run contracts:test
```

Runs 18 Solidity tests in `contracts/test/SwarmTraceRegistry.t.sol`:
- Publisher authorization and deauthorization by contract owner
- Release commitment registration and collision resistance
- Automatic version supersession
- Revocation permanence and prevention of re-revoking
- Access control enforcement (unauthorized callers cannot register releases or revoke other publishers' records)
- Fuzz testing of the deterministic release digest formula

### Code quality checks

```bash
npm run typecheck   # TypeScript compiler check (tsc --noEmit)
npm run lint        # ESLint verification
```

## Demo walkthrough

An interactive demonstration is available at `/demo` or by clicking **Try Demo** in the navigation header.

The demo does not require a Web3 wallet, testnet gas, or external API keys. It runs entirely in memory using pre-computed cryptographic fixtures:

1. **Step 1 (Verify integrity):** Evaluates an authentic Ubuntu image (`ubuntu-24.04-desktop-amd64.iso`) against its signed manifest, verifying full-file SHA-256 and all 7 piece hashes.
2. **Step 2 (Detect tampering):** Evaluates a modified variant of the same file with 1 flipped byte, showing the hash mismatch and isolating the altered piece (#0).
3. **Step 3 (Explore release history):** Compares two artifacts sharing identical filenames to demonstrate how cryptographic digests distinguish official vendor builds from unverified tracker repacks.
4. **Step 4 (Inspect risk report):** Displays the multi-source evidence audit, showing 100% provenance confidence alongside an explicit `SCANNER_UNAVAILABLE` notice for malware inspection.

*Note: All data in `/demo` consists of local test fixtures. They demonstrate the verification workflow but do not represent live on-chain transactions.*

## Limitations

- **No live BitTorrent client:** The application does not connect to the BitTorrent wire protocol (TCP/uTP peer connections) or scrape active swarms. Piece integrity is verified against chunk hashes declared in the manifest.
- **No integrated malware scanner:** The tool does not submit files to VirusTotal or execute dynamic sandbox analysis. External scanner status is honestly reported as unavailable.
- **Browser memory constraints:** Files are processed in memory through the browser's Web Crypto API. Files larger than approximately 2 GB may encounter browser memory limits.
- **On-chain registry state:** While the `SwarmTraceRegistry` contract is deployed on Monad Testnet, live publisher accounts and production software releases have not yet been registered on-chain. The publisher portal allows submitting transactions, but pre-seeded scenarios rely on local fixtures.
- **Deployment:** The application is configured and verified for local execution; it is not currently deployed to a public hosting URL.

## Project status

Penguin Trace is a working prototype and developer tool. The cryptographic verification engine, RFC 8785 manifest pipeline, Ed25519 signature checks, and smart contract architecture are fully implemented and tested.
