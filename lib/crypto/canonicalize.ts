/**
 * RFC 8785: JSON Canonicalization Scheme (JCS)
 * Specification: https://www.rfc-editor.org/rfc/rfc8785
 *
 * Implements deterministic canonical JSON serialization for cryptographic manifest payloads.
 */

export function canonicalizeRfc8785(data: unknown): string {
  if (data === null) {
    return "null";
  }

  if (typeof data === "boolean") {
    return data ? "true" : "false";
  }

  if (typeof data === "number") {
    if (!Number.isFinite(data)) {
      throw new TypeError("RFC 8785 prohibits NaN and Infinity");
    }
    // ECMAScript Number serialization is canonical for JCS
    return Object.is(data, -0) ? "0" : data.toString();
  }

  if (typeof data === "string") {
    return JSON.stringify(data);
  }

  if (Array.isArray(data)) {
    const elements = data.map((item) => {
      if (item === undefined || typeof item === "symbol" || typeof item === "function") {
        return "null";
      }
      return canonicalizeRfc8785(item);
    });
    return `[${elements.join(",")}]`;
  }

  if (typeof data === "object") {
    const keys = Object.keys(data).sort((a, b) => {
      // Sort UTF-16 code units lexicographically per RFC 8785 Section 3.2.3
      const len = Math.min(a.length, b.length);
      for (let i = 0; i < len; i++) {
        const codeA = a.charCodeAt(i);
        const codeB = b.charCodeAt(i);
        if (codeA !== codeB) {
          return codeA - codeB;
        }
      }
      return a.length - b.length;
    });

    const entries: string[] = [];
    for (const key of keys) {
      const value = (data as Record<string, unknown>)[key];
      // RFC 8785: undefined, symbols, and functions in objects are omitted
      if (value === undefined || typeof value === "symbol" || typeof value === "function") {
        continue;
      }
      entries.push(`${JSON.stringify(key)}:${canonicalizeRfc8785(value)}`);
    }

    return `{${entries.join(",")}}`;
  }

  throw new TypeError(`Unsupported type in RFC 8785 serialization: ${typeof data}`);
}
