export const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';
export const ANTHROPIC_API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';
export const CARTESIA_API_KEY = process.env.EXPO_PUBLIC_CARTESIA_API_KEY ?? '';

if (__DEV__) {
  if (!OPENAI_API_KEY) console.warn('[EmpathAI] Missing EXPO_PUBLIC_OPENAI_API_KEY');
  if (!ANTHROPIC_API_KEY) console.warn('[EmpathAI] Missing EXPO_PUBLIC_ANTHROPIC_API_KEY');
  if (!CARTESIA_API_KEY) console.warn('[EmpathAI] Missing EXPO_PUBLIC_CARTESIA_API_KEY');
}
