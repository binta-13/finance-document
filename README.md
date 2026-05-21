# Smart Doc Reader

Aplikasi _smart document reader_ untuk ekstraksi data invoice/receipt menggunakan AI vision, dibangun dengan **SvelteKit 5** + **Cloudflare Pages/D1**.

## Stack

| Lapisan | Teknologi | Alasan |
|---------|-----------|--------|
| **Framework** | SvelteKit 5 (Runes) | Reactivity deklaratif, file-based routing, Cloudflare adapter siap pakai |
| **Hosting** | Cloudflare Pages | Edge global, zero cold-start, integrasi D1 native |
| **Database** | Cloudflare D1 (SQLite) | Serverless, replikasi read-only global, biaya rendah |
| **UI** | shadcn-svelte + Tailwind CSS v4 | Komponen accessible, styling utility-first, kustomisasi mudah |
| **AI OCR** | OpenRouter (GPT-4o / Gemini 2.0 Flash) | Multi-model fallback, harga per-request, tanpa fine-tuning |
| **Client OCR** | Tesseract.js + pdfjs-dist | Fallback offline, gratis, PDF-to-image client-side |
| **Storage** | Cloudinary | Upload langsung dari client, transformasi URL, CDN |

## Pendekatan OCR/AI

Menggunakan **dual-path OCR**:

### 1. AI Vision (utama) — OpenRouter
- **Model**: GPT-4o → Gemini 2.0 Flash (fallback otomatis)
- **Cara**: Kirim gambar ke OpenRouter dengan prompt JSON-injection
- **Keunggulan**: Akurasi tinggi, paham konteks invoice, bisa multi-currency
- **Alasan**: Tidak perlu training data, cukup dengan prompt engineering

### 2. Tesseract.js (cadangan) — Client-side
- **Digunakan**: Via fungsi `ocr.ts` untuk preview cepat
- **Cara**: OCR lokal di browser dengan parsing regex sederhana
- **Keunggulan**: Gratis, tidak perlu API key, bekerja offline
- **Alasan**: Fallback jika AI vision gagal / tidak ada koneksi

### Prompt AI Vision

```json
{
  "vendor": "store name or null",
  "date": "YYYY-MM-DD or null",
  "total": 123.45 or null,
  "currency": "USD/IDR/EUR or null",
  "line_items": [
    {"description": "item name", "quantity": 1, "unit_price": 10.00, "amount": 10.00}
  ]
}
```

## Asumsi yang Diambil

1. **Invoice/receipt dalam format gambar atau PDF** — halaman pertama diekstrak menjadi image
2. **Struktur invoice standar** — memiliki vendor, tanggal, total, dan line items
3. **Bahasa Inggris** — prompt AI dan Tesseract menggunakan `eng`
4. **Koneksi internet** tersedia — untuk Cloudinary upload dan OpenRouter API
5. **Cloudinary upload public** — menggunakan unsigned upload preset (tanpa signature)
6. **Dokumen < 10MB** — batasan upload sisi client (tidak diverifikasi server-side)
7. **OpenRouter API key** dikonfigurasi via environment variable

## AI Workflow Log

```
Upload File
  ↓
Client → POST /api/upload → Cloudinary (image hosting)
  ↓
Client → POST /api/ocr/:id
  ↓
Server → fetchImageAsBase64 (download dari Cloudinary)
  ↓
Server → OpenRouter (GPT-4o) ← jika gagal → OpenRouter (Gemini 2.0 Flash)
  ↓
Server → Parse response JSON
  ↓
Server → Upsert ke extractions table + line_items table
  ↓
Server → Update document status → 'completed' / 'failed'
  ↓
Client → Polling list dokumen (setiap 3 detik jika ada pending)
  ↓
User → Review & edit ekstraksi
  ↓
User → Save → PATCH /api/documents/:id
```

### Confidence Scoring

Setiap ekstraksi memiliki skor confidence (0–1):
- `vendor` (0.25) — terisi
- `date` (0.25) — terisi
- `total` (0.25) — terisi
- `line_items` (0.25) — minimal 1 item

Skor ≥ 0.8 → **High Accuracy** | 0.5–0.79 → **Medium** | < 0.5 → **Low**

## Development

```sh
npm install
npm run dev
npm run dev:d1   # dengan D1 binding lokal
npm run build
```

Butuh file `.dev.vars` dengan:

```
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_UPLOAD_PRESET=xxx
OPENROUTER_API_KEY=sk-or-xxx
```
