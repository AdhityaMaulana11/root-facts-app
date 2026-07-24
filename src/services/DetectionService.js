import * as tf from '@tensorflow/tfjs';
import { isWebGPUSupported, validateModelMetadata, logError } from '../utils/common.js';

export class DetectionService {
  constructor() {
    this.model = null;
    this.labels = [];
    this.config = null;
    this.backendUsed = null;
  }

  // Muat model TensorFlow dan metadata label dari folder /model.
  // Sebelum load, kita cek dulu apakah browser support WebGPU —
  // kalau iya, pakai WebGPU; kalau tidak, fallback ke WebGL.
  async loadModel(onProgress) {
    try {
      if (isWebGPUSupported()) {
        try {
          await import('@tensorflow/tfjs-backend-webgpu');
          await tf.setBackend('webgpu');
          await tf.ready();
          this.backendUsed = 'webgpu';
          console.log('✅ TensorFlow.js menggunakan backend WebGPU');
        } catch {
          console.warn('⚠️ WebGPU gagal, beralih ke WebGL');
          await tf.setBackend('webgl');
          await tf.ready();
          this.backendUsed = 'webgl';
        }
      } else {
        await tf.setBackend('webgl');
        await tf.ready();
        this.backendUsed = 'webgl';
        console.log('✅ TensorFlow.js menggunakan backend WebGL');
      }

      onProgress && onProgress(20);

      // Load model dan metadata secara bersamaan biar lebih cepat
      const [model, metaResponse] = await Promise.all([
        tf.loadLayersModel('/model/model.json', {
          onProgress: (fraction) => {
            onProgress && onProgress(20 + Math.round(fraction * 70));
          },
        }),
        fetch('/model/metadata.json'),
      ]);

      const metadata = await metaResponse.json();

      if (!validateModelMetadata(metadata)) {
        throw new Error('Metadata model tidak valid');
      }

      this.model = model;
      this.labels = metadata.labels;
      this.config = metadata;

      onProgress && onProgress(100);
      console.log(
        `✅ DetectionService siap. Backend: ${this.backendUsed}, Label: ${this.labels.length}`
      );

      return true;
    } catch (error) {
      logError('DetectionService.loadModel', error);
      throw error;
    }
  }

  // Jalankan prediksi pada frame video yang diberikan.
  // Semua tensor dibungkus tf.tidy() supaya memori otomatis dibersihkan
  // setelah selesai — penting biar browser tidak lemot setelah pakai lama.
  async predict(imageElement) {
    if (!this.isLoaded() || !imageElement) return null;

    return tf.tidy(() => {
      const imageSize = this.config?.imageSize || 224;

      // Ubah frame jadi tensor, resize, lalu normalisasi ke rentang [-1, 1]
      const tensor = tf.browser
        .fromPixels(imageElement)
        .resizeBilinear([imageSize, imageSize])
        .toFloat()
        .div(127.5)
        .sub(1)
        .expandDims(0);

      const predictions = this.model.predict(tensor);
      const scores = predictions.dataSync();

      // Cari label dengan skor tertinggi
      let maxScore = 0;
      let maxIndex = 0;
      for (let i = 0; i < scores.length; i++) {
        if (scores[i] > maxScore) {
          maxScore = scores[i];
          maxIndex = i;
        }
      }

      return {
        className: this.labels[maxIndex] || 'Unknown',
        score: maxScore,
        confidence: Math.round(maxScore * 100),
        isValid: maxScore > 0,
        allScores: Array.from(scores).map((s, i) => ({
          label: this.labels[i],
          score: s,
        })),
      };
    });
  }

  // Cek apakah model sudah ter-load dan siap dipakai
  isLoaded() {
    return !!(this.model && this.labels.length > 0);
  }
}
