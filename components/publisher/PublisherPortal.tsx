"use client";

import React, { useState, useEffect } from "react";
import {
  KeyRound,
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
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Tabs: manifest, register, revoke, lookup
  const [activeTab, setActiveTab] = useState<"manifest" | "register" | "revoke" | "lookup">("register");

  // Registration form
  const [regPublisherId, setRegPublisherId] = useState<string>("org.penguintrace.core");
  const [regProductId, setRegProductId] = useState<string>("penguin-daemon");
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
    "Security vulnerability discovered in release dependency"
  );

  // Lookup form
  const [lookupQuery, setLookupQuery] = useState<string>("");
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

  function copyText(key: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

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
      setManifestSignSuccess(`Hashed file "${file.name}" (${file.size} bytes) via Web Crypto SHA-256.`);
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
    setStatusMessage("Manifest data transferred to registration form. Ready to commit on Monad Testnet.");
  }

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
        setErrorMessage("Registry contract address is not configured.");
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

      if (isAuthorized === false) {
        setErrorMessage(
          `Unauthorized caller: Address ${walletAddress} is not registered as an authorized publisher in SwarmTraceRegistry. Transaction would revert with NotAuthorizedPublisher.`
        );
        setIsSubmitting(false);
        return;
      }

      setTxPhase("awaiting_wallet");
      setStatusMessage("Awaiting transaction approval in wallet...");

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
      setStatusMessage(`Transaction submitted: ${hash}. Awaiting block confirmation on Monad Testnet...`);

      const receipt = await monadPublicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === "success") {
        setTxPhase("confirmed");
        setConfirmedBlock(receipt.blockNumber);
        setStatusMessage(
          `Release registered on Monad Testnet in block #${receipt.blockNumber}.`
        );
      } else {
        setTxPhase("reverted");
        setErrorMessage(
          `Transaction reverted on-chain in block #${receipt.blockNumber}.`
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
        setErrorMessage("Registry contract address is not configured.");
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
      setStatusMessage("Awaiting transaction approval in wallet...");

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
        setStatusMessage(`Release revoked on Monad Testnet in block #${receipt.blockNumber}.`);
      } else {
        setTxPhase("reverted");
        setErrorMessage(`Revocation transaction reverted on-chain.`);
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

      let record = await fetchOnChainReleaseByFileHash(formatted);
      if (!record) {
        record = await fetchOnChainRelease(formatted);
      }

      if (record) {
        setLookupRecord(record);
      } else {
        setLookupError("No release record found in registry for this query.");
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
            Broadcast release digest commitment into SwarmTraceRegistry.
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
              Connected address (<code className="font-mono bg-amber-100/60 px-1 py-0.5 rounded">{walletAddress}</code>) is not on the authorized publishers list in SwarmTraceRegistry. Calling <code className="font-mono">registerRelease</code> will revert on-chain. Contact the contract owner (<code className="font-mono">0xB9BA42...</code>) to call <code className="font-mono">authorizePublisher</code>.
            </p>
          </div>
        )}
      </div>

      {/* Action Tabs */}
      <div className="flex space-x-2 border-b border-neutral-200">
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
                className="w-full text-xs text-neutral-600 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border file:border-neutral-300 file:text-xs file:bg-white file:text-neutral-900 hover:file:bg-neutral-50 cursor-pointer"
              />
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

          <div className="grid sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="text-neutral-700 font-medium block mb-1">Publisher ID:</label>
              <input
                type="text"
                value={regPublisherId}
                onChange={(e) => setRegPublisherId(e.target.value)}
                className="w-full rounded-md bg-white border border-neutral-200 px-3 py-1.5 font-mono text-neutral-950 focus:outline-none focus:border-neutral-950"
              />
            </div>
            <div>
              <label className="text-neutral-700 font-medium block mb-1">Product ID:</label>
              <input
                type="text"
                value={regProductId}
                onChange={(e) => setRegProductId(e.target.value)}
                className="w-full rounded-md bg-white border border-neutral-200 px-3 py-1.5 font-mono text-neutral-950 focus:outline-none focus:border-neutral-950"
              />
            </div>
            <div>
              <label className="text-neutral-700 font-medium block mb-1">Version:</label>
              <input
                type="text"
                value={regVersion}
                onChange={(e) => setRegVersion(e.target.value)}
                className="w-full rounded-md bg-white border border-neutral-200 px-3 py-1.5 font-mono text-neutral-950 focus:outline-none focus:border-neutral-950"
              />
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-neutral-700 font-medium block mb-1">File SHA-256 Digest (bytes32):</label>
              <input
                type="text"
                value={regFileHash}
                onChange={(e) => setRegFileHash(e.target.value)}
                className="w-full rounded-md bg-white border border-neutral-200 px-3 py-1.5 font-mono text-neutral-950 focus:outline-none focus:border-neutral-950"
              />
            </div>

            <div>
              <label className="text-neutral-700 font-medium block mb-1">Manifest Digest (bytes32):</label>
              <input
                type="text"
                value={regManifestDigest}
                onChange={(e) => setRegManifestDigest(e.target.value)}
                className="w-full rounded-md bg-white border border-neutral-200 px-3 py-1.5 font-mono text-neutral-950 focus:outline-none focus:border-neutral-950"
              />
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

          {/* High-Contrast Computed Preview Digest Box */}
          <div className="p-4 rounded-xl bg-neutral-950 text-white border border-neutral-800 space-y-1.5 text-xs shadow-sm">
            <div className="text-neutral-400 flex items-center justify-between font-mono text-[11px]">
              <span>Deterministic Release Digest (keccak256):</span>
              <span className="text-neutral-400">Monad State Key</span>
            </div>
            <div className="font-mono text-emerald-400 break-all text-xs font-semibold">{computedPreviewDigest}</div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="submit"
              disabled={isSubmitting || isAuthorized === false}
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
              Query Registry by Digest or File Hash
            </h4>
            <p className="text-xs text-neutral-500">
              Query live commitments recorded on Monad Testnet (<code className="font-mono">0xeB3Ef...</code>).
            </p>
          </div>

          <div className="flex gap-2">
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
