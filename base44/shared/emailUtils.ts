// Fixes emails that got scrambled during PDF text extraction due to mixed
// RTL/LTR bidi reordering (e.g. "com.gmail@7829333orfarada" instead of
// "orfarada7829333@gmail.com"). The underlying issue: the PDF renderer
// reverses the ORDER of alnum "runs" (letter-runs, digit-runs, punctuation)
// within an LTR email string when it's embedded in an RTL paragraph, while
// keeping each run's internal characters intact. Reversing the run order
// restores the original email.
const VALID_EMAIL = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

export function fixScrambledEmail(email: string): string {
  if (!email) return email;
  const trimmed = email.trim();
  if (VALID_EMAIL.test(trimmed)) return trimmed;

  const tokens = trimmed.match(/[0-9]+|[a-zA-Z]+|./g) || [];
  const reversed = tokens.reverse().join('');
  if (VALID_EMAIL.test(reversed)) return reversed;

  return trimmed;
}