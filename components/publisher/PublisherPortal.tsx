"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { calculateReleaseDigest, getRegistryAddress } from "@/lib/chain/contract";
import { DEMO_PUBLISHER, DEMO_MONAD_PUBLISHER } from "@/lib/demo-data/fixtures";

export function PublisherPortal() {
  const [publisherAddress, setPublisherAddress] = useState<string>(
    DEMO_PUBLISHER.publisherAddress
  );
  const [authStatus, setAuthStatus] = useState<"AUTHORIZED" | "UNAUTHORIZED" | "PENDING">("AUTHORIZED");

  // Registration form
  const [regPublisherId, setRegPublisherId] = useState<string>("canonical-ubuntu");
  const [regProductId, setRegProductId] = useState<string>("ubuntu-desktop-iso");
  const [regVersion, setRegVersion] = useState<string>("24.04.2");
  const [regFileHash, setRegFileHash] = useState<string>(
    "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
  );
  const [regManifestDigest, setRegManifestDigest] = useState<string>(
    "0x1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff"
  );
  const [regTxHash, setRegTxHash] = useState<string | null>(null);

  // Revocation form
  const [revokeDigest, setRevokeDigest] = useState<string>("");
  const [revokeReason, setRevokeReason] = useState<string>(
    "Critical vulnerability CVE-2026-1124 in installer component"
  );
  const [revokeTxHash, setRevokeTxHash] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"register" | "revoke">("register");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const contractAddress = getRegistryAddress();

  // Calculated preview digest
  const computedPreviewDigest = calculateReleaseDigest(
    regPublisherId,
    regProductId,
    regVersion,
    regFileHash as `0x${string}`,
    regManifestDigest as `0x${string}`
  );

  async function handleRegisterRelease(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      // Check if browser has window.ethereum
      if (typeof window !== "undefined" && (window as any).ethereum) {
        // Here we could trigger a real contract write if deployed
        setStatusMessage(
          `Simulated Monad Testnet commitment generated for release digest: ${computedPreviewDigest}`
        );
      } else {
        setStatusMessage(
          `Release commitment calculated for Monad Testnet (Chain ID 10143). Registry Address: ${contractAddress}.`
        );
      }
      // Demo transaction reference
      setRegTxHash(
        "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")
      );
    } catch (err) {
      setStatusMessage("Registration error: " + (err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRevokeRelease(e: React.FormEvent) {
    e.preventDefault();
    if (!revokeDigest) {
      setStatusMessage("Please enter the release digest to revoke.");
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      setStatusMessage(
        `Revocation commitment prepared for digest ${revokeDigest.slice(0, 16)}... Reason: "${revokeReason}".`
      );
      setRevokeTxHash(
        "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")
      );
    } catch (err) {
      setStatusMessage("Revocation error: " + (err as Error).message);
    } finally {
      setIsSubmitting(false);
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
              <span>Publisher Authorization & Release Management</span>
            </h3>
          </div>

          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>AUTHORIZED PUBLISHER</span>
            </span>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 pt-2 text-xs font-mono">
          <div className="p-3 rounded-xl bg-gray-950 border border-gray-800 space-y-1">
            <div className="text-gray-400 font-sans">Connected Publisher Address:</div>
            <div className="text-cyan-300 truncate">{publisherAddress}</div>
          </div>
          <div className="p-3 rounded-xl bg-gray-950 border border-gray-800 space-y-1">
            <div className="text-gray-400 font-sans">SwarmTrace Registry Address:</div>
            <div className="text-purple-300 truncate">{contractAddress}</div>
          </div>
        </div>
      </div>

      {/* Action Tabs */}
      <div className="flex space-x-2 border-b border-gray-800">
        <button
          type="button"
          onClick={() => setActiveTab("register")}
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
          onClick={() => setActiveTab("revoke")}
          className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors flex items-center space-x-2 ${
            activeTab === "revoke"
              ? "bg-gray-900 text-rose-400 border-t border-x border-gray-800"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          <AlertOctagon className="w-4 h-4" />
          <span>Revoke Compromised Release</span>
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
              Commit Release on Monad Testnet
            </h4>
            <p className="text-xs text-gray-400">
              Only authorized publishers can register releases for their allocated publisher ID.
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
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs transition-all shadow-md shadow-cyan-950 flex items-center space-x-2 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting to Monad...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Commit Release to Registry</span>
                </>
              )}
            </button>

            {regTxHash && (
              <span className="text-[10px] font-mono text-gray-400 flex items-center space-x-1">
                <span className="text-emerald-400">Tx:</span>
                <span className="truncate max-w-[120px]">{regTxHash}</span>
                <a
                  href={`https://testnet.monadscan.com/tx/${regTxHash}`}
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
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs transition-all shadow-md shadow-rose-950 flex items-center space-x-2 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting revocation...</span>
                </>
              ) : (
                <>
                  <AlertOctagon className="w-3.5 h-3.5" />
                  <span>Execute Permanent Revocation</span>
                </>
              )}
            </button>

            {revokeTxHash && (
              <span className="text-[10px] font-mono text-gray-400 flex items-center space-x-1">
                <span className="text-rose-400">Revoked in Tx:</span>
                <span className="truncate max-w-[120px]">{revokeTxHash}</span>
                <a
                  href={`https://testnet.monadscan.com/tx/${revokeTxHash}`}
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

      {statusMessage && (
        <div className="p-4 rounded-xl bg-gray-900 border border-gray-800 text-xs text-gray-300 flex items-center space-x-2">
          <Info className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}
    </div>
  );
}
