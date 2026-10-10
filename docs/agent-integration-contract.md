# SwarmTrace Agent Integration & Ownership Contract

**Document Status:** Frozen — Phase 1 Baseline  
**Governing Lead:** Technical Lead / Principal Engineer  

---

## 1. Domain Ownership Matrix

| Domain | Assigned Agent | Owned Directories & Files | Prohibited Actions |
|---|---|---|---|
| **Smart Contracts & Registry** | **Agent A** | `contracts/src/`<br>`contracts/test/`<br>`contracts/script/`<br>`contracts/foundry.toml` | Must NOT edit `app/`, `components/`, or `lib/verification/types.ts`. Must NOT invent custom ERC-20 tokens or store bulky files on-chain. |
| **Cryptographic & Risk Engine** | **Agent B** | `lib/crypto/`<br>`lib/manifests/`<br>`lib/risk/`<br>`tests/crypto/`<br>`tests/risk/` | Must NOT modify `contracts/` or redefine types independently. Must NOT equate a hash mismatch with malware or unknown with malicious. |
| **Frontend & User Experience** | **Agent C** | `app/`<br>`components/`<br>`public/` | Must NOT handcraft contract ABIs or duplicate cryptographic algorithms. Must NOT fabricate blockchain txs or show misleading "SAFE" badges. |
| **Governance & Coordination** | **Technical Lead** | `lib/verification/types.ts`<br>`lib/chain/`<br>`package.json`<br>`tsconfig.json`<br>`.env.example`<br>`README.md`<br>`docs/` | Single point of synchronization for shared types, exported ABIs, and configuration changes. |

---

## 2. Shared Interfaces & Import Paths

All agents must import interfaces and helpers from the canonical paths:

| Data Contract | Canonical Path | Primary Consumers |
|---|---|---|
| Shared Data Types & Enums | `@/lib/verification/types` | Agent A, Agent B, Agent C |
| RFC 8785 Canonicalization | `@/lib/crypto/canonicalize` | Agent B, Agent C |
| Web Crypto SHA-256 Hashing | `@/lib/crypto/hashing` | Agent B, Agent C |
| Ed25519 Sign / Verify | `@/lib/crypto/ed25519` | Agent B, Agent C |
| Manifest Parsing & Validation | `@/lib/manifests/manifest` | Agent B, Agent C |
| Typed Viem Contract & ABI | `@/lib/chain/contract` | Agent C |
| Monad Testnet Chain Config | `@/lib/chain/monad` | Agent C |

---

## 3. ABI Synchronization & Interface Flow

```text
 ┌────────────────┐
 │    Agent A     │  1. Author & test Solidity contracts
 │ (contracts/)   │  2. Execute: forge build --root contracts
 └───────┬────────┘
         │
         ▼ Output: contracts/out/SwarmTraceRegistry.sol/SwarmTraceRegistry.json
 ┌────────────────┐
 │ Technical Lead │  3. Extract and synchronize ABI
 │ (lib/chain/)   │     lib/chain/abis/SwarmTraceRegistry.json
 └───────┬────────┘     Exports typed contract hooks in lib/chain/contract.ts
         │
         ▼ Consumed by
 ┌────────────────┐
 │    Agent C     │  4. Uses getSwarmTraceRegistryContract() & SWARMTRACE_REGISTRY_ABI
 │    (app/)      │     with viem/wagmi hooks for on-chain reads and transactions
 └────────────────┘
```

---

## 4. Error Handling Conventions

1. **Smart Contracts (`ISwarmTraceRegistry.sol`)**:
   - Uses custom Solidity errors with parameters (e.g. `NotAuthorizedPublisher(address caller)`, `UnauthorizedRevocation(address caller, address releaseOwner)`, `ReleaseAlreadyExists(bytes32 digest)`).
   - Reverts must never be generic `require(bool)` strings.
2. **Cryptographic Engine (`lib/crypto/`, `lib/manifests/`)**:
   - Returns discriminated unions (e.g. `ManifestValidationResult`, `SignatureVerificationResult`).
   - Does not throw unexpected exceptions into UI components; runtime failures map cleanly to status `"ERROR"`.
3. **Risk Presentation (`components/risk/`, `app/risk/`)**:
   - If no scanner is configured, explicitly displays `SCANNER_UNAVAILABLE` or `NOT_SCANNED`.
   - Never converts an empty scanner report into a "Clean" or "0 detections" verdict.

---

## 5. Environment Variables & Secret Safety

```ini
# BROWSER ACCESSIBLE (Non-sensitive only)
NEXT_PUBLIC_MONAD_CHAIN_ID=10143
NEXT_PUBLIC_MONAD_RPC_URL=https://testnet-rpc.monad.xyz
NEXT_PUBLIC_MONAD_EXPLORER_URL=https://testnet.monadscan.com
NEXT_PUBLIC_SWARMTRACE_REGISTRY_ADDRESS=0x...

# SERVER & SCRIPT ONLY (NEVER commit, NEVER prefix with NEXT_PUBLIC_)
PRIVATE_KEY=
```

**Non-Negotiable Rule:** Any deployer private key, wallet mnemonic, or administrative API key must NEVER be committed to Git or exposed in client bundles.

---

## 6. Handoff Criteria & Quality Gates

Before declaring any agent phase ready for integration, the agent must verify:

1. **Agent A Gate**:
   ```bash
   cd contracts && forge test -vvv
   ```
   All tests must pass with 0 warnings.
2. **Agent B Gate**:
   ```bash
   npx vitest run
   ```
   All cryptographic and validation unit tests must pass.
3. **Agent C Gate**:
   ```bash
   npx tsc --noEmit
   npm run build
   ```
   Zero type errors and clean Next.js build.
