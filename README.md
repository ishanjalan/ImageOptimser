# Squish

A blazing-fast, privacy-first image optimizer that runs entirely in your browser. Compress and convert images with professional-grade codecs — no uploads, no servers, no compromises.

![Squish Screenshot](screenshot.png)

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

### 🎯 Smart Defaults
- **Quality Presets** — Tiny (50%), Web (75%), Social (85%), High (92%), Max (98%)
- **Format Conversion** — Convert between JPEG, PNG, WebP, and AVIF
- **Lossless Mode** — Preserve perfect quality when needed
- **Strip EXIF** — Remove metadata for smaller files and privacy

### 🚀 Batch Processing
- Process hundreds of images simultaneously
- Multi-threaded worker pool scales to your CPU
- Download all optimized images as a single ZIP

### 🎨 Beautiful Experience
- Side-by-side before/after comparison slider
- Real-time compression progress
- Dark theme optimized for focus
- Responsive design for all screen sizes

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | [SvelteKit 2](https://kit.svelte.dev/) + [Svelte 5](https://svelte.dev/) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) |
| Compression | [@jsquash/*](https://github.com/nicferrier/jsquash) (WASM codecs) |
| SVG | [SVGO](https://github.com/svg/svgo) |
| Icons | [Lucide](https://lucide.dev/) |
| Language | TypeScript |

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

1. **Drop images** — Drag and drop files onto the drop zone, click to browse, or paste from clipboard
2. **Configure** — Choose quality preset, output format, and lossless mode
3. **Download** — Get individual files or download all as ZIP

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + Shift + D` | Download all as ZIP |
| `Cmd/Ctrl + V` | Paste image from clipboard |
| `Escape` | Clear all images |

## 🔧 How It Works

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Your Image │ ──▶ │ WASM Codecs  │ ──▶ │  Optimized  │
│   (local)   │     │ (in browser) │     │   (local)   │
└─────────────┘     └──────────────┘     └─────────────┘
         ▲                                      │
         └──────────────────────────────────────┘
                    Never leaves your device
```

1. **Decoding** — Image is decoded using format-specific WASM decoder
2. **Processing** — Raw pixel data is re-encoded with optimized settings
3. **Delivery** — Compressed file is created entirely in your browser

### Worker Pool Architecture

Squish automatically detects your CPU cores and creates an optimal number of Web Workers for parallel processing. This means:
- 4-core CPU → 2 parallel compressions
- 8-core CPU → 4 parallel compressions
- Batch of 20 images completes 4x faster than sequential

## 📊 Compression Comparison

| Format | Best For | Typical Savings |
|--------|----------|-----------------|
| JPEG | Photos, gradients | 60-80% |
| PNG | Screenshots, graphics with transparency | 20-50% |
| WebP | Universal web use | 70-85% |
| AVIF | Maximum compression | 80-90% |
| SVG | Vector graphics, icons | 30-60% |

## 🌟 Why Squish?

| Feature | Squish | Squoosh | TinyPNG |
|---------|----------|---------|---------|
| 100% Client-side | ✅ | ✅ | ❌ |
| Batch Processing | ✅ | ❌ | Limited |
| ZIP Download | ✅ | ❌ | ✅ |
| Format Conversion | ✅ | ✅ | ❌ |
| AVIF Support | ✅ | ✅ | ❌ |
| Open Source | ✅ | ✅ | ❌ |
| No Upload Limits | ✅ | ✅ | ❌ |

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
- [jSquash](https://github.com/nicferrier/jsquash) — WASM codec implementations
- [MozJPEG](https://github.com/mozilla/mozjpeg) — Mozilla's optimized JPEG encoder
- [OxiPNG](https://github.com/shssoichiro/oxipng) — Rust-based PNG optimizer

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/ishanjalan">Ishan Jalan</a>
</p>
