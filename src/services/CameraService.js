export class CameraService {
  constructor() {
    this.stream = null;
    this.video = null;
    this.canvas = null;
    this.config = null;
    this.fps = 30;
  }

  setVideoElement(videoElement) {
    this.video = videoElement;
  }

  setCanvasElement(canvasElement) {
    this.canvas = canvasElement;
  }

  // Ambil daftar semua kamera yang tersedia di perangkat.
  // Kita perlu minta izin dulu biar browser mau kasih nama kameranya —
  // tanpa ini, label kamera biasanya kosong, terutama di HP.
  async loadCameras() {
    try {
      // Minta stream sementara supaya browser "buka kunci" nama-nama kamera
      let tempStream = null;
      try {
        tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      } catch {
        // Kalau izin ditolak atau tidak ada kamera, tetap lanjut enumerasi
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');

      // Matikan stream sementara tadi, sudah tidak diperlukan
      if (tempStream) {
        tempStream.getTracks().forEach((t) => t.stop());
      }

      this.config = videoDevices;
      return videoDevices;
    } catch (error) {
      console.error('❌ CameraService.loadCameras:', error);
      return [];
    }
  }

  // Mulai kamera berdasarkan ID perangkat atau mode tampilan.
  // Parameter selectedCameraId bisa berupa:
  //   - deviceId spesifik dari hasil enumerateDevices (desktop/HP)
  //   - 'user'        → kamera depan (HP/tablet)
  //   - 'environment' → kamera belakang (HP/tablet)
  //   - 'default'     → biarkan browser yang pilih
  async startCamera(selectedCameraId) {
    try {
      // Hentikan stream lama dulu kalau masih jalan
      if (this.stream) {
        this.stopCamera();
      }

      let constraints;

      if (
        selectedCameraId &&
        selectedCameraId !== 'default' &&
        selectedCameraId !== 'user' &&
        selectedCameraId !== 'environment'
      ) {
        // Pakai deviceId eksak — cocok untuk desktop maupun HP
        constraints = {
          video: {
            deviceId: { exact: selectedCameraId },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        };
      } else if (selectedCameraId === 'user' || selectedCameraId === 'environment') {
        // Pakai facingMode untuk pilih kamera depan/belakang di HP
        constraints = {
          video: {
            facingMode: selectedCameraId,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        };
      } else {
        // Biarkan browser pilih kamera mana saja yang tersedia
        constraints = {
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        };
      }

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (this.video) {
        this.video.srcObject = this.stream;
        await new Promise((resolve, reject) => {
          this.video.onloadedmetadata = resolve;
          this.video.onerror = reject;
        });
        await this.video.play();
      }

      return true;
    } catch (error) {
      console.error('❌ CameraService.startCamera:', error);
      throw error;
    }
  }

  // Matikan kamera dan bersihkan semua resource-nya
  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
    }
  }

  // Simpan nilai FPS yang dipakai oleh detection loop
  setFPS(fps) {
    this.fps = fps;
  }

  // Cek apakah stream kamera sedang aktif
  isActive() {
    return !!(
      this.stream && this.stream.getTracks().some((t) => t.readyState === 'live')
    );
  }

  // Cek apakah elemen video sudah siap dipakai untuk inferensi
  isReady() {
    return !!(
      this.video &&
      this.video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA &&
      this.video.videoWidth > 0
    );
  }
}