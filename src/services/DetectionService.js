import * as tf from '@tensorflow/tfjs';
import { isWebGPUSupported, validateModelMetadata, logError } from '../utils/common.js';

export class DetectionService {
  constructor() {
    this.model = null;
    this.labels = [];
    this.config = null;
    this.backendUsed = null;
  }

  async loadModel(onProgress) {
    try {
      // Coba WebGPU dulu, kalau gagal fallback ke WebGL
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

      // Load model dan metadata sekaligus
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

  async predict(imageElement) {
    if (!this.isLoaded() || !imageElement) return null;

    // tf.tidy() penting untuk cegah memory leak di loop deteksi
    return tf.tidy(() => {
      const imageSize = this.config?.imageSize || 224;

      // Resize dan normalisasi ke [-1, 1] sesuai format training
      const tensor = tf.browser
        .fromPixels(imageElement)
        .resizeBilinear([imageSize, imageSize])
        .toFloat()
        .div(127.5)
        .sub(1)
        .expandDims(0);

      const predictions = this.model.predict(tensor);
      const scores = predictions.dataSync();

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

  isLoaded() {
    return !!(this.model && this.labels.length > 0);
  }
}
