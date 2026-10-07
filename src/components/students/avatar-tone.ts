/**
 * A stable gradient for a person's initials avatar, picked from their name.
 *
 * Decoration only: the same name always gets the same colour, so a student is
 * easy to spot again in a long list, but the name itself is always shown next
 * to it — the colour never identifies anyone on its own.
 */

const TONES = [
  "from-violet-500 to-fuchsia-500",
  "from-sky-500 to-indigo-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-500",
  "from-cyan-500 to-blue-500",
  "from-purple-500 to-indigo-500",
  "from-lime-500 to-emerald-500",
] as const;

export function avatarTone(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return `bg-gradient-to-br text-white font-semibold ${TONES[Math.abs(hash) % TONES.length]}`;
}
