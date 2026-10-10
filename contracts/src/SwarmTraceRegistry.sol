// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { ISwarmTraceRegistry } from "./interfaces/ISwarmTraceRegistry.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SwarmTraceRegistry
 * @notice On-chain registry for authorized publisher commitments and release statuses on Monad.
 * @dev Stores minimal cryptographic commitments and state transitions.
 *      Never stores raw files, full manifests, private keys, or scan reports on-chain.
 */
contract SwarmTraceRegistry is ISwarmTraceRegistry, Ownable {
    // --- State Storage ---

    /// @notice Publisher account address => Publisher metadata
    mapping(address => PublisherInfo) private _publishers;

    /// @notice Publisher reverse-DNS identifier => Publisher account address
    mapping(string => address) private _publisherIdToAddress;

    /// @notice Release commitment digest => Release record
    mapping(bytes32 => ReleaseRecord) private _releases;

    /// @notice File SHA-256 hash => Release commitment digest
    mapping(bytes32 => bytes32) private _fileHashToReleaseDigest;

    // --- Modifiers ---

    modifier onlyAuthorizedPublisher() {
        if (!_publishers[msg.sender].isAuthorized) {
            revert NotAuthorizedPublisher(msg.sender);
        }
        _;
    }

    // --- Constructor ---

    constructor(address initialAdmin) Ownable(initialAdmin) {}

    // --- Write Methods ---

    /**
     * @inheritdoc ISwarmTraceRegistry
     */
    function authorizePublisher(
        address publisher,
        string calldata publisherId,
        bytes32 ed25519PubKey
    ) external override onlyOwner {
        if (publisher == address(0)) {
            revert PublisherNotFound(address(0));
        }
        if (bytes(publisherId).length == 0) {
            revert EmptyStringArgument("publisherId");
        }
        if (ed25519PubKey == bytes32(0)) {
            revert InvalidZeroHash("ed25519PubKey");
        }

        address existingOwner = _publisherIdToAddress[publisherId];
        if (existingOwner != address(0) && existingOwner != publisher) {
            revert PublisherIdAlreadyRegistered(publisherId);
        }

        _publishers[publisher] = PublisherInfo({
            publisherAddress: publisher,
            publisherId: publisherId,
            ed25519PubKey: ed25519PubKey,
            authorizedAt: block.timestamp,
            isAuthorized: true
        });

        _publisherIdToAddress[publisherId] = publisher;

        emit PublisherAuthorized(publisher, publisherId, ed25519PubKey, block.timestamp);
    }

    /**
     * @inheritdoc ISwarmTraceRegistry
     */
    function deauthorizePublisher(address publisher) external override onlyOwner {
        PublisherInfo storage info = _publishers[publisher];
        if (info.publisherAddress == address(0)) {
            revert PublisherNotFound(publisher);
        }

        info.isAuthorized = false;

        emit PublisherDeauthorized(publisher, info.publisherId, block.timestamp);
    }

    /**
     * @inheritdoc ISwarmTraceRegistry
     */
    function rotateSigningKey(bytes32 newEd25519PubKey) external override onlyAuthorizedPublisher {
        if (newEd25519PubKey == bytes32(0)) {
            revert InvalidZeroHash("newEd25519PubKey");
        }

        PublisherInfo storage info = _publishers[msg.sender];
        bytes32 oldKey = info.ed25519PubKey;
        info.ed25519PubKey = newEd25519PubKey;

        emit PublisherKeyRotated(
            msg.sender,
            info.publisherId,
            oldKey,
            newEd25519PubKey,
            block.timestamp
        );
    }

    /**
     * @inheritdoc ISwarmTraceRegistry
     */
    function registerRelease(
        string calldata productId,
        string calldata releaseVersion,
        bytes32 fileHash,
        bytes32 manifestDigest,
        bytes32 previousReleaseDigest
    ) external override onlyAuthorizedPublisher returns (bytes32 releaseDigest) {
        if (bytes(productId).length == 0) {
            revert EmptyStringArgument("productId");
        }
        if (bytes(releaseVersion).length == 0) {
            revert EmptyStringArgument("releaseVersion");
        }
        if (fileHash == bytes32(0)) {
            revert InvalidZeroHash("fileHash");
        }
        if (manifestDigest == bytes32(0)) {
            revert InvalidZeroHash("manifestDigest");
        }

        PublisherInfo storage publisher = _publishers[msg.sender];

        releaseDigest = calculateReleaseDigest(
            publisher.publisherId,
            productId,
            releaseVersion,
            fileHash,
            manifestDigest
        );

        if (_releases[releaseDigest].status != ReleaseStatus.Unknown) {
            revert ReleaseAlreadyExists(releaseDigest);
        }

        // Handle predecessor supersession
        if (previousReleaseDigest != bytes32(0)) {
            ReleaseRecord storage previous = _releases[previousReleaseDigest];
            if (previous.status == ReleaseStatus.Unknown) {
                revert ReleaseNotFound(previousReleaseDigest);
            }
            if (
                keccak256(bytes(previous.productId)) != keccak256(bytes(productId)) ||
                keccak256(bytes(previous.publisherId)) != keccak256(bytes(publisher.publisherId))
            ) {
                revert ProductMismatch(previousReleaseDigest);
            }

            if (previous.status == ReleaseStatus.Active) {
                previous.status = ReleaseStatus.Superseded;
                emit ReleaseStatusChanged(
                    previousReleaseDigest,
                    ReleaseStatus.Active,
                    ReleaseStatus.Superseded,
                    "Superseded by newer version",
                    block.timestamp
                );
                emit ReleaseSuperseded(previousReleaseDigest, releaseDigest, block.timestamp);
            }
        }

        _releases[releaseDigest] = ReleaseRecord({
            releaseDigest: releaseDigest,
            publisherAddress: msg.sender,
            publisherId: publisher.publisherId,
            productId: productId,
            releaseVersion: releaseVersion,
            fileHash: fileHash,
            manifestDigest: manifestDigest,
            previousReleaseDigest: previousReleaseDigest,
            status: ReleaseStatus.Active,
            registeredAt: block.timestamp,
            revokedAt: 0,
            revokeReason: ""
        });

        _fileHashToReleaseDigest[fileHash] = releaseDigest;

        emit ReleaseRegistered(
            releaseDigest,
            msg.sender,
            publisher.publisherId,
            productId,
            releaseVersion,
            fileHash,
            manifestDigest,
            previousReleaseDigest,
            block.timestamp
        );
    }

    /**
     * @inheritdoc ISwarmTraceRegistry
     */
    function revokeRelease(bytes32 releaseDigest, string calldata reason) external override {
        ReleaseRecord storage release = _releases[releaseDigest];

        if (release.status == ReleaseStatus.Unknown) {
            revert ReleaseNotFound(releaseDigest);
        }
        if (release.status == ReleaseStatus.Revoked) {
            revert InvalidStatusTransition(ReleaseStatus.Revoked, ReleaseStatus.Revoked);
        }

        // Caller must be registering publisher or emergency admin
        if (msg.sender != release.publisherAddress && msg.sender != owner()) {
            revert UnauthorizedRevocation(msg.sender, release.publisherAddress);
        }

        ReleaseStatus oldStatus = release.status;
        release.status = ReleaseStatus.Revoked;
        release.revokedAt = block.timestamp;
        release.revokeReason = reason;

        emit ReleaseStatusChanged(
            releaseDigest,
            oldStatus,
            ReleaseStatus.Revoked,
            reason,
            block.timestamp
        );

        emit ReleaseRevoked(
            releaseDigest,
            msg.sender,
            reason,
            block.timestamp
        );
    }

    /**
     * @inheritdoc ISwarmTraceRegistry
     */
    function supersedeRelease(
        bytes32 oldReleaseDigest,
        bytes32 newReleaseDigest
    ) external override {
        ReleaseRecord storage oldRelease = _releases[oldReleaseDigest];
        ReleaseRecord storage newRelease = _releases[newReleaseDigest];

        if (oldRelease.status == ReleaseStatus.Unknown) {
            revert ReleaseNotFound(oldReleaseDigest);
        }
        if (newRelease.status == ReleaseStatus.Unknown) {
            revert ReleaseNotFound(newReleaseDigest);
        }
        if (oldRelease.status == ReleaseStatus.Revoked) {
            revert InvalidStatusTransition(ReleaseStatus.Revoked, ReleaseStatus.Superseded);
        }

        if (msg.sender != oldRelease.publisherAddress && msg.sender != owner()) {
            revert UnauthorizedRevocation(msg.sender, oldRelease.publisherAddress);
        }

        ReleaseStatus prevStatus = oldRelease.status;
        oldRelease.status = ReleaseStatus.Superseded;

        emit ReleaseStatusChanged(
            oldReleaseDigest,
            prevStatus,
            ReleaseStatus.Superseded,
            "Manually superseded",
            block.timestamp
        );

        emit ReleaseSuperseded(
            oldReleaseDigest,
            newReleaseDigest,
            block.timestamp
        );
    }

    // --- Read Methods ---

    function getRelease(bytes32 releaseDigest) external view override returns (ReleaseRecord memory) {
        return _releases[releaseDigest];
    }

    function getReleases(bytes32[] calldata digests) external view override returns (ReleaseRecord[] memory) {
        uint256 len = digests.length;
        ReleaseRecord[] memory records = new ReleaseRecord[](len);
        for (uint256 i = 0; i < len; i++) {
            records[i] = _releases[digests[i]];
        }
        return records;
    }

    function getReleaseByFileHash(bytes32 fileHash) external view override returns (ReleaseRecord memory) {
        bytes32 digest = _fileHashToReleaseDigest[fileHash];
        return _releases[digest];
    }

    function getPublisher(address publisherAddress) external view override returns (PublisherInfo memory) {
        return _publishers[publisherAddress];
    }

    function getPublisherById(string calldata publisherId) external view override returns (PublisherInfo memory) {
        address addr = _publisherIdToAddress[publisherId];
        return _publishers[addr];
    }

    function isAuthorizedPublisher(address account) external view override returns (bool) {
        return _publishers[account].isAuthorized;
    }

    function getReleaseStatus(bytes32 releaseDigest) external view override returns (ReleaseStatus) {
        return _releases[releaseDigest].status;
    }

    function calculateReleaseDigest(
        string memory publisherId,
        string memory productId,
        string memory releaseVersion,
        bytes32 fileHash,
        bytes32 manifestDigest
    ) public pure override returns (bytes32) {
        return keccak256(
            abi.encode(
                publisherId,
                productId,
                releaseVersion,
                fileHash,
                manifestDigest
            )
        );
    }
}
