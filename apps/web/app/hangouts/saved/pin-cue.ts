import {
  savedPeriod,
  type SavedPin,
} from "../../../lib/saved-hangouts-types.ts";

// Visual hints only. The source has no persisted category field.
const cues: { pattern: RegExp; emoji: string }[] = [
  { pattern: /taco|burrito|quesadilla|mexican/i, emoji: "🌮" },
  { pattern: /pizza|slice/i, emoji: "🍕" },
  { pattern: /coffee|cafe|latte|espresso/i, emoji: "☕" },
  { pattern: /music|concert|karaoke|band/i, emoji: "🎵" },
  { pattern: /hike|walk|trail|outdoors/i, emoji: "🥾" },
  { pattern: /study|library|book|reading/i, emoji: "📚" },
  { pattern: /volleyball/i, emoji: "🏐" },
  { pattern: /soccer/i, emoji: "⚽" },
  { pattern: /basketball/i, emoji: "🏀" },
  { pattern: /art|paint|draw|craft/i, emoji: "🎨" },
  { pattern: /game|board|dice|trivia/i, emoji: "🎲" },
  { pattern: /food|dinner|lunch|breakfast|brunch|eat/i, emoji: "🍽️" },
];
export function pinCue(item: Pick<SavedPin, "title" | "description">) {
  const words = `${item.title} ${item.description ?? ""}`;
  return cues.find((cue) => cue.pattern.test(words))?.emoji ?? "📍";
}
export function pinPeriod(item: Pick<SavedPin, "starts_at">, now: Date) {
  return savedPeriod(now, new Date(item.starts_at)) ?? "later";
}
