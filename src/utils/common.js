// Cetak error ke console dengan konteks yang jelas
export const logError = (context, error) => {
  console.error(`❌ ${context}:`, error);
};

// Cek apakah browser mendukung WebGPU
export const isWebGPUSupported = () => {
  return typeof navigator !== 'undefined' && 'gpu' in navigator;
};

// Cek apakah perangkat yang dipakai adalah HP atau tablet
export const isMobileDevice = () => {
  return navigator.userAgentData?.mobile ?? /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
};

// Buat delay sederhana berbasis Promise
export const createDelay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Validasi bahwa metadata model punya field labels yang benar
export const validateModelMetadata = (metadata) => {
  return metadata && metadata.labels && Array.isArray(metadata.labels);
};

// Terjemahkan error kamera ke pesan yang ramah untuk pengguna
export const getCameraErrorMessage = (error) => {
  const errorMessages = {
    'NotAllowedError': 'Izin kamera ditolak. Harap izinkan akses kamera.',
    'NotFoundError': 'Tidak ada kamera ditemukan pada perangkat ini.',
    'NotReadableError': 'Kamera sedang digunakan oleh aplikasi lain.'
  };

  return errorMessages[error.name] || 'Gagal memulai kamera';
};
