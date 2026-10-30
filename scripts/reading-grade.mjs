/**
 * reading-grade.mjs: a small tool that scores how hard a piece of text is to read.
 *
 * What this is: the shared reading grade tool. It gives a school grade for a piece of text.
 * Why it exists: we want every part to read at grade 8 or below. One tool means every check counts the same way.
 * How to use it: import fkGrade and pass it a string. It gives back a number, or null when there are no words.
 * Next step: read the notes below on how it counts. It is a guess, so use it to compare text, not to prove a grade.
 *
 * The score is the Flesch-Kincaid grade level: 0.39 x (words per sentence) + 11.8 x (syllables per word) - 15.59.
 * Syllables are counted by vowel groups, minus a silent final e, at least 1 per word. This is a heuristic.
 */

/** Count syllables in one word by vowel groups, minus a silent final e, floor 1. A heuristic. */
export function syllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  const groups = w.match(/[aeiouy]+/g) || [];
  let n = groups.length;
  if (w.endsWith("e") && !w.endsWith("le") && n > 1) n -= 1;
  return Math.max(1, n);
}

/** The words in a text: runs of letters, with inner apostrophes and hyphens kept. */
export const words = (t) => t.match(/[A-Za-z][A-Za-z'’-]*/g) || [];

/** Flesch-Kincaid grade of a text, rounded to two places; null when the text has no words. */
export function fkGrade(text) {
  const w = words(text);
  const sentences = Math.max(1, (text.match(/[.!?]+(\s|$)/g) || []).length);
  if (!w.length) return null;
  const syl = w.reduce((a, x) => a + syllables(x), 0);
  return +(0.39 * (w.length / sentences) + 11.8 * (syl / w.length) - 15.59).toFixed(2);
}
