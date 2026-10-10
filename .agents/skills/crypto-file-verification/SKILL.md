---
name: crypto-file-verification
description: Cryptographic verification standards for SwarmTrace, covering Web Crypto SHA-256 file hashing, RFC 8785 JSON Canonicalization Scheme (JCS), Ed25519 publisher signature verification with @noble/curves, and honest verification verdicts.
---

# SwarmTrace Cryptographic File Verification Standards

This skill defines the cryptographic and verification engineering rules for SwarmTrace. It establishes standards for client-side hashing, canonical JSON serialization, digital signature verification, and honest evidence classification.

## Core Security Axioms

Every verifier, UI component, and test in SwarmTrace must adhere to these non-negotiable principles:

1. **A filename is never proof of identity.** Anyone can rename any file to match a legitimate release name.
2. **A hash mismatch is not proof of malware.** A byte-level mismatch proves only that the file differs from the reference artifact (e.g. repacked archive, different build flags, localized version, corrupted download, or unauthorized modification).
3. **A matching hash does not prove a file is malware-free.** A cryptographic hash confirms byte-level equivalence to the reference manifest. If the publisher's build pipeline was compromised or an authenticated release contained a vulnerability, the file still matches the authentic release.
4. **A valid signature verifies authorship, not safety.** A valid Ed25519 publisher signature proves that the manifest payload was signed with the publisher's private key; it does not scan the file for malicious behavior.
5. **An unknown release is not a malicious release.** Files without a registered manifest or on-chain record must be explicitly classified as `UNKNOWN_RELEASE`, never as malware or malicious.

---

## 1. Hashing Architecture

### Whole-File SHA-256 Hashing
- Use the standard **Web Crypto API** (`crypto.subtle.digest("SHA-256", data)`).
- Verification runs **locally in the browser or worker**; file bytes must **never** be uploaded to any server or third party.
- For files larger than 10 MB, process chunks iteratively using `ReadableStream` or `File.slice()` with an incremental SHA-256 digest engine (e.g. `@noble/hashes/sha256`) to maintain 60fps UI responsiveness without thread freezing.

### Chunk / Piece Verification (Torrent Compatibility)
- If the release manifest includes `chunkSize` and `chunkHashes: string[]`:
  1. Slice the input file into pieces of `chunkSize` bytes.
  2. Compute SHA-256 for each piece.
  3. Compare computed chunk digests against `chunkHashes[i]`.
  4. Record mismatch indices to display exact corrupted/tampered pieces in the Live Swarm Integrity view.

---

## 2. Canonical Manifest Serialization (RFC 8785 JCS)

Manifests are serialized to JSON. However, standard `JSON.stringify` does not guarantee deterministic serialization across runtimes. Manifest signing and verification **must strictly adhere to RFC 8785 JSON Canonicalization Scheme (JCS)**.

### Canonicalization Rules:
1. **Property Ordering**: Object keys must be sorted lexicographically by their UTF-16 code units.
2. **Whitespace**: No whitespace between keys, colons, commas, or brackets.
3. **Number Representation**: Numbers must follow ECMAScript canonical number serialization (no trailing zeroes, exponential notation only when required by spec).
4. **String Escaping**: Only required control characters (`\"`, `\\`, and ASCII 0x00–0x1F) are escaped.
5. **No Undefined Values**: Properties with `undefined` values must be omitted.

### Detached / Non-Recursive Signature Protocol:
A signature **must never recursively sign itself**.
When signing or verifying a manifest:
1. Extract `signature` from the manifest object.
2. Form the canonical payload using the remaining fields:
   ```ts
   const { signature, ...payloadToVerify } = manifest;
   const canonicalJsonString = canonicalizeRfc8785(payloadToVerify);
   const messageBytes = new TextEncoder().encode(canonicalJsonString);
   ```
3. Compute `manifestDigest = sha256(canonicalJsonString)`.
4. Verify `signature` against `messageBytes` using the publisher's Ed25519 public key.

---

## 3. Ed25519 Signature Verification

- Use the maintained and audited `@noble/curves/ed25519` library (or native Node.js crypto in server/test environments).
- Signatures and public keys are hex-encoded (or standard Base64).
- Verify:
  ```ts
  import { ed25519 } from "@noble/curves/ed25519";
  
  const isValid = ed25519.verify(signatureBytes, messageBytes, publicKeyBytes);
  ```
- Reject non-canonical point encodings and malleated signatures per ZIP 215 / RFC 8032.

---

## 4. Verification Verdict State Machine

The verification engine must produce an explicit, typed `VerificationStatus`:

| Status | Exact Condition | UX Meaning |
|---|---|---|
| `MATCHING_AUTHENTICATED_RELEASE` | Manifest signature is valid AND file SHA-256 matches manifest AND on-chain release status is `Active` | File matches authorized release. |
| `HASH_MISMATCH` | Manifest signature is valid, but file SHA-256 != manifest SHA-256 | File bytes differ from publisher release. |
| `INVALID_MANIFEST_SIGNATURE` | Manifest signature failed Ed25519 verification against publisher key | Manifest has been forged, corrupted, or altered. |
| `UNKNOWN_RELEASE` | No authorized manifest or on-chain record matches the file or release ID | No publisher reference available to verify against. |
| `REVOKED_RELEASE` | Manifest matches file, but on-chain release status is `Revoked` | Publisher has revoked this release (security warning). |
| `VERIFICATION_ERROR` | Malformed file, invalid JSON, or execution error | Verification could not complete due to runtime error. |

Never collapse these states into a simplistic boolean `isSafe: boolean`.

---

## 5. Verification Checklist

Before certifying any verification pipeline code:

- [ ] **Client-Side Exclusivity**: Are file bytes hashed strictly locally in the browser/worker?
- [ ] **RFC 8785 Compliance**: Is the JSON serialized using compliant RFC 8785 canonicalization before hashing and signature verification?
- [ ] **Non-Recursive Signature**: Is the `signature` field removed from the payload before signature verification?
- [ ] **Public Key Alignment**: Is the signing key validated against the publisher's authorized key recorded on Monad Testnet?
- [ ] **Chunk Boundary Check**: Are chunk sizes and array lengths validated against the reported `fileSize`?
- [ ] **Honest Verdicts**: Does the verdict explicitly distinguish between hash mismatch, unknown release, and revoked release?
- [ ] **No "Safe" Claims**: Does the UI or engine avoid claiming "file is safe" solely on a valid signature or matching hash?

---

## 6. Failure Modes & Mitigations

| Failure Mode | Root Cause | Mitigation |
|---|---|---|
| **Malleable JSON Serialization** | Keys ordered differently on different platforms. | Use strict RFC 8785 JCS canonicalization algorithm; verified with standard test vectors. |
| **Self-Referential Signature Loop** | Manifest includes `signature` inside the signed body. | Strictly separate the detached signature field during serialization. |
| **Main Thread Lockup** | Hashing 500MB+ file synchronously in UI thread. | Process files in chunks via `ReadableStream` or Web Workers with progress callbacks. |
| **Silent Unknown Suppression** | Missing reference treated as negative malware verdict. | Enforce discriminated union returning `UNKNOWN_RELEASE` with clear informational badges. |
| **Ignoring Monad Revocation** | Valid local signature accepted even though registry marked release revoked. | Integrate on-chain registry status check (`ISwarmTraceRegistry.getReleaseStatus`) into final verdict. |

---

## 7. Acceptance Criteria

1. **Unit Test Vectors**:
   - RFC 8785 test suite passes for nested objects, unicode characters, numbers, and arrays.
   - Ed25519 RFC 8032 test vectors pass.
2. **Adversarial Test Vectors**:
   - Modifying a single bit in a 1 MB file produces `HASH_MISMATCH`.
   - Modifying a single character in a manifest JSON produces `INVALID_MANIFEST_SIGNATURE`.
   - Querying a revoked release returns `REVOKED_RELEASE` regardless of hash match.
   - An unregistered file returns `UNKNOWN_RELEASE`.
3. **Zero Network File Leakage**: Network monitor confirms zero byte uploads during file verification.
