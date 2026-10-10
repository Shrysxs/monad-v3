# SwarmTrace Cryptographic Protocol Specification

**Specification Version:** 1.0.0 (Phase 1 Architecture Freeze)  
**Status:** Frozen  

---

## 1. SHA-256 Digest Encoding

- **Standard:** FIPS PUB 180-4 Secure Hash Standard (SHA-256).
- **Execution Environment:** In the client/browser via the native `crypto.subtle.digest("SHA-256", buffer)` Web Crypto API. File contents remain strictly local and are never transmitted across the network.
- **Hex Representation:** Always lower-case, unpadded, 64-character hexadecimal strings (e.g. `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`).
- **On-chain EVM Representation:** 32-byte word (`bytes32`), converted by adding the standard `0x` hex prefix (`0x` + 64 hex characters).

---

## 2. RFC 8785 Canonical JSON Serialization (JCS)

To ensure digital signatures produce identical verification results across JavaScript, Go, Python, and Rust runtimes, all signed manifest payloads must follow RFC 8785:

1. **Object Key Sorting:** Keys are sorted lexicographically by UTF-16 code units.
2. **Whitespace:** Zero whitespace between keys, colons, commas, or array brackets.
3. **Number Serialization:** Numbers strictly follow ECMAScript 6 canonical number formatting; `NaN`, `Infinity`, and trailing zeroes after decimal points are prohibited.
4. **String Escaping:** Only quotation marks (`"`), reverse solidus (`\`), and control characters (U+0000 through U+001F) are escaped.
5. **Undefined Properties:** Any property with value `undefined` is omitted from serialization.

---

## 3. Signed Payload & Detached Signature Protocol

To prevent self-referential signature loops, the digital signature **must never sign itself**.

### Canonical Payload Structure
The signed message payload is defined by the `ReleaseManifestPayload` schema:
```json
{
  "fileName": "app-v1.0.0.tar.gz",
  "fileSize": 10485760,
  "productId": "swarmtrace-client",
  "publisherId": "org.swarmtrace.core",
  "publisherKeyId": "key-2026-v1",
  "releaseVersion": "1.0.0",
  "schemaVersion": "1.0.0",
  "sha256": "4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a"
}
```

### Signature Generation & Verification Workflow
1. Given a complete `SignedReleaseManifest`, extract the detached `signature` property.
2. Canonicalize the remaining payload using `canonicalizeRfc8785(payload)`.
3. Encode the canonical JSON string to raw UTF-8 bytes using `TextEncoder`.
4. Calculate the canonical manifest digest: `manifestDigest = sha256(canonicalPayloadBytes)`.
5. Verify the 64-byte Ed25519 signature against the UTF-8 bytes using the authorized publisher public key.

---

## 4. Public Keys and Key Identifiers

- **Algorithm:** Ed25519 (Edwards-curve Digital Signature Algorithm over Curve25519) per RFC 8032.
- **Key Representation:** 32-byte raw public key encoded as a 64-character lowercase hexadecimal string (or prefixed with `0x` in Solidity contract calldata).
- **Key Identifier (`publisherKeyId`):** A human-readable identifier chosen by the publisher (e.g. `key-2026-v1`) to facilitate key rotation tracking.
- **On-chain Anchor:** The active Ed25519 public key hash or 32-byte key is stored in `ISwarmTraceRegistry` on Monad Testnet for the corresponding publisher account.

---

## 5. Lifecycle Transitions & Verification Verdicts

1. **Active Release:** Manifest signature valid + whole-file hash matches manifest + on-chain status is `Active` $\rightarrow$ `MATCHING_AUTHENTICATED_RELEASE`.
2. **Hash Mismatch:** Manifest signature valid, but file bytes differ from manifest $\rightarrow$ `HASH_MISMATCH`. (Proves file bytes differ from the reference; does not prove malicious intent).
3. **Invalid Signature:** Signature fails cryptographic verification $\rightarrow$ `INVALID_MANIFEST_SIGNATURE`. (Manifest was tampered with, corrupted, or signed by an unauthorized key).
4. **Superseded Release:** File matches, but on-chain status is `Superseded` $\rightarrow$ `SUPERSEDED_RELEASE`. (Legitimate older release superseded by a newer version).
5. **Revoked Release:** File matches, but on-chain status is `Revoked` $\rightarrow$ `REVOKED_RELEASE`. (Publisher or security governance explicitly revoked the release).
6. **Unknown Release:** No registered manifest or on-chain commitment exists $\rightarrow$ `UNKNOWN_RELEASE`. (Unregistered file; unknown is never equated with malicious).

---

## 6. Security Invariants & Limitations

- **Integrity $\neq$ Benign:** A cryptographic match proves byte-level equivalence to the publisher's artifact. It does **not** prove the software is free from malware or vulnerabilities.
- **Mismatch $\neq$ Malware:** A mismatched hash indicates the downloaded bytes differ from the publisher reference (e.g., modified configuration, repacked installer, or network corruption).
- **Filename $\neq$ Identity:** Filenames are purely informational hints and are never trusted as identity proof.
