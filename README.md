# Squish

A blazing-fast, privacy-first image optimizer that runs entirely in your browser. Compress and convert images with professional-grade codecs — no uploads, no servers, no compromises.

**[🚀 Try it live](https://ishanjalan.github.io/ImageOptimser/)**

## ✨ Features

### 🔒 100% Private
Your images **never leave your device**. All compression happens locally using WebAssembly — no server uploads, no data collection, complete privacy.

### ⚡ Professional Codecs
Powered by the same algorithms used by Google and Mozilla:
- **MozJPEG** — Superior JPEG compression
- **OxiPNG** — Optimized PNG with maximum compression  
- **WebP** — Modern format with excellent quality/size ratio
- **AVIF** — Next-gen format with best-in-class compression
- **SVGO** — SVG optimization and minification
- **HEIC Input** — iPhone photo support (converted to WebP/AVIF)

### 🎯 Smart Defaults
- **Quality Presets** — Tiny (50%), Web (75%), Social (85%), High (92%), Max (98%)
- **Format Conversion** — Convert between JPEG, PNG, WebP, AVIF, and SVG
- **Lossless Mode** — Preserve perfect quality when needed
- **Strip EXIF** — Remove metadata for smaller files and privacy
- **Resize** — Max dimension presets (1920, 1280, 800px) with aspect ratio preservation

### 🚀 Batch Processing
- Process hundreds of images simultaneously
- Multi-threaded Web Worker pool scales to your CPU
- Parallel compression with automatic load balancing
- Download all optimized images as a single ZIP
- **Batch summary** with processing stats (time, speed, savings)

### 🎨 Beautiful Experience
- Side-by-side before/after comparison slider
- Real-time compression progress
- Dark theme optimized for focus
- Responsive design for all screen sizes
- Toast notifications for feedback
- Keyboard shortcuts

### 📱 PWA Support
- Installable as a desktop/mobile app
- Offline-capable with Service Worker caching
- Fast repeat visits with cached assets

### 🔧 Additional Features
- **Paste from clipboard** — Cmd/Ctrl+V to paste screenshots
- **URL input** — Fetch and optimize images from URLs
- **Drag-out to save** — Drag optimized images directly to desktop
- **Copy to clipboard** — One-click copy optimized images
- **Persist settings** — Your preferences saved across sessions
- **Drag reordering** — Reorder images in the list

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | [SvelteKit 2](https://kit.svelte.dev/) + [Svelte 5](https://svelte.dev/) (Runes) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) (Lightning CSS) |
| Build | [Vite 7](https://vitejs.dev/) |
| Compression | [@jsquash/*](https://github.com/nicferrier/jsquash) (WASM codecs) |
| HEIC | [heic2any](https://github.com/nicferrier/heic2any) (libheif WASM) |
| SVG | [SVGO](https://github.com/svg/svgo) |
| ZIP | [JSZip](https://stuk.github.io/jszip/) + File System Access API |
| Icons | [Lucide](https://lucide.dev/) |
| Language | TypeScript |

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser                                  │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐    │
│  │   Main UI    │     │  Worker Pool │     │   Service    │    │
│  │   Thread     │────▶│   Manager    │     │   Worker     │    │
│  │  (Svelte 5)  │     │              │     │   (Cache)    │    │
│  └──────────────┘     └──────────────┘     └──────────────┘    │
│         │                    │                                   │
│         │              ┌─────┴─────┐                            │
│         │              ▼           ▼                            │
│         │        ┌──────────┐ ┌──────────┐                     │
│         │        │ Worker 1 │ │ Worker 2 │ ...                 │
│         │        │  (WASM)  │ │  (WASM)  │                     │
│         │        └──────────┘ └──────────┘                     │
│         │              │           │                            │
│         │              ▼           ▼                            │
│         │        ┌──────────────────────┐                      │
│         │        │     WASM Codecs      │                      │
│         │        │ ┌────────┬────────┐  │                      │
│         │        │ │MozJPEG │OxiPNG  │  │                      │
│         │        │ ├────────┼────────┤  │                      │
│         │        │ │ WebP   │ AVIF   │  │                      │
│         │        │ └────────┴────────┘  │                      │
│         │        └──────────────────────┘                      │
│         │                                                       │
│  ┌──────▼───────────────────────────────────────────────────┐  │
│  │                    Svelte Stores                          │  │
│  │  ┌───────────┐  ┌──────────────┐  ┌────────────────┐    │  │
│  │  │  images   │  │   settings   │  │   batchStats   │    │  │
│  │  │ $state[]  │  │   $state     │  │    $state      │    │  │
│  │  └───────────┘  └──────────────┘  └────────────────┘    │  │
│  └──────────────────────────────────────────────────────────┘  │
│         ▲                                                       │
│  ┌──────┴───────────────────────────────────────────────────┐  │
│  │                    Input Sources                          │  │
│  │  • File drag & drop    • Clipboard paste                 │  │
│  │  • File picker         • URL fetch                       │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Processing Pipeline

```
Input Image                                              Output
    │                                                       ▲
    ▼                                                       │
┌───────────┐     ┌──────────────┐     ┌──────────────┐    │
│  Detect   │────▶│   Decode     │────▶│   Resize?    │────┤
│  Format   │     │  (WASM)      │     │(OffscreenCnv)│    │
└───────────┘     └──────────────┘     └──────────────┘    │
                         │                    │            │
                         │  HEIC? ────────────┘            │
                         │    │                            │
                         ▼    ▼                            │
                  ┌──────────────┐     ┌──────────────┐    │
                  │  heic2any    │────▶│   Encode     │────┘
                  │  (libheif)   │     │   (WASM)     │
                  └──────────────┘     └──────────────┘
```

### Worker Pool

Squish automatically detects your CPU cores and creates an optimal number of Web Workers for parallel processing:

| CPU Cores | Workers | Parallel Jobs |
|-----------|---------|---------------|
| 2 | 1 | 1 |
| 4 | 2 | 2 |
| 8 | 4 | 4 |
| 16 | 4 (max) | 4 |

This enables batch processing of 20+ images 4x faster than sequential processing.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm, pnpm, or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/ishanjalan/ImageOptimser.git
cd ImageOptimser

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build

```bash
npm run build
npm run preview
```

## 📖 Usage

1. **Drop images** — Drag and drop files, click to browse, paste from clipboard, or enter a URL
2. **Configure** — Choose quality preset, output format, resize, and lossless mode
3. **Download** — Get individual files, copy to clipboard, or download all as ZIP

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + Shift + D` | Download all as ZIP |
| `Cmd/Ctrl + V` | Paste image from clipboard |
| `Escape` | Clear all images |
| `?` | Show keyboard shortcuts |

### Supported Formats

| Format | Input | Output | Notes |
|--------|-------|--------|-------|
| JPEG | ✅ | ✅ | MozJPEG encoder |
| PNG | ✅ | ✅ | OxiPNG optimization |
| WebP | ✅ | ✅ | Lossy & lossless |
| AVIF | ✅ | ✅ | Best compression |
| SVG | ✅ | ✅ | SVGO optimization |
| HEIC | ✅ | ❌ | iPhone photos (converts to other formats) |

## 📊 Compression Comparison

| Format | Best For | Typical Savings |
|--------|----------|-----------------|
| JPEG | Photos, gradients | 60-80% |
| PNG | Screenshots, transparency | 20-50% |
| WebP | Universal web use | 70-85% |
| AVIF | Maximum compression | 80-90% |
| SVG | Vector graphics, icons | 30-60% |

## 🌟 Why Squish?

| Feature | Squish | Squoosh | TinyPNG | Cloud Services |
|---------|--------|---------|---------|----------------|
| 100% Client-side | ✅ | ✅ | ❌ | ❌ |
| Batch Processing | ✅ | ❌ | Limited | ✅ |
| ZIP Download | ✅ | ❌ | ✅ | ✅ |
| Format Conversion | ✅ | ✅ | ❌ | Limited |
| AVIF Support | ✅ | ✅ | ❌ | Limited |
| HEIC Input | ✅ | ❌ | ❌ | Some |
| Open Source | ✅ | ✅ | ❌ | ❌ |
| No Upload Limits | ✅ | ✅ | ❌ | ❌ |
| Offline Support | ✅ | ✅ | ❌ | ❌ |
| Parallel Processing | ✅ | ❌ | N/A | Server-side |

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Google Squoosh](https://squoosh.app/) — Inspiration for browser-based compression
- [Mediabunny](https://mediabunny.dev/) — Inspiration for performance visibility and architecture
- [jSquash](https://github.com/nicferrier/jsquash) — WASM codec implementations
- [MozJPEG](https://github.com/mozilla/mozjpeg) — Mozilla's optimized JPEG encoder
- [OxiPNG](https://github.com/shssoichiro/oxipng) — Rust-based PNG optimizer
- [heic2any](https://github.com/nicferrier/heic2any) — HEIC to other format conversion

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/ishanjalan">Ishan Jalan</a>
</p>
