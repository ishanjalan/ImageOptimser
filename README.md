# Squish - Image Optimizer

A modern, privacy-first image optimizer that runs entirely in your browser. Compress JPEG, PNG, WebP, AVIF, GIF, and SVG files with zero server uploads.

![Squish Screenshot](screenshot.png)

## Features

- **100% Client-Side** - All processing happens in your browser. Your images never leave your device.
- **Multiple Formats** - Supports JPEG, PNG, WebP, AVIF, GIF, and SVG
- **Format Conversion** - Convert between formats (e.g., PNG → WebP)
- **Batch Processing** - Optimize multiple images at once
- **Quality Control** - Adjustable compression quality
- **Drag & Drop** - Simple drag and drop interface
- **Download All** - Download all optimized images as a ZIP file
- **Dark/Light Mode** - Beautiful UI with theme toggle
- **Keyboard Shortcuts** - `Cmd/Ctrl + Shift + D` to download all, `Escape` to clear

## Tech Stack

- **SvelteKit 2** - Full-stack Svelte framework
- **Svelte 5** - Latest Svelte with runes (`$state`, `$derived`, `$effect`)
- **TypeScript** - Type-safe development
- **Tailwind CSS v4** - Utility-first styling with Lightning CSS
- **Vite** - Lightning fast build tool
- **Lucide Icons** - Beautiful, consistent icons

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/image-optimizer.git
cd image-optimizer

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Building for Production

```bash
npm run build
npm run preview
```

## How It Works

1. **Drop or select images** - Drag and drop images onto the drop zone or click to browse
2. **Configure settings** - Adjust quality and output format
3. **Automatic compression** - Images are processed instantly using the Canvas API
4. **Download results** - Download individual files or all at once as a ZIP

## Compression Technology

- **JPEG/PNG/WebP/AVIF** - Uses the browser's native Canvas API for efficient compression
- **SVG** - Basic optimization (comment removal, whitespace cleanup)
- **GIF** - Pass-through (maintains original)

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Acknowledgments

Built with inspiration from [Google's Squoosh](https://squoosh.app/) and [antonreshetov/image-optimizer](https://github.com/antonreshetov/image-optimizer).
