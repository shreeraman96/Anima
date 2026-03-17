import { OPENAI_API_KEY } from '../constants/config';

export async function transcribeAudio(audioUri: string): Promise<string> {
  const formData = new FormData();

  // expo-av records in m4a on iOS — Whisper accepts it natively
  formData.append('file', {
    uri: audioUri,
    name: 'recording.m4a',
    type: 'audio/m4a',
  } as unknown as Blob);

  formData.append('model', 'whisper-1');
  formData.append('language', 'en');
  formData.append('response_format', 'json');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      // Do NOT set Content-Type — fetch sets multipart boundary automatically
    },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Whisper API ${response.status}: ${err}`);
  }

  const data = await response.json();
  return (data.text as string).trim();
}
