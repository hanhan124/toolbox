# Mynx

A lightweight desktop utility built with [Tauri v2](https://v2.tauri.app/).

![Version](https://img.shields.io/github/v/release/hanhan124/mynx)
![Platform](https://img.shields.io/badge/platform-Windows-blue)
![License](https://img.shields.io/github/license/hanhan124/mynx)

## Features

- **qPCR Analysis** — Import Excel data, detect Ct values and gene groups, calculate relative expression via 2^(-ΔΔCt), and export reports with embedded charts.
- **TIFF Conversion** — Batch convert TIFF images to JPG with configurable margins, padding, and output quality. Supports recursive subdirectory processing.
- **Auto Update** — Built-in updater checks GitHub Releases for new versions. Users get a notification and can update in-app.
- **Theme System** — Light/dark mode with system theme detection and persistent preference.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript + Vite |
| Backend | Rust (Tauri v2) |
| Styling | CSS Custom Properties |
| Icons | lucide-react |
| Packaging | NSIS installer + portable exe |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/) (MSVC toolchain on Windows)
- Windows SDK

### Development

```bash
npm install
npm run tauri dev
```

### Build

```bash
# Portable exe (no install required)
npm run portable

# Full installer (NSIS)
npm run tauri build
```

Build artifacts are located in `src-tauri/target/release/bundle/`.

## Release

The project uses GitHub Actions for automated releases. Push a version tag to trigger the build:

```bash
git tag v1.8.0
git push origin v1.8.0
```

Actions will build, sign, and publish to [GitHub Releases](https://github.com/hanhan124/mynx/releases) automatically.

### Required GitHub Secrets

| Secret | Value |
|--------|-------|
| `TAURI_SIGNING_PRIVATE_KEY` | Contents of `mynx.key` |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Key password |

### Release Artifacts

| File | Description |
|------|-------------|
| `Mynx_x.x.x_x64-setup.exe` | NSIS installer |
| `Mynx_x.x.x_x64-setup.exe.sig` | Signature file |
| `Mynx_x.x.x_portable.exe` | Portable executable |
| `latest.json` | Update manifest |

## Project Structure

```
mynx-tauri/
├── src/                  React frontend
│   ├── components/       Shared UI components
│   ├── hooks/            Custom React hooks
│   ├── lib/              Business logic & tool registry
│   ├── pages/            Page components
│   └── styles/           CSS (themes, layout, components)
├── src-tauri/            Rust backend
│   ├── src/              Rust source code
│   ├── icons/            Application icons
│   └── capabilities/     Tauri permission config
├── scripts/              Build automation scripts
└── public/               Static assets
```

## License

MIT
