"use client";

import React, { useState, useEffect } from "react";
import {
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  PlusCircle,
  AlertOctagon,
  ExternalLink,
  CheckCircle2,
  RefreshCw,
  Info,
  Wallet,
  AlertTriangle,
  Search,
  FileCheck2,
  FileCode,
  Download,
  Copy,
  Upload,
  ArrowRight,
} from "lucide-react";
import { createWalletClient, custom } from "viem";
import { monadTestnet, monadPublicClient } from "@/lib/chain/monad";
import {
  calculateReleaseDigest,
  getRegistryAddress,
  checkPublisherAuthorization,
  fetchOnChainRelease,
  fetchOnChainReleaseByFileHash,
  SWARMTRACE_REGISTRY_ABI,
} from "@/lib/chain/contract";
import { sha256Bytes } from "@/lib/crypto/hashing";
import { createSignedManifest, computeManifestDigest } from "@/lib/manifests/manifest";
import type { ReleaseRecord, ReleaseManifestPayload } from "@/lib/verification/types";

export function PublisherPortal() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(false);

  // Tabs: register, revoke, lookup, manifest
  const [activeTab, setActiveTab] = useState<"register" | "revoke" | "lookup" | "manifest">("register");

  // Registration form
  const [regPublisherId, setRegPublisherId] = useState<string>("org.swarmtrace.core");
  const [regProductId, setRegProductId] = useState<string>("swarmtrace-daemon");
  const [regVersion, setRegVersion] = useState<string>("1.0.0");
  const [regFileHash, setRegFileHash] = useState<string>(
    "0x4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a"
  );
  const [regManifestDigest, setRegManifestDigest] = useState<string>(
    "0x8fae8f81a70295da9be68d90faea2050b44cb72e73708bb04cf93f415c138d61"
  );
  const [regPreviousReleaseDigest, setRegPreviousReleaseDigest] = useState<string>(
    "0x0000000000000000000000000000000000000000000000000000000000000000"
  );

  // Revocation form
  const [revokeDigest, setRevokeDigest] = useState<string>("");
  const [revokeReason, setRevokeReason] = useState<string>(
    "Security vulnerability CVE-2026-8812 discovered in dependency payload"
  );

  // Lookup form
  const [lookupQuery, setLookupQuery] = useState<string>("");
  const [isLookingUp, setIsLookingUp] = useState<boolean>(false);
  const [lookupRecord, setLookupRecord] = useState<ReleaseRecord | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Manifest Authoring State
  const [manifestGenPublisherId, setManifestGenPublisherId] = useState<string>("pub-sentinel-core");
  const [manifestGenProductId, setManifestGenProductId] = useState<string>("sentinel-agent-linux");
  const [manifestGenVersion, setManifestGenVersion] = useState<string>("2.4.0");
  const [manifestGenFileName, setManifestGenFileName] = useState<string>("sentinel-agent-v2.4.0.tar.gz");
  const [manifestGenFileSize, setManifestGenFileSize] = useState<number>(1048576);
  const [manifestGenSha256, setManifestGenSha256] = useState<string>(
    "4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a"
  );
  const [manifestGenKeyId, setManifestGenKeyId] = useState<string>("key-2026-core");
  const [manifestGenPrivateKeyHex, setManifestGenPrivateKeyHex] = useState<string>("");
  const [manifestGenSignedJson, setManifestGenSignedJson] = useState<string>("");
  const [manifestGenDigest, setManifestGenDigest] = useState<string>("");
  const [isHashingFile, setIsHashingFile] = useState<boolean>(false);
  const [manifestSignError, setManifestSignError] = useState<string | null>(null);
  const [manifestSignSuccess, setManifestSignSuccess] = useState<string | null>(null);

  async function handleFileSelectedForManifest(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsHashingFile(true);
    setManifestSignError(null);
    try {
      const buffer = await file.arrayBuffer();
      const hash = await sha256Bytes(new Uint8Array(buffer));
      setManifestGenFileName(file.name);
      setManifestGenFileSize(file.size);
      setManifestGenSha256(hash);
      setManifestSignSuccess(`Hashed local file "${file.name}" (${file.size} bytes) via Web Crypto SHA-256.`);
    } catch (err: any) {
      setManifestSignError("Failed to hash selected file: " + (err.message || String(err)));
    } finally {
      setIsHashingFile(false);
    }
  }

  async function handleLoadKeyFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setManifestSignError(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (parsed.privateKeyHex) {
        setManifestGenPrivateKeyHex(parsed.privateKeyHex);
        setManifestSignSuccess(`Private key loaded safely into browser memory from "${file.name}".`);
      } else {
        setManifestSignError("Selected JSON file does not contain a 'privateKeyHex' field.");
      }
    } catch (err: any) {
      setManifestSignError("Failed to read key file: " + (err.message || String(err)));
    }
  }

  async function handleGenerateAndSignManifest(e: React.FormEvent) {
    e.preventDefault();
    setManifestSignError(null);
    setManifestSignSuccess(null);

    if (!manifestGenPrivateKeyHex.trim()) {
      setManifestSignError("Please enter or load your Ed25519 private key for local signing.");
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
    setRegPublisherId(manifestGenPublisherId);
    setRegProductId(manifestGenProductId);
    setRegVersion(manifestGenVersion);
    setRegFileHash(
      (manifestGenSha256.startsWith("0x") ? manifestGenSha256 : `0x${manifestGenSha256}`) as `0x${string}`
    );
    if (manifestGenDigest) {
      setRegManifestDigest(manifestGenDigest);
    }
    setActiveTab("register");
    setStatusMessage("Manifest data transferred to Release Registration form. You can now commit the release on Monad Testnet.");
  }

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

  // Check wallet connection on mount
  useEffect(() => {
    async function checkWallet() {
      if (typeof window !== "undefined" && (window as any).ethereum) {
        try {
          const ethereum = (window as any).ethereum;
          const accounts = await ethereum.request({ method: "eth_accounts" });
          if (accounts && accounts.length > 0) {
            setWalletAddress(accounts[0]);
          }
          const currentChainId = await ethereum.request({ method: "eth_chainId" });
          setChainId(parseInt(currentChainId, 16));
        } catch {
          // Silent fallback
        }
      }
    }
    checkWallet();
  }, []);

  // Check publisher authorization if wallet & contract configured
  useEffect(() => {
    async function checkAuth() {
      if (walletAddress && isContractConfigured) {
        setIsCheckingAuth(true);
        try {
          const authorized = await checkPublisherAuthorization(walletAddress as `0x${string}`);
          setIsAuthorized(authorized);
        } catch {
          setIsAuthorized(false);
        } finally {
          setIsCheckingAuth(false);
        }
      } else {
        setIsAuthorized(null);
      }
    }
    checkAuth();
  }, [walletAddress, isContractConfigured]);

  async function connectWallet() {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      setErrorMessage("No Web3 wallet extension detected in this browser.");
      return;
    }
    try {
      const ethereum = (window as any).ethereum;
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

  async function switchToMonadTestnet() {
    if (typeof window === "undefined" || !(window as any).ethereum) return;
    const ethereum = (window as any).ethereum;
    try {
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x279f" }], // 10143
      });
      setChainId(10143);
      setStatusMessage("Switched to Monad Testnet (Chain ID 10143).");
      setErrorMessage(null);
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
          setChainId(10143);
        } catch (addError: any) {
          setErrorMessage("Failed to add Monad Testnet: " + addError.message);
        }
      } else if (switchError.code === 4001) {
        setErrorMessage("Network switch rejected by user.");
      } else {
        setErrorMessage("Network switch error: " + switchError.message);
      }
    }
  }

  // Deterministic preview digest matching ISwarmTraceRegistry.sol
  const computedPreviewDigest = calculateReleaseDigest(
    regPublisherId,
    regProductId,
    regVersion,
    (regFileHash.startsWith("0x") ? regFileHash : `0x${regFileHash}`) as `0x${string}`,
    (regManifestDigest.startsWith("0x") ? regManifestDigest : `0x${regManifestDigest}`) as `0x${string}`
  );

  async function handleRegisterRelease(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMessage(null);
    setErrorMessage(null);
    setConfirmedTxHash(null);
    setConfirmedBlock(null);

    try {
      if (!isContractConfigured) {
        setErrorMessage(
          "SwarmTraceRegistry contract address is not configured (NEXT_PUBLIC_SWARMTRACE_REGISTRY_ADDRESS is unset or 0x0). Real on-chain registration requires a deployed registry contract."
        );
        setIsSubmitting(false);
        return;
      }

      if (!walletAddress || typeof window === "undefined" || !(window as any).ethereum) {
        setErrorMessage("Please connect a Web3 wallet to broadcast on Monad Testnet.");
        setIsSubmitting(false);
        return;
      }

      if (chainId !== 10143) {
        await switchToMonadTestnet();
      }

      // Pre-flight authorization check
      if (isAuthorized === false) {
        setErrorMessage(
          `Unauthorized caller: Address ${walletAddress} is not registered as an authorized publisher in SwarmTraceRegistry. Transaction would revert on-chain with NotAuthorizedPublisher.`
        );
        setIsSubmitting(false);
        return;
      }

      setTxPhase("awaiting_wallet");
      setStatusMessage("Awaiting transaction confirmation in wallet...");

      const client = createWalletClient({
        chain: monadTestnet,
        transport: custom((window as any).ethereum),
      });

      const normFileHash = (regFileHash.startsWith("0x") ? regFileHash : `0x${regFileHash}`) as `0x${string}`;
      const normManifestDigest = (regManifestDigest.startsWith("0x") ? regManifestDigest : `0x${regManifestDigest}`) as `0x${string}`;
      const normPrevDigest = (regPreviousReleaseDigest.startsWith("0x")
        ? regPreviousReleaseDigest
        : `0x${regPreviousReleaseDigest}`) as `0x${string}`;

      const hash = await client.writeContract({
        address: contractAddress,
        abi: SWARMTRACE_REGISTRY_ABI,
        functionName: "registerRelease",
        args: [
          regProductId,
          regVersion,
          normFileHash,
          normManifestDigest,
          normPrevDigest,
        ],
        account: walletAddress as `0x${string}`,
      });

      setConfirmedTxHash(hash);
      setTxPhase("confirming");
      setStatusMessage(`Transaction submitted: ${hash}. Awaiting confirmation on Monad Testnet...`);

      // Wait for genuine on-chain receipt
      const receipt = await monadPublicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === "success") {
        setTxPhase("confirmed");
        setConfirmedBlock(receipt.blockNumber);
        setStatusMessage(
          `Release successfully registered on Monad Testnet in block #${receipt.blockNumber}!`
        );
      } else {
        setTxPhase("reverted");
        setErrorMessage(
          `Transaction reverted on-chain in block #${receipt.blockNumber}. Check if release already exists or caller is unauthorized.`
        );
      }
    } catch (err: any) {
      setTxPhase("error");
      if (err.code === 4001 || err.message?.includes("User rejected")) {
        setErrorMessage("Transaction was cancelled by user in wallet.");
      } else {
        setErrorMessage("Registration failed: " + (err.shortMessage || err.message));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRevokeRelease(e: React.FormEvent) {
    e.preventDefault();
    if (!revokeDigest.trim()) {
      setErrorMessage("Please enter the release digest to revoke.");
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);
    setErrorMessage(null);
    setConfirmedTxHash(null);
    setConfirmedBlock(null);

    try {
      if (!isContractConfigured) {
        setErrorMessage(
          "SwarmTraceRegistry contract address is not configured. Real on-chain revocation requires a deployed contract."
        );
        setIsSubmitting(false);
        return;
      }

      if (!walletAddress || typeof window === "undefined" || !(window as any).ethereum) {
        setErrorMessage("Please connect a Web3 wallet to broadcast on Monad Testnet.");
        setIsSubmitting(false);
        return;
      }

      if (chainId !== 10143) {
        await switchToMonadTestnet();
      }

      setTxPhase("awaiting_wallet");
      setStatusMessage("Awaiting transaction confirmation in wallet...");

      const client = createWalletClient({
        chain: monadTestnet,
        transport: custom((window as any).ethereum),
      });

      const normRevokeDigest = (revokeDigest.startsWith("0x") ? revokeDigest : `0x${revokeDigest}`) as `0x${string}`;

      const hash = await client.writeContract({
        address: contractAddress,
        abi: SWARMTRACE_REGISTRY_ABI,
        functionName: "revokeRelease",
        args: [normRevokeDigest, revokeReason],
        account: walletAddress as `0x${string}`,
      });

      setConfirmedTxHash(hash);
      setTxPhase("confirming");
      setStatusMessage(`Revocation submitted: ${hash}. Awaiting confirmation on Monad Testnet...`);

      const receipt = await monadPublicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === "success") {
        setTxPhase("confirmed");
        setConfirmedBlock(receipt.blockNumber);
        setStatusMessage(
          `Release successfully revoked on Monad Testnet in block #${receipt.blockNumber}!`
        );
      } else {
        setTxPhase("reverted");
        setErrorMessage(
          `Revocation transaction reverted on-chain. Caller must be the registering publisher or contract owner.`
        );
      }
    } catch (err: any) {
      setTxPhase("error");
      if (err.code === 4001 || err.message?.includes("User rejected")) {
        setErrorMessage("Revocation transaction was cancelled by user in wallet.");
      } else {
        setErrorMessage("Revocation failed: " + (err.shortMessage || err.message));
      }
    } finally {
      setIsSubmitting(false);
    }
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

      // Try by file hash first
      let record = await fetchOnChainReleaseByFileHash(formatted);
      if (!record) {
        // Try by release digest
        record = await fetchOnChainRelease(formatted);
      }

      if (record) {
        setLookupRecord(record);
      } else {
        setLookupError("No release record found in SwarmTraceRegistry for this query.");
      }
    } catch (err: any) {
      setLookupError("Registry query error: " + (err.message || String(err)));
    } finally {
      setIsLookingUp(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Publisher Status Header */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold font-mono">
              Monad Testnet Registry (Chain ID 10143)
            </span>
            <h3 className="text-xl font-bold text-white flex items-center space-x-2">
              <KeyRound className="w-5 h-5 text-cyan-400" />
              <span>Publisher Portal & Release Governance</span>
            </h3>
          </div>

          <div className="flex items-center space-x-3">
            {walletAddress ? (
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>CONNECTED: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={connectWallet}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-600 hover:bg-cyan-500 text-white flex items-center space-x-1.5 transition-colors"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Connect Wallet</span>
              </button>
            )}

            {chainId && chainId !== 10143 && (
              <button
                type="button"
                onClick={switchToMonadTestnet}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-950 text-amber-300 border border-amber-800 flex items-center space-x-1"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Switch to Monad (10143)</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 pt-2 text-xs font-mono">
          <div className="p-3 rounded-xl bg-gray-950 border border-gray-800 space-y-1">
            <div className="text-gray-400 font-sans">Active Wallet Address:</div>
            <div className="text-cyan-300 truncate">
              {walletAddress || "Not connected"}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-gray-950 border border-gray-800 space-y-1">
            <div className="text-gray-400 font-sans">Publisher Authorization:</div>
            <div className="font-semibold">
              {isCheckingAuth ? (
                <span className="text-gray-400">Verifying on-chain...</span>
              ) : isAuthorized === true ? (
                <span className="text-emerald-400">AUTHORIZED PUBLISHER</span>
              ) : isAuthorized === false ? (
                <span className="text-rose-400">UNAUTHORIZED ACCOUNT</span>
              ) : (
                <span className="text-gray-500">Connect wallet to verify</span>
              )}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-gray-950 border border-gray-800 space-y-1">
            <div className="text-gray-400 font-sans">SwarmTrace Registry Address:</div>
            <div className="text-purple-300 truncate">
              {isContractConfigured ? contractAddress : "Unset (Awaiting Deployed Address)"}
            </div>
          </div>
        </div>

        {/* Warning if connected account is unauthorized */}
        {walletAddress && isAuthorized === false && (
          <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>
              Authorization Notice: Connected address ({walletAddress.slice(0, 10)}...) is not registered as an authorized publisher in SwarmTraceRegistry. Only authorized publisher addresses can commit releases or revoke records.
            </span>
          </div>
        )}
      </div>

      {/* Action Tabs */}
      <div className="flex space-x-2 border-b border-gray-800">
        <button
          type="button"
          onClick={() => {
            setActiveTab("register");
            setStatusMessage(null);
            setErrorMessage(null);
          }}
          className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors flex items-center space-x-2 ${
            activeTab === "register"
              ? "bg-gray-900 text-cyan-400 border-t border-x border-gray-800"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          <span>Register New Release</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("revoke");
            setStatusMessage(null);
            setErrorMessage(null);
          }}
          className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors flex items-center space-x-2 ${
            activeTab === "revoke"
              ? "bg-gray-900 text-rose-400 border-t border-x border-gray-800"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          <AlertOctagon className="w-4 h-4" />
          <span>Revoke Compromised Release</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("lookup");
            setStatusMessage(null);
            setErrorMessage(null);
          }}
          className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors flex items-center space-x-2 ${
            activeTab === "lookup"
              ? "bg-gray-900 text-purple-400 border-t border-x border-gray-800"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Registry Release Lookup</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("manifest");
            setStatusMessage(null);
            setErrorMessage(null);
          }}
          className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors flex items-center space-x-2 ${
            activeTab === "manifest"
              ? "bg-gray-900 text-emerald-400 border-t border-x border-gray-800"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          <FileCode className="w-4 h-4" />
          <span>Author & Sign Manifest</span>
        </button>
      </div>

      {/* Tab 1: Register Release */}
      {activeTab === "register" && (
        <form
          onSubmit={handleRegisterRelease}
          className="rounded-2xl border border-gray-800 bg-gray-900/30 p-6 space-y-5"
        >
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-white">
              Commit Release to Monad Testnet Registry
            </h4>
            <p className="text-xs text-gray-400">
              Broadcast an immutable release commitment. Stores minimal cryptographic hashes on-chain.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-medium">Publisher ID</label>
              <input
                type="text"
                value={regPublisherId}
                onChange={(e) => setRegPublisherId(e.target.value)}
                className="w-full rounded-lg bg-gray-950 border border-gray-800 px-3 py-2 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-medium">Product ID</label>
              <input
                type="text"
                value={regProductId}
                onChange={(e) => setRegProductId(e.target.value)}
                className="w-full rounded-lg bg-gray-950 border border-gray-800 px-3 py-2 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-medium">Release Version</label>
              <input
                type="text"
                value={regVersion}
                onChange={(e) => setRegVersion(e.target.value)}
                className="w-full rounded-lg bg-gray-950 border border-gray-800 px-3 py-2 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-medium">
                File SHA-256 Digest (bytes32):
              </label>
              <input
                type="text"
                value={regFileHash}
                onChange={(e) => setRegFileHash(e.target.value)}
                className="w-full rounded-lg bg-gray-950 border border-gray-800 px-3 py-2 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-medium">
                RFC 8785 Manifest Digest (bytes32):
              </label>
              <input
                type="text"
                value={regManifestDigest}
                onChange={(e) => setRegManifestDigest(e.target.value)}
                className="w-full rounded-lg bg-gray-950 border border-gray-800 px-3 py-2 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-medium">
                Previous Release Digest (Optional, for supersession):
              </label>
              <input
                type="text"
                value={regPreviousReleaseDigest}
                onChange={(e) => setRegPreviousReleaseDigest(e.target.value)}
                placeholder="0x000... or previous version release digest"
                className="w-full rounded-lg bg-gray-950 border border-gray-800 px-3 py-2 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Computed Preview Digest */}
          <div className="p-3 rounded-xl bg-gray-950 border border-gray-800 space-y-1 text-xs">
            <div className="text-gray-400 flex items-center justify-between">
              <span>Deterministic Release Digest (keccak256):</span>
              <span className="text-[10px] text-cyan-400 font-mono">Monad State Key</span>
            </div>
            <div className="font-mono text-cyan-300 break-all">{computedPreviewDigest}</div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="submit"
              disabled={isSubmitting || isAuthorized === false}
              className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs transition-all shadow-md shadow-cyan-950 flex items-center space-x-2 disabled:cursor-not-allowed disabled:bg-gray-800"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>
                    {txPhase === "awaiting_wallet"
                      ? "Awaiting Signature..."
                      : txPhase === "confirming"
                      ? "Confirming on Monad..."
                      : "Processing..."}
                  </span>
                </>
              ) : (
                <>
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Commit Release to Registry</span>
                </>
              )}
            </button>

            {confirmedTxHash && (
              <span className="text-[10px] font-mono text-gray-400 flex items-center space-x-1">
                <span className="text-emerald-400">MonadScan:</span>
                <span className="truncate max-w-[120px]">{confirmedTxHash}</span>
                <a
                  href={`https://testnet.monadscan.com/tx/${confirmedTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:underline inline-flex items-center"
                >
                  <ExternalLink className="w-3 h-3 ml-0.5" />
                </a>
              </span>
            )}
          </div>
        </form>
      )}

      {/* Tab 2: Revoke Release */}
      {activeTab === "revoke" && (
        <form
          onSubmit={handleRevokeRelease}
          className="rounded-2xl border border-gray-800 bg-gray-900/30 p-6 space-y-5"
        >
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-rose-300">
              Revoke Compromised Release
            </h4>
            <p className="text-xs text-gray-400">
              Revocation is terminal and permanent. Once revoked on Monad, a release cannot be restored.
            </p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-medium">
                Target Release Digest (bytes32):
              </label>
              <input
                type="text"
                placeholder="0x..."
                value={revokeDigest}
                onChange={(e) => setRevokeDigest(e.target.value)}
                className="w-full rounded-lg bg-gray-950 border border-gray-800 px-3 py-2 text-xs text-white font-mono focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-medium">Revocation Reason:</label>
              <textarea
                rows={2}
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                className="w-full rounded-lg bg-gray-950 border border-gray-800 px-3 py-2 text-xs text-white font-mono focus:border-rose-500 focus:outline-none resize-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="submit"
              disabled={isSubmitting || isAuthorized === false}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs transition-all shadow-md shadow-rose-950 flex items-center space-x-2 disabled:cursor-not-allowed disabled:bg-gray-800"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>
                    {txPhase === "awaiting_wallet"
                      ? "Awaiting Signature..."
                      : txPhase === "confirming"
                      ? "Confirming Revocation..."
                      : "Processing..."}
                  </span>
                </>
              ) : (
                <>
                  <AlertOctagon className="w-3.5 h-3.5" />
                  <span>Execute Permanent Revocation</span>
                </>
              )}
            </button>

            {confirmedTxHash && (
              <span className="text-[10px] font-mono text-gray-400 flex items-center space-x-1">
                <span className="text-rose-400">Revoked in Tx:</span>
                <span className="truncate max-w-[120px]">{confirmedTxHash}</span>
                <a
                  href={`https://testnet.monadscan.com/tx/${confirmedTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:underline inline-flex items-center"
                >
                  <ExternalLink className="w-3 h-3 ml-0.5" />
                </a>
              </span>
            )}
          </div>
        </form>
      )}

      {/* Tab 3: Registry Release Lookup */}
      {activeTab === "lookup" && (
        <div className="rounded-2xl border border-gray-800 bg-gray-900/30 p-6 space-y-5">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-white">
              Read Release Records from Monad Testnet Registry
            </h4>
            <p className="text-xs text-gray-400">
              Query genuine live state directly from the deployed registry contract.
            </p>
          </div>

          <form onSubmit={handleLookupRelease} className="flex gap-2">
            <input
              type="text"
              placeholder="Enter release digest (0x...) or file SHA-256 hash..."
              value={lookupQuery}
              onChange={(e) => setLookupQuery(e.target.value)}
              className="flex-1 rounded-lg bg-gray-950 border border-gray-800 px-3 py-2 text-xs text-white font-mono focus:border-purple-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isLookingUp}
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs flex items-center space-x-1.5 transition-colors disabled:cursor-not-allowed"
            >
              {isLookingUp ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
              <span>Query</span>
            </button>
          </form>

          {lookupError && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{lookupError}</span>
            </div>
          )}

          {lookupRecord && (
            <div className="p-4 rounded-xl bg-gray-950 border border-gray-800 space-y-3">
              <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                <span className="text-xs font-semibold text-white">Release Record Found</span>
                <span
                  className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                    lookupRecord.status === "ACTIVE"
                      ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                      : lookupRecord.status === "REVOKED"
                      ? "bg-rose-950 text-rose-300 border border-rose-800"
                      : "bg-blue-950 text-blue-300 border border-blue-800"
                  }`}
                >
                  {lookupRecord.status}
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 text-xs font-mono text-gray-300">
                <div>
                  <span className="text-gray-500">Publisher:</span> {lookupRecord.publisherId}
                </div>
                <div>
                  <span className="text-gray-500">Product / Ver:</span> {lookupRecord.productId} v{lookupRecord.releaseVersion}
                </div>
                <div className="truncate">
                  <span className="text-gray-500">File Hash:</span> {lookupRecord.fileHash}
                </div>
                <div className="truncate">
                  <span className="text-gray-500">Manifest Digest:</span> {lookupRecord.manifestDigest}
                </div>
                <div className="truncate">
                  <span className="text-gray-500">Digest:</span> {lookupRecord.releaseDigest}
                </div>
                <div>
                  <span className="text-gray-500">Publisher Addr:</span> {lookupRecord.publisherAddress}
                </div>
                {lookupRecord.revokeReason && (
                  <div className="col-span-2 text-rose-300">
                    <span className="text-rose-500">Revocation Reason:</span> &quot;{lookupRecord.revokeReason}&quot;
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Manifest Authoring & Local Signing */}
      {activeTab === "manifest" && (
        <div className="rounded-2xl border border-gray-800 bg-gray-900/30 p-6 space-y-6">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-white flex items-center space-x-2">
              <FileCode className="w-4 h-4 text-emerald-400" />
              <span>Author & Cryptographically Sign Release Manifest</span>
            </h4>
            <p className="text-xs text-gray-400">
              Create RFC 8785 canonical JSON manifests, compute Web Crypto SHA-256 hashes, and sign with your Ed25519 publisher key. Signing executes strictly in client memory.
            </p>
          </div>

          <form onSubmit={handleGenerateAndSignManifest} className="space-y-5">
            {/* Artifact File Picker (Optional but recommended) */}
            <div className="p-4 rounded-xl bg-gray-950 border border-gray-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-300 flex items-center space-x-1.5">
                  <Upload className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Auto-Hash Local Release File (Optional)</span>
                </span>
                <label
                  htmlFor="manifest-file-upload"
                  className="cursor-pointer px-3 py-1 rounded-lg text-xs bg-gray-900 hover:bg-gray-800 border border-gray-700 text-cyan-300 transition-colors"
                >
                  {isHashingFile ? "Hashing..." : "Browse File..."}
                  <input
                    type="file"
                    id="manifest-file-upload"
                    className="hidden"
                    onChange={handleFileSelectedForManifest}
                  />
                </label>
              </div>
              <p className="text-[11px] text-gray-500">
                Selecting a file automatically computes its exact byte length and SHA-256 hash locally.
              </p>
            </div>

            {/* Metadata Fields */}
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-medium">Publisher ID</label>
                <input
                  type="text"
                  value={manifestGenPublisherId}
                  onChange={(e) => setManifestGenPublisherId(e.target.value)}
                  className="w-full rounded-lg bg-gray-950 border border-gray-800 px-3 py-2 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-medium">Product ID</label>
                <input
                  type="text"
                  value={manifestGenProductId}
                  onChange={(e) => setManifestGenProductId(e.target.value)}
                  className="w-full rounded-lg bg-gray-950 border border-gray-800 px-3 py-2 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-medium">Release Version</label>
                <input
                  type="text"
                  value={manifestGenVersion}
                  onChange={(e) => setManifestGenVersion(e.target.value)}
                  className="w-full rounded-lg bg-gray-950 border border-gray-800 px-3 py-2 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-medium">File Name</label>
                <input
                  type="text"
                  value={manifestGenFileName}
                  onChange={(e) => setManifestGenFileName(e.target.value)}
                  className="w-full rounded-lg bg-gray-950 border border-gray-800 px-3 py-2 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-medium">File Size (Bytes)</label>
                <input
                  type="number"
                  value={manifestGenFileSize}
                  onChange={(e) => setManifestGenFileSize(Number(e.target.value))}
                  className="w-full rounded-lg bg-gray-950 border border-gray-800 px-3 py-2 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-medium">Publisher Key ID</label>
                <input
                  type="text"
                  value={manifestGenKeyId}
                  onChange={(e) => setManifestGenKeyId(e.target.value)}
                  className="w-full rounded-lg bg-gray-950 border border-gray-800 px-3 py-2 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-medium">
                Artifact SHA-256 Digest (64 hex characters):
              </label>
              <input
                type="text"
                value={manifestGenSha256}
                onChange={(e) => setManifestGenSha256(e.target.value)}
                className="w-full rounded-lg bg-gray-950 border border-gray-800 px-3 py-2 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                required
              />
            </div>

            {/* Private Key Input & File Loader */}
            <div className="p-4 rounded-xl bg-gray-950 border border-gray-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-300 flex items-center space-x-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  <span>Ed25519 Signing Private Key (32-byte Hex):</span>
                </label>
                <label
                  htmlFor="load-key-file"
                  className="cursor-pointer text-xs text-cyan-400 hover:underline"
                >
                  Load from .keys JSON file
                  <input
                    type="file"
                    id="load-key-file"
                    accept=".json"
                    className="hidden"
                    onChange={handleLoadKeyFile}
                  />
                </label>
              </div>
              <input
                type="password"
                value={manifestGenPrivateKeyHex}
                onChange={(e) => setManifestGenPrivateKeyHex(e.target.value)}
                placeholder="Paste 64-character private key hex (kept strictly in browser memory)..."
                className="w-full rounded-lg bg-gray-900 border border-gray-800 px-3 py-2 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
              <p className="text-[11px] text-gray-500">
                Security Assurance: This private key is used only locally via WebAssembly/pure JS to sign the manifest. It is never logged, transmitted over the network, or saved to browser storage.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors flex items-center space-x-2"
              >
                <FileCode className="w-4 h-4" />
                <span>Canonicalize & Sign Manifest</span>
              </button>
            </div>
          </form>

          {manifestSignSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/80 text-xs text-emerald-300 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{manifestSignSuccess}</span>
            </div>
          )}

          {manifestSignError && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-xs text-rose-300 flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{manifestSignError}</span>
            </div>
          )}

          {/* Generated Manifest Display */}
          {manifestGenSignedJson && (
            <div className="p-4 rounded-xl bg-gray-950 border border-gray-800 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-emerald-300 font-mono">
                  Generated Signed Manifest (RFC 8785)
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(manifestGenSignedJson);
                      setStatusMessage("Manifest JSON copied to clipboard.");
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-300 flex items-center space-x-1"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy JSON</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleTransferToRegistration}
                    className="px-3 py-1.5 rounded-lg text-xs bg-cyan-600 hover:bg-cyan-500 text-white font-medium flex items-center space-x-1"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span>Transfer to Registration Form</span>
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-gray-900 border border-gray-800 text-xs font-mono space-y-1">
                <div className="text-gray-400">RFC 8785 Manifest Digest (bytes32 on Monad):</div>
                <div className="text-cyan-300 break-all">{manifestGenDigest}</div>
              </div>

              <pre className="p-3 rounded-lg bg-gray-900 border border-gray-800 text-[11px] font-mono text-gray-300 overflow-x-auto max-h-60">
                {manifestGenSignedJson}
              </pre>
            </div>
          )}
        </div>
      )}

      {statusMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/80 text-xs text-emerald-300 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800/80 text-xs text-rose-300 flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
