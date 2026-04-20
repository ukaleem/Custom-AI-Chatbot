const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /you\s+are\s+now\s+(a\s+)?/i,
  /forget\s+(everything|all|your)/i,
  /act\s+as\s+(if\s+you\s+are|a\s+)/i,
  /system\s*:\s*/i,
  /<\s*\/?system\s*>/i,
  /\[INST\]/i,
  /###\s*instruction/i,
];

export function sanitizeUserInput(input: string): string {
  let clean = input.trim().slice(0, 2000);

  // Strip any HTML/XML tags
  clean = clean.replace(/<[^>]*>/g, '');

  // Neutralise prompt injection attempts
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(clean)) {
      return '[message removed: invalid input]';
    }
  }

  return clean;
}

export function isInjectionAttempt(input: string): boolean {
  return INJECTION_PATTERNS.some((p) => p.test(input));
}
