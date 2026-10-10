# SwarmTrace --- Product Requirements Document (PRD)

**Document status:** Draft v1.0 --- implementation baseline\
**Project:** SwarmTrace\
**Category:** Web3 / Cybersecurity / Peer-to-peer software distribution\
**Target chain:** Monad Testnet\
**Primary goal:** Build a torrent-oriented file provenance and security
verification platform with three connected features and meaningful
on-chain functionality.

------------------------------------------------------------------------

## 1. Executive Summary

SwarmTrace helps users assess whether a downloaded file matches an
authenticated publisher release, understand how it relates to other
versions or variants, and inspect available security evidence before
trusting it.

Peer-to-peer distribution is efficient, but a filename, torrent listing,
peer count, or matching torrent metadata does not establish that a file
came from the legitimate publisher. A cryptographic hash detects
byte-level differences only when compared with a trusted reference. A
matching hash does not prove a file is malware-free.

SwarmTrace combines: 1. **Live Swarm Integrity** --- hash and
manifest-based integrity verification, with chunk/piece-level progress
where the input format supports it. 2. **Release DNA** --- compare file
variants and trace release/version/revocation relationships. 3. **Swarm
Risk Intelligence** --- present an evidence-based assessment combining
provenance, integrity, revocation, and available scanner/attestation
findings.

Monad provides a public, auditable registry for authorized publisher
release commitments and release-status changes. File contents and bulky
scan reports remain off-chain.

### Product promise

**"Know whether a downloaded file matches a trusted release, what
evidence supports that conclusion, and what remains unknown."**

SwarmTrace must never claim that a file is "safe" solely because its
hash matches or its publisher signature verifies.

------------------------------------------------------------------------

## 2. Problem Statement

Users download software and files from torrents, mirrors, file-sharing
links, and other distribution channels. They may encounter: - Files with
legitimate-looking names but altered contents. - Repacked or
impersonated releases. - Outdated releases or releases that have been
revoked. - Incomplete or untrusted provenance information. - Malware
scan results that are missing, stale, contradictory, or difficult to
interpret.

Existing artifact signing and transparency systems already address
important parts of software provenance. SwarmTrace must not present
basic hashing, digital signatures, or transparency logging as
inventions. Its differentiation hypothesis is a torrent-oriented user
workflow that combines file/chunk integrity, cross-source variant
comparison, release lineage, and explainable security evidence.

## 3. Product Goals

### Primary goals

-   Let users compare a local file against a trusted,
    publisher-authorized release manifest.
-   Make integrity verification understandable and evidence-based.
-   Show whether a file matches a known release, differs from a known
    release, is associated with a revoked release, or has unknown
    provenance.
-   Maintain release authorization and status on Monad Testnet.
-   Provide a credible three-feature demonstration within the hackathon
    window.
-   Make the repository reproducible from README instructions.

### Secondary goals

-   Support signed manifests and publisher key rotation/revocation.
-   Support a piece/chunk manifest and progress reporting.
-   Aggregate signed findings from independent verifiers/scanners.
-   Create a foundation for future integration with actual BitTorrent
    clients and protocols.

### Non-goals for the hackathon MVP

-   Building a complete BitTorrent client or implementing peer
    discovery, tracker communication, or the torrent wire protocol.
-   Guaranteeing that any file is malware-free.
-   Putting files, full manifests, private information, or large scan
    reports on-chain.
-   Building a universal publisher identity authority.
-   Implementing a production-grade dispute system or crowdsourced
    reputation economy.
-   Reimplementing Sigstore, Cosign, Fulcio, or Rekor.
-   Requiring a paid API or a single external security service for the
    main demo.
-   Deploying to Monad Mainnet before the testnet implementation is
    reliable and security-reviewed.

------------------------------------------------------------------------

## 4. Target Users and Use Cases

### Primary users

1.  **Software downloaders:** want to know whether a downloaded
    installer or archive matches a trusted release.
2.  **Open-source maintainers:** want to publish an authenticated
    release manifest and make release status discoverable.
3.  **Torrent and mirror operators:** want to compare distributed copies
    against the publisher-approved release.
4.  **Security researchers and verifiers:** want to publish
    attributable, auditable observations about specific file hashes.

### Core user stories

-   As a downloader, I can select a local file and verify it against an
    authenticated release record.
-   As a downloader, I can see exactly why a file is marked matching,
    mismatched, revoked, or unknown.
-   As a maintainer, I can register a release commitment on Monad using
    an authorized publisher account.
-   As a user, I can compare two files that share a filename and see
    whether their hashes and release lineage agree.
-   As a user, I can inspect security findings with source, timestamp,
    evidence type, and freshness.
-   As a judge, I can see a real Monad transaction and independently
    inspect the deployed contract.
-   As a developer, I can reproduce the project using the README without
    private instructions.

------------------------------------------------------------------------

## 5. Core Features and Requirements

## Feature 1 --- Live Swarm Integrity

### Purpose

Establish whether the bytes in a local file match a publisher-authorized
reference.

### Hackathon MVP

-   Accept a local file through a browser file picker or drag-and-drop.
-   Compute SHA-256 in the client or a trusted local verification
    module.
-   Load a signed release manifest with at least:
    -   product/release identifier
    -   version
    -   file name (informational only)
    -   file size
    -   whole-file SHA-256 digest
    -   publisher public-key identifier
    -   publisher signature over canonical manifest data
    -   optional chunk/piece hashes or Merkle root
    -   manifest schema version
-   Verify the manifest signature against a configured trusted publisher
    key.
-   Compare the local file's digest with the manifest digest.
-   If chunk hashes are supplied, compute and compare chunk digests and
    display progress and mismatch locations.
-   Show explicit states:
    -   `MATCHING_AUTHENTICATED_RELEASE`
    -   `HASH_MISMATCH`
    -   `INVALID_MANIFEST_SIGNATURE`
    -   `UNKNOWN_RELEASE`
    -   `REVOKED_RELEASE`
    -   `VERIFICATION_ERROR`
-   Show the reference source and the chain record used.
-   Explain that a hash mismatch proves difference from the reference,
    not malicious intent.
-   Explain that a successful integrity check does not establish
    malware-free status.

### Acceptance criteria

-   A known test file with a valid manifest produces a matching result.
-   Changing one byte produces a mismatch.
-   Altering the manifest without a valid signature fails verification.
-   An unknown file is labelled unknown, not malicious.
-   A revoked release cannot display as currently trusted.
-   UI never uses a blanket "safe" label based only on a hash match.
-   Verification does not upload file contents to a server by default.

### Later release

-   Integrate with a real BitTorrent client or supported client API to
    observe pieces during download.
-   Support BEP 52 Merkle piece-layer information and other torrent
    metadata formats where appropriate.
-   Validate manifests for large files efficiently with streaming/chunk
    processing.

**Scope honesty:** the hackathon MVP verifies a local downloaded file
and can show chunk-level verification when a compatible manifest exists.
It does not claim to implement live torrent wire-protocol monitoring
unless a real client integration is completed and tested.

## Feature 2 --- Release DNA

### Purpose

Help users distinguish files that have the same name but different
content and understand the relationship between release versions.

### Hackathon MVP

-   Display a release detail page showing publisher, product, version,
    whole-file digest, release status, registration transaction, and
    timestamps.
-   Compare two files/manifests side by side.
-   Identify:
    -   exact hash match
    -   same filename but different digest
    -   different versions with separately authenticated manifests
    -   revoked/superseded release
    -   unknown/unregistered variant
-   Represent release relationships as a simple graph or timeline.
-   Keep claims evidence-based: same filename is not proof of common
    origin; similar hashes are not necessarily proof of a legitimate
    relationship.
-   Use seeded, clearly labelled demo records in addition to the live
    record created during the demo.

### Acceptance criteria

-   Two files with identical names and different contents are shown as
    different artifacts.
-   A legitimate older release is distinguished from a hash mismatch.
-   A release's revoked/superseded status is visible with its source and
    reason.
-   A variant with no authenticated reference is marked unknown rather
    than malicious.
-   The UI can link a release to its Monad transaction.

### Later release

-   Add magnet-link and `.torrent` metadata parsing.
-   Correlate content identifiers and manifests across sources.
-   Add a more advanced provenance graph and import/export tools.

## Feature 3 --- Swarm Risk Intelligence

### Purpose

Present security evidence separately from authenticity so users can make
informed decisions.

### Hackathon MVP

-   Build a unified evidence panel containing:
    -   publisher signature result
    -   trusted manifest/hash comparison
    -   release status/revocation result
    -   available scanner result
    -   signed verifier attestations, if configured
-   Each finding must include source, timestamp, evidence type, status,
    and freshness where known.
-   Support a scanner adapter interface. Integrate a real scanner/API
    only when available and configured.
-   If no scanner is configured, show `SCANNER_UNAVAILABLE` or
    `NOT_SCANNED`; do not fabricate a clean result.
-   Any seeded demonstration finding must be visibly labelled as demo
    data.
-   Avoid naïve crowd voting: multiple anonymous reports are not proof
    of maliciousness.
-   Provide an overall status such as:
    -   `AUTHENTICITY_CONFIRMED_SECURITY_UNKNOWN`
    -   `INTEGRITY_MISMATCH`
    -   `REVOKED_RELEASE`
    -   `SUSPICIOUS_SECURITY_FINDING`
    -   `UNKNOWN_PROVENANCE`
    -   `CONFLICTING_EVIDENCE`
-   Explain which evidence caused the status.

### Acceptance criteria

-   A file may be authentic but still show malware status as unknown or
    flagged.
-   A file with a hash mismatch is not automatically labelled malware.
-   Missing scanner results never display as "clean."
-   Stale or conflicting findings remain visible and are not silently
    collapsed into a single confident verdict.
-   Scanner integration failure does not break integrity verification.

### Later release

-   Multiple real scanner integrations, signed attestation submission,
    source weighting, report freshness policies, and abuse resistance.

------------------------------------------------------------------------

## 6. Monad Integration

Monad is the shared, publicly inspectable registry and authorization
layer, not the file storage or malware scanner.

### On-chain responsibilities

-   Register a release commitment for an authorized publisher.
-   Maintain publisher authorization and key rotation/revocation state.
-   Maintain release status: active, superseded, or revoked.
-   Emit events for release registration and status changes.
-   Optionally anchor a signed security-attestation digest or
    content-addressed report reference.
-   Expose read methods so the frontend can retrieve current release
    status and publisher authorization.

### Off-chain responsibilities

-   File bytes and local file hashing.
-   Manifest construction and signature verification.
-   Piece/chunk hashing.
-   Scanner execution and report processing.
-   Variant comparison and visualizations.
-   Large report storage.
-   User interface and optional torrent metadata parsing.

### Contract design requirements

-   Only an authorized publisher/administrator can register or revoke
    that publisher's releases.
-   Untrusted users cannot impersonate a publisher by registering a
    hash.
-   Status transitions are explicit and tested.
-   Events contain only non-sensitive metadata and commitments.
-   Do not store private keys, personal data, raw files, or bulky
    reports on-chain.
-   Provide a testnet deployment and explorer verification.
-   The README includes chain/network details, contract address,
    deployed transaction references, and instructions.

### Security caveats

-   A chain record proves what the registry recorded, not that the
    publisher is honest or the file is benign.
-   Publisher onboarding and root-of-trust policy must be documented.
-   Key compromise and recovery must be considered.
-   Do not deploy to mainnet without review simply to chase bonus
    points.

------------------------------------------------------------------------

## 7. Architecture

### Recommended hackathon architecture

-   **Frontend:** Next.js App Router, TypeScript, Tailwind CSS,
    shadcn/ui, Lucide.
-   **Wallet/EVM:** viem and wagmi, or viem alone if wallet requirements
    are simple.
-   **Contracts:** Solidity with Foundry tests and deployment scripts.
-   **Verification engine:** TypeScript modules for SHA-256, canonical
    manifest validation, signature verification, comparison, and verdict
    generation.
-   **Manifest/signature:** Use a well-maintained cryptography library
    and a documented canonicalization format; do not invent a signature
    scheme.
-   **Storage:** local file processing by default; optional small
    off-chain metadata storage only when needed.
-   **Scanner adapter:** optional integration, explicit unavailable
    state if unconfigured.
-   **Testing:** Vitest for frontend/verification logic, Foundry for
    contract tests, Playwright or a manual demo checklist for end-to-end
    flows.
-   **Hosting:** a public frontend deployment such as Vercel or another
    reliable host.
-   **Repository:** a single Next.js application plus a clearly
    separated `contracts/` directory is preferred over a complex
    monorepo for this timebox.

### Suggested repository structure

``` text
swarmtrace/
  app/
    page.tsx
    verify/
    releases/
    compare/
    api/                  # only if a server route is required
  components/
    verification/
    release-dna/
    risk-intelligence/
    wallet/
  lib/
    crypto/
    manifests/
    verification/
    risk/
    chain/
    demo-data/
  contracts/
    src/
    test/
    script/
    foundry.toml
  public/
    demo/
  tests/
  docs/
  README.md
  .env.example
  package.json
```

Keep all contract ABI and frontend types aligned. Generated ABI
artifacts should be the source of truth where practical.

------------------------------------------------------------------------

## 8. Data Models

### Release manifest (conceptual)

``` ts
type ReleaseManifest = {
  schemaVersion: string;
  publisherId: string;
  productId: string;
  releaseVersion: string;
  fileName: string;       // display hint, never identity proof
  fileSize: number;
  sha256: string;
  chunkSize?: number;
  chunkHashes?: string[];
  merkleRoot?: string;
  publisherKeyId: string;
  signature: string;
  releaseNotesUrl?: string;
};
```

### Verification result

``` ts
type VerificationStatus =
  | "MATCHING_AUTHENTICATED_RELEASE"
  | "HASH_MISMATCH"
  | "INVALID_MANIFEST_SIGNATURE"
  | "UNKNOWN_RELEASE"
  | "REVOKED_RELEASE"
  | "VERIFICATION_ERROR";

type VerificationResult = {
  status: VerificationStatus;
  computedSha256?: string;
  expectedSha256?: string;
  publisherSignatureValid: boolean | "unknown";
  chainRecordFound: boolean;
  releaseStatus?: "active" | "superseded" | "revoked" | "unknown";
  findings: EvidenceFinding[];
  explanation: string[];
};
```

### Evidence finding

``` ts
type EvidenceFinding = {
  sourceId: string;
  sourceType: "publisher" | "scanner" | "verifier" | "registry";
  findingType: string;
  status: "positive" | "negative" | "unknown" | "conflicting";
  observedAt?: number;
  expiresAt?: number;
  reportDigest?: string;
  demoOnly?: boolean;
};
```

### Contract interface (initial target)

The exact interface must be frozen by the lead before parallel agent
implementation. Candidate operations: - `registerRelease(...)` -
`setReleaseStatus(...)` or `revokeRelease(...)` -
`rotatePublisherKey(...)` - `recordAttestation(...)` (optional if time
permits) - `getRelease(...)` - `isAuthorizedPublisher(...)`

Prefer a compact contract over feature-heavy tokenomics. Do not create a
custom token.

------------------------------------------------------------------------

## 9. UX Requirements

The primary screen should answer three questions quickly: 1. Does this
file match an authenticated release? 2. What evidence supports the
result? 3. What does the result not prove?

### Main screens

-   **Verify:** drag-and-drop/local file selection, manifest selection
    or lookup, verification progress, final verdict.
-   **Release DNA:** release metadata, version timeline, compare
    variants, transaction links.
-   **Risk Intelligence:** evidence list, scanner status,
    source/timestamp/freshness, conflicting findings.
-   **Publisher/registry demo controls:** clearly labelled testnet/demo
    actions for registering and revoking a release.
-   **About/README:** limitations, trust model, supported formats, and
    reproduction instructions.

### UX principles

-   No generic "SAFE" badge.
-   Use "matches authenticated release" instead of "safe."
-   Explain "unknown," "mismatch," "revoked," and "scanner unavailable."
-   Show chain/network and transaction links for on-chain claims.
-   Clearly label seeded demo data.
-   Keep files local by default and communicate any upload explicitly.
-   Never expose signing private keys to the browser or commit secrets
    to the repository.

------------------------------------------------------------------------

## 10. Seven-Hour Hackathon Roadmap

The hackathon rubric has 400 possible points: - Basic eligibility: 100 -
Working product: 100 - Build in public: 100 - Bonus: 100

The schedule must preserve code freeze and submission deadlines. The
referenced event deadline is 5:30 PM IST for code freeze and 5:45 PM IST
for submission.

### Phase 0 --- Freeze decisions (first 20--30 minutes)

-   Agree on product name and scope.
-   Freeze shared types, manifest schema, contract ABI, and demo
    scenario.
-   Create repository, branch rules, `.env.example`, and issue list.
-   Assign one integration owner.
-   Do not let parallel agents independently redesign interfaces.

### Phase 1 --- Parallel implementation

-   Contract agent: minimal registry, authorization, revocation, tests.
-   Verification agent: manifest schema, file hash, signature
    verification, verdict engine.
-   Frontend agent: polished shell, upload flow, release comparison,
    evidence panel.
-   Integration/lead: testnet setup, shared types, deployment pipeline,
    README, demo script.

### Phase 2 --- Vertical slice

Must work end to end: 1. Register a publisher-approved test release on
Monad Testnet. 2. Verify a local file against the authenticated
manifest. 3. Show a live transaction and release record. 4. Modify the
file and demonstrate mismatch. 5. Compare release variants. 6. Display
honest risk evidence and scanner-unavailable state if no real scanner is
configured.

### Phase 3 --- Reliability and evidence

-   Run contract tests and verification tests.
-   Verify the contract source on the explorer.
-   Deploy the public frontend.
-   Complete README with setup, environment variables, chain
    information, contract address, and reproducible steps.
-   Record a 30-second-or-longer demo video and a separate creative
    product ad.
-   Publish the required tagged social post and track eligible view
    counts.
-   Rehearse the three-minute pitch.
-   Stop code changes at the official code freeze; submit by the
    submission deadline.

### Phase 4 --- After hackathon

-   Real torrent client integration.
-   BEP 52 metadata/piece-layer support.
-   Real scanner integrations.
-   Publisher identity onboarding and key recovery.
-   Independent security review.
-   Threat modelling and abuse resistance.
-   Mainnet deployment only after review.

------------------------------------------------------------------------

## 11. Agent Roles and Skills

Agents must work against shared interfaces. Only the lead/integration
owner may change shared types or the contract ABI without notifying all
agents.

### Agent A --- Smart contracts

**Skills:** Solidity, access control, events, EVM storage, Foundry,
unit/invariant testing, Monad deployment and explorer verification.

**Tasks:** - Implement release registry and publisher authorization. -
Add release status/revocation and optional key rotation. - Write tests
for unauthorized registration, unauthorized revocation, duplicate
records, invalid transitions, and read behavior. - Provide ABI,
deployment scripts, address, and verification steps.

**Must not:** implement the frontend or invent a token.

### Agent B --- Verification and cryptography

**Skills:** TypeScript, SHA-256, digital signatures, canonical JSON,
file streaming/chunking, schema validation, secure error handling, test
vectors.

**Tasks:** - Define manifest validation. - Hash local files. - Verify
signatures using a maintained library. - Compare computed and expected
hashes. - Implement the verdict engine and chunk-level progress when a
manifest supports it. - Add test fixtures for valid, modified,
invalid-signature, unknown, and revoked cases.

**Must not:** treat filename as identity or label an unknown file
malicious.

### Agent C --- Frontend/product experience

**Skills:** Next.js, TypeScript, Tailwind, accessible UI, wallet
integration, file APIs, responsive layouts, visualization, error/loading
states.

**Tasks:** - Build Verify, Release DNA, and Risk Intelligence views. -
Integrate typed verification results and contract reads/writes. - Show
transaction and explorer links. - Distinguish real findings from demo
fixtures. - Ensure the complete happy path works on the hosted
application.

**Must not:** fake successful transactions or invent scanner results.

### Agent D --- Integration, QA, and DevEx (lead or additional agent)

**Skills:** Git, TypeScript interfaces, test orchestration, RPC
configuration, deployment, README writing, browser debugging, security
review, demo storytelling.

**Tasks:** - Maintain the interface/ABI contract. - Integrate components
and resolve merge conflicts. - Deploy testnet contract and frontend. -
Run end-to-end tests. - Verify public links and contract source. -
Prepare README, demo, social evidence, and three-minute pitch.

### Parallel-agent rules

-   Give each agent a narrow task and explicit files it owns.
-   Ask agents to report changed files, commands run, test results, and
    known limitations.
-   Require tests before merging.
-   Never let two agents edit the same core file simultaneously.
-   Use small commits and integrate early.
-   Freeze the ABI and manifest schema before implementation.
-   Do not accept claims like "implemented" without a runnable test or
    observable result.

------------------------------------------------------------------------

## 12. Acceptance Checklist

### Basic rubric --- 100 points

-   [ ] Public GitHub repository.
-   [ ] README contains public app URL and contract address.
-   [ ] Contract deployed on Monad Testnet.
-   [ ] App publicly hosted.

### Working product --- 100 points

-   [ ] All announced functions work.
-   [ ] Live transaction during demo.
-   [ ] Contract source verified on explorer.
-   [ ] README enables a third party to run the project without help.

### Build in public --- 100 points

-   [ ] Project post tags `@monad`, `@monad_dev`, `@geeky_kartikey`.
-   [ ] Demo video is 30 seconds or longer and shows the running
    product.
-   [ ] Creative product advertisement published.
-   [ ] Eligible project posts reach 5,000 combined views before the
    deadline, if achievable.

### Bonus --- up to 100 points

-   [ ] Mainnet deployment only if safe and reviewed.
-   [ ] Custom domain only after core requirements.
-   [ ] Collect genuine user feedback for pre-market fit.
-   [ ] Document a plausible paid API/enterprise monitoring model.
-   [ ] Explain the originality and differentiation with evidence.

### Security and honesty

-   [ ] No private keys committed.
-   [ ] Unauthorized publisher registration is rejected.
-   [ ] Invalid signatures fail.
-   [ ] Byte-modified file fails hash comparison.
-   [ ] Unknown is not equated with malicious.
-   [ ] Hash match is not equated with malware-free.
-   [ ] Scanner absence is not shown as a clean result.
-   [ ] Demo findings are labelled as demo data.
-   [ ] No files or sensitive data are stored on-chain.

------------------------------------------------------------------------

## 13. Risks and Mitigations

  -----------------------------------------------------------------------
  Risk                                Mitigation
  ----------------------------------- -----------------------------------
  Scope too large for seven hours     Prioritize a complete vertical
                                      slice; treat real torrent-client
                                      integration as post-hackathon
                                      unless already available.

  Agents create incompatible          Freeze manifest schema, TypeScript
  interfaces                          types, and ABI before parallel
                                      work.

  Signature implementation is         Use maintained libraries, canonical
  incorrect                           payload encoding, and known test
                                      vectors.

  False claim of file safety          Separate authenticity, integrity,
                                      revocation, and malware findings in
                                      UI and code.

  Publisher impersonation             Require authorization for registry
                                      writes; explain the demo trust
                                      root.

  Scanner API unavailable             Use an adapter with explicit
                                      unavailable state; do not fabricate
                                      clean results.

  RPC/testnet/deployment failure      Test deployment early and keep a
                                      recorded fallback demo while
                                      preserving real explorer links.

  Novelty challenge                   Focus on torrent-oriented live
                                      verification, cross-source variant
                                      comparison, and evidence
                                      provenance; acknowledge existing
                                      signing/transparency systems.

  Secret leakage                      Keep deployer keys in local
                                      environment variables, never
                                      frontend bundles or commits.

  Overclaiming real-time torrent      Only claim actual live torrent
  support                             monitoring if a real
                                      client/protocol integration has
                                      been implemented and tested.
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 14. Product Differentiation and Competitive Positioning

SwarmTrace is not a replacement for Sigstore and does not claim to
invent cryptographic signing or transparency logs.

The differentiation hypothesis is: - Torrent-oriented file and chunk
verification. - Comparison of multiple distributions that claim to be
the same release. - A clear release lineage and revocation view. - A
unified, explainable evidence panel that separates publisher
authenticity from malware status. - A Monad registry for shared release
authorization and status transitions.

Before making strong novelty claims, compare the implementation against
existing torrent clients, publisher checksum/signature workflows,
Sigstore, and security scanning tools.

### One-sentence pitch

**SwarmTrace is a torrent-native verification and forensics layer that
checks downloaded files against authenticated releases, compares
suspicious variants, and explains security evidence, backed by an
auditable release registry on Monad.**

------------------------------------------------------------------------

## 15. Three-Minute Demo Script

**0:00--0:20 --- Problem:** "A filename and a torrent source do not
prove that a file is authentic."

**0:20--0:45 --- Feature 1:** Register or load a publisher-authenticated
release, select a local file, and show the real hash/signature
verification result.

**0:45--1:10 --- Tampering:** Modify the test file and demonstrate the
mismatch. Explain that mismatch means different bytes, not automatically
malware.

**1:10--1:35 --- Feature 2:** Compare two same-name variants and show
the authenticated release/version/revocation relationship.

**1:35--2:00 --- Feature 3:** Show provenance, scanner state, and
security findings with their sources. Explicitly distinguish unknown
from clean.

**2:00--2:25 --- Monad:** Show the live Testnet transaction, contract
address, verified source, and release registry record.

**2:25--2:45 --- Differentiation and business:** Explain
torrent-specific variant forensics and a potential verification API for
software distributors and mirror operators.

**2:45--3:00 --- Required information:** Say the public GitHub repo,
contract address, live URL, and deployment network aloud.

------------------------------------------------------------------------

## 16. Decisions to Freeze Before Prompting Agents

1.  Repository name: `swarmtrace`.
2.  Frontend: Next.js + TypeScript + Tailwind.
3.  Contract: Solidity + Foundry on Monad Testnet.
4.  Manifest format and signature/canonicalization library.
5.  Exact contract ABI and publisher authorization model.
6.  Local-file verification as the guaranteed MVP; actual torrent client
    integration is optional and must not be faked.
7.  Scanner adapter behavior when no scanner is configured.
8.  Shared TypeScript types and ownership of files.
9.  Demo release, modified-file fixture, and variant fixtures.
10. Code freeze, submission deadline, and required evidence.

**Definition of done:** a public application can verify a test file
against a publisher-authenticated release, detect a modified copy,
compare release variants, display honest security evidence, and
read/write the deployed Monad Testnet registry with a verifiable
transaction trail. The repository is public, the contract is verified,
the README is reproducible, and the three-minute demo is rehearsed.
