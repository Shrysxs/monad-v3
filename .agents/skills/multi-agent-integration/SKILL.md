---
name: multi-agent-integration
description: Multi-agent coordination protocols, interface governance, file ownership boundaries, and handoff criteria for SwarmTrace parallel development across Agent A (Contracts), Agent B (Verification), and Agent C (Frontend).
---

# SwarmTrace Multi-Agent Integration & Governance Standards

This skill defines the parallel execution boundaries, interface freeze policies, file ownership rules, and verification gates for coordinating autonomous agents on the SwarmTrace repository.

## The Three Implementation Agents

To build SwarmTrace rapidly and reliably without merge conflicts or architectural drift, work is partitioned across three specialized agents coordinated by the Technical Lead:

```text
               ┌────────────────────────────────────────────────────────┐
               │              Lead / Integration Agent                   │
               │  - Architecture Freeze & Shared Types (lib/types)      │
               │  - Contract ABI synchronization (lib/chain)            │
               │  - README, .env.example, .monskills & DevEx             │
               └───────────┬────────────────┬───────────────────────────┘
                           │                │
            ┌──────────────▼────┐    ┌──────▼────────────┐    ┌─────────────────▼──┐
            │      Agent A      │    │      Agent B      │    │      Agent C       │
            │  Smart Contracts  │    │ Cryptographic &   │    │    Frontend &      │
            │  & Foundry Tests  │    │   Risk Engine     │    │  User Experience   │
            └───────────────────┘    └───────────────────┘    └────────────────────┘
```

### Agent A: Smart Contracts & Monad Registry
- **File Ownership**: `contracts/src/`, `contracts/test/`, `contracts/script/`, `contracts/foundry.toml`.
- **Responsibilities**: Implements `SwarmTraceRegistry.sol`, authoring Foundry unit, invariant, and access control tests, deployment scripts, and explorer verification inputs.
- **Reference Skills**: `.agents/skills/solidity-security/SKILL.md`, `.agents/skills/gas/SKILL.md`, `.agents/skills/addresses/SKILL.md`, `.agents/skills/scaffold/SKILL.md`.
- **Must NOT**: Edit frontend files or invent custom tokens.

### Agent B: Cryptographic Verification & Risk Engine
- **File Ownership**: `lib/crypto/`, `lib/manifests/`, `lib/verification/`, `lib/risk/`, `tests/crypto/`, `tests/risk/`.
- **Responsibilities**: Web Crypto SHA-256 hashing, chunk hashing, RFC 8785 JSON Canonicalization Scheme (JCS), Ed25519 signature verification, manifest validation, evidence aggregation, and risk evaluation.
- **Reference Skills**: `.agents/skills/crypto-file-verification/SKILL.md`, `.agents/skills/security-testing/SKILL.md`.
- **Must NOT**: Treat filename as identity, label unknown files as malware, or fabricate scan results.

### Agent C: Frontend & User Experience
- **File Ownership**: `app/`, `components/`, `public/`.
- **Responsibilities**: Next.js App Router views (Live Swarm Integrity, Release DNA, Swarm Risk Intelligence), drag-and-drop file inputs, wallet connection to Monad Testnet, reactive state display, and demo fixtures.
- **Reference Skills**: `.agents/skills/nextjs-web3-engineering/SKILL.md`, `.agents/skills/wallet-integration/SKILL.md`.
- **Must NOT**: Fake blockchain transactions, mock peer-to-peer wire protocol connections, or display "SAFE" badges.

---

## 1. Interface Governance & Freeze Rules

1. **Frozen Source of Truth**:
   - Shared data contracts in `lib/verification/types.ts` are frozen by the Technical Lead.
   - Individual agents **must not** unilaterally modify, add fields, or redefine shared types.
   - If a schema alteration is necessary, it must be documented, proposed to the Technical Lead, and propagated across all three agent domains simultaneously.
2. **Contract ABI Propagation**:
   - Agent A compiles contracts: `forge build --root contracts`.
   - Contract ABI is exported to `lib/chain/abis/SwarmTraceRegistry.json`.
   - Agent C and the Lead consume this single exported ABI in viem contract definitions. No agent may handcraft or duplicate ABI arrays.
3. **No Overlapping File Writes**:
   - Two agents must never edit the same source file concurrently.
   - Changes outside an agent's assigned directory require explicit coordination.

---

## 2. Shared Security Axioms

All implementation agents must strictly enforce these requirements:

- **Never treat a changed hash as proof of malware.** (Mismatch indicates difference from reference, not malicious intent).
- **Never treat a matching hash as proof that a file is malware-free.** (Integrity != clean).
- **Never report a scan as clean when no scanner ran.** (Display `SCANNER_UNAVAILABLE` or `NOT_SCANNED`).
- **Never trust an unauthenticated publisher or allow unauthorized revocation.** (Enforce on-chain and cryptographic authorization).
- **Never fabricate blockchain transactions, scanner results, or torrent integration.** (All claims must be backed by real code or clearly labeled `DEMO DATA`).
- **Require automated tests and evidence before declaring a feature complete.** (Foundry tests for contracts, Vitest for verification/risk logic).

---

## 3. Integration Checklist & Quality Gates

Before integrating an agent's work into the main development branch:

- [ ] **Directory Boundaries Respected**: Did the agent only touch files within its assigned ownership scope?
- [ ] **Interface Consistency**: Does the agent's code compile cleanly against `lib/verification/types.ts` without local overrides?
- [ ] **No Secret Commits**: Are all private keys, mnemonic seeds, and RPC secrets excluded from committed files and environment variables?
- [ ] **Automated Tests Executed**: Did the agent provide passing test logs (`forge test` or `vitest run`)?
- [ ] **Deterministic Clean Builds**: Does `npm run build` and `npm run typecheck` pass without errors?
- [ ] **Accurate Status Reporting**: Does the agent's report specify exact files created, commands run, tests passed, and known limitations?

---

## 4. Failure Modes & Mitigations

| Failure Mode | Impact | Prevention / Recovery |
|---|---|---|
| **Type Drift** | Agent B changes manifest fields while Agent C relies on old schema. | Strict type freeze in `lib/verification/types.ts`. All agents import types from this single module. |
| **ABI Desynchronization** | Frontend calls contract functions with outdated parameter types. | Automated ABI export script: `contracts/out/SwarmTraceRegistry.sol/SwarmTraceRegistry.json` -> `lib/chain/abis/`. |
| **Fabricated Demos** | Agent mocks transaction receipts to appear functional without real RPC calls. | Disallow fake transaction generation; enforce explicit `DEMO DATA` labeling and real Monad Testnet explorer links. |
| **Overlapping File Conflicts** | Agent A and Agent C both modify root `package.json`. | Lead manages root configuration (`package.json`, `tsconfig.json`, `foundry.toml`, `.env.example`). |

---

## 5. Acceptance Criteria

1. **Handoff Artifacts**:
   - Clear contract ABI and interface definition in `lib/chain/`.
   - Complete type definitions in `lib/verification/types.ts`.
   - Comprehensive test commands documented in `README.md`.
2. **Reproducibility**:
   - Each agent can verify its subsystem independently using isolated commands:
     * `npm run contracts:test` for Agent A.
     * `npm run test` for Agent B.
     * `npm run dev` and `npm run typecheck` for Agent C.
3. **Execution Readiness**:
   - Agents A, B, and C can execute concurrently without blocking or modifying each other's deliverables.
