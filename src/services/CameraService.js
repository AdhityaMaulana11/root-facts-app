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

  async loadCameras() {
    try {
      // Request stream dulu supaya browser mau buka label nama kameranya
      let tempStream = null;
      try {
        tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      } catch {
        // Kalau ditolak pun lanjut aja, mungkin labelnya kosong tapi tetap bisa enumerate
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');

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

  async startCamera(selectedCameraId) {
    try {
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
        // deviceId spesifik — untuk desktop atau HP yang sudah ter-enumerate
        constraints = {
          video: {
            deviceId: { exact: selectedCameraId },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        };
      } else if (selectedCameraId === 'user' || selectedCameraId === 'environment') {
        // facingMode untuk kamera depan/belakang di HP dan tablet
        constraints = {
          video: {
            facingMode: selectedCameraId,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        };
      } else {
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

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
    }
  }

  setFPS(fps) {
    this.fps = fps;
  }

  isActive() {
    return !!(
      this.stream && this.stream.getTracks().some((t) => t.readyState === 'live')
    );
  }

  isReady() {
    return !!(
      this.video &&
      this.video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA &&
      this.video.videoWidth > 0
    );
  }
}