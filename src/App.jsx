import { useRef, useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import CameraSection from './components/CameraSection';
import InfoPanel from './components/InfoPanel';
import { useAppState } from './hooks/useAppState';
import { CameraService } from './services/CameraService';
import { DetectionService } from './services/DetectionService';
import { RootFactsService } from './services/RootFactsService';
import { APP_CONFIG, FPS_CONFIG, isValidDetection } from './utils/config';
import { getCameraErrorMessage } from './utils/common';

function App() {
  const { state, actions } = useAppState();
  const detectionCleanupRef = useRef(null);
  const isRunningRef = useRef(false);
  const lastPredictionRef = useRef(null);
  const animFrameRef = useRef(null);
  const lastFrameTimeRef = useRef(0);
  const fpsRef = useRef(FPS_CONFIG.default);
  const [currentTone, setCurrentTone] = useState('normal');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [copyToast, setCopyToast] = useState(false);
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('default');

  // ===== Inisialisasi layanan deteksi, kamera, dan generator =====
  useEffect(() => {
    let cancelled = false;

    const initServices = async () => {
      try {
        // Buat instance masing-masing service
        const detector = new DetectionService();
        const camera = new CameraService();
        const generator = new RootFactsService();

        actions.setServices({ detector, camera, generator });

        // --- Muat model TensorFlow ---
        actions.setModelStatus('Memuat TensorFlow...');
        setLoadingProgress(0);

        await detector.loadModel((pct) => {
          if (!cancelled) {
            setLoadingProgress(pct);
            actions.setModelStatus(`Memuat TensorFlow... ${pct}%`);
          }
        });

        if (cancelled) return;
        actions.setModelStatus('Memuat AI...');
        setLoadingProgress(0);

        // --- Muat model Transformers.js ---
        await generator.loadModel((pct) => {
          if (!cancelled) {
            setLoadingProgress(pct);
            actions.setModelStatus(`Memuat AI... ${pct}%`);
          }
        });

        if (cancelled) return;
        actions.setModelStatus('Model AI Siap');
        setLoadingProgress(100);
        console.log('✅ All services initialized');
      } catch (error) {
        if (!cancelled) {
          console.error('❌ Service init failed:', error);
          actions.setModelStatus('Gagal Memuat Model');
          actions.setError('Gagal menginisialisasi model AI. Periksa koneksi internet.');
        }
      }
    };

    initServices();

    return () => {
      cancelled = true;
    };
  // Dijalankan sekali saat mount
  }, []);

  // ===== Bersihkan sumber daya saat komponen ditinggalkan =====
  useEffect(() => {
    return () => {
      isRunningRef.current = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (detectionCleanupRef.current) {
        detectionCleanupRef.current();
      }
      if (state.services.camera) {
        state.services.camera.stopCamera();
      }
    };
  // Hanya jalan saat unmount
  }, []);

  // ===== Fungsi untuk memulai loop deteksi =====
  const startDetectionLoop = useCallback(() => {
    const { detector, camera, generator } = state.services;
    if (!detector || !camera || !generator) return;

    isRunningRef.current = true;
    lastFrameTimeRef.current = 0;

    const loop = async (timestamp) => {
      if (!isRunningRef.current) return;

      const fps = fpsRef.current;
      const interval = 1000 / fps;
      const elapsed = timestamp - lastFrameTimeRef.current;

      if (elapsed >= interval) {
        lastFrameTimeRef.current = timestamp;

        if (camera.isReady() && detector.isLoaded()) {
          try {
            const result = await detector.predict(camera.video);

            if (result && isValidDetection(result)) {
              const label = result.className;

              actions.setDetectionResult(result);
              actions.setAppState('result');

              // Hanya generate fakta baru kalau label-nya berubah
              if (label !== lastPredictionRef.current) {
                lastPredictionRef.current = label;
                actions.setFunFactData(null); // tampilkan loading dulu

                if (generator.isReady() && !generator.isGenerating) {
                  const fact = await generator.generateFacts(label);
                  actions.setFunFactData(fact ?? 'error');
                }
              }
            } else if (!result || !result.isValid) {
              // Confidence rendah — kembalikan ke idle
              actions.setAppState('idle');
              actions.setDetectionResult(null);
              lastPredictionRef.current = null;
            }
          } catch (err) {
            console.warn('Detection frame error:', err);
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    // Kembalikan fungsi cleanup untuk menghentikan loop
    return () => {
      isRunningRef.current = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [state.services, actions]);

  // ===== Fungsi untuk memulai dan menghentikan kamera =====
  const handleToggleCamera = useCallback(async () => {
    const { camera } = state.services;
    if (!camera) return;

    if (state.isRunning) {
      // Hentikan semua proses dan matikan kamera
      isRunningRef.current = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (detectionCleanupRef.current) {
        detectionCleanupRef.current();
        detectionCleanupRef.current = null;
      }
      camera.stopCamera();
      actions.setRunning(false);
      actions.resetResults();
      lastPredictionRef.current = null;
    } else {
      // Mulai kamera dan detection loop
      try {
        actions.setError(null);
        // Muat daftar kamera dulu sebelum mulai stream
        const cameras = await camera.loadCameras();
        setAvailableCameras(cameras);
        await camera.startCamera(selectedCameraId);
        actions.setRunning(true);
        actions.setAppState('idle');

        // Tunggu sebentar biar video element siap sebelum mulai detect
        setTimeout(() => {
          const cleanup = startDetectionLoop();
          detectionCleanupRef.current = cleanup;
        }, 500);
      } catch (error) {
        const msg = getCameraErrorMessage(error);
        actions.setError(msg);
        actions.setRunning(false);
      }
    }
  }, [state.services, state.isRunning, actions, startDetectionLoop, selectedCameraId]);

  // ===== Fungsi untuk mengganti kamera (bisa saat berjalan atau tidak) =====
  const handleCameraChange = useCallback(async (deviceId) => {
    setSelectedCameraId(deviceId);
    const { camera } = state.services;
    if (!camera) return;

    // Kalau kamera sudah jalan, langsung ganti stream-nya tanpa stop dulu
    if (state.isRunning) {
      try {
        await camera.startCamera(deviceId);
        // Reset prediksi supaya fakta baru bisa di-generate
        lastPredictionRef.current = null;
      } catch (error) {
        const msg = getCameraErrorMessage(error);
        actions.setError(msg);
      }
    }
  }, [state.services, state.isRunning, actions]);

  // ===== [Advance] Fungsi untuk mengubah nada fakta yang dihasilkan =====
  const handleToneChange = useCallback((tone) => {
    setCurrentTone(tone);
    if (state.services.generator) {
      state.services.generator.setTone(tone);
      // Reset prediksi terakhir supaya fakta baru muncul dengan tone baru
      lastPredictionRef.current = null;
    }
  }, [state.services.generator]);

  // Perbarui fpsRef saat slider FPS digeser
  const handleFpsChange = useCallback((fps) => {
    fpsRef.current = fps;
    if (state.services.camera) {
      state.services.camera.setFPS(fps);
    }
  }, [state.services.camera]);

  // ===== [Skilled] Fungsi untuk menyalin fakta ke clipboard =====
  const handleCopyFact = useCallback(async () => {
    if (!state.funFactData || state.funFactData === 'error') return;
    try {
      await navigator.clipboard.writeText(state.funFactData);
      setCopyToast(true);
      setTimeout(() => setCopyToast(false), 2500);
    } catch {
      actions.setError('Gagal menyalin ke clipboard.');
    }
  }, [state.funFactData, actions]);

  return (
    <div className="app-container">
      <Header
        modelStatus={state.modelStatus}
        loadingProgress={loadingProgress}
      />

      <main className="main-content">
        <CameraSection
          isRunning={state.isRunning}
          onToggleCamera={handleToggleCamera}
          onToneChange={handleToneChange}
          onFpsChange={handleFpsChange}
          onCameraChange={handleCameraChange}
          services={state.services}
          modelStatus={state.modelStatus}
          error={state.error}
          currentTone={currentTone}
          availableCameras={availableCameras}
          selectedCameraId={selectedCameraId}
        />

        <InfoPanel
          appState={state.appState}
          detectionResult={state.detectionResult}
          funFactData={state.funFactData}
          error={state.error}
          onCopyFact={handleCopyFact}
        />
      </main>

      <footer className="footer">
        <p>
          Powered by <strong>TensorFlow.js</strong> &amp; <strong>Transformers.js</strong>
        </p>
      </footer>

      {/* Notifikasi error */}
      {state.error && (
        <div className="error-toast" role="alert">
          <span>⚠️ {state.error}</span>
          <button
            className="toast-close"
            onClick={() => actions.setError(null)}
            aria-label="Tutup notifikasi"
          >
            ×
          </button>
        </div>
      )}

      {/* Notifikasi berhasil salin */}
      {copyToast && (
        <div className="copy-toast" role="status">
          ✅ Fakta berhasil disalin!
        </div>
      )}
    </div>
  );
}

export default App;
