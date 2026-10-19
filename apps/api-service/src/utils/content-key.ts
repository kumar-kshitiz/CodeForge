const INLINE_PREFIX = "inline-base64:";

export function createInlineContentKey(content: string): string {
  return `${INLINE_PREFIX}${Buffer.from(content, "utf8").toString("base64")}`;
}

export function resolveContentKey(key: string): string {
  if (!key.startsWith(INLINE_PREFIX)) {
    throw new Error(
      `Unsupported content key. Expected ${INLINE_PREFIX} or a configured object-storage adapter.`,
    );
  }

  return Buffer.from(key.slice(INLINE_PREFIX.length), "base64").toString(
    "utf8",
  );
}
