export interface CuratedVoice {
  id: string;
  name: string;
  description: string;
  gender: 'female' | 'male';
}

export const DEFAULT_VOICE_ID = 'e3827ec5-697a-4b7c-9704-1a23041bbc51'; // Sweet Lady

// 6 female + 6 male = 12 curated Cartesia voices
export const CURATED_VOICES: CuratedVoice[] = [
  // Female (6)
  { id: 'e3827ec5-697a-4b7c-9704-1a23041bbc51', name: 'Sweet Lady',          description: 'Gentle, intimate, reassuring',      gender: 'female' },
  { id: 'a3520a8f-226a-428d-9fcd-b0a4711a6829', name: 'Reflective Woman',    description: 'Thoughtful, empathetic, nurturing', gender: 'female' },
  { id: 'cd17ff2d-5ea4-4695-be8f-42193949b946', name: 'Meditation Lady',     description: 'Soft, slow, soothing',              gender: 'female' },
  { id: '00a77add-48d5-4ef6-8157-71e5437b282d', name: 'Calm Lady',           description: 'Even-toned, measured, anchoring',  gender: 'female' },
  { id: '248be419-c632-4f23-adf1-5324ed7dbf1d', name: 'Professional Woman',  description: 'Clear, direct, balanced',           gender: 'female' },
  { id: '15a9cd88-84b0-4a8b-95f2-5d583b54c72e', name: 'Reading Lady',        description: 'Balanced, unhurried, clear',        gender: 'female' },
  // Male (6)
  { id: 'b043dea0-a007-4bbe-a708-769dc0d0c569', name: 'Wise Man',            description: 'Deep, compassionate, fatherly',    gender: 'male' },
  { id: 'f114a467-c40a-4db8-964d-aaba89cd08fa', name: 'Yogaman',             description: 'Centered, slow, grounding',        gender: 'male' },
  { id: '42b39f37-515f-4eee-8546-73e841679c1d', name: 'Wise Guide Man',      description: 'Quiet confidence, steady pace',    gender: 'male' },
  { id: '69267136-1bdc-412f-ad78-0caad210fb40', name: 'Friendly Reading Man', description: 'Warm, conversational, natural',   gender: 'male' },
  { id: 'a167e0f3-df7e-4d52-a9c3-f949145efdab', name: 'Customer Support Man', description: 'Neutral, professional, factual',  gender: 'male' },
  { id: 'ee7ea9f8-c0c1-498c-9279-764d6b56d189', name: 'Polite Man',          description: 'Crisp, matter-of-fact, polished',  gender: 'male' },
];

export function getVoiceById(id: string): CuratedVoice | undefined {
  return CURATED_VOICES.find((v) => v.id === id);
}
