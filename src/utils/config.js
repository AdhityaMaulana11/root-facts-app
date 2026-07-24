// Konfigurasi umum aplikasi
export const APP_CONFIG = {
  detectionConfidenceThreshold: 70, // persen minimum confidence biar dianggap valid
  analyzingDelay: 1500,
  factsGenerationDelay: 1000,
  detectionRetryInterval: 100,
  defaultFps: 30,
};

// Batas FPS untuk detection loop
export const FPS_CONFIG = {
  default: 30,
  min: 1,
  max: 60,
  step: 1,
};

// Pilihan gaya bahasa (persona) saat generate fakta
export const TONE_CONFIG = {
  availableTones: [
    { value: 'normal', label: 'Normal' },
    { value: 'funny', label: 'Lucu 😄' },
    { value: 'professional', label: 'Edukatif 📚' },
    { value: 'casual', label: 'Bersejarah 🏛️' },
  ],
  defaultTone: 'normal',
};

// Konfigurasi model bahasa yang dipakai untuk generate fun fact.
// Pakai fp32 (default) supaya bobot model tidak corrupt — penting untuk encoder-decoder T5.
export const LLM_CONFIG = {
  modelId: 'Xenova/LaMini-Flan-T5-77M',
  // dtype sengaja tidak diset, pakai default fp32 — q8/q4 bikin output corrupt di T5
  maxNewTokens: 80,
  numBeams: 2,        // beam search jauh lebih stabil dari greedy untuk model T5
  earlyStop: true,    // berhenti begitu beam terbaik selesai
  repetitionPenalty: 1.3,
};

// Validasi apakah hasil deteksi layak ditampilkan ke pengguna
export const isValidDetection = (result) => {
  const { detectionConfidenceThreshold } = APP_CONFIG;
  return result && result.isValid && result.confidence >= detectionConfidenceThreshold;
};
