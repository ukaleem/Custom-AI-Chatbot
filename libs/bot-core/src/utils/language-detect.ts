import { ILLMProvider } from '@custom-ai-chatbot/shared-types';

const LANG_PATTERNS: Record<string, RegExp> = {
  it: /\b(ciao|salve|buon|grazie|prego|sì|come|dove|quando|voglio|vorrei|ho|sono)\b/i,
  de: /\b(hallo|guten|danke|bitte|ich|Sie|wie|wo|wann|möchte|haben|sind)\b/i,
  fr: /\b(bonjour|salut|merci|oui|non|je|vous|comment|où|quand|voudrais|suis)\b/i,
  es: /\b(hola|gracias|por favor|sí|no|yo|usted|cómo|dónde|cuándo|quiero|soy)\b/i,
};

export function detectLanguageHeuristic(text: string): string | null {
  for (const [lang, pattern] of Object.entries(LANG_PATTERNS)) {
    if (pattern.test(text)) return lang;
  }
  return null;
}

export async function detectLanguage(
  text: string,
  llm: ILLMProvider,
): Promise<string> {
  // Fast heuristic first — avoids an LLM call for obvious cases
  const heuristic = detectLanguageHeuristic(text);
  if (heuristic) return heuristic;

  // Fall back to LLM detection
  try {
    return await llm.detectLanguage(text);
  } catch {
    return 'en';
  }
}
