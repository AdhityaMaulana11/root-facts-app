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
  // LaMini-Flan-T5 adalah model text2text-generation (bukan chat),
  // jadi pipeline-nya berbeda dari model TinyLlama sebelumnya.
  async loadModel(onProgress) {
    try {
      const device = isWebGPUSupported() ? 'webgpu' : 'wasm';
      this.currentBackend = device;
      console.log(`🤖 RootFactsService: pakai device=${device}`);

      onProgress && onProgress(10);

      this.generator = await pipeline(
        'text2text-generation', // Flan-T5 pakai text2text, bukan text-generation
        LLM_CONFIG.modelId,
        {
          dtype: LLM_CONFIG.dtype,
          device,
          progress_callback: (info) => {
            if (info.status === 'progress' && info.progress != null) {
              onProgress && onProgress(10 + Math.round(info.progress * 0.88));
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
  // Flan-T5 dilatih untuk mengikuti instruksi teks biasa,
  // jadi kita cukup tulis perintahnya secara langsung.
  _buildPrompt(vegetableName) {
    const toneSuffix = {
      normal: '',
      funny: ' Use a funny and humorous tone.',
      professional: ' Explain it like an expert teacher.',
      casual: ' Include a historical fact or origin story.',
    };

    const suffix = toneSuffix[this.currentTone] || '';

    return (
      `Describe one interesting fun fact about ${vegetableName}.${suffix} ` +
      'Keep the answer under 80 words.'
    );
  }

  // Generate fun fact berdasarkan nama sayuran yang terdeteksi.
  // Output Flan-T5 lebih sederhana — langsung berupa string teks.
  async generateFacts(vegetableName) {
    if (!this.isReady() || this.isGenerating) return null;

    this.isGenerating = true;
    try {
      const prompt = this._buildPrompt(vegetableName);

      // Flan-T5 menerima string biasa sebagai input, bukan array messages
      const output = await this.generator(prompt, {
        max_new_tokens: LLM_CONFIG.maxNewTokens,
        temperature: LLM_CONFIG.temperature,
        top_p: LLM_CONFIG.topP,
        do_sample: LLM_CONFIG.doSample,
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
