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

// Konfigurasi model bahasa yang dipakai untuk generate fun fact
export const LLM_CONFIG = {
  modelId: 'Xenova/TinyLlama-1.1B-Chat-v1.0',
  dtype: 'q4', // quantized 4-bit biar ringan di browser
  maxNewTokens: 120,
  temperature: 0.8,
  topP: 0.9,
  doSample: true,
};

// Validasi apakah hasil deteksi layak ditampilkan ke pengguna
export const isValidDetection = (result) => {
  const { detectionConfidenceThreshold } = APP_CONFIG;
  return result && result.isValid && result.confidence >= detectionConfidenceThreshold;
};
