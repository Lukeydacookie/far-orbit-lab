// Spelling help proposes a nearby authored answer; it never awards points.
// The player explicitly confirms a correction while the same timer keeps running.
function editDistance(a, b) {
  const rows = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) rows[i][0] = i;
  for (let j = 0; j <= b.length; j++) rows[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      // Adjacent swapped letters count as one typo: spanihs → spanish.
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
      }
    }
  }
  return rows[a.length][b.length];
}

function suggestAnswers(puzzle, word) {
  const typed = normalize(word);
  if (typed.length < 4) return [];
  const limit = typed.length >= 8 ? 2 : 1;
  const clues = new Set(puzzle.clues.map(normalize));
  const candidates = new Map();
  for (const tier of puzzle.tiers) {
    for (const names of tier.answers) {
      let best = null;
      for (const name of names) {
        const key = normalize(name);
        if (clues.has(key) || Math.abs(key.length - typed.length) > limit) continue;
        const distance = editDistance(typed, key);
        if (distance > 0 && distance <= limit && (!best || distance < best.distance)) best = { name, distance };
      }
      if (best) {
        const key = normalize(names[0]);
        if (!candidates.has(key) || best.distance < candidates.get(key).distance) candidates.set(key, best);
      }
    }
  }
  const matches = [...candidates.values()].sort((a, b) => a.distance - b.distance || a.name.localeCompare(b.name));
  if (!matches.length) return [];
  // Show equally close alternatives, without preferring a higher scoring tier.
  return matches.filter((item) => item.distance === matches[0].distance).slice(0, 3).map((item) => item.name);
}
