# 🌱 Root Fact App

![Root Fact App Preview](public/screenshots/root_fact_app_1784884877510.png)

Root Fact App adalah aplikasi **Progressive Web App (PWA)** cerdas yang menggabungkan kemampuan **Computer Vision** dan **Generative AI** langsung di dalam browser pengguna (Client-side AI). 

Aplikasi ini dapat mendeteksi jenis sayuran secara *real-time* menggunakan kamera perangkat, lalu secara otomatis membuatkan "Fun Fact" unik tentang sayuran tersebut dengan gaya bahasa (persona) yang bisa diatur sesuai keinginan!

Proyek ini dibangun sebagai penyelesaian kelas **"Penerapan AI di Aplikasi Web"** dari **Dicoding Academy**, dengan memenuhi semua kriteria penilaian tingkat **Advanced**.

---

## ✨ Fitur Unggulan

- 📷 **Deteksi Sayuran Real-time**: Menggunakan model Computer Vision kustom via **TensorFlow.js**.
- 🧠 **AI Generatif di Browser**: Menggunakan **Transformers.js** (`TinyLlama-1.1B`) untuk menghasilkan fun fact unik secara instan tanpa perlu akses API eksternal (No Server Required!).
- 🎭 **Persona System**: Ubah gaya bahasa AI sesuai keinginan: *Normal*, *Lucu 😄*, *Edukatif 📚*, atau *Bersejarah 🏛️*.
- ⚙️ **Kamera Fleksibel & Multi-Platform**: Mendukung pemilihan berbagai jenis kamera (Kamera Depan, Kamera Belakang, Webcam Eksternal) di HP, Tablet, maupun Desktop.
- ⚡ **Adaptive Backend (WebGPU / WebGL / WASM)**: Secara otomatis memilih *hardware acceleration* terbaik yang tersedia di browser pengguna agar inferensi AI berjalan super mulus.
- 🎛️ **Kontrol Performa**: Dilengkapi *slider* pengaturan FPS (1 - 60 FPS) dan manajemen memori otomatis (`tf.tidy`) agar tidak boros baterai atau *crash*.
- 📶 **100% Offline Support (PWA)**: Berkat arsitektur PWA (Workbox), seluruh aset web dan model AI (hingga puluhan MB) di-*cache* secara lokal. **Aplikasi dan AI tetap bisa berjalan normal meskipun tanpa koneksi internet!**

---

## 🛠️ Teknologi yang Digunakan

- **Frontend**: React + Vite
- **Styling**: Vanilla CSS (Modern CSS Variables & Animations)
- **Computer Vision**: [TensorFlow.js](https://www.tensorflow.org/js)
- **Generative AI**: [Transformers.js](https://huggingface.co/docs/transformers.js) oleh Hugging Face
- **PWA**: `vite-plugin-pwa` (Workbox)
- **Linting**: ESLint + Dicoding Academy Standards

---

## 🚀 Cara Menjalankan Secara Lokal

Buka terminal kesayanganmu dan jalankan perintah berikut:

### 1. Instalasi Dependensi
```bash
npm install
```

### 2. Jalankan Mode Development
```bash
npm run dev
```
Aplikasi bisa diakses di `http://localhost:3001` (atau port lain yang tertera di terminal).

### 3. Build & Mode Produksi
Untuk mensimulasikan PWA dan menguji fitur *offline*:
```bash
npm run build
npm run preview
```

---

## 📱 Tangkapan Layar Tambahan

| Pemilihan Kamera Dinamis | Gaya Bahasa Lucu |
| :---: | :---: |
| *(Fitur ganti kamera *real-time*)* | *(Contoh prompt AI responsif)* |

---

## 📝 Catatan Tambahan
Karena ini adalah *Client-side AI*, browser akan mengunduh model AI (sekitar ~20-30MB) saat **pertama kali** aplikasi dijalankan. Pastikan koneksi internet stabil saat inisialisasi awal. Setelah itu, PWA akan menyimpannya ke dalam sistem penyimpanan perangkat (Cache Storage) dan aplikasi 100% bisa dipakai tanpa internet.

---
*Developed by Adhitya a.k.a Blue Screen Boy for Dicoding.*
