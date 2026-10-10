---
name: nextjs-web3-engineering
description: Frontend engineering standards for SwarmTrace Next.js App Router, Tailwind CSS, shadcn/ui, viem/wagmi on Monad Testnet, ensuring local file processing, zero secret leakage, and honest security UI.
---

# SwarmTrace Next.js & Web3 Engineering Standards

This skill establishes the frontend architecture, UI/UX conventions, and Web3 integration standards for the SwarmTrace application.

## Monad Guidance Source

Always consult **MONSKILLS** for authoritative Monad-specific details:
- **BigInt Gotcha**: `.agents/skills/scaffold/SKILL.md` — `tsconfig.json` MUST target `ES2020` or higher to support BigInt literals (`0n`, `1n`) required by `viem` and `wagmi`.
- **Gas Pricing**: `.agents/skills/gas/SKILL.md` — Monad charges on `gas_limit`, not gas used; UI must not inflate gas limit estimates arbitrarily.
- **Fast Transactions**: `.agents/skills/scaffold/SKILL.md` — Monad supports `eth_sendRawTransactionSync` via `useSendTransactionSync` for sub-second receipts.
- **Network Parameters**: `.agents/skills/addresses/SKILL.md` — Monad Testnet Chain ID `10143`, RPC `https://testnet-rpc.monad.xyz`, Explorer `https://testnet.monadscan.com`.
- **Wallet Connection**: `.agents/skills/wallet-integration/SKILL.md` — Para embedded MPC wallet plus external wallet connect (MetaMask, Coinbase, etc.).

---

## 1. Frontend Architecture & Boundaries

### App Router Organization
```text
app/
  layout.tsx          # Root layout, theme provider, Wagmi & QueryClient providers
  page.tsx            # Landing & navigation overview
  verify/             # Feature 1: Live Swarm Integrity (file drag & drop, chunk progress)
  dna/                # Feature 2: Release DNA (variant comparison, lineage graph)
  risk/               # Feature 3: Swarm Risk Intelligence (evidence panel, scanner status)
components/
  ui/                 # shadcn/ui primitives (button, badge, card, dialog, progress)
  navigation/         # Global header, nav tabs, network badge
  verification/       # File dropzone, hash display, chunk matrix
  release-dna/        # Variant comparator, lineage timeline
  risk/               # Security evidence list, scanner adapters
  wallet/             # Account display, connect button, Monad network switcher
```

### Strict Server vs. Client Boundary
- **Client Components (`"use client"`)**: File reading, Web Crypto API hashing, Drag & Drop events, Wagmi hooks, interactive charts/timelines.
- **Server Components / Routes**: Metadata generation, cached static fixtures, public RPC read proxies if required.
- **Security Rule**: Never import server secrets or private keys into client components. Any environment variable accessible to the browser **must** begin with `NEXT_PUBLIC_` and contain **only** non-sensitive values (such as contract address and public RPC URL).

---

## 2. UX & Honesty Principles

1. **No Generic "SAFE" Badges**:
   - Never display a green "SAFE" or "CLEAN" badge based only on a hash match or publisher signature.
   - Use accurate, descriptive badges:
     * `MATCHES AUTHENTICATED RELEASE` (Cyan/Emerald)
     * `INTEGRITY MISMATCH` (Amber/Rose)
     * `REVOKED RELEASE` (Red)
     * `UNKNOWN RELEASE` (Neutral Gray)
     * `SCANNER UNAVAILABLE` (Subtle Slate)
2. **Explicit Scanner States**:
   - If no external malware scanner API is configured, display `SCANNER_UNAVAILABLE` or `NOT_SCANNED`.
   - **Never** report a scan as clean or 0/70 detections when no actual scanner ran.
3. **Seeded Demo Data Labeling**:
   - All pre-seeded demonstration records, comparative variants, or sample files must carry a visible `DEMO DATA` badge.
   - Users and judges must be able to distinguish between live Monad Testnet transactions and seeded mock data instantly.
4. **No Torrent Protocol Fabrication**:
   - SwarmTrace MVP verifies local downloaded files and chunk manifests.
   - Do **not** create fake animated "P2P peer connection" or mock torrent swarm network simulations unless a genuine BitTorrent client integration is actively running.

---

## 3. Web3 & Monad Integration Standards

### Viem & Wagmi Configuration
- Define Monad Testnet chain definition:
  ```ts
  import { defineChain } from "viem";

  export const monadTestnet = defineChain({
    id: 10143,
    name: "Monad Testnet",
    nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
    rpcUrls: {
      default: { http: ["https://testnet-rpc.monad.xyz"] },
    },
    blockExplorers: {
      default: { name: "MonadScan", url: "https://testnet.monadscan.com" },
    },
    testnet: true,
  });
  ```
- Always generate transaction links pointing to `https://testnet.monadscan.com/tx/${txHash}`.
- Contract addresses should be configured via `NEXT_PUBLIC_SWARMTRACE_REGISTRY_ADDRESS` with a validated fallback to the deployed address.

---

## 4. Frontend Engineering Checklist

Before committing any UI or Web3 component:

- [ ] **Target ES2020**: Is `tsconfig.json` configured with `"target": "ES2020"` to support BigInt literals?
- [ ] **No Secret Exposure**: Are private keys, deployer seeds, or admin credentials completely absent from frontend code and `.env.local`?
- [ ] **Local File Processing**: Does file hashing run entirely in-browser without sending file contents over HTTP?
- [ ] **Honest Badging**: Are labels free of misleading "SAFE" terminology?
- [ ] **Unconfigured Scanner Handling**: Does the Risk Intelligence view show `SCANNER_UNAVAILABLE` when no scanner is configured?
- [ ] **Demo Data Badges**: Are all mock variants and demo releases visibly labeled as `DEMO DATA`?
- [ ] **Explorer Links**: Do all on-chain transactions and contract references link out to `testnet.monadscan.com`?
- [ ] **Responsive & Accessible**: Do dropzones and buttons support keyboard navigation and screen readers?

---

## 5. Failure Modes & Mitigations

| Failure Mode | Threat / Root Cause | Mitigation |
|---|---|---|
| **BigInt Build Failure** | `TS2737: BigInt literals not available`. | Ensure `compilerOptions.target = "ES2020"` in `tsconfig.json`. |
| **Accidental File Upload** | File input triggers multipart form submit. | Use `event.preventDefault()`, read via `FileReader` / `File.stream()`, and store only resulting SHA-256 in state. |
| **Deceptive Scanner Verdict** | Defaulting scanner state to "Clean" when API key is missing. | Enforce `SCANNER_UNAVAILABLE` default state with clear explanation tooltip. |
| **Leaked Private Key** | Deployer private key prefixed with `NEXT_PUBLIC_`. | Never prefix signing keys with `NEXT_PUBLIC_`; validate env variables at build time. |
| **Broken RPC Fallback** | Testnet RPC throttling freezes UI. | Implement graceful error banners and retry mechanisms with status feedback. |

---

## 6. Acceptance Criteria

1. **Navigation**: Accessible, polished navigation shell with active routes for:
   - `/verify` (Live Swarm Integrity)
   - `/dna` (Release DNA)
   - `/risk` (Swarm Risk Intelligence)
2. **Local Verification Flow**:
   - Drag-and-drop file loads and hashes locally within 500ms for test files.
   - Hash mismatches and signature failures render explicit, non-judgmental explanations.
3. **Wallet Connection**:
   - Connects to Monad Testnet (Chain ID 10143) and displays formatted account address.
4. **Strict TypeScript & Build**:
   - `npm run typecheck` (`tsc --noEmit`) passes with 0 errors.
   - `npm run lint` passes with 0 warnings.
