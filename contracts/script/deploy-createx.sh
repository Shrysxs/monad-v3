#!/usr/bin/env bash
# Deploys PenguinTraceRegistry to Monad Testnet with the monskills flow:
# Alchemy Agent Wallet session -> CREATE2 through the canonical CreateX factory,
# then verifies the source on all Monad explorers via the monskills verification API.
#
# Prereqs (done by you, never by an agent):
#   npm install -g @alchemy/cli@latest   # v0.18.0+
#   alchemy auth                          # or: alchemy auth login --device-code
#   create an EVM Agent Wallet session in the Alchemy dashboard, then:
#   alchemy wallet connect --mode session && alchemy wallet use session
#
# Usage: contracts/script/deploy-createx.sh <registry-admin-address> [salt]
#   registry-admin-address  account that can authorize publishers (use your own browser wallet
#                           so you can use the portal's Admin tab)
#   salt                    bytes32, defaults to zero
set -euo pipefail

ADMIN="${1:?usage: deploy-createx.sh <registry-admin-address> [salt]}"
SALT="${2:-0x0000000000000000000000000000000000000000000000000000000000000000}"
NETWORK="monad-testnet"
CHAIN_ID=10143
RPC_URL="https://testnet-rpc.monad.xyz"
CREATEX="0xba5Ed099633D3B313e4D5F7bdc1305d3c28ba5Ed"
CONTRACT="src/PenguinTraceRegistry.sol:PenguinTraceRegistry"

cd "$(dirname "$0")/.."

[[ "$ADMIN" =~ ^0x[0-9a-fA-F]{40}$ ]] || { echo "Admin must be a 20-byte 0x address" >&2; exit 1; }
command -v alchemy >/dev/null || { echo "Alchemy CLI not installed: npm install -g @alchemy/cli@latest" >&2; exit 1; }
alchemy wallet status --verify >/dev/null || { echo "No active Agent Wallet session (see prereqs above)" >&2; exit 1; }
SESSION_ADDR="$(alchemy wallet address | grep -oE '0x[0-9a-fA-F]{40}' | head -1)"
echo "Agent wallet session: $SESSION_ADDR"
echo "Registry admin:       $ADMIN"

[[ -n "$(cast code "$CREATEX" --rpc-url "$RPC_URL" | sed 's/^0x$//')" ]] || { echo "CreateX not found on $NETWORK" >&2; exit 1; }

forge build >/dev/null
CREATION="$(forge inspect "$CONTRACT" bytecode)"
CTOR_ARGS="$(cast abi-encode "constructor(address)" "$ADMIN")"
INIT_CODE="${CREATION}${CTOR_ARGS#0x}"

# CreateX guards the salt before CREATE2, so computeCreate2Address(salt, ...) with the raw salt
# predicts the wrong address. Simulating the real call returns the exact address it will deploy to.
PREDICTED="$(cast call "$CREATEX" "deployCreate2(bytes32,bytes)(address)" "$SALT" "$INIT_CODE" \
  --from "$SESSION_ADDR" --rpc-url "$RPC_URL")"
echo "Deterministic address: $PREDICTED"

if [[ -n "$(cast code "$PREDICTED" --rpc-url "$RPC_URL" | sed 's/^0x$//')" ]]; then
  echo "Already deployed at $PREDICTED (same salt + init code); skipping deploy."
else
  BAL="$(cast balance "$SESSION_ADDR" --rpc-url "$RPC_URL")"
  if [[ "$BAL" == "0" ]]; then
    echo "Session wallet has no MON; requesting testnet faucet funds..."
    curl -s -X POST https://agents.devnads.com/v1/faucet -H "Content-Type: application/json" \
      -d "{\"chainId\": $CHAIN_ID, \"address\": \"$SESSION_ADDR\"}"
    echo
    sleep 5
  fi

  echo "Deploying through CreateX via the Agent Wallet session..."
  alchemy evm contract call "$CREATEX" "deployCreate2(bytes32,bytes)" --args "[\"$SALT\",\"$INIT_CODE\"]" -n "$NETWORK"

  echo -n "Waiting for code at $PREDICTED"
  for _ in $(seq 1 60); do
    [[ -n "$(cast code "$PREDICTED" --rpc-url "$RPC_URL" | sed 's/^0x$//')" ]] && break
    echo -n "."; sleep 2
  done
  echo
  [[ -n "$(cast code "$PREDICTED" --rpc-url "$RPC_URL" | sed 's/^0x$//')" ]] || { echo "No code at $PREDICTED after waiting" >&2; exit 1; }
fi

OWNER="$(cast call "$PREDICTED" "owner()(address)" --rpc-url "$RPC_URL")"
echo "Deployed. owner() = $OWNER"

# Verify on all explorers via the monskills verification API.
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
forge verify-contract "$PREDICTED" "$CONTRACT" --chain "$CHAIN_ID" --show-standard-json-input > "$WORK/standard-input.json"
jq '.metadata' out/PenguinTraceRegistry.sol/PenguinTraceRegistry.json > "$WORK/metadata.json"
COMPILER="v$(jq -r '.compiler.version' "$WORK/metadata.json")"
jq -n \
  --argjson chainId "$CHAIN_ID" \
  --arg addr "$PREDICTED" \
  --arg name "$CONTRACT" \
  --arg compiler "$COMPILER" \
  --arg args "${CTOR_ARGS#0x}" \
  --slurpfile input "$WORK/standard-input.json" \
  --slurpfile meta "$WORK/metadata.json" \
  '{chainId: $chainId, contractAddress: $addr, contractName: $name, compilerVersion: $compiler,
    standardJsonInput: $input[0], foundryMetadata: $meta[0], constructorArgs: $args}' > "$WORK/verify.json"
echo "Verifying source..."
curl -s -X POST https://agents.devnads.com/v1/verify -H "Content-Type: application/json" -d @"$WORK/verify.json"
echo

cat <<EOF

Done. Set this in .env.local (and your hosting env):
  NEXT_PUBLIC_PENGUINTRACE_REGISTRY_ADDRESS=$PREDICTED
Explorer: https://testnet.monadscan.com/address/$PREDICTED
When finished with the agent wallet: alchemy wallet disconnect
EOF
