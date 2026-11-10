import type { VerificationVerdict } from "../verification/types";

/**
 * Plain-language wording for verification results.
 * Everything a non-expert sees about a result comes from here, so every page says the same thing.
 */

export type Tone = "good" | "warn" | "bad" | "neutral";

export interface CheckLine {
  label: string;
  tone: Tone;
  detail: string;
}

export interface VerdictCopy {
  tone: Tone;
  title: string;
  meaning: string;
  action: string;
  checks: CheckLine[];
}

export function describeVerdict(v: VerificationVerdict): VerdictCopy {
  const sig = v.signatureVerification.status;
  const record = v.releaseRecord;
  const fi = v.fileIntegrity;
  const changedPieces = (fi.chunksTotal ?? 0) - (fi.chunksMatched ?? 0);

  // 1. Is the signature file really from the publisher?
  const publisherCheck: CheckLine =
    v.status === "NETWORK_ERROR"
      ? { label: "Signature is from the real publisher", tone: "neutral", detail: "Couldn't check — the registry was unreachable." }
      : sig === "VALID"
      ? { label: "Signature is from the real publisher", tone: "good", detail: `Signed by ${v.signatureVerification.publisherId}.` }
      : sig === "KEY_NOT_FOUND"
      ? {
          label: "Signature is from the real publisher",
          tone: "neutral",
          detail: `"${v.signatureVerification.publisherId}" isn't a registered publisher, so we can't confirm who signed it.`,
        }
      : sig === "KEY_REVOKED" || sig === "KEY_UNAUTHORIZED"
      ? { label: "Signature is from the real publisher", tone: "bad", detail: "This publisher is no longer trusted." }
      : {
          label: "Signature is from the real publisher",
          tone: "bad",
          detail: "The signature doesn't belong to this publisher, or the signature file was edited.",
        };

  // 2. Does the file match the publisher's release? Only meaningful if the signature is trusted.
  const fileCheck: CheckLine =
    fi.status !== "MATCH"
      ? {
          label: "File matches the publisher's release",
          tone: "bad",
          detail:
            fi.expectedFileSize !== undefined && fi.expectedFileSize !== fi.fileSize
              ? `The file is a different size (${fi.fileSize} bytes instead of ${fi.expectedFileSize}).`
              : changedPieces > 0
              ? `${changedPieces} of ${fi.chunksTotal} parts of the file are different.`
              : "The file's contents are different.",
        }
      : sig === "VALID"
      ? { label: "File matches the publisher's release", tone: "good", detail: "Every byte is identical. Nothing was changed or added." }
      : {
          label: "File matches the publisher's release",
          tone: "neutral",
          detail: "It matches the signature file, but that signature can't be trusted, so this proves nothing.",
        };

  // 3. Is the release still valid?
  const releaseCheck: CheckLine =
    record?.status === "ACTIVE"
      ? { label: "Release hasn't been withdrawn", tone: "good", detail: "The publisher hasn't withdrawn or replaced it." }
      : record?.status === "SUPERSEDED"
      ? { label: "Release hasn't been withdrawn", tone: "warn", detail: "The publisher has released a newer version." }
      : record?.status === "REVOKED"
      ? {
          label: "Release hasn't been withdrawn",
          tone: "bad",
          detail: `The publisher withdrew it${record.revokeReason ? `: “${record.revokeReason}”` : "."}`,
        }
      : v.status === "NETWORK_ERROR"
      ? { label: "Release hasn't been withdrawn", tone: "neutral", detail: "Couldn't check — the registry was unreachable." }
      : { label: "Release hasn't been withdrawn", tone: "neutral", detail: "This release isn't registered, so we can't tell." }

  // 4. Viruses — always honest: we never scan.
  const virusCheck: CheckLine = {
    label: "Virus scan",
    tone: "neutral",
    detail: "Not scanned. A genuine file can still contain bugs or malware if the publisher shipped them.",
  };

  const checks = [publisherCheck, fileCheck, releaseCheck, virusCheck];

  switch (v.status) {
    case "MATCHING_AUTHENTICATED_RELEASE":
      return {
        tone: "good",
        title: "This file is genuine",
        meaning: "It's exactly the file the publisher released, and the release is still valid.",
        action: "You can trust where this file came from. Use your usual antivirus if you're unsure about the software itself.",
        checks,
      };
    case "HASH_MISMATCH":
      return {
        tone: "bad",
        title: "This file has been changed",
        meaning: "It doesn't match what the publisher released. It may be incomplete, corrupted, or tampered with.",
        action: "Don't open or install it. Download it again from the publisher's official website.",
        checks,
      };
    case "INVALID_MANIFEST_SIGNATURE":
      return {
        tone: "bad",
        title: "The signature isn't real",
        meaning: "The signature file wasn't signed by this publisher, or someone edited it.",
        action: "Don't trust this download. Get both the file and its signature file from the official source.",
        checks,
      };
    case "UNAUTHORIZED_KEY":
      return {
        tone: "bad",
        title: "This publisher is no longer trusted",
        meaning: "The publisher's access has been removed from the registry.",
        action: "Don't use this file until the publisher is trusted again.",
        checks,
      };
    case "REVOKED_RELEASE":
      return {
        tone: "bad",
        title: "The publisher withdrew this release",
        meaning: "The file is genuine, but the publisher has marked this version as unsafe or broken.",
        action: "Don't use it. Download the latest version from the publisher.",
        checks,
      };
    case "SUPERSEDED_RELEASE":
      return {
        tone: "warn",
        title: "Genuine, but out of date",
        meaning: "This is a real release from the publisher, but a newer version is available.",
        action: "Consider downloading the latest version.",
        checks,
      };
    case "NETWORK_ERROR":
      return {
        tone: fi.status === "MATCH" ? "neutral" : "bad",
        title: "Couldn't reach the registry",
        meaning: "We checked the file itself, but couldn't look up the publisher to confirm it.",
        action: "Check your internet connection and try again.",
        checks,
      };
    case "UNKNOWN_RELEASE":
      return sig === "KEY_NOT_FOUND"
        ? {
            tone: "warn",
            title: "We can't confirm who made this",
            meaning: "This publisher isn't registered with Penguin Trace, so there's no trusted signature to check against.",
            action: "Only use this file if you trust where you downloaded it from.",
            checks,
          }
        : {
            tone: "warn",
            title: "Signed, but not registered",
            meaning: "The publisher signed this file, but never registered this release, so we can't tell if it was later withdrawn.",
            action: "It's probably fine, but you can ask the publisher to register their releases.",
            checks,
          };
    default:
      return {
        tone: "neutral",
        title: "Check incomplete",
        meaning: v.summary,
        action: "Try again.",
        checks,
      };
  }
}
