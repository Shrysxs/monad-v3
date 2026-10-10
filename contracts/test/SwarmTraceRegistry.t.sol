// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { Test } from "forge-std/Test.sol";
import { SwarmTraceRegistry } from "../src/SwarmTraceRegistry.sol";
import { ISwarmTraceRegistry } from "../src/interfaces/ISwarmTraceRegistry.sol";

contract SwarmTraceRegistryTest is Test {
    SwarmTraceRegistry public registry;

    address public admin = address(0xAD);
    address public publisher1 = address(0xCAFE);
    address public publisher2 = address(0xBEEF);
    address public attacker = address(0xBAD);

    string public constant PUB_ID_1 = "org.swarmtrace.core";
    string public constant PUB_ID_2 = "org.canonical.ubuntu";
    bytes32 public constant PUB_ED25519_KEY_1 = bytes32(hex"1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef");
    bytes32 public constant PUB_ED25519_KEY_2 = bytes32(hex"abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890");

    bytes32 public constant FILE_HASH_V1 = bytes32(hex"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    bytes32 public constant MANIFEST_DIGEST_V1 = bytes32(hex"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");

    bytes32 public constant FILE_HASH_V2 = bytes32(hex"cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc");
    bytes32 public constant MANIFEST_DIGEST_V2 = bytes32(hex"dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd");

    function setUp() public {
        vm.prank(admin);
        registry = new SwarmTraceRegistry(admin);

        vm.prank(admin);
        registry.authorizePublisher(publisher1, PUB_ID_1, PUB_ED25519_KEY_1);

        vm.prank(admin);
        registry.authorizePublisher(publisher2, PUB_ID_2, PUB_ED25519_KEY_2);
    }

    function test_InitialAuthorization() public view {
        assertTrue(registry.isAuthorizedPublisher(publisher1));
        assertTrue(registry.isAuthorizedPublisher(publisher2));
        assertFalse(registry.isAuthorizedPublisher(attacker));

        ISwarmTraceRegistry.PublisherInfo memory pub1 = registry.getPublisher(publisher1);
        assertEq(pub1.publisherId, PUB_ID_1);
        assertEq(pub1.ed25519PubKey, PUB_ED25519_KEY_1);
        assertTrue(pub1.isAuthorized);

        ISwarmTraceRegistry.PublisherInfo memory pub2 = registry.getPublisherById(PUB_ID_2);
        assertEq(pub2.publisherAddress, publisher2);
        assertTrue(pub2.isAuthorized);
    }

    function test_NonAdminCannotAuthorize() public {
        vm.prank(attacker);
        vm.expectRevert();
        registry.authorizePublisher(attacker, "org.attacker", bytes32(hex"1111"));
    }

    function test_DuplicatePublisherId_DifferentAddress_Reverts() public {
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(ISwarmTraceRegistry.PublisherIdAlreadyRegistered.selector, PUB_ID_1));
        registry.authorizePublisher(attacker, PUB_ID_1, bytes32(hex"9999"));
    }

    function test_AdminCanDeauthorizePublisher() public {
        vm.prank(admin);
        registry.deauthorizePublisher(publisher1);

        assertFalse(registry.isAuthorizedPublisher(publisher1));

        ISwarmTraceRegistry.PublisherInfo memory pub = registry.getPublisher(publisher1);
        assertFalse(pub.isAuthorized);
    }

    function test_DeauthorizedPublisherCannotRegister() public {
        vm.prank(admin);
        registry.deauthorizePublisher(publisher1);

        vm.prank(publisher1);
        vm.expectRevert(abi.encodeWithSelector(ISwarmTraceRegistry.NotAuthorizedPublisher.selector, publisher1));
        registry.registerRelease(
            "swarmtrace-node",
            "1.0.0",
            FILE_HASH_V1,
            MANIFEST_DIGEST_V1,
            bytes32(0)
        );
    }

    function test_DeauthorizedPublisherCannotRotateKey() public {
        vm.prank(admin);
        registry.deauthorizePublisher(publisher1);

        vm.prank(publisher1);
        vm.expectRevert(abi.encodeWithSelector(ISwarmTraceRegistry.NotAuthorizedPublisher.selector, publisher1));
        registry.rotateSigningKey(bytes32(hex"8888"));
    }

    function test_RegisterRelease_Success() public {
        vm.prank(publisher1);
        bytes32 digest = registry.registerRelease(
            "swarmtrace-node",
            "1.0.0",
            FILE_HASH_V1,
            MANIFEST_DIGEST_V1,
            bytes32(0)
        );

        assertNotEq(digest, bytes32(0));
        assertEq(uint8(registry.getReleaseStatus(digest)), uint8(ISwarmTraceRegistry.ReleaseStatus.Active));

        ISwarmTraceRegistry.ReleaseRecord memory rec = registry.getRelease(digest);
        assertEq(rec.productId, "swarmtrace-node");
        assertEq(rec.releaseVersion, "1.0.0");
        assertEq(rec.fileHash, FILE_HASH_V1);
        assertEq(rec.manifestDigest, MANIFEST_DIGEST_V1);
        assertEq(rec.publisherAddress, publisher1);
        assertEq(rec.publisherId, PUB_ID_1);

        // Lookup by fileHash
        ISwarmTraceRegistry.ReleaseRecord memory lookup = registry.getReleaseByFileHash(FILE_HASH_V1);
        assertEq(lookup.releaseDigest, digest);
    }

    function test_UnauthorizedCallerCannotRegister() public {
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(ISwarmTraceRegistry.NotAuthorizedPublisher.selector, attacker));
        registry.registerRelease(
            "swarmtrace-node",
            "1.0.0",
            FILE_HASH_V1,
            MANIFEST_DIGEST_V1,
            bytes32(0)
        );
    }

    function test_DuplicateRelease_Reverts() public {
        vm.prank(publisher1);
        bytes32 digest = registry.registerRelease(
            "swarmtrace-node",
            "1.0.0",
            FILE_HASH_V1,
            MANIFEST_DIGEST_V1,
            bytes32(0)
        );

        vm.prank(publisher1);
        vm.expectRevert(abi.encodeWithSelector(ISwarmTraceRegistry.ReleaseAlreadyExists.selector, digest));
        registry.registerRelease(
            "swarmtrace-node",
            "1.0.0",
            FILE_HASH_V1,
            MANIFEST_DIGEST_V1,
            bytes32(0)
        );
    }

    function test_ZeroHash_Reverts() public {
        vm.prank(publisher1);
        vm.expectRevert(abi.encodeWithSelector(ISwarmTraceRegistry.InvalidZeroHash.selector, "fileHash"));
        registry.registerRelease(
            "swarmtrace-node",
            "1.0.0",
            bytes32(0),
            MANIFEST_DIGEST_V1,
            bytes32(0)
        );

        vm.prank(publisher1);
        vm.expectRevert(abi.encodeWithSelector(ISwarmTraceRegistry.InvalidZeroHash.selector, "manifestDigest"));
        registry.registerRelease(
            "swarmtrace-node",
            "1.0.0",
            FILE_HASH_V1,
            bytes32(0),
            bytes32(0)
        );
    }

    function test_RevokeRelease_Success() public {
        vm.prank(publisher1);
        bytes32 digest = registry.registerRelease(
            "swarmtrace-node",
            "1.0.0",
            FILE_HASH_V1,
            MANIFEST_DIGEST_V1,
            bytes32(0)
        );

        vm.prank(publisher1);
        registry.revokeRelease(digest, "Critical vulnerability discovered in v1.0.0");

        assertEq(uint8(registry.getReleaseStatus(digest)), uint8(ISwarmTraceRegistry.ReleaseStatus.Revoked));

        ISwarmTraceRegistry.ReleaseRecord memory rec = registry.getRelease(digest);
        assertEq(rec.revokeReason, "Critical vulnerability discovered in v1.0.0");
        assertGt(rec.revokedAt, 0);
    }

    function test_AttackerCannotRevokePublisherRelease() public {
        vm.prank(publisher1);
        bytes32 digest = registry.registerRelease(
            "swarmtrace-node",
            "1.0.0",
            FILE_HASH_V1,
            MANIFEST_DIGEST_V1,
            bytes32(0)
        );

        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(ISwarmTraceRegistry.UnauthorizedRevocation.selector, attacker, publisher1));
        registry.revokeRelease(digest, "Malicious takedown attempt");

        assertEq(uint8(registry.getReleaseStatus(digest)), uint8(ISwarmTraceRegistry.ReleaseStatus.Active));
    }

    function test_RevokePermanence_CannotReRevoke() public {
        vm.prank(publisher1);
        bytes32 digest = registry.registerRelease(
            "swarmtrace-node",
            "1.0.0",
            FILE_HASH_V1,
            MANIFEST_DIGEST_V1,
            bytes32(0)
        );

        vm.prank(publisher1);
        registry.revokeRelease(digest, "Initial revocation");

        vm.prank(publisher1);
        vm.expectRevert(abi.encodeWithSelector(
            ISwarmTraceRegistry.InvalidStatusTransition.selector,
            ISwarmTraceRegistry.ReleaseStatus.Revoked,
            ISwarmTraceRegistry.ReleaseStatus.Revoked
        ));
        registry.revokeRelease(digest, "Second revocation attempt");
    }

    function test_RevokePermanence_CannotSupersedeRevoked() public {
        vm.prank(publisher1);
        bytes32 v1Digest = registry.registerRelease(
            "swarmtrace-node",
            "1.0.0",
            FILE_HASH_V1,
            MANIFEST_DIGEST_V1,
            bytes32(0)
        );

        vm.prank(publisher1);
        bytes32 v2Digest = registry.registerRelease(
            "swarmtrace-node",
            "1.1.0",
            FILE_HASH_V2,
            MANIFEST_DIGEST_V2,
            bytes32(0)
        );

        vm.prank(publisher1);
        registry.revokeRelease(v1Digest, "Revoked due to security issue");

        vm.prank(publisher1);
        vm.expectRevert(abi.encodeWithSelector(
            ISwarmTraceRegistry.InvalidStatusTransition.selector,
            ISwarmTraceRegistry.ReleaseStatus.Revoked,
            ISwarmTraceRegistry.ReleaseStatus.Superseded
        ));
        registry.supersedeRelease(v1Digest, v2Digest);
    }

    function test_CrossPublisherSupersession_Reverts() public {
        vm.prank(publisher1);
        bytes32 pub1Digest = registry.registerRelease(
            "swarmtrace-node",
            "1.0.0",
            FILE_HASH_V1,
            MANIFEST_DIGEST_V1,
            bytes32(0)
        );

        // Publisher 2 tries to link to Publisher 1's release as previous
        vm.prank(publisher2);
        vm.expectRevert(abi.encodeWithSelector(ISwarmTraceRegistry.ProductMismatch.selector, pub1Digest));
        registry.registerRelease(
            "swarmtrace-node",
            "2.0.0",
            FILE_HASH_V2,
            MANIFEST_DIGEST_V2,
            pub1Digest
        );
    }

    function test_AutomaticSupersession_OnVersionUpdate() public {
        vm.prank(publisher1);
        bytes32 v1Digest = registry.registerRelease(
            "swarmtrace-node",
            "1.0.0",
            FILE_HASH_V1,
            MANIFEST_DIGEST_V1,
            bytes32(0)
        );
        assertEq(uint8(registry.getReleaseStatus(v1Digest)), uint8(ISwarmTraceRegistry.ReleaseStatus.Active));

        vm.prank(publisher1);
        bytes32 v2Digest = registry.registerRelease(
            "swarmtrace-node",
            "1.1.0",
            FILE_HASH_V2,
            MANIFEST_DIGEST_V2,
            v1Digest
        );

        assertEq(uint8(registry.getReleaseStatus(v2Digest)), uint8(ISwarmTraceRegistry.ReleaseStatus.Active));
        assertEq(uint8(registry.getReleaseStatus(v1Digest)), uint8(ISwarmTraceRegistry.ReleaseStatus.Superseded));
    }

    function test_BatchGetReleases() public {
        vm.prank(publisher1);
        bytes32 d1 = registry.registerRelease("node", "1.0", FILE_HASH_V1, MANIFEST_DIGEST_V1, bytes32(0));
        vm.prank(publisher1);
        bytes32 d2 = registry.registerRelease("node", "2.0", FILE_HASH_V2, MANIFEST_DIGEST_V2, d1);

        bytes32[] memory digests = new bytes32[](2);
        digests[0] = d1;
        digests[1] = d2;

        ISwarmTraceRegistry.ReleaseRecord[] memory records = registry.getReleases(digests);
        assertEq(records.length, 2);
        assertEq(records[0].releaseDigest, d1);
        assertEq(records[1].releaseDigest, d2);
    }

    function testFuzz_CalculateReleaseDigest(
        string memory pubId,
        string memory prodId,
        string memory ver,
        bytes32 fHash,
        bytes32 mDigest
    ) public view {
        bytes32 d1 = registry.calculateReleaseDigest(pubId, prodId, ver, fHash, mDigest);
        bytes32 d2 = keccak256(abi.encode(pubId, prodId, ver, fHash, mDigest));
        assertEq(d1, d2);
    }
}
