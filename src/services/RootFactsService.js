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
  // jadi pipeline-nya berbeda dari model generatif berbasis chat.
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
          dtype: LLM_CONFIG.dtype,
          device,
          progress_callback: (info) => {
            if (info.status === 'progress' && info.progress != null) {
              fileProgress[info.name || 'main'] = info.progress;
              const values = Object.values(fileProgress);
              const avg = values.reduce((a, b) => a + b, 0) / values.length;
              onProgress && onProgress(10 + Math.round(avg * 88));
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
  // Kita paksa output bahasa Inggris supaya tidak tercampur bahasa lain.
  _buildPrompt(vegetableName) {
    const toneSuffix = {
      normal: '',
      funny: ' Use a funny and humorous tone.',
      professional: ' Explain it like an expert teacher.',
      casual: ' Include a historical fact or origin story.',
    };

    const suffix = toneSuffix[this.currentTone] || '';

    return (
      `Answer in English only. Describe one interesting fun fact about ${vegetableName}.${suffix} ` +
      'Keep the answer under 60 words.'
    );
  }

  // Generate fun fact berdasarkan nama sayuran yang terdeteksi.
  // Pakai greedy decoding (do_sample: false) supaya output tidak looping/ngaco.
  async generateFacts(vegetableName) {
    if (!this.isReady() || this.isGenerating) return null;

    this.isGenerating = true;
    try {
      const prompt = this._buildPrompt(vegetableName);

      // Flan-T5 menerima string biasa sebagai input, bukan array messages
      const output = await this.generator(prompt, {
        max_new_tokens: LLM_CONFIG.maxNewTokens,
        do_sample: LLM_CONFIG.doSample,
        repetition_penalty: LLM_CONFIG.repetitionPenalty,
        no_repeat_ngram_size: LLM_CONFIG.noRepeatNgramSize,
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
