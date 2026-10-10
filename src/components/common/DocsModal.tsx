import React from 'react';
import { X, ShieldCheck, Binary, Database, Cpu } from 'lucide-react';
import { TuxLogo } from './TuxLogo';

interface DocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DocsModal({ isOpen, onClose }: DocsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-[3px] p-4">
      <div className="w-full max-w-3xl bg-[#101112] border border-[#232426] rounded-[8px] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1B1C1E] flex items-center justify-between bg-[#151617]/50">
          <div className="flex items-center gap-3">
            <TuxLogo size={24} />
            <div>
              <div className="text-sm font-semibold text-[#F0F1F2] tracking-tight">
                PENGUIN TRACE Documentation & Architecture Spec
              </div>
              <div className="text-[10px] font-mono text-[#9A9DA3]">
                Protocol Specification v0.9.4 • Monad Ecosystem
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-[4px] text-[#9A9DA3] hover:text-[#F0F1F2] hover:bg-[#191A1C] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-[#9A9DA3] leading-relaxed">
          {/* Section 1 */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-[#F0F1F2] flex items-center gap-2">
              <Binary className="w-4 h-4 text-[#5E6BFF]" />
              1. Deterministic Client-Side Hashing
            </h3>
            <p>
              Penguin Trace performs all cryptographic digest calculations directly inside your browser sandbox using the
              W3C standard <code className="text-[#F0F1F2] font-mono bg-[#151617] px-1 py-0.5 rounded">crypto.subtle.digest(&apos;SHA-256&apos;, buffer)</code> Web Crypto API.
              Your binary files never leave your device, eliminating network latency and data leakage vectors.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-[#F0F1F2] flex items-center gap-2">
              <Database className="w-4 h-4 text-[#31C875]" />
              2. On-Chain Monad Provenance Registry
            </h3>
            <p>
              Calculated hashes are queried against the immutable Monad Provenance smart contract registry (<code className="text-[#F0F1F2] font-mono bg-[#151617] px-1 py-0.5 rounded">0x3209B172E9D42C128b9eEbfaC74046FE945d836A</code>).
              Each published release is anchored with:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-[11px] font-mono">
              <li>Canonical SHA-256 binary digest.</li>
              <li>Multi-sig publisher ed25519 signing key attestation.</li>
              <li>Block height timestamp and verifiable consensus signatures.</li>
              <li>SLSA Level 3 reproducible build receipts and builder image hashes.</li>
            </ul>
          </section>

          {/* Section 3: Crucial Security Axiom */}
          <section className="p-3.5 bg-[#151617] border border-[#1B1C1E] rounded-[6px] space-y-2">
            <h3 className="text-xs font-bold text-[#E4CD19] flex items-center gap-1.5 uppercase font-mono">
              <ShieldCheck className="w-4 h-4 text-[#E4CD19]" />
              3. Security Policy: Authenticity vs. Malware Analysis
            </h3>
            <p className="text-[11px] text-[#9A9DA3]">
              <strong className="text-[#F0F1F2]">Publisher Authenticity</strong> mathematically guarantees that the binary was built and signed by the verified keyholder.
              However, authenticity does <span className="underline text-[#E45B5B]">not</span> equal runtime malware safety.
              In local verification mode, external virus sandboxes are unconfigured; Penguin Trace reports <strong className="text-[#F0F1F2] font-mono">NOT_SCANNED</strong> or <strong className="text-[#F0F1F2] font-mono">SCANNER_UNAVAILABLE</strong> rather than fabricating clean verdicts.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-[#F0F1F2] flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#17B7C8]" />
              4. Verification Status Taxonomy
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="p-2 bg-[#080809] border border-[#1B1C1E] rounded">
                <span className="text-[#31C875] font-bold">MATCHING_AUTHENTICATED_RELEASE</span>
                <p className="text-[#9A9DA3] text-[10px] mt-0.5 font-sans">
                  Digest matches published on-chain anchor from verified key.
                </p>
              </div>
              <div className="p-2 bg-[#080809] border border-[#1B1C1E] rounded">
                <span className="text-[#E45B5B] font-bold">HASH_MISMATCH</span>
                <p className="text-[#9A9DA3] text-[10px] mt-0.5 font-sans">
                  Filename claims release identity, but binary checksum fails.
                </p>
              </div>
              <div className="p-2 bg-[#080809] border border-[#1B1C1E] rounded">
                <span className="text-[#F97316] font-bold">REVOKED_RELEASE</span>
                <p className="text-[#9A9DA3] text-[10px] mt-0.5 font-sans">
                  Release certificate withdrawn due to vulnerability or leak.
                </p>
              </div>
              <div className="p-2 bg-[#080809] border border-[#1B1C1E] rounded">
                <span className="text-[#E4CD19] font-bold">UNKNOWN_RELEASE</span>
                <p className="text-[#9A9DA3] text-[10px] mt-0.5 font-sans">
                  No cryptographic record exists on the Monad ledger.
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#1B1C1E] bg-[#151617]/50 flex items-center justify-between text-[11px] text-[#9A9DA3]">
          <span>Monad Testnet Gateway v0.9.4</span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-[#191A1C] hover:bg-[#232426] text-[#F0F1F2] rounded-[4px] transition-colors border border-[#1B1C1E] cursor-pointer"
          >
            Close Documentation
          </button>
        </div>
      </div>
    </div>
  );
}

export default DocsModal;
