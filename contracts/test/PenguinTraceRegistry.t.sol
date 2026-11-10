// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { Test } from "forge-std/Test.sol";
import { PenguinTraceRegistry } from "../src/PenguinTraceRegistry.sol";
import { IPenguinTraceRegistry } from "../src/interfaces/IPenguinTraceRegistry.sol";

contract PenguinTraceRegistryTest is Test {
    PenguinTraceRegistry public registry;

    address public admin = address(0xAD);
    address public publisher1 = address(0xCAFE);
    address public publisher2 = address(0xBEEF);
    address public attacker = address(0xBAD);

    string public constant PUB_ID_1 = "org.penguintrace.core";
    string public constant PUB_ID_2 = "org.canonical.ubuntu";
    bytes32 public constant PUB_ED25519_KEY_1 = bytes32(hex"1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef");
    bytes32 public constant PUB_ED25519_KEY_2 = bytes32(hex"abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890");

    bytes32 public constant FILE_HASH_V1 = bytes32(hex"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    bytes32 public constant MANIFEST_DIGEST_V1 = bytes32(hex"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");

    bytes32 public constant FILE_HASH_V2 = bytes32(hex"cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc");
    bytes32 public constant MANIFEST_DIGEST_V2 = bytes32(hex"dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd");

    function setUp() public {
        vm.prank(admin);
        registry = new PenguinTraceRegistry(admin);

        vm.prank(admin);
        registry.authorizePublisher(publisher1, PUB_ID_1, PUB_ED25519_KEY_1);

        vm.prank(admin);
        registry.authorizePublisher(publisher2, PUB_ID_2, PUB_ED25519_KEY_2);
    }

    function test_InitialAuthorization() public view {
        assertTrue(registry.isAuthorizedPublisher(publisher1));
        assertTrue(registry.isAuthorizedPublisher(publisher2));
        assertFalse(registry.isAuthorizedPublisher(attacker));

        IPenguinTraceRegistry.PublisherInfo memory pub1 = registry.getPublisher(publisher1);
        assertEq(pub1.publisherId, PUB_ID_1);
        assertEq(pub1.ed25519PubKey, PUB_ED25519_KEY_1);
        assertTrue(pub1.isAuthorized);

        IPenguinTraceRegistry.PublisherInfo memory pub2 = registry.getPublisherById(PUB_ID_2);
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
        vm.expectRevert(abi.encodeWithSelector(IPenguinTraceRegistry.PublisherIdAlreadyRegistered.selector, PUB_ID_1));
        registry.authorizePublisher(attacker, PUB_ID_1, bytes32(hex"9999"));
    }

    function test_AdminCanDeauthorizePublisher() public {
        vm.prank(admin);
        registry.deauthorizePublisher(publisher1);

        assertFalse(registry.isAuthorizedPublisher(publisher1));

        IPenguinTraceRegistry.PublisherInfo memory pub = registry.getPublisher(publisher1);
        assertFalse(pub.isAuthorized);
    }

    function test_DeauthorizedPublisherCannotRegister() public {
        vm.prank(admin);
        registry.deauthorizePublisher(publisher1);

        vm.prank(publisher1);
        vm.expectRevert(abi.encodeWithSelector(IPenguinTraceRegistry.NotAuthorizedPublisher.selector, publisher1));
        registry.registerRelease(
            "penguintrace-node",
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
        vm.expectRevert(abi.encodeWithSelector(IPenguinTraceRegistry.NotAuthorizedPublisher.selector, publisher1));
        registry.rotateSigningKey(bytes32(hex"8888"));
    }

    function test_RegisterRelease_Success() public {
        vm.prank(publisher1);
        bytes32 digest = registry.registerRelease(
            "penguintrace-node",
            "1.0.0",
            FILE_HASH_V1,
            MANIFEST_DIGEST_V1,
            bytes32(0)
        );

        assertNotEq(digest, bytes32(0));
        assertEq(uint8(registry.getReleaseStatus(digest)), uint8(IPenguinTraceRegistry.ReleaseStatus.Active));

        IPenguinTraceRegistry.ReleaseRecord memory rec = registry.getRelease(digest);
        assertEq(rec.productId, "penguintrace-node");
        assertEq(rec.releaseVersion, "1.0.0");
        assertEq(rec.fileHash, FILE_HASH_V1);
        assertEq(rec.manifestDigest, MANIFEST_DIGEST_V1);
        assertEq(rec.publisherAddress, publisher1);
        assertEq(rec.publisherId, PUB_ID_1);

        // Lookup by fileHash
        IPenguinTraceRegistry.ReleaseRecord memory lookup = registry.getReleaseByFileHash(PUB_ID_1, FILE_HASH_V1);
        assertEq(lookup.releaseDigest, digest);
    }

    function test_UnauthorizedCallerCannotRegister() public {
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(IPenguinTraceRegistry.NotAuthorizedPublisher.selector, attacker));
        registry.registerRelease(
            "penguintrace-node",
            "1.0.0",
            FILE_HASH_V1,
            MANIFEST_DIGEST_V1,
            bytes32(0)
        );
    }

    function test_DuplicateRelease_Reverts() public {
        vm.prank(publisher1);
        bytes32 digest = registry.registerRelease(
            "penguintrace-node",
            "1.0.0",
            FILE_HASH_V1,
            MANIFEST_DIGEST_V1,
            bytes32(0)
        );

        vm.prank(publisher1);
        vm.expectRevert(abi.encodeWithSelector(IPenguinTraceRegistry.ReleaseAlreadyExists.selector, digest));
        registry.registerRelease(
            "penguintrace-node",
            "1.0.0",
            FILE_HASH_V1,
            MANIFEST_DIGEST_V1,
            bytes32(0)
        );
    }

    function test_ZeroHash_Reverts() public {
        vm.prank(publisher1);
        vm.expectRevert(abi.encodeWithSelector(IPenguinTraceRegistry.InvalidZeroHash.selector, "fileHash"));
        registry.registerRelease(
            "penguintrace-node",
            "1.0.0",
            bytes32(0),
            MANIFEST_DIGEST_V1,
            bytes32(0)
        );

        vm.prank(publisher1);
        vm.expectRevert(abi.encodeWithSelector(IPenguinTraceRegistry.InvalidZeroHash.selector, "manifestDigest"));
        registry.registerRelease(
            "penguintrace-node",
            "1.0.0",
            FILE_HASH_V1,
            bytes32(0),
            bytes32(0)
        );
    }

    function test_RevokeRelease_Success() public {
        vm.prank(publisher1);
        bytes32 digest = registry.registerRelease(
            "penguintrace-node",
            "1.0.0",
            FILE_HASH_V1,
            MANIFEST_DIGEST_V1,
            bytes32(0)
        );

        vm.prank(publisher1);
        registry.revokeRelease(digest, "Critical vulnerability discovered in v1.0.0");

        assertEq(uint8(registry.getReleaseStatus(digest)), uint8(IPenguinTraceRegistry.ReleaseStatus.Revoked));

        IPenguinTraceRegistry.ReleaseRecord memory rec = registry.getRelease(digest);
        assertEq(rec.revokeReason, "Critical vulnerability discovered in v1.0.0");
        assertGt(rec.revokedAt, 0);
    }

    function test_AttackerCannotRevokePublisherRelease() public {
        vm.prank(publisher1);
        bytes32 digest = registry.registerRelease(
            "penguintrace-node",
            "1.0.0",
            FILE_HASH_V1,
            MANIFEST_DIGEST_V1,
            bytes32(0)
        );

        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(IPenguinTraceRegistry.UnauthorizedRevocation.selector, attacker, publisher1));
        registry.revokeRelease(digest, "Malicious takedown attempt");

        assertEq(uint8(registry.getReleaseStatus(digest)), uint8(IPenguinTraceRegistry.ReleaseStatus.Active));
    }

    function test_RevokePermanence_CannotReRevoke() public {
        vm.prank(publisher1);
        bytes32 digest = registry.registerRelease(
            "penguintrace-node",
            "1.0.0",
            FILE_HASH_V1,
            MANIFEST_DIGEST_V1,
            bytes32(0)
        );

        vm.prank(publisher1);
        registry.revokeRelease(digest, "Initial revocation");

        vm.prank(publisher1);
        vm.expectRevert(abi.encodeWithSelector(
            IPenguinTraceRegistry.InvalidStatusTransition.selector,
            IPenguinTraceRegistry.ReleaseStatus.Revoked,
            IPenguinTraceRegistry.ReleaseStatus.Revoked
        ));
        registry.revokeRelease(digest, "Second revocation attempt");
    }

    function test_RevokePermanence_CannotSupersedeRevoked() public {
        vm.prank(publisher1);
        bytes32 v1Digest = registry.registerRelease(
            "penguintrace-node",
            "1.0.0",
            FILE_HASH_V1,
            MANIFEST_DIGEST_V1,
            bytes32(0)
        );

        vm.prank(publisher1);
        bytes32 v2Digest = registry.registerRelease(
            "penguintrace-node",
            "1.1.0",
            FILE_HASH_V2,
            MANIFEST_DIGEST_V2,
            bytes32(0)
        );

        vm.prank(publisher1);
        registry.revokeRelease(v1Digest, "Revoked due to security issue");

        vm.prank(publisher1);
        vm.expectRevert(abi.encodeWithSelector(
            IPenguinTraceRegistry.InvalidStatusTransition.selector,
            IPenguinTraceRegistry.ReleaseStatus.Revoked,
            IPenguinTraceRegistry.ReleaseStatus.Superseded
        ));
        registry.supersedeRelease(v1Digest, v2Digest);
    }

    function test_CrossPublisherSupersession_Reverts() public {
        vm.prank(publisher1);
        bytes32 pub1Digest = registry.registerRelease(
            "penguintrace-node",
            "1.0.0",
            FILE_HASH_V1,
            MANIFEST_DIGEST_V1,
            bytes32(0)
        );

        // Publisher 2 tries to link to Publisher 1's release as previous
        vm.prank(publisher2);
        vm.expectRevert(abi.encodeWithSelector(IPenguinTraceRegistry.ProductMismatch.selector, pub1Digest));
        registry.registerRelease(
            "penguintrace-node",
            "2.0.0",
            FILE_HASH_V2,
            MANIFEST_DIGEST_V2,
            pub1Digest
        );
    }

    function test_AutomaticSupersession_OnVersionUpdate() public {
        vm.prank(publisher1);
        bytes32 v1Digest = registry.registerRelease(
            "penguintrace-node",
            "1.0.0",
            FILE_HASH_V1,
            MANIFEST_DIGEST_V1,
            bytes32(0)
        );
        assertEq(uint8(registry.getReleaseStatus(v1Digest)), uint8(IPenguinTraceRegistry.ReleaseStatus.Active));

        vm.prank(publisher1);
        bytes32 v2Digest = registry.registerRelease(
            "penguintrace-node",
            "1.1.0",
            FILE_HASH_V2,
            MANIFEST_DIGEST_V2,
            v1Digest
        );

        assertEq(uint8(registry.getReleaseStatus(v2Digest)), uint8(IPenguinTraceRegistry.ReleaseStatus.Active));
        assertEq(uint8(registry.getReleaseStatus(v1Digest)), uint8(IPenguinTraceRegistry.ReleaseStatus.Superseded));
    }

    function test_BatchGetReleases() public {
        vm.prank(publisher1);
        bytes32 d1 = registry.registerRelease("node", "1.0", FILE_HASH_V1, MANIFEST_DIGEST_V1, bytes32(0));
        vm.prank(publisher1);
        bytes32 d2 = registry.registerRelease("node", "2.0", FILE_HASH_V2, MANIFEST_DIGEST_V2, d1);

        bytes32[] memory digests = new bytes32[](2);
        digests[0] = d1;
        digests[1] = d2;

        IPenguinTraceRegistry.ReleaseRecord[] memory records = registry.getReleases(digests);
        assertEq(records.length, 2);
        assertEq(records[0].releaseDigest, d1);
        assertEq(records[1].releaseDigest, d2);
    }

    function test_RegisterRelease_RecordsSigningKey() public {
        vm.prank(publisher1);
        bytes32 digest = registry.registerRelease("penguintrace-node", "1.0.0", FILE_HASH_V1, MANIFEST_DIGEST_V1, bytes32(0));
        assertEq(registry.getRelease(digest).signingKey, PUB_ED25519_KEY_1);
    }

    function test_KeyRotation_PreservesSigningKeyOfEarlierReleases() public {
        vm.prank(publisher1);
        bytes32 oldDigest = registry.registerRelease("penguintrace-node", "1.0.0", FILE_HASH_V1, MANIFEST_DIGEST_V1, bytes32(0));

        bytes32 newKey = bytes32(hex"7777777777777777777777777777777777777777777777777777777777777777");
        vm.prank(publisher1);
        registry.rotateSigningKey(newKey);

        vm.prank(publisher1);
        bytes32 newDigest = registry.registerRelease("penguintrace-node", "1.1.0", FILE_HASH_V2, MANIFEST_DIGEST_V2, oldDigest);

        assertEq(registry.getRelease(oldDigest).signingKey, PUB_ED25519_KEY_1);
        assertEq(registry.getRelease(newDigest).signingKey, newKey);
        assertEq(registry.getPublisher(publisher1).ed25519PubKey, newKey);
    }

    function test_FileHashLookup_CannotBeShadowedByAnotherPublisher() public {
        vm.prank(publisher1);
        bytes32 victimDigest = registry.registerRelease("penguintrace-node", "1.0.0", FILE_HASH_V1, MANIFEST_DIGEST_V1, bytes32(0));

        vm.prank(publisher1);
        registry.revokeRelease(victimDigest, "compromised build");

        // A different authorized publisher registers the exact same file hash.
        vm.prank(publisher2);
        bytes32 shadowDigest = registry.registerRelease("fake-node", "9.9.9", FILE_HASH_V1, MANIFEST_DIGEST_V2, bytes32(0));

        IPenguinTraceRegistry.ReleaseRecord memory victimView = registry.getReleaseByFileHash(PUB_ID_1, FILE_HASH_V1);
        assertEq(victimView.releaseDigest, victimDigest);
        assertEq(uint8(victimView.status), uint8(IPenguinTraceRegistry.ReleaseStatus.Revoked));

        IPenguinTraceRegistry.ReleaseRecord memory shadowView = registry.getReleaseByFileHash(PUB_ID_2, FILE_HASH_V1);
        assertEq(shadowView.releaseDigest, shadowDigest);
    }

    function test_FileHashLookup_UnknownPublisherReturnsEmpty() public view {
        IPenguinTraceRegistry.ReleaseRecord memory rec = registry.getReleaseByFileHash("org.unknown", FILE_HASH_V1);
        assertEq(uint8(rec.status), uint8(IPenguinTraceRegistry.ReleaseStatus.Unknown));
    }

    function _register(address who, string memory product, string memory version, bytes32 fileHash, bytes32 manifestDigest)
        internal
        returns (bytes32)
    {
        vm.prank(who);
        return registry.registerRelease(product, version, fileHash, manifestDigest, bytes32(0));
    }

    function test_Supersede_RejectsSelf() public {
        bytes32 d = _register(publisher1, "penguintrace-node", "1.0.0", FILE_HASH_V1, MANIFEST_DIGEST_V1);
        vm.prank(publisher1);
        vm.expectRevert();
        registry.supersedeRelease(d, d);
    }

    function test_Supersede_RejectsOtherPublishersRelease() public {
        bytes32 mine = _register(publisher1, "penguintrace-node", "1.0.0", FILE_HASH_V1, MANIFEST_DIGEST_V1);
        bytes32 theirs = _register(publisher2, "penguintrace-node", "2.0.0", FILE_HASH_V2, MANIFEST_DIGEST_V2);
        vm.prank(publisher1);
        vm.expectRevert(abi.encodeWithSelector(IPenguinTraceRegistry.ProductMismatch.selector, theirs));
        registry.supersedeRelease(mine, theirs);
    }

    function test_Supersede_RejectsDifferentProduct() public {
        bytes32 a = _register(publisher1, "penguintrace-node", "1.0.0", FILE_HASH_V1, MANIFEST_DIGEST_V1);
        bytes32 b = _register(publisher1, "other-product", "1.0.0", FILE_HASH_V2, MANIFEST_DIGEST_V2);
        vm.prank(publisher1);
        vm.expectRevert(abi.encodeWithSelector(IPenguinTraceRegistry.ProductMismatch.selector, b));
        registry.supersedeRelease(a, b);
    }

    function test_Supersede_RejectsRevokedReplacement() public {
        bytes32 a = _register(publisher1, "penguintrace-node", "1.0.0", FILE_HASH_V1, MANIFEST_DIGEST_V1);
        bytes32 b = _register(publisher1, "penguintrace-node", "1.1.0", FILE_HASH_V2, MANIFEST_DIGEST_V2);
        vm.prank(publisher1);
        registry.revokeRelease(b, "bad build");
        vm.prank(publisher1);
        vm.expectRevert();
        registry.supersedeRelease(a, b);
    }

    function test_Supersede_SameProductSucceeds() public {
        bytes32 a = _register(publisher1, "penguintrace-node", "1.0.0", FILE_HASH_V1, MANIFEST_DIGEST_V1);
        bytes32 b = _register(publisher1, "penguintrace-node", "1.1.0", FILE_HASH_V2, MANIFEST_DIGEST_V2);
        vm.prank(publisher1);
        registry.supersedeRelease(a, b);
        assertEq(uint8(registry.getReleaseStatus(a)), uint8(IPenguinTraceRegistry.ReleaseStatus.Superseded));
    }

    function test_Authorize_CannotRenamePublisherId() public {
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(IPenguinTraceRegistry.PublisherAlreadyExists.selector, PUB_ID_1));
        registry.authorizePublisher(publisher1, "org.renamed", PUB_ED25519_KEY_1);
        assertEq(registry.getPublisherById("org.renamed").publisherAddress, address(0));
    }

    function test_Authorize_ReauthorizeSameIdAfterDeauth() public {
        vm.prank(admin);
        registry.deauthorizePublisher(publisher1);
        bytes32 newKey = bytes32(hex"5555555555555555555555555555555555555555555555555555555555555555");
        vm.prank(admin);
        registry.authorizePublisher(publisher1, PUB_ID_1, newKey);
        assertTrue(registry.isAuthorizedPublisher(publisher1));
        assertEq(registry.getPublisherById(PUB_ID_1).ed25519PubKey, newKey);
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
