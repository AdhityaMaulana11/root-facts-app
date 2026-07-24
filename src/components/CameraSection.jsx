import { useState, useRef, useEffect } from 'react';
import { Camera, Mic, ScanLine, RefreshCw } from 'lucide-react';
import { TONE_CONFIG, FPS_CONFIG } from '../utils/config';

// Buat label yang mudah dibaca untuk perangkat kamera
function getCameraLabel(device, index, total) {
  if (device.label) return device.label;
  // Label cadangan saat browser belum memberikan label asli
  return total === 1 ? 'Kamera Utama' : `Kamera ${index + 1}`;
}

function CameraSection({
  isRunning,
  onToggleCamera,
  onToneChange,
  onFpsChange,
  onCameraChange,
  services,
  modelStatus,
  error,
  currentTone,
  availableCameras,
  selectedCameraId,
}) {
  const [fps, setFps] = useState(FPS_CONFIG.default);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Sambungkan DOM ref ke camera service
  useEffect(() => {
    if (services.camera) {
      if (videoRef.current && !services.camera.video) {
        services.camera.setVideoElement(videoRef.current);
      }
      if (canvasRef.current && !services.camera.canvas) {
        services.camera.setCanvasElement(canvasRef.current);
      }
    }
  });

  // Sinkronkan pengaturan FPS ke camera service
  useEffect(() => {
    if (services.camera) {
      services.camera.setFPS(fps);
    }
  }, [fps, services.camera]);

  const handleFpsChange = (newFps) => {
    const value = Number(newFps);
    setFps(value);
    if (onFpsChange) onFpsChange(value);
  };

  const handleToneChange = (e) => {
    if (onToneChange) onToneChange(e.target.value);
  };

  const handleCameraChange = (e) => {
    if (onCameraChange) onCameraChange(e.target.value);
  };

  const isModelReady = modelStatus === 'Model AI Siap';
  const buttonDisabled = !isModelReady;
  const buttonText = isRunning ? 'Stop Scan' : 'Mulai Scan';
  const hasCameras = availableCameras && availableCameras.length > 0;

  return (
    <section className="camera-section" aria-label="Camera Feed and Controls">
      <div className="camera-container">
        <div className="camera-wrapper">
          <video
            ref={videoRef}
            id="media-video"
            autoPlay
            muted
            playsInline
            className={isRunning ? '' : 'hidden'}
          />

          <canvas
            ref={canvasRef}
            id="media-canvas"
            className="hidden"
          />

          <div className={`camera-overlay ${isRunning ? 'active' : ''}`}>
            <div className="overlay-frame" />
          </div>

          {!isRunning && (
            <div className="camera-placeholder">
              <Camera size={48} />
              <p>Kamera tidak aktif</p>
              {error && (
                <p style={{ color: '#ef4444', fontSize: '0.8125rem', marginTop: '0.5rem' }}>
                  {error}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Tombol Mulai/Berhenti */}
        <div className="camera-controls">
          <button
            id="btn-toggle"
            className={`capture-btn ${isRunning ? 'scanning' : ''}`}
            onClick={onToggleCamera}
            disabled={buttonDisabled}
            aria-label={buttonText}
            style={{ opacity: buttonDisabled ? 0.5 : 1 }}
            title={buttonDisabled ? 'Menunggu model dimuat...' : buttonText}
          >
            <ScanLine size={24} />
          </button>
        </div>

        {/* Baris Pengaturan */}
        <div className="settings-bar">

          {/* Pilihan Kamera */}
          <div className="setting-item camera-setting">
            <Camera size={16} />
            {hasCameras ? (
              <select
                id="camera-select"
                value={selectedCameraId}
                onChange={handleCameraChange}
                aria-label="Pilih kamera"
                className="camera-select"
              >
                {availableCameras.map((device, i) => (
                  <option key={device.deviceId || i} value={device.deviceId || 'default'}>
                    {getCameraLabel(device, i, availableCameras.length)}
                  </option>
                ))}
              </select>
            ) : (
              <span className="camera-hint">
                {isRunning
                  ? 'Klik stop untuk ganti kamera'
                  : 'Mulai scan untuk memilih kamera'}
              </span>
            )}

            {/* Badge jumlah kamera */}
            {isRunning && hasCameras && availableCameras.length > 1 && (
              <span className="camera-count-badge">
                {availableCameras.length} kamera
              </span>
            )}
          </div>

          {/* Pengatur FPS */}
          <div className="setting-item fps-setting">
            <span id="fps-label">{fps} FPS</span>
            <input
              id="fps-slider"
              type="range"
              min={FPS_CONFIG.min}
              max={FPS_CONFIG.max}
              step={FPS_CONFIG.step}
              value={fps}
              onChange={(e) => handleFpsChange(e.target.value)}
              disabled={isRunning}
              aria-label="Detection FPS"
            />
          </div>

          {/* Pilihan Gaya Bahasa / Persona */}
          <div className="setting-item tone-setting">
            <Mic size={16} />
            <select
              id="tone-select"
              value={currentTone || 'normal'}
              onChange={handleToneChange}
              aria-label="Pilih gaya bahasa AI"
            >
              {TONE_CONFIG.availableTones.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </section>
  );
}

export default CameraSection;
