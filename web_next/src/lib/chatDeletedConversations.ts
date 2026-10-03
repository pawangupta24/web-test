/**
 * chatDeletedConversations.ts — persisted guard against a deleted conversation
 * reappearing in the Messages list.
 *
 * Deleting a conversation is client-side only (no backend delete endpoint —
 * Messages.tsx's `deleteConv` only clears the message history and resets
 * mute). The server still returns that conversation from `dok.chat.conversations()`,
 * so without remembering "the user deleted this," the very next full
 * conversations refetch — a page reload, or the realtime `bump()` handler's
 * refetch when a brand-new conversation id arrives — brings the tile straight
 * back. Framework-free so it's unit-testable without the React tree, per this
 * repo's convention (see theme.ts / appearance.ts).
 */
const STORAGE_KEY = "dl_deleted_conversations";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export const readDeletedConversationIds = (storage: StorageLike | null | undefined): Set<string> => {
  if (!storage) return new Set();
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.map(String)) : new Set();
  } catch {
    return new Set();
  }
};

export const writeDeletedConversationIds = (storage: StorageLike | null | undefined, ids: Set<string>): void => {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    /* best-effort */
  }
};

/** Filters a freshly-fetched conversation list, dropping anything still marked deleted. */
export const filterOutDeleted = <T extends { id?: unknown }>(
  conversations: T[],
  deletedIds: Set<string>,
  cidOf: (c: T) => unknown,
): T[] => conversations.filter((c) => !deletedIds.has(String(cidOf(c))));
