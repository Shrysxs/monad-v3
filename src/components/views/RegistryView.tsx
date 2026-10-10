import React, { useState, useEffect } from 'react';
import {
  Database,
  ShieldCheck,
  ShieldAlert,
  Wallet,
  Copy,
  Check,
  AlertTriangle,
  Search,
} from 'lucide-react';
import { MOCK_REGISTRY_RELEASES } from '@/data/mockRegistry';
import { VerifiedRelease } from '@/types/swarm';
import { formatBytes, truncateHash } from '@/lib/crypto';

interface RegistryViewProps {
  onSelectReleaseInDna?: (release: VerifiedRelease) => void;
}

export function RegistryView({ onSelectReleaseInDna }: RegistryViewProps) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterChannel, setFilterChannel] = useState<'all' | 'stable' | 'beta'>('all');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const contractAddress = '0x3209B172E9D42C128b9eEbfaC74046FE945d836A';
  const networkName = 'Monad Testnet';
  const chainId = 10143;
  const anchorBlock = 5081920;

  // Check if wallet was already connected in window.ethereum
  useEffect(() => {
    const checkExistingConnection = async () => {
      if (typeof window !== 'undefined' && 'ethereum' in window) {
        try {
          const provider = (window as unknown as { ethereum: { request: (args: { method: string }) => Promise<string[]> } }).ethereum;
          const accounts = await provider.request({ method: 'eth_accounts' });
          if (accounts && accounts.length > 0) {
            setWalletAddress(accounts[0]);
          }
        } catch {
          // Silent fallback
        }
      }
    };
    checkExistingConnection();
  }, []);

  const handleConnectWallet = async () => {
    setIsConnecting(true);
    setWalletError(null);

    if (typeof window === 'undefined' || !('ethereum' in window)) {
      setWalletError('No Web3 wallet extension detected in this browser. Running in read-only public registry mode.');
      setIsConnecting(false);
      return;
    }

    try {
      const provider = (window as unknown as { ethereum: { request: (args: { method: string }) => Promise<string[]> } }).ethereum;
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      if (accounts && accounts.length > 0) {
        setWalletAddress(accounts[0]);
      } else {
        setWalletError('No accounts authorized.');
      }
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: number }).code === 4001) {
        setWalletError('Connection request was rejected by user.');
      } else {
        const msg = err instanceof Error ? err.message : 'Failed to connect wallet provider';
        setWalletError(msg);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectWallet = () => {
    setWalletAddress(null);
    setWalletError(null);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const filteredReleases = MOCK_REGISTRY_RELEASES.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.sha256.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.fileName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesChannel = filterChannel === 'all' || r.channel === filterChannel;
    return matchesSearch && matchesChannel;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Banner: Real Network Configuration */}
      <div className="p-4 bg-[#101112] border border-[#1B1C1E] rounded-[8px] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-[4px] bg-[#5E6BFF]/10 border border-[#5E6BFF]/30 mt-0.5">
            <Database className="w-4 h-4 text-[#5E6BFF]" />
          </div>
          <div>
            <div className="text-xs font-semibold text-[#F0F1F2] flex items-center gap-2">
              Monad Provenance Registry & Consensus Node
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#152E22] text-[#31C875] border border-[#31C875]/30">
                READ-ONLY GATEWAY
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#191A1C] text-[#9A9DA3] border border-[#232426]">
                DEMO SEED DATA
              </span>
            </div>
            <p className="text-[11px] text-[#9A9DA3] mt-0.5 max-w-2xl">
              Registry entries represent cryptographic commitments anchored into Monad consensus blocks. Write operations
              (registering new releases or revoking keys) require authorization from the Monad Core multi-sig contract.
            </p>
          </div>
        </div>

        {/* Wallet Connection Status */}
        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
          {walletAddress ? (
            <div className="flex items-center gap-2">
              <div className="px-2.5 py-1 bg-[#151617] border border-[#1B1C1E] rounded-[4px] text-xs font-mono text-[#F0F1F2] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#31C875]" />
                <span>{truncateHash(walletAddress, 6, 4)}</span>
              </div>
              <button
                onClick={handleDisconnectWallet}
                className="px-2 py-1 text-[11px] text-[#9A9DA3] hover:text-[#E45B5B] bg-[#101112] border border-[#1B1C1E] rounded-[4px] transition-colors cursor-pointer"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnectWallet}
              disabled={isConnecting}
              className="px-3.5 py-1.5 bg-[#5E6BFF] hover:bg-[#4E5BEE] text-white text-xs font-medium rounded-[4px] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Wallet Error / Notice if any */}
      {walletError && (
        <div className="p-3 bg-[#1C1A10] border border-[#E4CD19]/40 rounded-[6px] flex items-center justify-between text-xs text-[#E4CD19]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{walletError}</span>
          </div>
          <button
            onClick={() => setWalletError(null)}
            className="text-[10px] uppercase font-mono text-[#9A9DA3] hover:text-[#F0F1F2]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Network Telemetry Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-[#101112] border border-[#1B1C1E] rounded-[8px]">
          <div className="flex items-center justify-between text-[10px] font-mono text-[#9A9DA3]">
            <span>Active Network</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#31C875] animate-pulse" />
          </div>
          <div className="text-sm font-bold font-mono text-[#F0F1F2] mt-1">{networkName}</div>
          <div className="text-[10px] text-[#9A9DA3] mt-0.5">Chain ID: {chainId}</div>
        </div>

        <div className="p-4 bg-[#101112] border border-[#1B1C1E] rounded-[8px]">
          <div className="text-[10px] font-mono text-[#9A9DA3]">Anchor Block Height</div>
          <div className="text-sm font-bold font-mono text-[#5E6BFF] mt-1">#{anchorBlock.toLocaleString()}</div>
          <div className="text-[10px] text-[#9A9DA3] mt-0.5">Finality: Instant (BFT)</div>
        </div>

        <div className="p-4 bg-[#101112] border border-[#1B1C1E] rounded-[8px]">
          <div className="text-[10px] font-mono text-[#9A9DA3]">Registry Contract</div>
          <div className="text-xs font-bold font-mono text-[#F0F1F2] mt-1 flex items-center justify-between">
            <span>{truncateHash(contractAddress, 6, 4)}</span>
            <button
              onClick={() => handleCopy(contractAddress)}
              className="text-[#9A9DA3] hover:text-[#F0F1F2] p-1 cursor-pointer"
              title="Copy Contract Address"
            >
              {copiedText === contractAddress ? <Check className="w-3 h-3 text-[#31C875]" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
          <div className="text-[10px] text-[#9A9DA3] mt-0.5">Verified Source: Monad</div>
        </div>

        <div className="p-4 bg-[#101112] border border-[#1B1C1E] rounded-[8px]">
          <div className="text-[10px] font-mono text-[#9A9DA3]">Write Authorization</div>
          <div className="text-xs font-bold font-mono text-[#E4CD19] mt-1">
            {walletAddress ? 'Read-Only Account' : 'Disconnected'}
          </div>
          <div className="text-[10px] text-[#9A9DA3] mt-0.5">Requires Multi-Sig Key</div>
        </div>
      </div>

      {/* Registry Search & Filter Bar */}
      <div className="p-3 bg-[#101112] border border-[#1B1C1E] rounded-[8px] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-[#9A9DA3] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search release name, tag, or SHA-256..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#151617] border border-[#1B1C1E] focus:border-[#5E6BFF] text-xs font-mono text-[#F0F1F2] placeholder-[#9A9DA3]/60 pl-9 pr-3 py-1.5 rounded-[4px] outline-none"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-mono self-end sm:self-center">
          <span className="text-[#9A9DA3]">Channel:</span>
          <button
            onClick={() => setFilterChannel('all')}
            className={`px-2 py-1 rounded-[4px] border ${
              filterChannel === 'all'
                ? 'bg-[#151617] text-[#5E6BFF] border-[#5E6BFF]/40'
                : 'text-[#9A9DA3] border-transparent hover:bg-[#151617]'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterChannel('stable')}
            className={`px-2 py-1 rounded-[4px] border ${
              filterChannel === 'stable'
                ? 'bg-[#151617] text-[#5E6BFF] border-[#5E6BFF]/40'
                : 'text-[#9A9DA3] border-transparent hover:bg-[#151617]'
            }`}
          >
            Stable
          </button>
          <button
            onClick={() => setFilterChannel('beta')}
            className={`px-2 py-1 rounded-[4px] border ${
              filterChannel === 'beta'
                ? 'bg-[#151617] text-[#5E6BFF] border-[#5E6BFF]/40'
                : 'text-[#9A9DA3] border-transparent hover:bg-[#151617]'
            }`}
          >
            Beta / Revoked
          </button>
        </div>
      </div>

      {/* Registered Releases Table */}
      <div className="bg-[#101112] border border-[#1B1C1E] rounded-[8px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1B1C1E] bg-[#151617]/50 text-[#9A9DA3] font-mono text-[11px]">
                <th className="py-3 px-4">Release & Tag</th>
                <th className="py-3 px-4">SHA-256 Digest</th>
                <th className="py-3 px-4">Publisher & Key</th>
                <th className="py-3 px-4">Block Anchor</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1B1C1E]">
              {filteredReleases.map((rel) => {
                const isRevoked = rel.revoked?.isRevoked;

                return (
                  <tr key={rel.id} className="hover:bg-[#151617] transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#F0F1F2]">{rel.name}</div>
                      <div className="text-[10px] font-mono text-[#5E6BFF] mt-0.5">
                        {rel.tag} • {formatBytes(rel.fileSize)}
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#9A9DA3]">{truncateHash(rel.sha256, 10, 8)}</span>
                        <button
                          onClick={() => handleCopy(rel.sha256)}
                          className="p-1 text-[#9A9DA3] hover:text-[#F0F1F2] cursor-pointer"
                          title="Copy Full SHA-256"
                        >
                          {copiedText === rel.sha256 ? <Check className="w-3 h-3 text-[#31C875]" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-[11px]">
                      <div className="text-[#F0F1F2]">{rel.publisher.name}</div>
                      <div className="text-[10px] font-mono text-[#9A9DA3]">
                        {truncateHash(rel.publisher.address, 6, 4)} ({rel.publisher.signingKeyId})
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px] text-[#9A9DA3]">
                      #{rel.monadBlockNumber.toLocaleString()}
                    </td>

                    <td className="py-3 px-4">
                      {isRevoked ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#E45B5B] bg-[#2E1517] px-2 py-0.5 rounded border border-[#E45B5B]/30">
                          <ShieldAlert className="w-2.5 h-2.5" /> REVOKED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#31C875] bg-[#152E22] px-2 py-0.5 rounded border border-[#31C875]/30">
                          <ShieldCheck className="w-2.5 h-2.5" /> VERIFIED
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      {onSelectReleaseInDna && (
                        <button
                          onClick={() => onSelectReleaseInDna(rel)}
                          className="px-2.5 py-1 bg-[#191A1C] hover:bg-[#232426] border border-[#1B1C1E] text-xs font-mono text-[#F0F1F2] rounded transition-colors cursor-pointer"
                        >
                          Inspect DNA
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default RegistryView;
