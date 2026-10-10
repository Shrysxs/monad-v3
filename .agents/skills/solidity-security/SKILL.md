---
name: solidity-security
description: Engineering guidelines and security standards for SwarmTrace Solidity contracts on Monad, covering publisher authorization, access control, replay prevention, reentrancy defense, status state-machine transitions, and testnet deployment safety.
---

# SwarmTrace Solidity Security Standards

This skill provides engineering instructions and security standards for authoring, testing, and reviewing Solidity smart contracts for the SwarmTrace platform on Monad.

SwarmTrace is a torrent and software provenance registry. Smart contracts act as the auditable registry and authorization anchor for publishers, releases, and status changes. Smart contracts must **never** store raw file bytes, full manifests, private keys, personally identifiable information, or bulky malware scan reports on-chain.

## Monad Guidance Source

For all Monad-specific behavior, gas models, and environment parameters, consult the installed **MONSKILLS**:
- Architecture & Execution: `.agents/skills/concepts/SKILL.md` (asynchronous execution, parallel execution, block states).
- Gas Pricing: `.agents/skills/gas/SKILL.md` (Monad charges on `gas_limit`, not gas used; always set tight gas limits).
- Network Addresses & Explorers: `.agents/skills/addresses/SKILL.md` (Monad Testnet chainId `10143`, RPC `https://testnet-rpc.monad.xyz`, Explorer `testnet.monadscan.com`).
- Scaffold & Verification: `.agents/skills/scaffold/SKILL.md` (multi-explorer verification API and CreateX deployment).

Do not invent or contradict Monad network parameters defined in MONSKILLS.

---

## 1. Architecture & Security Axioms

1. **Strict Access Control**: Only an authorized publisher address may register or revoke releases associated with its identity (`publisherId`). Admin or registry deployer accounts must not register releases impersonating a publisher or revoke releases on a publisher's behalf without explicit emergency multi-sig authority.
2. **Deterministic Commitments**: Release digests must be computed deterministically via `keccak256(abi.encode(publisherId, productId, releaseVersion, fileHash, manifestDigest))`.
3. **No Unbounded Storage**: Only fixed-size hashes (`bytes32 fileHash`, `bytes32 manifestDigest`, `bytes32 releaseDigest`) and compact metadata (timestamps, string identifiers) are written to contract storage.
4. **State Machine Invariants**: A release progresses monotonically through states:
   - `Unknown (0)` -> Does not exist.
   - `Active (1)` -> Registered and valid.
   - `Superseded (2)` -> Valid historical release superseded by a newer version.
   - `Revoked (3)` -> Explicitly revoked due to vulnerability, compromise, or error (Terminal state).
   A `Revoked` release can never transition back to `Active` or `Superseded`.
5. **No Token or Financial Risk**: SwarmTrace is a provenance registry. Do not introduce ERC-20 tokens, staking, or crowdsourced financial staking models.

---

## 2. Core Implementation Requirements

### Access Control & Publisher Authorization
- Maintain a mapping of authorized publisher addresses: `mapping(address => PublisherInfo) public publishers`.
- Track publisher identity mapping: `mapping(string => address) public publisherIdToAddress`.
- Enforce that a publisher ID cannot be claimed by a different address once registered.
- Provide a modifier `onlyAuthorizedPublisher()` that verifies `publishers[msg.sender].isAuthorized == true`.
- Support publisher signing key rotation:
  ```solidity
  function rotateSigningKey(bytes32 newEd25519PubKey) external onlyAuthorizedPublisher;
  ```
  The publisher can rotate its associated Ed25519 public key identifier on-chain, emitting `PublisherKeyRotated`.

### Release Registration & Supersession
- Releases are indexed by `bytes32 releaseDigest` and also lookup-able by `bytes32 fileHash`.
- When registering a release:
  ```solidity
  function registerRelease(
      string calldata productId,
      string calldata releaseVersion,
      bytes32 fileHash,
      bytes32 manifestDigest,
      bytes32 previousReleaseDigest
  ) external onlyAuthorizedPublisher returns (bytes32 releaseDigest);
  ```
- Validate that `fileHash != bytes32(0)` and `manifestDigest != bytes32(0)`.
- If `previousReleaseDigest != bytes32(0)`:
  - Verify that the previous release belongs to the same `publisherId` and `productId`.
  - If the previous release status is `Active`, transition it to `Superseded` and emit `ReleaseSuperseded`.

### Release Revocation
- Releases can be revoked by the registering publisher:
  ```solidity
  function revokeRelease(bytes32 releaseDigest, string calldata reason) external;
  ```
- Revert if the release is not found (`Unknown`) or is already `Revoked`.
- Record `revokedAt = block.timestamp` and `revokeReason = reason`.
- Emit `ReleaseRevoked` and `ReleaseStatusChanged`.

---

## 3. Security Checklist

Before approving any contract implementation or migration, verify:

- [ ] **Access Control**: Does every state-mutating function restrict callers using explicit modifiers?
- [ ] **Caller Authentication**: Does `registerRelease` strictly use `publishers[msg.sender]` rather than an arbitrary `publisherAddress` parameter passed in calldata?
- [ ] **Revocation Authority**: Can an unauthenticated caller or competing publisher revoke a release? (Must revert).
- [ ] **Reentrancy**: Are there external calls to untrusted addresses? (SwarmTrace registry has no external calls or ether transfers; CEI pattern followed).
- [ ] **Zero-Value Validation**: Are `fileHash`, `manifestDigest`, and `ed25519PubKey` validated against `bytes32(0)`?
- [ ] **Data Boundary**: Does any contract function accept or store raw file contents or full manifest JSONs? (Must be strictly prohibited).
- [ ] **Event Logging**: Are all status mutations accompanied by indexed events containing timestamps and actor addresses?
- [ ] **Monad Gas Rules**: Are loops unbounded? (No unbounded loops; constant-time mappings only).

---

## 4. Failure Cases & Mitigations

| Failure Mode | Threat / Root Cause | Mitigation |
|---|---|---|
| **Publisher Impersonation** | Attacker registers a release claiming to be a known vendor. | Contracts authenticate `msg.sender` against `publisherIdToAddress`. Calldata publisher ID cannot override authenticated address. |
| **Unauthorized Revocation** | Competitor revokes a legitimate release to cause denial of service. | `revokeRelease` requires `msg.sender == release.publisherAddress` (or multisig contract owner). |
| **State Tampering** | Revoked release re-registered or moved to active. | Check `releases[digest].status == ReleaseStatus.Unknown` on registration; disallow transition out of `Revoked`. |
| **Digest Collision / Overwrite** | Replay of existing release arguments. | Revert with `ReleaseAlreadyExists()` if `releases[releaseDigest].status != ReleaseStatus.Unknown`. |
| **Unbounded Gas Consumption** | Dynamic arrays iterated on-chain. | All lookups use mappings (`releaseDigest -> ReleaseRecord`, `fileHash -> bytes32 releaseDigest`). No dynamic iteration over all releases. |

---

## 5. Acceptance Criteria

1. **Foundry Test Suite**:
   - `test_RegisterRelease_Success`: Authorized publisher successfully registers release; state is `Active`.
   - `test_RegisterRelease_Unauthorized_Reverts`: Non-publisher caller reverts with `NotAuthorizedPublisher`.
   - `test_RegisterRelease_Duplicate_Reverts`: Re-registering existing release reverts with `ReleaseAlreadyExists`.
   - `test_RevokeRelease_Success`: Publisher revokes active release; state becomes `Revoked`.
   - `test_RevokeRelease_Unauthorized_Reverts`: Attacker attempting to revoke reverts with `UnauthorizedRevocation`.
   - `test_RevokeRelease_AlreadyRevoked_Reverts`: Revoking an already revoked release reverts with `InvalidStatusTransition`.
   - `test_SupersedeRelease_Success`: Registering version 2 with `previousReleaseDigest` transitions version 1 to `Superseded`.
   - `test_RotateSigningKey_Success`: Publisher rotates Ed25519 public key and emits event.
2. **Gas Efficiency**: Compilation under Foundry with `cancun` EVM and 200 optimizer runs passes with 0 warnings.
3. **Audit Readiness**: NatSpec documentation on all public and external methods.
