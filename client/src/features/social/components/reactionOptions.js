// Only the quick toolbar is curated. The full emoji picker has no six-emoji limit.
export const REACTION_OPTIONS = Object.freeze([
  { emoji: "👍", label: "Like" },
  { emoji: "❤️", label: "Love" },
  { emoji: "😆", label: "Laugh" },
  { emoji: "😮", label: "Surprised" },
  { emoji: "😢", label: "Sad" },
  { emoji: "🎉", label: "Celebrate" },
]);

// A single Unicode emoji grapheme, not a text string or a series of emojis.
// The server independently checks the same rule before persisting reactions.
export function isSupportedReactionEmoji(value) {
  if (typeof value !== "string" || !value.length || value.length > 64) return false;
  if (!/[\p{Emoji_Presentation}\p{Extended_Pictographic}\u20e3]/u.test(value)) return false;
  if (/[\s\p{Cc}]/u.test(value)) return false;
  const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(value);
  const first = graphemes[Symbol.iterator]();
  const current = first.next();
  return !current.done && current.value.segment === value && first.next().done;
}

export function nextReaction(selectedEmoji, chosenEmoji) {
  if (!isSupportedReactionEmoji(chosenEmoji)) return undefined;
  return selectedEmoji === chosenEmoji ? null : chosenEmoji;
}
