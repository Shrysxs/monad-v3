# SwarmTrace On-Chain vs. Off-Chain Verification Boundaries

**Document Status:** Complete & Frozen  
**Target Chain:** Monad Testnet (Chain ID 10143)  

---

## 1. Executive Summary

A core architectural pillar of SwarmTrace is maintaining a clear, honest boundary between what is verified and recorded on-chain versus what is computed and validated off-chain.

Storing an Ed25519 public key on-chain records the authorized key identifier; it **does not** automatically execute Ed25519 curve point arithmetic on-chain (which is computationally prohibitive on standard EVM without dedicated precompiles). The table below specifies the exact boundary.

---

## 2. Verification Responsibility Matrix

| Verification Aspect | Location | Implementation & Mechanism | Rationale |
|---|---|---|---|
| **Publisher Address Authorization** | **On-Chain** | `ISwarmTraceRegistry.authorizePublisher` / `onlyAuthorizedPublisher` modifier | Establishes the authoritative root of trust for authorized publishing addresses on Monad. |
| **Publisher ID Uniqueness** | **On-Chain** | `_publisherIdToAddress[publisherId]` mapping check | Prevents publisher impersonation and identity collision. |
| **Release Commitment Registration** | **On-Chain** | `ISwarmTraceRegistry.registerRelease` storing `releaseDigest` tuple | Creates an immutable, public, auditable timestamp and commitment on Monad Testnet. |
| **Release Status & Revocation** | **On-Chain** | `ISwarmTraceRegistry.revokeRelease` / `supersedeRelease` | Ensures monotonic, tamper-evident status changes that any client can independently audit. |
| **Revocation Authority Check** | **On-Chain** | `msg.sender == release.publisherAddress \|\| msg.sender == owner()` | Prohibits unauthorized or competing accounts from revoking another publisher's release. |
| **Raw File Byte Hashing** | **Off-Chain** | Client-side Web Crypto API `crypto.subtle.digest("SHA-256", bytes)` | File bytes never leave the user's machine; zero network bandwidth or privacy leakage. |
| **Chunk / Piece Verification** | **Off-Chain** | Client-side incremental hashing comparing against `chunkHashes[i]` | Enables 60fps UI feedback for large multi-gigabyte torrent distributions. |
| **Canonical JSON Serialization** | **Off-Chain** | RFC 8785 (JCS) deterministic property ordering and whitespace elimination | Guarantees identical byte encoding across runtimes before signature verification. |
| **Ed25519 Signature Verification** | **Off-Chain** | `@noble/curves/ed25519.verify(sig, canonicalBytes, pubKey)` | Verifies authorship cryptographically using the authorized public key retrieved from Monad. |
| **Security Scanning & Sandbox Analysis** | **Off-Chain** | External scanner adapter or verifier attestations | Bulky scan logs, heuristics, and engine verdicts are kept off-chain; only hashes/digests can be anchored. |

---

## 3. Threat Model & Verification Flow

```text
 1. User selects local file -> Browser computes SHA-256 (Local)
 2. User loads signed manifest -> Client canonicalizes via RFC 8785 JCS (Local)
 3. Client queries Monad Testnet for publisherId & ed25519PubKey (On-Chain Read)
 4. Client verifies Ed25519 signature over canonical manifest (Local Cryptography)
 5. Client queries Monad Testnet for release status: Active, Superseded, or Revoked (On-Chain Read)
 6. Client compares computed file SHA-256 with expected manifest SHA-256 (Local Comparison)
 7. Engine synthesizes findings and renders explainable verdict:
    - MATCHING_AUTHENTICATED_RELEASE
    - HASH_MISMATCH
    - INVALID_MANIFEST_SIGNATURE
    - REVOKED_RELEASE
    - UNKNOWN_RELEASE
```
