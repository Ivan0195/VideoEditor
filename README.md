# 🎬 Video Editor Web App

A modern, browser-based video editor built with **React** and **TypeScript**. Trim, crop, and apply filters to your videos directly in the browser using the power of **FFmpeg WebAssembly**—no server upload required!

---

## ✨ Features

- **Video Upload**: Load any video file from your device.
- **Trim**: Select start and end points to cut your video.
- **Crop**: Drag and resize a crop rectangle directly on the video.
- **Filters**: Adjust brightness, contrast, saturation, blur, sepia, grayscale, invert, and hue.
- **Preview**: See all changes in real time.
- **Export**: Download your trimmed, cropped, or filtered video.
- **Undo Crop**: Easily revert crop changes (Ctrl+Z / Cmd+Z).
- **Fast & Private**: All processing happens in your browser—your videos never leave your device.

---

## 🚀 Getting Started

### 1. **Clone the repository**

### 2. **Install dependencies**

```bash
npm install
# or
yarn install
```

### 3. **Copy FFmpeg WebAssembly files**

```bash
npm run copy:ffmpeg
```

This copies the necessary FFmpeg WASM files to the `public/` directory.

### 4. **Start the development server**

```bash
npm start
# or
yarn start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🛠️ Project Structure

```
src/
  components/
    VideoEditor/        # Main video editor logic and UI
    VideoControls/      # Play, pause, volume, etc.
    VideoFilters/       # Filter controls
    Timeline/           # Trimming timeline
    App/                # App entry point
  utils/                # Helper functions
  types/                # TypeScript types
  index.tsx             # React root
  index.scss            # Global styles
public/
  index.html            # Main HTML file
  favicon.ico           # App icon
```

---

## ⚙️ Scripts

- `npm start` — Start the dev server
- `npm run build:dev` — Build for development
- `npm run build:prod` — Build for production
- `npm run copy:ffmpeg` — Copy FFmpeg WASM files to `public/`
- `npm run typecheck` — TypeScript type checking

---

## 🧩 Tech Stack

- **React 19**
- **TypeScript**
- **FFmpeg WebAssembly** (`@ffmpeg/ffmpeg`, `@ffmpeg/core`, `@ffmpeg/util`)
- **Sass** for styling
- **Webpack** for bundling

---

## 📦 Dependencies

See [`package.json`](./package.json) for the full list.

---

## ❓ FAQ

**Q: Are my videos uploaded to a server?**  
A: _No! All video processing is done locally in your browser using FFmpeg WebAssembly._

**Q: What browsers are supported?**  
A: _Latest versions of Chrome, Firefox, Edge, and Safari are recommended._

---

## 🙏 Acknowledgements

- [FFmpeg](https://ffmpeg.org/) for the amazing open-source video tools.
- [ffmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm) for bringing FFmpeg to the browser.

---

> _Made with ❤️ and TypeScript_
