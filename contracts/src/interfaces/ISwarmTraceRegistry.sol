// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/**
 * @title ISwarmTraceRegistry
 * @notice Canonical registry interface for SwarmTrace release provenance and publisher authorization on Monad.
 * @dev Stores only cryptographic commitments and state machine transitions.
 *      Raw files, full manifests, private keys, personal data, and large scan reports remain off-chain.
 */
interface ISwarmTraceRegistry {
    /// @notice Lifecycle status of a release
    enum ReleaseStatus {
        Unknown,    // 0: Record not found in registry
        Active,     // 1: Legitimate active release authorized by publisher
        Superseded, // 2: Legitimate release superseded by a newer version
        Revoked     // 3: Revoked by authorized publisher or emergency admin
    }

    /// @notice Publisher identity and authorized signing key metadata
    struct PublisherInfo {
        address publisherAddress;
        string publisherId;          // Canonical reverse-DNS identifier (e.g. "org.swarmtrace.core")
        bytes32 ed25519PubKey;       // 32-byte Ed25519 public key used for manifest signatures
        uint256 authorizedAt;        // Timestamp when authorized
        bool isAuthorized;           // Whether publisher is currently authorized
    }

    /// @notice On-chain release commitment record
    struct ReleaseRecord {
        bytes32 releaseDigest;          // keccak256 commitment of the release tuple
        address publisherAddress;       // Registered publisher address
        string publisherId;             // Publisher identifier
        string productId;               // Product identifier (e.g. "swarmtrace-node")
        string releaseVersion;          // Semantic version string (e.g. "1.0.0")
        bytes32 fileHash;               // SHA-256 digest of the entire file
        bytes32 manifestDigest;         // SHA-256 digest of the canonical RFC 8785 manifest payload
        bytes32 previousReleaseDigest;  // Predecessor release digest or bytes32(0)
        ReleaseStatus status;           // Current status
        uint256 registeredAt;           // Timestamp when registered
        uint256 revokedAt;              // Timestamp when revoked (or 0)
        string revokeReason;            // Explanation if revoked (or empty string)
    }

    // --- Events ---

    event PublisherAuthorized(
        address indexed publisherAddress,
        string publisherId,
        bytes32 ed25519PubKey,
        uint256 timestamp
    );

    event PublisherDeauthorized(
        address indexed publisherAddress,
        string publisherId,
        uint256 timestamp
    );

    event PublisherKeyRotated(
        address indexed publisherAddress,
        string publisherId,
        bytes32 indexed oldEd25519PubKey,
        bytes32 indexed newEd25519PubKey,
        uint256 timestamp
    );

    event ReleaseRegistered(
        bytes32 indexed releaseDigest,
        address indexed publisherAddress,
        string publisherId,
        string productId,
        string releaseVersion,
        bytes32 indexed fileHash,
        bytes32 manifestDigest,
        bytes32 previousReleaseDigest,
        uint256 timestamp
    );

    event ReleaseStatusChanged(
        bytes32 indexed releaseDigest,
        ReleaseStatus indexed oldStatus,
        ReleaseStatus indexed newStatus,
        string reason,
        uint256 timestamp
    );

    event ReleaseRevoked(
        bytes32 indexed releaseDigest,
        address indexed revokedBy,
        string reason,
        uint256 timestamp
    );

    event ReleaseSuperseded(
        bytes32 indexed oldReleaseDigest,
        bytes32 indexed newReleaseDigest,
        uint256 timestamp
    );

    // --- Custom Errors ---

    error NotAuthorizedPublisher(address caller);
    error NotRegistryAdmin(address caller);
    error PublisherAlreadyExists(string publisherId);
    error PublisherNotFound(address publisherAddress);
    error PublisherIdAlreadyRegistered(string publisherId);
    error ReleaseAlreadyExists(bytes32 releaseDigest);
    error ReleaseNotFound(bytes32 releaseDigest);
    error UnauthorizedRevocation(address caller, address releaseOwner);
    error InvalidStatusTransition(ReleaseStatus currentStatus, ReleaseStatus requestedStatus);
    error InvalidZeroHash(string paramName);
    error EmptyStringArgument(string paramName);
    error ProductMismatch(bytes32 previousReleaseDigest);

    // --- Write Methods ---

    function authorizePublisher(
        address publisher,
        string calldata publisherId,
        bytes32 ed25519PubKey
    ) external;

    function deauthorizePublisher(address publisher) external;

    function rotateSigningKey(bytes32 newEd25519PubKey) external;

    function registerRelease(
        string calldata productId,
        string calldata releaseVersion,
        bytes32 fileHash,
        bytes32 manifestDigest,
        bytes32 previousReleaseDigest
    ) external returns (bytes32 releaseDigest);

    function revokeRelease(bytes32 releaseDigest, string calldata reason) external;

    function supersedeRelease(bytes32 oldReleaseDigest, bytes32 newReleaseDigest) external;

    // --- Read Methods ---

    function getRelease(bytes32 releaseDigest) external view returns (ReleaseRecord memory);

    function getReleases(bytes32[] calldata digests) external view returns (ReleaseRecord[] memory);

    function getReleaseByFileHash(bytes32 fileHash) external view returns (ReleaseRecord memory);

    function getPublisher(address publisherAddress) external view returns (PublisherInfo memory);

    function getPublisherById(string calldata publisherId) external view returns (PublisherInfo memory);

    function isAuthorizedPublisher(address account) external view returns (bool);

    function getReleaseStatus(bytes32 releaseDigest) external view returns (ReleaseStatus);

    function calculateReleaseDigest(
        string memory publisherId,
        string memory productId,
        string memory releaseVersion,
        bytes32 fileHash,
        bytes32 manifestDigest
    ) external pure returns (bytes32);
}
