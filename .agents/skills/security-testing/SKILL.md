---
name: security-testing
description: Comprehensive quality assurance and security testing framework for SwarmTrace, defining test methodologies for Foundry contract tests, Vitest cryptographic tests, and adversarial threat vectors.
---

# SwarmTrace Security & Verification Testing Standards

This skill defines the testing protocols, adversarial test vectors, and automated validation requirements for SwarmTrace across smart contracts, cryptographic verification, and frontend risk presentation.

## Core Security Rules for Testers

Every automated test and verification check must enforce:

1. **Automated Evidence Requirement**: No feature may be marked complete without executable automated tests that run and pass in the repository.
2. **Adversarial Negative Testing**: Testing must actively verify failure and revert conditions (tampered bytes, altered signatures, unauthorized callers, expired keys).
3. **Honesty Verification**:
   - Assert that a modified byte produces `HASH_MISMATCH`, never a malware verdict.
   - Assert that an authentic file does not claim to be malware-free unless an actual scanner attestation is provided.
   - Assert that an unconfigured scanner reports `SCANNER_UNAVAILABLE` or `NOT_SCANNED`, never "clean".
   - Assert that an unauthenticated publisher cannot register or revoke releases on-chain.
   - Assert that mock demo records are explicitly flagged with `demoOnly: true`.

---

## 1. Smart Contract Testing (Foundry)

Contract tests reside under `contracts/test/` and run via `forge test -vvv`.

### Required Foundry Test Matrix
1. **Publisher Access Control**:
   - `test_AdminCanAuthorizePublisher`: Admin authorizes address with `publisherId` and Ed25519 key.
   - `test_NonAdminCannotAuthorizePublisher`: Unauthorized address attempting authorization reverts.
   - `test_DeauthorizedPublisherCannotRegister`: Revoked publisher cannot register new releases.
2. **Release Registration Integrity**:
   - `test_RegisterRelease_Authorized`: Authorized publisher registers release with valid digests.
   - `test_RegisterRelease_CallerMismatch`: Address A attempting to register for Address B's `publisherId` reverts.
   - `test_RegisterRelease_DuplicateDigest`: Submitting identical release twice reverts.
   - `test_RegisterRelease_ZeroHashes`: Submitting `bytes32(0)` for fileHash or manifestDigest reverts.
3. **Revocation & State Transitions**:
   - `test_RevokeRelease_ByPublisher`: Registering publisher can revoke active release.
   - `test_RevokeRelease_ByNonPublisher`: Attacker attempting to revoke legitimate release reverts.
   - `test_RevokeRelease_AlreadyRevoked`: Calling revoke on an already revoked release reverts.
   - `test_RevokeRelease_UnknownRelease`: Calling revoke on non-existent digest reverts.
4. **Supersession & Versioning**:
   - `test_Supersede_OnNewRelease`: Version 2 specifying Version 1 digest as previous transitions Version 1 from `Active` to `Superseded`.
   - `test_Supersede_DifferentPublisher`: Attempting to supersede another publisher's release reverts.

---

## 2. Cryptographic & Verification Testing (Vitest)

TypeScript cryptographic and verification logic resides under `lib/` and is tested via `npm run test` (`vitest run`).

### Required Vitest Test Matrix
1. **RFC 8785 JSON Canonicalization Scheme (JCS)**:
   - Lexicographical property ordering test (e.g. `{ z: 1, a: 2, m: 3 }` -> `{"a":2,"m":3,"z":1}`).
   - Whitespace stripping test (nested objects and arrays formatted without spaces).
   - Number format test (canonical IEEE 754 representations, no trailing zeroes).
   - Detached signature test (confirming `signature` property is stripped prior to canonicalization).
2. **Ed25519 Signature Verification**:
   - Standard RFC 8032 test vectors pass.
   - Corrupted signature bytes fail verification.
   - Valid signature with altered manifest payload fails verification (`INVALID_MANIFEST_SIGNATURE`).
   - Wrong publisher public key fails verification.
3. **File Hash & Piece Verification**:
   - Exact file hash match produces `MATCHING_AUTHENTICATED_RELEASE`.
   - Single-bit flip in file content produces `HASH_MISMATCH` with exact digest mismatch recorded.
   - Chunk verification accurately flags altered piece indices while passing unaltered pieces.
4. **Evidence & Risk Engine Verdicts**:
   - Unregistered file returns `UNKNOWN_RELEASE` (not malware).
   - Valid file with revoked on-chain status returns `REVOKED_RELEASE`.
   - Missing scanner API returns `SCANNER_UNAVAILABLE` (never fabricated clean).
   - Conflicting attestations return `CONFLICTING_EVIDENCE`.

---

## 3. Security Testing Checklist

Before declaring any milestone or phase complete:

- [ ] **Foundry Suite Passes**: Does `forge test` pass all unit and invariant tests with 0 failures?
- [ ] **Vitest Suite Passes**: Does `npm run test` run all test suites and pass with 0 errors?
- [ ] **Adversarial Negative Tests Included**: Are there explicit tests for unauthorized registration, forged signatures, and tampered files?
- [ ] **Strict Revert Checks**: Do Foundry tests check specific custom error selectors (e.g. `vm.expectRevert(abi.encodeWithSelector(...))`) rather than generic reverts?
- [ ] **Zero Mocking of Real Chains in Final Tests**: Are on-chain tests executed against Foundry local EVM and verified against Monad Testnet RPC parameters?
- [ ] **Honest Evidence Invariants Verified**: Does the test suite assert that `NOT_SCANNED` never equals clean?
- [ ] **Deterministic Results**: Are tests free of race conditions, timer flakiness, or unhandled asynchronous promises?

---

## 4. Failure Modes & Mitigations

| Failure Mode | Threat / Root Cause | Mitigation |
|---|---|---|
| **Trivial Passing Tests** | Tests assert `true == true` or mock away the core verification logic. | Require full end-to-end payload generation, canonicalization, and real signature verification in test vectors. |
| **False Sense of Safety** | Tests assume hash match equals clean file. | Write tests verifying that authentic files can still be flagged with security findings or revoked status. |
| **Silent Revert Masking** | Contract calls fail silently in JavaScript catch blocks. | Ensure verification clients surface explicit error types and test error propagation. |
| **Flaky Web Worker Tests** | Browser-specific Web Crypto API unavailable in Node test environment. | Use polyfills or standard Node.js `crypto.webcrypto` to ensure deterministic execution in Vitest. |

---

## 5. Acceptance Criteria

1. **Commands**:
   - `forge test --root contracts -vvv` exits with code 0.
   - `npm run test` (`vitest run`) exits with code 0.
2. **Coverage**:
   - 100% of custom error branches in `SwarmTraceRegistry.sol` covered by negative test cases.
   - Complete test suite for `canonicalizeRfc8785`, `verifyManifestSignature`, and `evaluateReleaseRisk`.
3. **Reproducibility**:
   - A fresh clone running `npm install && npm test && forge test` runs all tests without manual setup.
