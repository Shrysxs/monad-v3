import { ed25519 } from "@noble/curves/ed25519";

/**
 * Normalizes hex string (removes optional 0x prefix, ensures even length).
 */
export function normalizeHex(hex: string): string {
  let clean = hex.trim().toLowerCase();
  if (clean.startsWith("0x")) {
    clean = clean.slice(2);
  }
  if (clean.length % 2 !== 0) {
    clean = "0" + clean;
  }
  return clean;
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = normalizeHex(hex);
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.slice(i, i + 2), 16);
  }
  return bytes;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Verifies an Ed25519 signature over raw message bytes or string.
 *
 * @param signatureHex 64-byte Ed25519 signature in hex format (128 characters)
 * @param message Message as Uint8Array or UTF-8 string
 * @param publicKeyHex 32-byte Ed25519 public key in hex format (64 characters)
 * @returns boolean true if signature is valid, false otherwise
 */
export function verifyEd25519Signature(
  signatureHex: string,
  message: Uint8Array | string,
  publicKeyHex: string
): boolean {
  try {
    const sigBytes = hexToBytes(signatureHex);
    const pubBytes = hexToBytes(publicKeyHex);
    const msgBytes = typeof message === "string" ? new TextEncoder().encode(message) : message;

    if (sigBytes.length !== 64) {
      return false;
    }
    if (pubBytes.length !== 32) {
      return false;
    }

    return ed25519.verify(sigBytes, msgBytes, pubBytes);
  } catch {
    return false;
  }
}

/**
 * Signs a message using an Ed25519 private key (used for test vectors and publisher fixtures).
 */
export function signEd25519Message(
  message: Uint8Array | string,
  privateKeyHex: string
): string {
  const privBytes = hexToBytes(privateKeyHex);
  const msgBytes = typeof message === "string" ? new TextEncoder().encode(message) : message;
  const sigBytes = ed25519.sign(msgBytes, privBytes);
  return bytesToHex(sigBytes);
}

/**
 * Generates an Ed25519 keypair for demonstration or test vector authoring.
 */
export function generateEd25519KeyPair(): { publicKeyHex: string; privateKeyHex: string } {
  const privBytes = ed25519.utils.randomPrivateKey();
  const pubBytes = ed25519.getPublicKey(privBytes);
  return {
    publicKeyHex: bytesToHex(pubBytes),
    privateKeyHex: bytesToHex(privBytes),
  };
}
