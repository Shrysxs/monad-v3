# Penguin Trace

> Verify software integrity. Trace provenance.

Penguin Trace is a local verification tool and release registry client. It addresses a straightforward problem: when you download a software binary or installer, there is rarely a direct way to prove that the file matches what the publisher built, that the publisher's signing key was authorized, or that the release has not been revoked.

The application computes file digests locally in the browser, checks detached Ed25519 signatures across canonical RFC 8785 manifests, and inspects release commitments recorded on Monad Testnet.

## What it does

- **Local file hashing:** Computes full-file SHA-256 digests and piece-level chunk hashes entirely in the browser, streaming the file in a Web Worker so multi-GB files never need to fit in memory. File contents are never uploaded to a server.
- **Detached signature verification:** Validates publisher Ed25519 signatures against RFC 8785 JSON Canonicalization Scheme (JCS) release manifests.
- **Piece-level tamper localization:** Matches individual piece hashes against manifest declarations to pinpoint altered or corrupted byte ranges.
- **On-chain release commitments:** Queries an EVM registry contract on Monad Testnet for publisher authorization, version lineage, and revocation status.
- **Compare files:** Compares two artifacts that share the same filename to determine whether they share an origin, represent distinct builds, or indicate an untrusted repack.
- **Honest evidence reporting:** Separates publisher identity from runtime safety. When no antivirus or external scanner is configured, the tool reports `SCANNER_UNAVAILABLE` rather than fabricating a clean result.

## How verification works

Verification follows these steps:

1. **File selection and local hashing:** The user drops or selects a file. The browser reads the bytes through the Web Crypto API and computes its whole-file SHA-256 digest, along with sequential piece hashes if a chunk size is defined.
2. **Digest comparison:** The computed hash is compared against the expected digest declared in the release manifest. If they differ, the verification halts with a `HASH_MISMATCH` status and highlights the altered pieces.
3. **Trusted key resolution:** The verification key is never typed in by the user or taken from the manifest. The registry is queried for the publisher entry matching the manifest's `publisherId`, and for the release record matching the exact release digest computed from the manifest. If the publisher is not registered the result is `UNKNOWN_RELEASE`; if the publisher has been deauthorized it is `UNAUTHORIZED_KEY`.
4. **Signature check:** The manifest is canonicalized according to RFC 8785 and the detached Ed25519 signature is verified. A registered release is checked against the signing key recorded with that release on-chain, so key rotation does not invalidate earlier releases. An unregistered release is checked against the publisher's current key. A failed check returns `INVALID_MANIFEST_SIGNATURE`.
5. **Release status:** A release record is trusted only if it commits to exactly this manifest (publisher, product, version, file hash, manifest digest) and was registered by the publisher's account. Its status determines whether the release is active, superseded, or `REVOKED`.
6. **Verdict classification:** The engine returns one of these states:
   - `MATCHING_AUTHENTICATED_RELEASE`
   - `HASH_MISMATCH`
   - `INVALID_MANIFEST_SIGNATURE`
   - `UNAUTHORIZED_KEY`
   - `REVOKED_RELEASE`
   - `SUPERSEDED_RELEASE`
   - `UNKNOWN_RELEASE`
   - `NETWORK_ERROR`

### Core security boundaries

- **Integrity is not safety:** A matching SHA-256 hash proves byte-level equivalence to the publisher's reference artifact. It does not prove that the code is free of bugs, backdoors, or malicious logic.
- **A mismatch is not proof of malware:** An altered hash indicates the file differs from the reference (due to bit rot, an unofficial repack, or a modified installer). It does not identify the intent behind the change.
- **Signatures verify authorship, not behavior:** A valid Ed25519 signature proves the manifest was created by the holder of the private key. It does not inspect what the binary does when executed.
- **Blockchain records do not scan binaries:** The registry records cryptographic commitments. Monad does not execute, analyze, or sanitize software payloads.

## Why Monad?

File hashing and Ed25519 signature checks can be performed entirely offline. However, static checksums published on standard HTTP mirrors or vendor websites share the same single point of failure as the download itself: if the mirror or DNS is compromised, the posted hashes and public keys can be swapped simultaneously.

Penguin Trace uses Monad Testnet to run an immutable, append-only registry contract (`PenguinTraceRegistry`). The contract stores:

- Authorized publisher IDs and their corresponding Ed25519 public keys
- Deterministic release digests (`keccak256(publisherId, productId, releaseVersion, fileHash, manifestDigest)`)
- The Ed25519 signing key that was authorized when each release was registered
- Per-publisher file-hash indexes, so one publisher can never shadow another publisher's records
- Version lineage pointers (`previousReleaseDigest`) to track supersession
- Permanent revocation flags and explanations

This creates an independently verifiable public ledger of release history that a compromised download mirror cannot retroactively modify. Monad was selected for its EVM compatibility, sub-second block finality, and low transaction costs for recording high-frequency releases.

- **Contract Address:** [`0x9E7AF4e6301C7ce483Fe609E130aC845DDD4d1Bc`](https://testnet.monadscan.com/address/0x9E7AF4e6301C7ce483Fe609E130aC845DDD4d1Bc) (`PenguinTraceRegistry`, source verified on Monadscan)
- **Deployment Transaction:** [`0x615b9da117d0f1ddf37aee1b6e371f8a90d5882cd74d5aa8a809c568db32bde7`](https://testnet.monadscan.com/tx/0x615b9da117d0f1ddf37aee1b6e371f8a90d5882cd74d5aa8a809c568db32bde7) (CREATE2 via CreateX, salt `0x0`)
- **Registry Admin:** `0x2603e032e8ec090c1f6ef25d30da199210f439e1`
- **Network:** Monad Testnet (Chain ID `10143`)

*No publishers or releases are registered yet. The admin authorizes publishers (Admin tab or `alchemy evm contract call`), and publishers register releases from the portal.*

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

The example file is preconfigured for Monad Testnet. Set the registry address to your deployment of `PenguinTraceRegistry` (see [Deploying the registry](#deploying-the-registry)):

```ini
NEXT_PUBLIC_MONAD_CHAIN_ID=10143
NEXT_PUBLIC_MONAD_RPC_URL=https://testnet-rpc.monad.xyz
NEXT_PUBLIC_MONAD_EXPLORER_URL=https://testnet.monadscan.com
NEXT_PUBLIC_PENGUINTRACE_REGISTRY_ADDRESS=0x...   # address printed by the deploy script
```

With no address set, live registry checks are disabled and every live verification ends in `UNKNOWN_RELEASE`; the demo fixtures still work. The older `NEXT_PUBLIC_SWARMTRACE_REGISTRY_ADDRESS` name is still read as a fallback.

*Never store private keys or signing secrets in `.env.local` or any file tracked by version control.*

### Deploying the registry

**Recommended (monskills flow):** deploy from an Alchemy Agent Wallet session via CREATE2 through the CreateX factory. No private key ever touches your machine, and the source is verified on all Monad explorers automatically.

```bash
npm install -g @alchemy/cli@latest      # v0.18.0+
alchemy auth                             # or: alchemy auth login --device-code
# Create an EVM Agent Wallet session at https://dashboard.alchemy.com/products/agent-wallet/evm-wallet, then:
alchemy wallet connect --mode session && alchemy wallet use session

contracts/script/deploy-createx.sh <registry-admin-address>
```

The admin address is passed to the constructor, so use your own browser wallet to manage publishers from the portal's Admin tab.

**Alternative (Foundry keystore):**

```bash
cd contracts
forge script script/DeployPenguinTrace.s.sol --rpc-url monad_testnet --broadcast --account <keystore-name>
```

After changing the contract, regenerate the frontend ABI with `npm run contracts:build && npm run abi:sync`.

The deployer becomes the registry admin. Connect that wallet in the publisher portal's **Admin** tab to authorize publisher accounts (address, publisher ID, Ed25519 public key).

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

Runs 54 tests across 6 test suites:
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

Runs 29 Solidity tests in `contracts/test/PenguinTraceRegistry.t.sol`:
- Publisher authorization and deauthorization by contract owner
- Release commitment registration and collision resistance
- Per-release signing key recording across key rotation
- Publisher-scoped file-hash lookups that cannot be shadowed by another publisher
- Automatic version supersession
- Revocation permanence and prevention of re-revoking
- Access control enforcement (unauthorized callers cannot register releases or revoke other publishers' records)
- Fuzz testing of the deterministic release digest formula

### Code quality checks

```bash
npm run typecheck   # TypeScript compiler check (tsc --noEmit)
npm run lint        # ESLint verification
```

## Using the app

| Page | What it's for |
|---|---|
| **Check a file** (`/verify`) | Add a downloaded file and the publisher's `.json` signature file, and get a plain answer: genuine, changed, fake signature, withdrawn, or out of date, plus what to do next. Technical details (fingerprints, piece map, step log) are folded away. |
| **Compare files** (`/dna`) | Two files with the same name: are they identical, two versions, or is one a fake? |
| **For publishers** (`/publisher`) | Sign a release, publish it on Monad, withdraw a release, look one up, and (admin) approve publishers. |
| **Try the demo** (`/demo`) | A four-step story with made-up sample files: a genuine download, a tampered one, a fake with the same name, and a withdrawn release. No wallet or files needed. |

Every page also offers made-up sample files, always labelled "Sample data". Results from samples never claim to come from Monad Testnet.

## Limitations

- **No live BitTorrent client:** The application does not connect to the BitTorrent wire protocol (TCP/uTP peer connections) or scrape active swarms. Piece integrity is verified against chunk hashes declared in the manifest.
- **No integrated malware scanner:** The tool does not submit files to VirusTotal or execute dynamic sandbox analysis. External scanner status is honestly reported as unavailable.
- **Hashing speed:** Files are streamed from disk and hashed incrementally in a Web Worker (8 MiB at a time), so memory use stays flat regardless of file size. Very large files still take time to hash; progress is shown while hashing.
- **On-chain registry state:** While the `PenguinTraceRegistry` contract is deployed on Monad Testnet, live publisher accounts and production software releases have not yet been registered on-chain. The publisher portal allows submitting transactions, but pre-seeded scenarios rely on local fixtures.
- **Deployment:** The application is configured and verified for local execution; it is not currently deployed to a public hosting URL.

## Project status

Penguin Trace is a working prototype and developer tool. The cryptographic verification engine, RFC 8785 manifest pipeline, Ed25519 signature checks, and smart contract architecture are fully implemented and tested.
