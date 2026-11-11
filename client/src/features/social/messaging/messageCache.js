/**
 * Centralized reconciliation of HTTP and Socket.IO message updates.
 * Infinite query pages are newest-first; each page contains oldest-first items.
 * The same clientId survives retries and reconnects, preventing duplicate bubbles.
 */
export function mergeMessage(data, message) {
  if (!message || (!message._id && !message.clientId)) return data;
  const empty = { pages: [{ items: [], nextCursor: null }], pageParams: [null] };
  const current = data?.pages?.length ? data : empty;
  const exists = current.pages.some((p) => (p.items || []).some((m) =>
    (message._id && m._id === message._id) || (message.clientId && m.clientId === message.clientId)));
  let merged = false;
  const pages = current.pages.map((page) => ({
    ...page,
    items: (page.items || []).flatMap((entry) => {
      const match = (message._id && entry._id === message._id) || (message.clientId && entry.clientId === message.clientId);
      if (!match) return [entry];
      if (merged) return [];
      merged = true;
      const stored = message._id && !String(message._id).startsWith("pending:");
      return [{ ...entry, ...message, ...(stored ? {
        // A Socket.IO/HTTP acknowledgement supersedes blob previews.
        localAttachments: undefined, uploadStage: undefined, uploadPercent: undefined,
        retryPayload: undefined, sendingState: undefined,
      } : { sendingState: message.sendingState || entry.sendingState }) }];
    }),
  }));
  if (!exists) pages[0].items.push(message);
  // Keep each page ordered by creation time. A stable ID tie-breaker preserves rapid sends.
  pages.forEach((page) => page.items.sort((a, b) =>
    new Date(a.createdAt || 0) - new Date(b.createdAt || 0) || String(a.clientId || a._id).localeCompare(String(b.clientId || b._id))));
  return { ...current, pages };
}

export function markMessageFailed(data, clientId) {
  if (!data?.pages) return data;
  return { ...data, pages: data.pages.map((page) => ({ ...page,
    items: page.items.map((m) => m.clientId === clientId && String(m._id).startsWith("pending:") ? { ...m, sendingState: "failed" } : m),
  })) };
}

export function updateMessage(data, messageId, change) {
  if (!data?.pages) return data;
  return { ...data, pages: data.pages.map((page) => ({ ...page,
    items: page.items.map((m) => m._id === messageId ? { ...m, ...(typeof change === "function" ? change(m) : change) } : m),
  })) };
}

export function hideMessage(data, messageId) {
  if (!data?.pages) return data;
  return { ...data, pages: data.pages.map((page) => ({ ...page,
    items: page.items.filter((m) => m._id !== messageId),
  })) };
}

export function markReceipt(data, { type, userId, messageId, readAt }) {
  if (!data?.pages) return data;
  return { ...data, pages: data.pages.map((page) => ({ ...page, items: page.items.map((m) => {
    if (messageId && m._id !== messageId) return m;
    if (type === "read" && readAt && new Date(m.createdAt) > new Date(readAt)) return m;
    const field = type === "read" ? "readBy" : "deliveredTo";
    if (m[field]?.includes(userId)) return m;
    return { ...m, [field]: [...(m[field] || []), userId] };
  }) })) };
}

export function messageDeliveryState(message, recipients = []) {
  if (message.sendingState === "failed") return "failed";
  if (message.sendingState === "sending" || String(message._id).startsWith("pending:")) return "sending";
  if (!recipients.length) return "sent";
  if (recipients.every((id) => message.readBy?.includes(id))) return "seen";
  if (recipients.every((id) => message.deliveredTo?.includes(id))) return "delivered";
  return "sent";
}

export function messagesInChronologicalOrder(data) {
  const seen = new Set();
  return [...(data?.pages || [])].reverse().flatMap((page) => page.items || []).filter((m) => {
    const key = m.clientId || m._id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0) || String(a._id).localeCompare(String(b._id)));
}

/** Remove only a local optimistic message when the composer retains a failed draft. */
export function removePendingMessage(data, clientId) {
  if (!data?.pages) return data;
  return { ...data, pages: data.pages.map((page) => ({ ...page,
    items: (page.items || []).filter((m) => !(m.clientId === clientId && String(m._id).startsWith("pending:"))),
  })) };
}
