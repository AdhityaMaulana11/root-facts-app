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

  async loadModel(onProgress) {
    try {
      const device = isWebGPUSupported() ? 'webgpu' : 'wasm';
      this.currentBackend = device;
      console.log(`🤖 RootFactsService: pakai device=${device}`);

      onProgress && onProgress(10);

      // Transformers.js download banyak file paralel, tiap file punya progress sendiri.
      // Rata-rata semua file, dan pastikan angkanya cuma bisa naik.
      const fileProgress = {};
      let lastProgress = 10;

      this.generator = await pipeline(
        'text2text-generation', // T5 pakai text2text, bukan text-generation
        LLM_CONFIG.modelId,
        {
          device,
          // dtype sengaja tidak diset — q8/q4 bikin output T5 rusak, pakai fp32 default
          progress_callback: (info) => {
            if (info.status === 'progress' && info.progress != null) {
              fileProgress[info.name || 'main'] = info.progress;
              const values = Object.values(fileProgress);
              const avg = values.reduce((a, b) => a + b, 0) / values.length;
              const next = 10 + Math.round(avg * 0.88);
              if (next > lastProgress) {
                lastProgress = next;
                onProgress && onProgress(lastProgress);
              }
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

  setTone(tone) {
    const validTones = TONE_CONFIG.availableTones.map((t) => t.value);
    if (validTones.includes(tone)) {
      this.currentTone = tone;
    }
  }

  // T5 tidak pakai format chat, cukup instruksi langsung dalam bahasa Inggris
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

  async generateFacts(vegetableName) {
    if (!this.isReady() || this.isGenerating) return null;

    this.isGenerating = true;
    try {
      const prompt = this._buildPrompt(vegetableName);

      // Pakai beam search, hasilnya lebih stabil dari greedy untuk model T5 kecil
      const output = await this.generator(prompt, {
        max_new_tokens: LLM_CONFIG.maxNewTokens,
        num_beams: LLM_CONFIG.numBeams,
        early_stopping: LLM_CONFIG.earlyStop,
        repetition_penalty: LLM_CONFIG.repetitionPenalty,
      });

      const text = output?.[0]?.generated_text?.trim() || '';
      return text || null;
    } catch (error) {
      logError('RootFactsService.generateFacts', error);
      return null;
    } finally {
      this.isGenerating = false;
    }
  }

  isReady() {
    return this.isModelLoaded && !!this.generator;
  }
}
