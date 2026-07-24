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

  // Muat model bahasa (LLM) dari Hugging Face lewat Transformers.js.
  // Sama seperti DetectionService, kita cek WebGPU dulu —
  // kalau tidak support, fallback ke WASM yang lebih kompatibel.
  async loadModel(onProgress) {
    try {
      const device = isWebGPUSupported() ? 'webgpu' : 'wasm';
      this.currentBackend = device;
      console.log(`🤖 RootFactsService: pakai device=${device}`);

      onProgress && onProgress(10);

      this.generator = await pipeline(
        'text-generation',
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

  // Buat prompt berdasarkan nama sayuran dan tone yang sedang aktif
  _buildPrompt(vegetableName) {
    const toneInstructions = {
      normal: '',
      funny: 'Answer in a funny and humorous style. ',
      professional: 'Answer like an expert teacher or professor. ',
      casual: 'Include a historical fact or origin story. ',
    };

    const tonePrefix = toneInstructions[this.currentTone] || '';

    return (
      `${tonePrefix}Tell me one interesting fun fact about ${vegetableName}. ` +
      'Keep your response under 80 words. Be concise and engaging.'
    );
  }

  // Generate fun fact berdasarkan nama sayuran yang terdeteksi.
  // Pakai flag isGenerating supaya tidak ada dua request jalan bersamaan.
  async generateFacts(vegetableName) {
    if (!this.isReady() || this.isGenerating) return null;

    this.isGenerating = true;
    try {
      const prompt = this._buildPrompt(vegetableName);

      const messages = [
        {
          role: 'system',
          content:
            'You are a knowledgeable assistant that provides short, fascinating facts about vegetables.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ];

      const output = await this.generator(messages, {
        max_new_tokens: LLM_CONFIG.maxNewTokens,
        temperature: LLM_CONFIG.temperature,
        top_p: LLM_CONFIG.topP,
        do_sample: LLM_CONFIG.doSample,
      });

      // Ambil teks hasil generasi — format output beda tergantung versi model
      const result = output?.[0]?.generated_text;
      let text = '';

      if (Array.isArray(result)) {
        // Format chat: cari pesan terakhir dari role 'assistant'
        const assistantMsg = [...result].reverse().find((m) => m.role === 'assistant');
        text = assistantMsg?.content?.trim() || '';
      } else if (typeof result === 'string') {
        // Format string biasa: hapus bagian prompt-nya
        text = result.replace(prompt, '').trim();
      }

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
