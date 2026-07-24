import { pipeline } from '@huggingface/transformers';
import { TONE_CONFIG, LLM_CONFIG } from '../utils/config.js';
import { isWebGPUSupported, logError } from '../utils/common.js';

export class RootFactsService {
  constructor() {
    this.generator = null;
    this.isModelLoaded = false;
    this.isGenerating = false;
    this.config = null;
    this.currentBackend = null;
    this.currentTone = TONE_CONFIG.defaultTone;
  }

  // Muat model bahasa dari Hugging Face lewat Transformers.js.
  // LaMini-Flan-T5 adalah model text2text-generation (encoder-decoder).
  // Kita tidak set dtype supaya pakai fp32 default — quantisasi (q8/q4)
  // terbukti merusak output untuk arsitektur T5.
  async loadModel(onProgress) {
    try {
      const device = isWebGPUSupported() ? 'webgpu' : 'wasm';
      this.currentBackend = device;
      console.log(`🤖 RootFactsService: pakai device=${device}`);

      onProgress && onProgress(10);

      // Track progress per file supaya persentase tidak naik-turun.
      // Transformers.js mengunduh banyak file paralel (tokenizer, weights, dll),
      // tiap file laporkan progress 0-1 masing-masing. Kita rata-rata semuanya.
      const fileProgress = {};

      this.generator = await pipeline(
        'text2text-generation', // Flan-T5 pakai text2text, bukan text-generation
        LLM_CONFIG.modelId,
        {
          // dtype tidak diset = pakai fp32 default yang paling stabil
          device,
          progress_callback: (info) => {
            if (info.status === 'progress' && info.progress != null) {
              fileProgress[info.name || 'main'] = info.progress;
              const values = Object.values(fileProgress);
              const avg = values.reduce((a, b) => a + b, 0) / values.length;
              // info.progress adalah 0-100 (persen), bukan 0-1, jadi kalikan 0.88
              onProgress && onProgress(10 + Math.round(avg * 0.88));
            }
          },
        }
      );

      this.isModelLoaded = true;
      onProgress && onProgress(100);
      console.log('✅ RootFactsService: model berhasil dimuat');
      return true;
    } catch (error) {
      logError('RootFactsService.loadModel', error);
      throw error;
    }
  }

  // Ganti tone/persona yang dipakai saat generate fakta
  setTone(tone) {
    const validTones = TONE_CONFIG.availableTones.map((t) => t.value);
    if (validTones.includes(tone)) {
      this.currentTone = tone;
    }
  }

  // Buat prompt instruksi langsung (tanpa format chat).
  // Flan-T5 dilatih untuk mengikuti instruksi teks biasa dalam bahasa Inggris.
  _buildPrompt(vegetableName) {
    const toneSuffix = {
      normal: '',
      funny: ' Write it in a funny and humorous way.',
      professional: ' Explain it like an expert scientist or teacher.',
      casual: ' Include a historical fact or where it originally came from.',
    };

    const suffix = toneSuffix[this.currentTone] || '';

    return (
      `Write one interesting fun fact about ${vegetableName} in English.${suffix} ` +
      'Maximum 60 words.'
    );
  }

  // Generate fun fact berdasarkan nama sayuran yang terdeteksi.
  // Pakai beam search (num_beams: 2) yang lebih stabil dan konsisten
  // dibanding greedy decoding untuk model T5 kecil.
  async generateFacts(vegetableName) {
    if (!this.isReady() || this.isGenerating) return null;

    this.isGenerating = true;
    try {
      const prompt = this._buildPrompt(vegetableName);

      const output = await this.generator(prompt, {
        max_new_tokens: LLM_CONFIG.maxNewTokens,
        num_beams: LLM_CONFIG.numBeams,
        early_stopping: LLM_CONFIG.earlyStop,
        repetition_penalty: LLM_CONFIG.repetitionPenalty,
      });

      // Output text2text-generation: [{ generated_text: "..." }]
      const text = output?.[0]?.generated_text?.trim() || '';

      return text || null;
    } catch (error) {
      logError('RootFactsService.generateFacts', error);
      return null;
    } finally {
      this.isGenerating = false;
    }
  }

  // Cek apakah model sudah siap dipakai untuk generate
  isReady() {
    return this.isModelLoaded && !!this.generator;
  }
}
