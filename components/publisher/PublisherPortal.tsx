"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  KeyRound,
  UserCog,
  ShieldCheck,
  PlusCircle,
  AlertOctagon,
  ExternalLink,
  Check,
  X,
  Wallet,
  AlertTriangle,
  Search,
  FileCode,
  Copy,
  CheckCheck,
  Info,
  RefreshCw,
} from "lucide-react";
import { createWalletClient, custom, encodeFunctionData, type Hex } from "viem";
import { monadTestnet, monadPublicClient } from "@/lib/chain/monad";
import {
  calculateReleaseDigest,
  getRegistryAddress,
  fetchPublisherByAddress,
  fetchRegistryOwner,
  fetchOnChainRelease,
  fetchOnChainReleaseByFileHash,
  REGISTRY_ABI,
} from "@/lib/chain/contract";
import { hashFile } from "@/lib/crypto/hash-file";
import {
  createSignedManifest,
  computeManifestDigest,
  parseAndValidateManifest,
  verifyManifestSignature,
} from "@/lib/manifests/manifest";
import type {
  ReleaseRecord,
  ReleaseManifestPayload,
  RegistryPublisher,
  SignedReleaseManifest,
} from "@/lib/verification/types";

const MONAD_CHAIN_ID = 10143;
/** Piece size recorded in authored manifests (4 MiB) */
const MANIFEST_PIECE_SIZE = 4 * 1024 * 1024;
const ZERO_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000";

/* eslint-disable @typescript-eslint/no-explicit-any */
function getEthereum(): any | null {
  return typeof window !== "undefined" ? (window as any).ethereum ?? null : null;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const with0x = (hex: string) => (hex.startsWith("0x") ? hex : `0x${hex}`) as `0x${string}`;

interface RegistrationCheck {
  manifest: SignedReleaseManifest;
  manifestDigest: `0x${string}`;
  /** Digest the contract will compute, using the publisherId stored on-chain for this wallet */
  releaseDigest: `0x${string}`;
  problems: string[];
}

export function PublisherPortal() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(false);
  const [onChainPublisher, setOnChainPublisher] = useState<RegistryPublisher | null>(null);
  const [registryOwner, setRegistryOwner] = useState<`0x${string}` | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Tabs: manifest, register, revoke, lookup
  const [activeTab, setActiveTab] = useState<"manifest" | "register" | "revoke" | "lookup" | "admin">(
    "register"
  );

  // Registration form: the signed manifest is the single source of truth
  const [regManifestJson, setRegManifestJson] = useState<string>("");
  const [regPreviousReleaseDigest, setRegPreviousReleaseDigest] = useState<string>(ZERO_BYTES32);
  const [regCheck, setRegCheck] = useState<RegistrationCheck | null>(null);
  const [regParseError, setRegParseError] = useState<string | null>(null);

  // Admin form
  const [adminPublisherAddress, setAdminPublisherAddress] = useState<string>("");
  const [adminPublisherId, setAdminPublisherId] = useState<string>("");
  const [adminPublisherKey, setAdminPublisherKey] = useState<string>("");

  // Revocation form
  const [revokeDigest, setRevokeDigest] = useState<string>("");
  const [revokeReason, setRevokeReason] = useState<string>(
    "Security vulnerability discovered in release dependency"
  );

  // Lookup form
  const [lookupQuery, setLookupQuery] = useState<string>("");
  const [lookupPublisherId, setLookupPublisherId] = useState<string>("");
  const [isLookingUp, setIsLookingUp] = useState<boolean>(false);
  const [lookupRecord, setLookupRecord] = useState<ReleaseRecord | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Manifest Authoring State
  const [manifestGenPublisherId, setManifestGenPublisherId] = useState<string>("pub-penguin-core");
  const [manifestGenProductId, setManifestGenProductId] = useState<string>("penguin-agent-linux");
  const [manifestGenVersion, setManifestGenVersion] = useState<string>("2.0.0");
  const [manifestGenFileName, setManifestGenFileName] = useState<string>("penguin-agent-v2.0.0.tar.gz");
  const [manifestGenFileSize, setManifestGenFileSize] = useState<number>(1048576);
  const [manifestGenSha256, setManifestGenSha256] = useState<string>(
    "4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a"
  );
  const [manifestGenKeyId, setManifestGenKeyId] = useState<string>("key-2026-core");
  const [manifestGenPrivateKeyHex, setManifestGenPrivateKeyHex] = useState<string>("");
  const [manifestGenSignedJson, setManifestGenSignedJson] = useState<string>("");
  const [manifestGenDigest, setManifestGenDigest] = useState<string>("");
  const [isHashingFile, setIsHashingFile] = useState<boolean>(false);
  const [hashProgress, setHashProgress] = useState<number>(0);
  const lastHashedSha256 = useRef<string>("");
  // Piece hashes of the hashed file (enables tamper localization for downloaders)
  const [manifestGenChunks, setManifestGenChunks] = useState<{ chunkSize: number; chunkHashes: string[] } | null>(
    null
  );
  const [manifestSignError, setManifestSignError] = useState<string | null>(null);
  const [manifestSignSuccess, setManifestSignSuccess] = useState<string | null>(null);

  // Transaction states
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [txPhase, setTxPhase] = useState<"idle" | "awaiting_wallet" | "confirming" | "confirmed" | "reverted" | "error">("idle");
  const [confirmedTxHash, setConfirmedTxHash] = useState<string | null>(null);
  const [confirmedBlock, setConfirmedBlock] = useState<bigint | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const contractAddress = getRegistryAddress();
  const isContractConfigured =
    contractAddress !== "0x0000000000000000000000000000000000000000";
  const isRegistryAdmin =
    !!walletAddress && !!registryOwner && walletAddress.toLowerCase() === registryOwner.toLowerCase();

  function copyText(key: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  // Sync wallet account / chain on mount and whenever the wallet reports a change
  useEffect(() => {
    const ethereum = getEthereum();
    if (!ethereum) return;

    const syncChain = async () => {
      try {
        setChainId(parseInt(await ethereum.request({ method: "eth_chainId" }), 16));
      } catch {
        // ignore
      }
    };
    ethereum
      .request({ method: "eth_accounts" })
      .then((accounts: string[]) => setWalletAddress(accounts?.[0] ?? null))
      .catch(() => {});
    syncChain();

    const onAccounts = (accounts: string[]) => setWalletAddress(accounts?.[0] ?? null);
    const onChain = (id: string) => setChainId(parseInt(id, 16));
    ethereum.on?.("accountsChanged", onAccounts);
    ethereum.on?.("chainChanged", onChain);
    return () => {
      ethereum.removeListener?.("accountsChanged", onAccounts);
      ethereum.removeListener?.("chainChanged", onChain);
    };
  }, []);

  // Registry admin (owner) for the Admin tab
  useEffect(() => {
    if (!isContractConfigured) return;
    fetchRegistryOwner()
      .then(setRegistryOwner)
      .catch(() => setRegistryOwner(null));
  }, [isContractConfigured]);

  // Load this wallet's on-chain publisher entry (publisherId + authorized Ed25519 key)
  useEffect(() => {
    async function checkAuth() {
      if (walletAddress && isContractConfigured) {
        setIsCheckingAuth(true);
        try {
          const info = await fetchPublisherByAddress(walletAddress as `0x${string}`);
          setOnChainPublisher(info);
          setIsAuthorized(info?.isAuthorized ?? false);
        } catch {
          setOnChainPublisher(null);
          setIsAuthorized(null);
        } finally {
          setIsCheckingAuth(false);
        }
      } else {
        setOnChainPublisher(null);
        setIsAuthorized(null);
      }
    }
    checkAuth();
  }, [walletAddress, isContractConfigured, confirmedBlock]);

  async function connectWallet() {
    if (!getEthereum()) {
      setErrorMessage("No Web3 wallet extension detected in this browser.");
      return;
    }
    try {
      const ethereum = getEthereum();
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      if (accounts && accounts.length > 0) {
        setWalletAddress(accounts[0]);
      }
      const currentChainId = await ethereum.request({ method: "eth_chainId" });
      setChainId(parseInt(currentChainId, 16));
      setErrorMessage(null);
      setStatusMessage("Wallet connected successfully.");
    } catch (err: any) {
      if (err.code === 4001) {
        setErrorMessage("Connection request was rejected by user.");
      } else {
        setErrorMessage("Wallet connection error: " + err.message);
      }
    }
  }

  /**
   * Switches the wallet to Monad Testnet. Returns true only if the wallet is
   * confirmed to be on chain 10143 afterwards; callers must abort otherwise.
   */
  async function switchToMonadTestnet(): Promise<boolean> {
    const ethereum = getEthereum();
    if (!ethereum) return false;
    try {
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x279f" }], // 10143
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: "0x279f",
                chainName: "Monad Testnet",
                nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
                rpcUrls: ["https://testnet-rpc.monad.xyz"],
                blockExplorerUrls: ["https://testnet.monadscan.com"],
              },
            ],
          });
        } catch (addError: any) {
          setErrorMessage("Failed to add Monad Testnet: " + addError.message);
          return false;
        }
      } else if (switchError.code === 4001) {
        setErrorMessage("Network switch rejected by user.");
        return false;
      } else {
        setErrorMessage("Network switch error: " + switchError.message);
        return false;
      }
    }

    // Confirm with the wallet rather than assuming the switch succeeded.
    const current = parseInt(await ethereum.request({ method: "eth_chainId" }), 16);
    setChainId(current);
    if (current !== MONAD_CHAIN_ID) {
      setErrorMessage("Wallet is still not on Monad Testnet (chain 10143). Transaction not sent.");
      return false;
    }
    setStatusMessage("Switched to Monad Testnet (Chain ID 10143).");
    setErrorMessage(null);
    return true;
  }

  /**
   * Sends one registry transaction and tracks it through confirmation.
   * Aborts (without sending) if the wallet, network, or contract is not ready.
   */
  async function submitRegistryTx(
    data: Hex,
    messages: { submitted: string; confirmed: (block: bigint) => string; failedPrefix: string }
  ): Promise<boolean> {
    setIsSubmitting(true);
    setStatusMessage(null);
    setErrorMessage(null);
    setConfirmedTxHash(null);

    try {
      if (!isContractConfigured) {
        setErrorMessage("Registry contract address is not configured.");
        return false;
      }
      const ethereum = getEthereum();
      if (!walletAddress || !ethereum) {
        setErrorMessage("Please connect a Web3 wallet to broadcast on Monad Testnet.");
        return false;
      }
      if (chainId !== MONAD_CHAIN_ID && !(await switchToMonadTestnet())) {
        setTxPhase("error");
        return false;
      }

      setTxPhase("awaiting_wallet");
      setStatusMessage("Awaiting transaction approval in wallet...");

      const client = createWalletClient({ chain: monadTestnet, transport: custom(ethereum) });
      const hash = await client.sendTransaction({
        to: contractAddress,
        data,
        account: walletAddress as `0x${string}`,
        chain: monadTestnet,
      });

      setConfirmedTxHash(hash);
      setTxPhase("confirming");
      setStatusMessage(`${messages.submitted}: ${hash}. Awaiting confirmation on Monad Testnet...`);

      const receipt = await monadPublicClient.waitForTransactionReceipt({ hash });
      if (receipt.status === "success") {
        setTxPhase("confirmed");
        setConfirmedBlock(receipt.blockNumber);
        setStatusMessage(messages.confirmed(receipt.blockNumber));
        return true;
      }
      setTxPhase("reverted");
      setErrorMessage(`Transaction reverted on-chain in block #${receipt.blockNumber}.`);
      return false;
    } catch (err: any) {
      setTxPhase("error");
      if (err.code === 4001 || err.message?.includes("User rejected")) {
        setErrorMessage("Transaction was cancelled in the wallet.");
      } else {
        setErrorMessage(`${messages.failedPrefix}: ${err.shortMessage || err.message}`);
      }
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleFileSelectedForManifest(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsHashingFile(true);
    setHashProgress(0);
    setManifestSignError(null);
    try {
      // Streamed in a Web Worker: large release artifacts are never loaded into memory whole.
      const digest = await hashFile(file, { chunkSize: MANIFEST_PIECE_SIZE, onProgress: setHashProgress });
      setManifestGenFileName(file.name);
      setManifestGenFileSize(digest.size);
      setManifestGenSha256(digest.sha256);
      lastHashedSha256.current = digest.sha256;
      setManifestGenChunks({ chunkSize: MANIFEST_PIECE_SIZE, chunkHashes: digest.chunkHashes ?? [] });
      setManifestSignSuccess(
        `Hashed "${file.name}" (${digest.size} bytes, ${digest.chunkHashes?.length ?? 0} pieces of ${MANIFEST_PIECE_SIZE / 1048576} MiB).`
      );
    } catch (err: any) {
      setManifestSignError("Failed to hash selected file: " + (err.message || String(err)));
    } finally {
      setIsHashingFile(false);
    }
  }

  async function handleGenerateAndSignManifest(e: React.FormEvent) {
    e.preventDefault();
    setManifestSignError(null);
    setManifestSignSuccess(null);

    if (!manifestGenPrivateKeyHex.trim()) {
      setManifestSignError("Please enter your Ed25519 private key for local in-browser signing.");
      return;
    }

    try {
      const cleanKey = manifestGenPrivateKeyHex.trim().replace(/^0x/, "");
      if (cleanKey.length !== 64) {
        setManifestSignError("Ed25519 private key must be a 64-character hex string (32 bytes).");
        return;
      }

      const payload: ReleaseManifestPayload = {
        schemaVersion: "1.0.0",
        publisherId: manifestGenPublisherId.trim(),
        productId: manifestGenProductId.trim(),
        releaseVersion: manifestGenVersion.trim(),
        fileName: manifestGenFileName.trim(),
        fileSize: Number(manifestGenFileSize),
        sha256: manifestGenSha256.trim().toLowerCase().replace(/^0x/, ""),
        publisherKeyId: manifestGenKeyId.trim(),
        // Piece hashes only describe the file that was hashed; drop them if the digest was edited by hand.
        ...(manifestGenChunks &&
        manifestGenSha256.trim().toLowerCase().replace(/^0x/, "") === lastHashedSha256.current
          ? manifestGenChunks
          : {}),
      };

      const signed = await createSignedManifest(payload, cleanKey);
      const digest = await computeManifestDigest(signed);

      setManifestGenSignedJson(JSON.stringify(signed, null, 2));
      setManifestGenDigest(digest);
      setManifestSignSuccess("Manifest successfully canonicalized (RFC 8785) and signed with Ed25519.");
    } catch (err: any) {
      setManifestSignError("Signing error: " + (err.message || String(err)));
    }
  }

  function handleTransferToRegistration() {
    setRegManifestJson(manifestGenSignedJson);
    setActiveTab("register");
    setStatusMessage("Signed manifest transferred to the registration form.");
  }

  // Re-validate the registration manifest whenever it, or the wallet's on-chain entry, changes.
  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!regManifestJson.trim()) {
        setRegCheck(null);
        setRegParseError(null);
        return;
      }
      const parsed = await parseAndValidateManifest(regManifestJson);
      if (cancelled) return;
      if (!parsed.valid) {
        setRegCheck(null);
        setRegParseError(parsed.message);
        return;
      }
      setRegParseError(null);

      const manifest = parsed.manifest;
      const manifestDigest = with0x(parsed.manifestDigest);
      const problems: string[] = [];

      if (!onChainPublisher) {
        problems.push("Connected wallet is not a registered publisher, so the signing key cannot be checked.");
      } else {
        if (!onChainPublisher.isAuthorized) problems.push("Connected publisher account is deauthorized.");
        if (manifest.publisherId !== onChainPublisher.publisherId) {
          problems.push(
            `Manifest publisherId "${manifest.publisherId}" does not match this wallet's on-chain publisherId "${onChainPublisher.publisherId}".`
          );
        }
        const sig = await verifyManifestSignature(manifest, onChainPublisher.ed25519PubKey.replace(/^0x/, ""));
        if (cancelled) return;
        if (!sig.isValid) {
          problems.push(
            "Manifest signature does not verify against this publisher's registered Ed25519 key. Registering it would create a release no verifier can authenticate."
          );
        }
      }

      // The contract derives the digest from the publisherId stored on-chain, not from user input.
      const releaseDigest = calculateReleaseDigest(
        onChainPublisher?.publisherId ?? manifest.publisherId,
        manifest.productId,
        manifest.releaseVersion,
        with0x(manifest.sha256),
        manifestDigest
      );
      setRegCheck({ manifest, manifestDigest, releaseDigest, problems });
    }
    check();
    return () => {
      cancelled = true;
    };
  }, [regManifestJson, onChainPublisher]);

  async function handleRegisterRelease(e: React.FormEvent) {
    e.preventDefault();
    if (!regCheck) {
      setErrorMessage(regParseError ?? "Paste the signed release manifest to register.");
      return;
    }
    if (regCheck.problems.length > 0) {
      setErrorMessage(`Registration blocked: ${regCheck.problems[0]}`);
      return;
    }
    const prev = with0x(regPreviousReleaseDigest.trim() || ZERO_BYTES32);
    if (!/^0x[0-9a-fA-F]{64}$/.test(prev)) {
      setErrorMessage("Previous release digest must be a 32-byte hex value.");
      return;
    }

    const { manifest, manifestDigest } = regCheck;
    await submitRegistryTx(
      encodeFunctionData({
        abi: REGISTRY_ABI,
        functionName: "registerRelease",
        args: [manifest.productId, manifest.releaseVersion, with0x(manifest.sha256), manifestDigest, prev],
      }),
      {
        submitted: "Transaction submitted",
        confirmed: (block) => `Release registered on Monad Testnet in block #${block}.`,
        failedPrefix: "Registration failed",
      }
    );
  }

  async function handleRevokeRelease(e: React.FormEvent) {
    e.preventDefault();
    if (!/^(0x)?[0-9a-fA-F]{64}$/.test(revokeDigest.trim())) {
      setErrorMessage("Please enter the 32-byte release digest to revoke.");
      return;
    }
    await submitRegistryTx(
      encodeFunctionData({
        abi: REGISTRY_ABI,
        functionName: "revokeRelease",
        args: [with0x(revokeDigest.trim()), revokeReason],
      }),
      {
        submitted: "Revocation submitted",
        confirmed: (block) => `Release revoked on Monad Testnet in block #${block}.`,
        failedPrefix: "Revocation failed",
      }
    );
  }

  async function handleAuthorizePublisher(e: React.FormEvent) {
    e.preventDefault();
    const address = adminPublisherAddress.trim();
    const key = adminPublisherKey.trim().replace(/^0x/, "").toLowerCase();
    if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
      setErrorMessage("Publisher address must be a 20-byte 0x address.");
      return;
    }
    if (!adminPublisherId.trim()) {
      setErrorMessage("Publisher ID is required (e.g. org.example.app).");
      return;
    }
    if (!/^[0-9a-f]{64}$/.test(key)) {
      setErrorMessage("Ed25519 public key must be 64 hex characters (32 bytes).");
      return;
    }
    await submitRegistryTx(
      encodeFunctionData({
        abi: REGISTRY_ABI,
        functionName: "authorizePublisher",
        args: [address as `0x${string}`, adminPublisherId.trim(), `0x${key}`],
      }),
      {
        submitted: "Authorization submitted",
        confirmed: (block) => `Publisher ${adminPublisherId.trim()} authorized in block #${block}.`,
        failedPrefix: "Authorization failed",
      }
    );
  }

  async function handleDeauthorizePublisher() {
    const address = adminPublisherAddress.trim();
    if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
      setErrorMessage("Enter the publisher address to deauthorize.");
      return;
    }
    await submitRegistryTx(
      encodeFunctionData({
        abi: REGISTRY_ABI,
        functionName: "deauthorizePublisher",
        args: [address as `0x${string}`],
      }),
      {
        submitted: "Deauthorization submitted",
        confirmed: (block) => `Publisher ${address} deauthorized in block #${block}.`,
        failedPrefix: "Deauthorization failed",
      }
    );
  }

  async function handleLookupRelease(e: React.FormEvent) {
    e.preventDefault();
    if (!lookupQuery.trim()) {
      setLookupError("Please enter a release digest or file SHA-256 hash.");
      return;
    }

    setIsLookingUp(true);
    setLookupError(null);
    setLookupRecord(null);

    try {
      const cleanInput = lookupQuery.trim().toLowerCase();
      const formatted = (cleanInput.startsWith("0x") ? cleanInput : `0x${cleanInput}`) as `0x${string}`;

      // Exact release digest first. File-hash lookups are always scoped to a publisher,
      // so another publisher registering the same hash can never answer the query.
      let record = await fetchOnChainRelease(formatted);
      if (!record && lookupPublisherId.trim()) {
        record = await fetchOnChainReleaseByFileHash(lookupPublisherId.trim(), formatted);
      }

      if (record) {
        setLookupRecord(record);
      } else {
        setLookupError(
          lookupPublisherId.trim()
            ? "No release record found for this digest, or for this file hash under that publisher."
            : "No release found for this digest. To look up by file SHA-256, also enter the publisher ID."
        );
      }
    } catch (err: any) {
      setLookupError("Registry query error: " + (err.message || String(err)));
    } finally {
      setIsLookingUp(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* 3-Step Numbered Workflow Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-3.5 rounded-lg border border-neutral-200 bg-white space-y-1">
          <div className="font-mono text-[10px] text-neutral-500 font-bold uppercase">
            Step 1
          </div>
          <div className="font-bold text-neutral-950">Author &amp; Sign Manifest</div>
          <p className="text-[11px] text-neutral-600">
            Compute SHA-256 &amp; sign RFC 8785 envelope with local Ed25519 key.
          </p>
        </div>

        <div className="p-3.5 rounded-lg border border-neutral-200 bg-white space-y-1">
          <div className="font-mono text-[10px] text-neutral-500 font-bold uppercase">
            Step 2
          </div>
          <div className="font-bold text-neutral-950">Connect Publisher Wallet</div>
          <p className="text-[11px] text-neutral-600">
            EVM account authorized on Monad Testnet registry contract.
          </p>
        </div>

        <div className="p-3.5 rounded-lg border border-neutral-200 bg-white space-y-1">
          <div className="font-mono text-[10px] text-neutral-500 font-bold uppercase">
            Step 3
          </div>
          <div className="font-bold text-neutral-950">Commit Release On-Chain</div>
          <p className="text-[11px] text-neutral-600">
            Broadcast release digest commitment into PenguinTraceRegistry.
          </p>
        </div>
      </div>

      {/* Credential distinction explainer */}
      <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-xs space-y-2 shadow-sm">
        <div className="font-bold text-neutral-950 flex items-center space-x-2 font-mono uppercase tracking-wider">
          <Info className="w-4 h-4 text-neutral-700" />
          <span>Understanding Publisher Credentials</span>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 text-neutral-600 pt-1">
          <div className="p-3 rounded-lg bg-white border border-neutral-200 space-y-1">
            <span className="font-bold text-neutral-950 block">EVM Wallet Address</span>
            <p className="text-[11px] leading-relaxed">
              Authorizes on-chain transactions on Monad Testnet (<code className="font-mono">registerRelease</code>, <code className="font-mono">revokeRelease</code>). Must be authorized by the registry owner.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-white border border-neutral-200 space-y-1">
            <span className="font-bold text-neutral-950 block">Ed25519 Signing Key</span>
            <p className="text-[11px] leading-relaxed">
              Cryptographically signs the detached RFC 8785 JSON manifest. Verified client-side by downloaders using the Web Crypto and curves API.
            </p>
          </div>
        </div>
      </div>

      {/* Publisher Status Header */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-0.5">
            <span className="text-xs uppercase tracking-wider text-neutral-500 font-mono font-bold">
              Monad Testnet (Chain ID 10143)
            </span>
            <h3 className="text-base font-bold text-neutral-950">
              Publisher Registry Status
            </h3>
          </div>

          <div className="flex items-center space-x-2">
            {walletAddress ? (
              <span className="px-3 py-1 rounded text-xs font-mono font-medium bg-neutral-100 text-neutral-900 border border-neutral-200 flex items-center space-x-2 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={connectWallet}
                className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-neutral-950 text-white hover:bg-neutral-800 transition-colors flex items-center space-x-1.5 shadow-sm"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Connect wallet</span>
              </button>
            )}

            {chainId && chainId !== 10143 && (
              <button
                type="button"
                onClick={switchToMonadTestnet}
                className="px-3 py-1.5 rounded-md text-xs font-medium bg-amber-50 text-amber-950 border border-amber-300 hover:bg-amber-100"
              >
                Switch to Monad (10143)
              </button>
            )}
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-lg bg-neutral-50 border border-neutral-200 space-y-1">
            <div className="text-neutral-500 font-mono text-[10px] uppercase">Connected Wallet:</div>
            <div className="font-mono text-neutral-950 font-bold truncate">
              {walletAddress || "Not connected"}
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-neutral-50 border border-neutral-200 space-y-1">
            <div className="text-neutral-500 font-mono text-[10px] uppercase">Publisher Authorization:</div>
            <div className="font-bold">
              {isCheckingAuth ? (
                <span className="text-neutral-500">Checking...</span>
              ) : isAuthorized === true ? (
                <span className="text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block font-semibold">
                  Authorized Publisher
                </span>
              ) : isAuthorized === false ? (
                <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block font-semibold">
                  Unauthorized Account
                </span>
              ) : (
                <span className="text-neutral-500">Connect to verify</span>
              )}
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-neutral-50 border border-neutral-200 space-y-1">
            <div className="text-neutral-500 font-mono text-[10px] uppercase">Registry Contract:</div>
            <div className="flex items-center justify-between font-mono text-neutral-950 gap-1">
              <span className="truncate font-semibold">{contractAddress.slice(0, 10)}...{contractAddress.slice(-6)}</span>
              <button
                type="button"
                onClick={() => copyText("regAddress", contractAddress)}
                className="text-neutral-400 hover:text-neutral-950 shrink-0 p-0.5"
                title="Copy address"
              >
                {copiedKey === "regAddress" ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Warning if connected account is unauthorized */}
        {walletAddress && isAuthorized === false && (
          <div className="p-4 rounded-lg bg-amber-50 border border-amber-300 text-amber-950 text-xs space-y-1.5 shadow-sm">
            <div className="font-bold flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Wallet Not Authorized on Registry</span>
            </div>
            <p className="text-amber-900 leading-relaxed">
              Connected address (<code className="font-mono bg-amber-100/60 px-1 py-0.5 rounded">{walletAddress}</code>) is not on the authorized publishers list in PenguinTraceRegistry. Calling <code className="font-mono">registerRelease</code> will revert on-chain. Ask the registry admin
              {registryOwner ? (
                <>
                  {" "}(<code className="font-mono">{registryOwner.slice(0, 10)}...</code>)
                </>
              ) : null}{" "}
              to call <code className="font-mono">authorizePublisher</code> from the Admin tab.
            </p>
          </div>
        )}
      </div>

      {/* Action Tabs */}
      <div className="flex space-x-2 border-b border-neutral-200 overflow-x-auto whitespace-nowrap">
        <button
          type="button"
          onClick={() => {
            setActiveTab("manifest");
            setStatusMessage(null);
            setErrorMessage(null);
          }}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all flex items-center space-x-1.5 ${
            activeTab === "manifest"
              ? "bg-neutral-950 text-white shadow-sm"
              : "text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100"
          }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>1. Author &amp; Sign Manifest</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("register");
            setStatusMessage(null);
            setErrorMessage(null);
          }}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all flex items-center space-x-1.5 ${
            activeTab === "register"
              ? "bg-neutral-950 text-white shadow-sm"
              : "text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100"
          }`}
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>2. Commit to Monad</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("revoke");
            setStatusMessage(null);
            setErrorMessage(null);
          }}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all flex items-center space-x-1.5 ${
            activeTab === "revoke"
              ? "bg-neutral-950 text-white shadow-sm"
              : "text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100"
          }`}
        >
          <AlertOctagon className="w-3.5 h-3.5" />
          <span>Revoke Release</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("lookup");
            setStatusMessage(null);
            setErrorMessage(null);
          }}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all flex items-center space-x-1.5 ${
            activeTab === "lookup"
              ? "bg-neutral-950 text-white shadow-sm"
              : "text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100"
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Registry Lookup</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("admin");
            setStatusMessage(null);
            setErrorMessage(null);
          }}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all flex items-center space-x-1.5 ${
            activeTab === "admin"
              ? "bg-neutral-950 text-white shadow-sm"
              : "text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100"
          }`}
        >
          <UserCog className="w-3.5 h-3.5" />
          <span>Admin</span>
        </button>
      </div>

      {/* Tab 1: Author & Sign Manifest */}
      {activeTab === "manifest" && (
        <form onSubmit={handleGenerateAndSignManifest} className="rounded-xl border border-neutral-200 bg-white p-6 space-y-4 shadow-sm animate-in fade-in duration-200">
          <div className="space-y-1">
            <h4 className="text-xs font-mono font-bold text-neutral-950 uppercase tracking-wider">
              Author and Sign Release Manifest
            </h4>
            <p className="text-xs text-neutral-500">
              Signs metadata according to RFC 8785 JSON Canonicalization Scheme using your local Ed25519 private key in memory. Private keys never leave your browser.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="text-neutral-700 font-medium block mb-1">Publisher ID:</label>
              <input
                type="text"
                value={manifestGenPublisherId}
                onChange={(e) => setManifestGenPublisherId(e.target.value)}
                className="w-full rounded-md bg-white border border-neutral-200 px-3 py-1.5 font-mono text-neutral-950 focus:outline-none focus:border-neutral-950"
              />
            </div>
            <div>
              <label className="text-neutral-700 font-medium block mb-1">Product ID:</label>
              <input
                type="text"
                value={manifestGenProductId}
                onChange={(e) => setManifestGenProductId(e.target.value)}
                className="w-full rounded-md bg-white border border-neutral-200 px-3 py-1.5 font-mono text-neutral-950 focus:outline-none focus:border-neutral-950"
              />
            </div>
            <div>
              <label className="text-neutral-700 font-medium block mb-1">Version:</label>
              <input
                type="text"
                value={manifestGenVersion}
                onChange={(e) => setManifestGenVersion(e.target.value)}
                className="w-full rounded-md bg-white border border-neutral-200 px-3 py-1.5 font-mono text-neutral-950 focus:outline-none focus:border-neutral-950"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-neutral-700 font-medium block mb-1">Target artifact file:</label>
              <input
                type="file"
                onChange={handleFileSelectedForManifest}
                disabled={isHashingFile}
                className="w-full text-xs text-neutral-600 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border file:border-neutral-300 file:text-xs file:bg-white file:text-neutral-900 hover:file:bg-neutral-50 cursor-pointer"
              />
              {isHashingFile && (
                <div className="mt-1.5 text-[11px] font-mono text-neutral-600">
                  Hashing locally... {Math.floor(hashProgress * 100)}%
                </div>
              )}
            </div>
            <div>
              <label className="text-neutral-700 font-medium block mb-1">Publisher Key ID:</label>
              <input
                type="text"
                value={manifestGenKeyId}
                onChange={(e) => setManifestGenKeyId(e.target.value)}
                className="w-full rounded-md bg-white border border-neutral-200 px-3 py-1.5 font-mono text-neutral-950 focus:outline-none focus:border-neutral-950"
              />
            </div>
          </div>

          <div className="text-xs">
            <label className="text-neutral-700 font-medium block mb-1">
              Ed25519 Private Key Hex (32 bytes / 64 hex chars):
            </label>
            <input
              type="password"
              placeholder="e.g. 9d61b19deffd5... (stored in local browser memory only)"
              value={manifestGenPrivateKeyHex}
              onChange={(e) => setManifestGenPrivateKeyHex(e.target.value)}
              className="w-full rounded-md bg-white border border-neutral-200 px-3 py-1.5 font-mono text-neutral-950 focus:outline-none focus:border-neutral-950"
            />
          </div>

          <div className="flex items-center space-x-3 pt-2">
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-neutral-950 text-white hover:bg-neutral-800 font-semibold text-xs transition-all shadow-sm"
            >
              Sign manifest locally
            </button>

            {manifestGenSignedJson && (
              <button
                type="button"
                onClick={handleTransferToRegistration}
                className="px-4 py-2 rounded-lg bg-white text-neutral-950 border border-neutral-300 hover:bg-neutral-50 font-semibold text-xs transition-all"
              >
                Use for on-chain registration &rarr;
              </button>
            )}
          </div>

          {manifestSignSuccess && (
            <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{manifestSignSuccess}</span>
            </div>
          )}

          {manifestSignError && (
            <div className="p-3.5 rounded-lg bg-red-50 border border-red-300 text-red-950 text-xs flex items-center space-x-2">
              <X className="w-4 h-4 text-red-700 shrink-0" />
              <span>{manifestSignError}</span>
            </div>
          )}

          {manifestGenSignedJson && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-neutral-950">Signed Manifest JSON:</span>
                <button
                  type="button"
                  onClick={() => copyText("signedManifest", manifestGenSignedJson)}
                  className="text-neutral-600 hover:text-neutral-950 flex items-center space-x-1"
                >
                  {copiedKey === "signedManifest" ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy JSON</span>
                </button>
              </div>
              <textarea
                readOnly
                rows={6}
                value={manifestGenSignedJson}
                className="w-full rounded-md bg-neutral-50 border border-neutral-200 p-2.5 font-mono text-[11px] text-neutral-900 resize-none"
              />
            </div>
          )}
        </form>
      )}

      {/* Tab 2: Commit Release to Registry */}
      {activeTab === "register" && (
        <form onSubmit={handleRegisterRelease} className="rounded-xl border border-neutral-200 bg-white p-6 space-y-4 shadow-sm animate-in fade-in duration-200">
          <div className="space-y-1">
            <h4 className="text-xs font-mono font-bold text-neutral-950 uppercase tracking-wider">
              Commit Release to Monad Testnet Registry
            </h4>
            <p className="text-xs text-neutral-500">
              Broadcasts an immutable release commitment storing file hash, manifest digest, and predecessor link.
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-neutral-700 font-medium block mb-1">Signed release manifest JSON:</label>
              <textarea
                rows={6}
                value={regManifestJson}
                onChange={(e) => setRegManifestJson(e.target.value)}
                placeholder="Paste the signed manifest, or sign one in step 1 and transfer it here."
                className="w-full rounded-md bg-white border border-neutral-200 p-2.5 font-mono text-[11px] text-neutral-900 focus:outline-none focus:border-neutral-950 resize-none"
              />
              <p className="text-[11px] text-neutral-500 mt-1">
                The product, version, file hash and manifest digest are taken from this manifest. Its signature is checked
                against your on-chain Ed25519 key before anything is sent.
              </p>
            </div>

            <div>
              <label className="text-neutral-700 font-medium block mb-1">Previous Release Digest (Optional, for supersession):</label>
              <input
                type="text"
                value={regPreviousReleaseDigest}
                onChange={(e) => setRegPreviousReleaseDigest(e.target.value)}
                className="w-full rounded-md bg-white border border-neutral-200 px-3 py-1.5 font-mono text-neutral-950 focus:outline-none focus:border-neutral-950"
              />
            </div>
          </div>

          {regParseError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-300 text-red-950 text-xs">{regParseError}</div>
          )}

          {regCheck && (
            <div className="rounded-lg border border-neutral-200 text-xs divide-y divide-neutral-100">
              {[
                ["Publisher ID (on-chain)", onChainPublisher?.publisherId ?? "— wallet not registered —"],
                ["Product", regCheck.manifest.productId],
                ["Version", regCheck.manifest.releaseVersion],
                ["File SHA-256", with0x(regCheck.manifest.sha256)],
                ["Manifest digest", regCheck.manifestDigest],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3 px-3 py-2">
                  <span className="text-neutral-500 shrink-0">{label}</span>
                  <span className="font-mono text-neutral-950 truncate">{value}</span>
                </div>
              ))}
              <div className="px-3 py-2">
                {regCheck.problems.length === 0 ? (
                  <span className="inline-flex items-center space-x-1.5 text-emerald-800 font-semibold">
                    <Check className="w-3.5 h-3.5" />
                    <span>Signature verified against your registered Ed25519 key</span>
                  </span>
                ) : (
                  <ul className="space-y-1 text-red-800">
                    {regCheck.problems.map((p) => (
                      <li key={p} className="flex items-start space-x-1.5">
                        <X className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* High-Contrast Computed Preview Digest Box */}
          <div className="p-4 rounded-xl bg-neutral-950 text-white border border-neutral-800 space-y-1.5 text-xs shadow-sm">
            <div className="text-neutral-400 flex items-center justify-between font-mono text-[11px]">
              <span>Deterministic Release Digest (keccak256):</span>
              <span className="text-neutral-400">
                {onChainPublisher ? "Uses on-chain publisherId" : "Preview (wallet not registered)"}
              </span>
            </div>
            <div className="font-mono text-emerald-400 break-all text-xs font-semibold">
              {regCheck?.releaseDigest ?? "—"}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !regCheck || regCheck.problems.length > 0}
              className="px-6 py-2.5 rounded-lg bg-neutral-950 text-white hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 font-semibold text-xs transition-all shadow-sm flex items-center space-x-2"
            >
              <span>{isSubmitting ? "Broadcasting..." : "Commit release to Monad"}</span>
            </button>

            {confirmedTxHash && (
              <a
                href={`https://testnet.monadscan.com/tx/${confirmedTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-neutral-950 hover:underline inline-flex items-center space-x-1 font-semibold"
              >
                <span>View on MonadScan</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </form>
      )}

      {/* Tab 3: Revoke Release */}
      {activeTab === "revoke" && (
        <form onSubmit={handleRevokeRelease} className="rounded-xl border border-neutral-200 bg-white p-6 space-y-4 shadow-sm animate-in fade-in duration-200">
          <div className="space-y-1">
            <h4 className="text-xs font-mono font-bold text-neutral-950 uppercase tracking-wider">
              Revoke Compromised Release
            </h4>
            <p className="text-xs text-neutral-500">
              Permanently marks a release commitment as REVOKED on Monad Testnet.
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-neutral-700 font-medium block mb-1">Release Digest to Revoke (bytes32):</label>
              <input
                type="text"
                placeholder="0x..."
                value={revokeDigest}
                onChange={(e) => setRevokeDigest(e.target.value)}
                className="w-full rounded-md bg-white border border-neutral-200 px-3 py-1.5 font-mono text-neutral-950 focus:outline-none focus:border-neutral-950"
              />
            </div>

            <div>
              <label className="text-neutral-700 font-medium block mb-1">Revocation Reason:</label>
              <input
                type="text"
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                className="w-full rounded-md bg-white border border-neutral-200 px-3 py-1.5 text-neutral-950 focus:outline-none focus:border-neutral-950"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:bg-neutral-200 disabled:text-neutral-400 font-semibold text-xs transition-all shadow-sm"
            >
              <span>{isSubmitting ? "Revoking..." : "Revoke release on Monad"}</span>
            </button>

            {confirmedTxHash && (
              <a
                href={`https://testnet.monadscan.com/tx/${confirmedTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-neutral-950 hover:underline inline-flex items-center space-x-1 font-semibold"
              >
                <span>View on MonadScan</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </form>
      )}

      {/* Tab 4: Lookup */}
      {activeTab === "lookup" && (
        <form onSubmit={handleLookupRelease} className="rounded-xl border border-neutral-200 bg-white p-6 space-y-4 shadow-sm animate-in fade-in duration-200">
          <div className="space-y-1">
            <h4 className="text-xs font-mono font-bold text-neutral-950 uppercase tracking-wider">
              Query Registry by Release Digest or Publisher + File Hash
            </h4>
            <p className="text-xs text-neutral-500">
              Query live commitments recorded on Monad Testnet (<code className="font-mono">{contractAddress.slice(0, 8)}...</code>).
              File-hash lookups require the publisher ID.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="Publisher ID (only for file-hash lookup)"
              value={lookupPublisherId}
              onChange={(e) => setLookupPublisherId(e.target.value)}
              className="sm:w-56 rounded-md bg-white border border-neutral-200 px-3 py-2 font-mono text-xs text-neutral-950 focus:outline-none focus:border-neutral-950"
            />
            <input
              type="text"
              placeholder="0x... release digest or file SHA-256"
              value={lookupQuery}
              onChange={(e) => setLookupQuery(e.target.value)}
              className="flex-1 rounded-md bg-white border border-neutral-200 px-3 py-2 font-mono text-xs text-neutral-950 focus:outline-none focus:border-neutral-950"
            />
            <button
              type="submit"
              disabled={isLookingUp}
              className="px-5 py-2 rounded-lg bg-neutral-950 text-white hover:bg-neutral-800 disabled:bg-neutral-200 font-semibold text-xs transition-all shadow-sm"
            >
              {isLookingUp ? "Searching..." : "Lookup"}
            </button>
          </div>

          {lookupError && (
            <div className="p-3.5 rounded-lg bg-neutral-100 border border-neutral-200 text-neutral-700 text-xs flex items-center space-x-2">
              <Info className="w-4 h-4 text-neutral-600 shrink-0" />
              <span>{lookupError}</span>
            </div>
          )}

          {lookupRecord && (
            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2 text-xs font-mono shadow-sm">
              <div className="flex justify-between items-center font-sans font-bold">
                <span className="text-neutral-950">Release Record Found</span>
                <span className="px-2.5 py-0.5 rounded text-[10px] bg-neutral-950 text-white font-mono">
                  {lookupRecord.status}
                </span>
              </div>
              <div className="text-neutral-700 truncate">Digest: {lookupRecord.releaseDigest}</div>
              <div className="text-neutral-700 truncate">File Hash: {lookupRecord.fileHash}</div>
              <div className="text-neutral-700 truncate">Publisher: {lookupRecord.publisherId}</div>
              <div className="text-neutral-700">Product: {lookupRecord.productId} v{lookupRecord.releaseVersion}</div>
            </div>
          )}
        </form>
      )}

      {/* Tab 5: Registry Admin */}
      {activeTab === "admin" && (
        <form onSubmit={handleAuthorizePublisher} className="rounded-xl border border-neutral-200 bg-white p-6 space-y-4 shadow-sm animate-in fade-in duration-200">
          <div className="space-y-1">
            <h4 className="text-xs font-mono font-bold text-neutral-950 uppercase tracking-wider">
              Authorize or Deauthorize Publishers
            </h4>
            <p className="text-xs text-neutral-500">
              Only the registry admin{" "}
              {registryOwner ? <code className="font-mono">({registryOwner.slice(0, 10)}...)</code> : null} can bind a
              publisher account to a publisher ID and Ed25519 signing key. A publisher ID cannot be changed once set.
            </p>
          </div>

          {!isRegistryAdmin && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-300 text-amber-950 text-xs">
              {walletAddress
                ? "The connected wallet is not the registry admin. These transactions would revert."
                : "Connect the registry admin wallet to use this tab."}
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-neutral-700 font-medium block mb-1">Publisher account address:</label>
              <input
                type="text"
                placeholder="0x..."
                value={adminPublisherAddress}
                onChange={(e) => setAdminPublisherAddress(e.target.value)}
                className="w-full rounded-md bg-white border border-neutral-200 px-3 py-1.5 font-mono text-neutral-950 focus:outline-none focus:border-neutral-950"
              />
            </div>
            <div>
              <label className="text-neutral-700 font-medium block mb-1">Publisher ID:</label>
              <input
                type="text"
                placeholder="org.example.app"
                value={adminPublisherId}
                onChange={(e) => setAdminPublisherId(e.target.value)}
                className="w-full rounded-md bg-white border border-neutral-200 px-3 py-1.5 font-mono text-neutral-950 focus:outline-none focus:border-neutral-950"
              />
            </div>
          </div>
          <div className="text-xs">
            <label className="text-neutral-700 font-medium block mb-1">Ed25519 public key (32-byte hex):</label>
            <input
              type="text"
              placeholder="64 hex characters"
              value={adminPublisherKey}
              onChange={(e) => setAdminPublisherKey(e.target.value)}
              className="w-full rounded-md bg-white border border-neutral-200 px-3 py-1.5 font-mono text-neutral-950 focus:outline-none focus:border-neutral-950"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !isRegistryAdmin}
              className="px-5 py-2.5 rounded-lg bg-neutral-950 text-white hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 font-semibold text-xs transition-all shadow-sm"
            >
              {isSubmitting ? "Broadcasting..." : "Authorize publisher"}
            </button>
            <button
              type="button"
              onClick={handleDeauthorizePublisher}
              disabled={isSubmitting || !isRegistryAdmin}
              className="px-5 py-2.5 rounded-lg bg-white text-red-700 border border-red-300 hover:bg-red-50 disabled:bg-neutral-100 disabled:text-neutral-400 disabled:border-neutral-200 font-semibold text-xs transition-all"
            >
              Deauthorize address
            </button>
          </div>
        </form>
      )}

      {/* Status Messages */}
      {statusMessage && (
        <div className="p-4 rounded-xl bg-neutral-100 border border-neutral-300 text-neutral-900 text-xs flex items-center space-x-2.5 shadow-sm">
          <Info className="w-4 h-4 text-neutral-700 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-300 text-red-950 text-xs flex items-center space-x-2.5 shadow-sm">
          <X className="w-4 h-4 text-red-700 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
