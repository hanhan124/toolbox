# Mynx Desktop Toolkit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Tauri v2 desktop toolkit for researchers with qPCR data analysis and TIFF-to-JPG conversion.

**Architecture:** Tauri v2 backend (Rust) + React 18 frontend (TypeScript, Vite). ExcelJS for browser-side Excel processing. PowerShell via tauri-plugin-shell for TIFF conversion. VBS scripts for Excel COM chart generation.

**Tech Stack:** Tauri v2, React 18, TypeScript, Vite, ExcelJS, tauri-plugin-shell, tauri-plugin-dialog, tauri-plugin-fs, tauri-plugin-store

---

## File Structure

```
mynx-tauri/
├── src-tauri/
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── src/
│   │   └── main.rs              # Tauri app entry + commands
│   └── icons/                    # App icons
├── src/
│   ├── main.tsx                  # React entry
│   ├── App.tsx                   # Router + layout
│   ├── components/
│   │   ├── TitleBar.tsx          # Custom window title bar
│   │   ├── Sidebar.tsx           # 52px navigation sidebar
│   │   ├── Home.tsx              # Welcome page with tool cards
│   │   ├── LoadingOverlay.tsx    # Full-screen loading
│   │   ├── Toast.tsx             # Toast notification system
│   │   └── Modal.tsx             # Modal dialog
│   ├── pages/
│   │   ├── qPCR/
│   │   │   ├── QpcrPage.tsx      # Main qPCR container (3 steps)
│   │   │   ├── FileSelect.tsx    # Step 0: file picker
│   │   │   ├── Transform.tsx     # Step 1: data transform
│   │   │   └── Calculate.tsx     # Step 2: qPCR calculation
│   │   └── tiff/
│   │       ├── TiffPage.tsx      # TIFF conversion page
│   │       └── ConvertOptions.tsx # Watermark + quality options
│   ├── lib/
│   │   ├── qpcr-transform.ts     # Core: pivot Excel data
│   │   ├── qpcr-calculate.ts     # Core: 2^(-ΔCt), stats
│   │   ├── chart-gen.ts          # VBS script generator
│   │   ├── tiff-convert.ts       # PowerShell caller
│   │   ├── excel-io.ts           # ExcelJS read/write helpers
│   │   └── config.ts             # Theme + alwaysOnTop persistence
│   ├── hooks/
│   │   ├── useTheme.ts           # Theme context
│   │   └── useToast.ts           # Toast state
│   └── styles/
│       ├── themes.css            # CSS variables dark/light
│       ├── global.css            # Base styles + scrollbar
│       └── components.css        # Shared component styles
├── package.json
├── tsconfig.json
├── vite.config.ts
└── index.html
```

---

### Task 1: Scaffold Tauri v2 Project

**Covers:** [S2], [S11]

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`
- Create: `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, `src-tauri/src/main.rs`
- Create: `src/main.tsx`, `src/App.tsx`

- [ ] **Step 1: Initialize project with Tauri CLI**

```bash
cd "C:\Users\HAN\Desktop\vibe_coding\mynx-tauri"
npm create tauri-app@latest . -- --template react-ts
```

Select: React + TypeScript, package manager npm.

- [ ] **Step 2: Install dependencies**

```bash
npm install react-router-dom exceljs
npm install @tauri-apps/plugin-dialog @tauri-apps/plugin-fs @tauri-apps/plugin-shell @tauri-apps/plugin-store @tauri-apps/plugin-updater
```

- [ ] **Step 3: Configure tauri.conf.json**

Set in `src-tauri/tauri.conf.json`:
```json
{
  "app": {
    "windows": [
      {
        "title": "Mynx",
        "width": 440,
        "height": 620,
        "minWidth": 360,
        "minHeight": 380,
        "decorations": false,
        "resizable": true
      }
    ]
  },
  "bundle": {
    "active": true,
    "identifier": "com.fanguanghan.mynx",
    "icon": ["icons/32x32.png", "icons/128x128.png", "icons/128x128@2x.png"],
    "windows": {
      "installer": {
        "installMode": "both"
      }
    }
  }
}
```

- [ ] **Step 4: Configure Cargo.toml plugins**

Add to `src-tauri/Cargo.toml` dependencies:
```toml
tauri-plugin-dialog = "2"
tauri-plugin-fs = "2"
tauri-plugin-shell = "2"
tauri-plugin-store = "2"
tauri-plugin-updater = "2"
```

- [ ] **Step 5: Wire up plugins in main.rs**

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_updater::Builder::default().build())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 6: Create minimal App.tsx**

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function Home() {
  return <div><h1>Mynx</h1></div>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 7: Verify build**

```bash
npm run tauri dev
```

Expected: Window opens with "Mynx" heading, frameless window working.

- [ ] **Step 8: Commit**

```bash
git init && git add -A && git commit -m "feat: scaffold Tauri v2 project with React + TypeScript"
```

---

### Task 2: App Shell — Theme System + CSS Foundation

**Covers:** [S3]

**Files:**
- Create: `src/styles/themes.css`, `src/styles/global.css`
- Modify: `src/main.tsx`

- [ ] **Step 1: Create themes.css**

```css
:root,
[data-theme="dark"] {
  --bg-primary: #1a1a1c;
  --bg-secondary: #252527;
  --bg-card: #252527;
  --bg-hover: rgba(255,255,255,0.07);
  --bg-active: rgba(66,133,244,0.14);
  --text-primary: #e8eaed;
  --text-secondary: #9aa0a6;
  --accent: #8AB4F8;
  --border: rgba(255,255,255,0.08);
  --green: #81C995;
  --red: #F28B82;
}

[data-theme="light"] {
  --bg-primary: #f8f9fa;
  --bg-secondary: #ffffff;
  --bg-card: #ffffff;
  --bg-hover: rgba(0,0,0,0.04);
  --bg-active: rgba(66,133,244,0.10);
  --text-primary: #202124;
  --text-secondary: #5f6368;
  --accent: #1A73E8;
  --border: rgba(0,0,0,0.08);
  --green: #1E8E3E;
  --red: #D93025;
}
```

- [ ] **Step 2: Create global.css**

```css
@import './themes.css';

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  font-size: 13px;
  background: var(--bg-primary);
  color: var(--text-primary);
  overflow: hidden;
  user-select: none;
}

::-webkit-scrollbar {
  width: 4px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 2px;
}

button {
  font-family: inherit;
  font-size: inherit;
  border: none;
  cursor: pointer;
  transition: all 180ms cubic-bezier(0.4, 0, 0.2, 1);
}

button:active {
  transform: scale(0.94);
}

input, select {
  font-family: inherit;
  font-size: inherit;
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 6px 10px;
  outline: none;
  transition: border-color 180ms;
}

input:focus, select:focus {
  border-color: var(--accent);
}
```

- [ ] **Step 3: Update main.tsx to import global.css**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 4: Commit**

```bash
git add src/styles/ src/main.tsx
git commit -m "feat: add theme CSS variables and global styles"
```

---

### Task 3: App Shell — Title Bar + Sidebar Layout

**Covers:** [S3], [S4]

**Files:**
- Create: `src/components/TitleBar.tsx`, `src/components/Sidebar.tsx`, `src/components/Home.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create TitleBar.tsx**

```tsx
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useState } from 'react';

interface TitleBarProps {
  title: string;
}

export default function TitleBar({ title }: TitleBarProps) {
  const [isPinned, setIsPinned] = useState(false);
  const win = getCurrentWindow();

  const togglePin = async () => {
    const next = !isPinned;
    await win.setAlwaysOnTop(next);
    setIsPinned(next);
  };

  return (
    <div data-tauri-drag-region style={{
      height: 36,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 12px',
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border)',
      WebkitAppRegion: 'drag' as any,
    }}>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{title}</span>
      <div style={{ display: 'flex', gap: 4, WebkitAppRegion: 'no-drag' as any }}>
        <button onClick={togglePin} style={{
          width: 28, height: 28, borderRadius: 6,
          background: isPinned ? 'var(--accent)' : 'transparent',
          color: isPinned ? '#fff' : 'var(--text-secondary)',
          fontSize: 14,
        }}>📌</button>
        <button onClick={() => win.minimize()} style={{
          width: 28, height: 28, borderRadius: 6,
          background: 'transparent', color: 'var(--text-secondary)', fontSize: 14,
        }}>─</button>
        <button onClick={() => win.toggleMaximize()} style={{
          width: 28, height: 28, borderRadius: 6,
          background: 'transparent', color: 'var(--text-secondary)', fontSize: 14,
        }}>☐</button>
        <button onClick={() => win.close()} style={{
          width: 28, height: 28, borderRadius: 6,
          background: 'transparent', color: 'var(--text-secondary)', fontSize: 14,
        }} onMouseEnter={e => {
          e.currentTarget.style.background = 'var(--red)';
          e.currentTarget.style.color = '#fff';
        }} onMouseLeave={e => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--text-secondary)';
        }}>✕</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create Sidebar.tsx**

```tsx
import { useNavigate, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/', label: '主页', icon: '🏠' },
  { path: '/qpcr', label: 'qPCR', icon: '🧬' },
  { path: '/tiff', label: 'TIFF', icon: '🖼️' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav style={{
      width: 52,
      height: '100%',
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '12px 0',
      gap: 4,
    }}>
      {/* App icon */}
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: 'linear-gradient(135deg, #4285F4, #34A853)',
        marginBottom: 12,
      }} />

      {/* Nav items */}
      {navItems.map(item => {
        const active = location.pathname === item.path;
        return (
          <button key={item.path} onClick={() => navigate(item.path)} style={{
            width: 40, height: 40, borderRadius: 8,
            background: active ? 'var(--bg-active)' : 'transparent',
            color: active ? 'var(--accent)' : 'var(--text-secondary)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', fontSize: 16, gap: 2,
          }}
          onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-hover)'; }}
          onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
          >
            <span>{item.icon}</span>
            <span style={{ fontSize: 9 }}>{item.label}</span>
          </button>
        );
      })}

      {/* Bottom buttons */}
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <button style={{
          width: 36, height: 36, borderRadius: 8,
          background: 'transparent', color: 'var(--text-secondary)', fontSize: 14,
        }}>🌐</button>
        <button style={{
          width: 36, height: 36, borderRadius: 8,
          background: 'transparent', color: 'var(--text-secondary)', fontSize: 14,
        }}>🌙</button>
        <button style={{
          width: 36, height: 36, borderRadius: 8,
          background: 'transparent', color: 'var(--text-secondary)', fontSize: 14,
        }}>ℹ️</button>
      </div>
    </nav>
  );
}
```

- [ ] **Step 3: Create Home.tsx**

```tsx
import { useNavigate } from 'react-router-dom';

const tools = [
  { path: '/qpcr', title: 'qPCR Tools', desc: '实时荧光定量 PCR 数据分析', gradient: 'linear-gradient(135deg, #4285F4, #34A853)' },
  { path: '/tiff', title: 'TIFF 转 JPG', desc: '批量图片格式转换', gradient: 'linear-gradient(135deg, #EA4335, #FBBC05)' },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '40px 20px', gap: 24, height: '100%',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 52, height: 52, borderRadius: 12,
          background: 'linear-gradient(135deg, #4285F4, #34A853)',
          margin: '0 auto 12px',
        }} />
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Mynx</h1>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>效率工具集</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
        {tools.map(tool => (
          <button key={tool.path} onClick={() => navigate(tool.path)} style={{
            padding: '16px 20px', borderRadius: 12,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14,
            transition: 'all 180ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--accent)';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: tool.gradient, flexShrink: 0,
            }} />
            <div>
              <div style={{ fontWeight: 500 }}>{tool.title}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{tool.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Update App.tsx with full layout**

```tsx
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import TitleBar from './components/TitleBar';
import Sidebar from './components/Sidebar';
import Home from './components/Home';

const titles: Record<string, string> = {
  '/': 'Mynx',
  '/qpcr': 'qPCR Tools',
  '/tiff': 'TIFF 转 JPG',
};

function Layout() {
  const location = useLocation();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <TitleBar title={titles[location.pathname] || 'Mynx'} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <main style={{ flex: 1, overflow: 'auto' }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/qpcr" element={<div>qPCR Tools</div>} />
            <Route path="/tiff" element={<div>TIFF to JPG</div>} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}
```

- [ ] **Step 5: Verify layout**

```bash
npm run tauri dev
```

Expected: Frameless window with title bar, sidebar nav, home page with tool cards.

- [ ] **Step 6: Commit**

```bash
git add src/components/ src/App.tsx src/styles/
git commit -m "feat: implement app shell with title bar, sidebar, and home page"
```

---

### Task 4: qPCR — File Selection + Excel Reading

**Covers:** [S5]

**Files:**
- Create: `src/lib/excel-io.ts`, `src/pages/qPCR/QpcrPage.tsx`, `src/pages/qPCR/FileSelect.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create excel-io.ts**

```tsx
import ExcelJS from 'exceljs';

export interface ExcelFile {
  path: string;
  name: string;
  workbook: ExcelJS.Workbook;
}

export async function readExcelFile(path: string, name: string): Promise<ExcelFile> {
  const { readFile } = await import('@tauri-apps/plugin-fs');
  const buffer = await readFile(path);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return { path, name, workbook };
}

export function getSheetNames(wb: ExcelJS.Workbook): string[] {
  return wb.worksheets.map(s => s.name);
}

export function getSheet(wb: ExcelJS.Workbook, name: string): ExcelJS.Worksheet | undefined {
  return wb.worksheets.find(s => s.name === name);
}

export async function saveExcelFile(wb: ExcelJS.Workbook, path: string): Promise<void> {
  const buffer = await wb.xlsx.writeBuffer();
  const { writeFile } = await import('@tauri-apps/plugin-fs');
  await writeFile(path, new Uint8Array(buffer));
}
```

- [ ] **Step 2: Create FileSelect.tsx**

```tsx
import { open } from '@tauri-apps/plugin-dialog';
import { readExcelFile, getSheetNames, type ExcelFile } from '../../lib/excel-io';

interface FileSelectProps {
  file: ExcelFile | null;
  sheetName: string;
  onFileSelect: (file: ExcelFile) => void;
  onSheetChange: (name: string) => void;
  onClear: () => void;
  onSave: () => void;
}

export default function FileSelect({ file, sheetName, onFileSelect, onSheetChange, onClear, onSave }: FileSelectProps) {
  const handleOpen = async () => {
    const selected = await open({
      multiple: false,
      filters: [{ name: 'Excel', extensions: ['xlsx', 'xls'] }],
    });
    if (selected) {
      const f = await readExcelFile(selected, selected.split(/[\\/]/).pop() || 'file.xlsx');
      onFileSelect(f);
    }
  };

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 12, padding: 16,
    }}>
      {file ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 24 }}>📊</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.path}</div>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-secondary)' }}>
          点击"打开"选择 Excel 文件
        </div>
      )}

      {file && (
        <select value={sheetName} onChange={e => onSheetChange(e.target.value)} style={{
          width: '100%', marginBottom: 12, padding: '6px 10px',
        }}>
          {getSheetNames(file.workbook).map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleOpen} style={{
          flex: 1, padding: '8px 0', borderRadius: 8,
          background: 'var(--accent)', color: '#fff', fontWeight: 500,
        }}>打开</button>
        <button onClick={onSave} disabled={!file} style={{
          flex: 1, padding: '8px 0', borderRadius: 8,
          background: 'var(--bg-hover)', color: 'var(--text-primary)',
          opacity: file ? 1 : 0.5,
        }}>保存</button>
        <button onClick={onClear} disabled={!file} style={{
          flex: 1, padding: '8px 0', borderRadius: 8,
          background: 'var(--bg-hover)', color: 'var(--text-primary)',
          opacity: file ? 1 : 0.5,
        }}>清空</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create QpcrPage.tsx**

```tsx
import { useState } from 'react';
import FileSelect from './FileSelect';
import type { ExcelFile } from '../../lib/excel-io';
import { save } from '@tauri-apps/plugin-dialog';

export default function QpcrPage() {
  const [file, setFile] = useState<ExcelFile | null>(null);
  const [sheetName, setSheetName] = useState('');

  const handleSave = async () => {
    if (!file) return;
    const path = await save({ defaultPath: file.name, filters: [{ name: 'Excel', extensions: ['xlsx'] }] });
    if (path) {
      const { saveExcelFile } = await import('../../lib/excel-io');
      await saveExcelFile(file.workbook, path);
    }
  };

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <FileSelect
        file={file}
        sheetName={sheetName}
        onFileSelect={f => { setFile(f); setSheetName(f.workbook.worksheets[0]?.name || ''); }}
        onSheetChange={setSheetName}
        onClear={() => { setFile(null); setSheetName(''); }}
        onSave={handleSave}
      />
    </div>
  );
}
```

- [ ] **Step 4: Add qPCR route to App.tsx**

Update the Routes in `src/App.tsx`:
```tsx
import QpcrPage from './pages/qPCR/QpcrPage';

// In Routes:
<Route path="/qpcr" element={<QpcrPage />} />
```

- [ ] **Step 5: Verify**

```bash
npm run tauri dev
```

Expected: qPCR page shows file picker, can open Excel, sheet dropdown appears.

- [ ] **Step 6: Commit**

```bash
git add src/lib/excel-io.ts src/pages/qPCR/ src/App.tsx
git commit -m "feat: add qPCR file selection with ExcelJS reading"
```

---

### Task 5: qPCR — Data Transform Algorithm

**Covers:** [S6]

**Files:**
- Create: `src/lib/qpcr-transform.ts`, `src/pages/qPCR/Transform.tsx`
- Modify: `src/pages/qPCR/QpcrPage.tsx`

- [ ] **Step 1: Create qpcr-transform.ts**

```tsx
import ExcelJS from 'exceljs';

export interface TransformResult {
  sheet: ExcelJS.Worksheet;
  geneNames: string[];
}

export function transformQpcrData(
  sourceSheet: ExcelJS.Worksheet,
): TransformResult {
  const rows = sourceSheet.eachRow({ includeEmpty: false });
  const headerRow = sourceSheet.getRow(1);

  // Auto-detect columns
  let targetCol = 0, sampleCol = 0, cqCol = 0;
  headerRow.eachCell((cell, colNumber) => {
    const val = String(cell.value || '').toLowerCase().trim();
    if (['target', 'gene', '基因'].includes(val)) targetCol = colNumber;
    if (['sample', 'group', '样本', '分组'].includes(val)) sampleCol = colNumber;
    if (['cq', 'ct'].includes(val)) cqCol = colNumber;
  });

  // Fallback to column indices if not found
  if (!targetCol) targetCol = 3;
  if (!sampleCol) sampleCol = 5;
  if (!cqCol) cqCol = 6;

  // Build dictionary: sample → { gene → values[] }
  const dict = new Map<string, Map<string, number[]>>();
  const geneSet = new Set<string>();

  sourceSheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const sample = String(row.getCell(sampleCol).value || '').trim();
    const target = String(row.getCell(targetCol).value || '').trim();
    const cqRaw = row.getCell(cqCol).value;
    const cq = typeof cqRaw === 'number' ? cqRaw : parseFloat(String(cqRaw));

    if (!sample || !target) return;
    if (!dict.has(sample)) dict.set(sample, new Map());
    const sampleMap = dict.get(sample)!;
    if (!sampleMap.has(target)) sampleMap.set(target, []);
    if (!isNaN(cq)) sampleMap.get(target)!.push(cq);
    geneSet.add(target);
  });

  const geneNames = Array.from(geneSet);
  const newWb = new ExcelJS.Workbook();
  const newSheet = newWb.addWorksheet('Transformed Data');

  // Header: num | group name | gene1 | gene2 | ...
  newSheet.getRow(1).getCell(1).value = 'num';
  newSheet.getRow(1).getCell(1).font = { bold: true };
  newSheet.getRow(1).getCell(2).value = 'group name';
  newSheet.getRow(1).getCell(2).font = { bold: true };
  geneNames.forEach((gene, i) => {
    const cell = newSheet.getRow(1).getCell(3 + i);
    cell.value = gene;
    cell.font = { bold: true };
  });

  // Fill data
  let newRow = 2;
  let num = 1;
  for (const [sample, sampleMap] of dict) {
    // Find max reps for this sample
    let maxReps = 0;
    for (const vals of sampleMap.values()) {
      if (vals.length > maxReps) maxReps = vals.length;
    }
    if (maxReps === 0) maxReps = 1;

    for (let j = 0; j < maxReps; j++) {
      const row = newSheet.getRow(newRow);
      if (j === 0) {
        row.getCell(1).value = num++;
        row.getCell(2).value = sample;
      }
      geneNames.forEach((gene, i) => {
        const vals = sampleMap.get(gene);
        const cell = row.getCell(3 + i);
        if (vals && j < vals.length) {
          cell.value = vals[j];
        } else {
          // Missing value: fill 50 if all missing, else leave empty
          const hasAny = vals && vals.length > 0;
          if (!hasAny) {
            cell.value = 50;
          }
          cell.fill = {
            type: 'pattern', pattern: 'solid',
            fgColor: { argb: 'FFFFFF00' },
          };
        }
      });
      newRow++;
    }
  }

  newSheet.columns.forEach(col => { col.width = 15; });

  return { sheet: newSheet, geneNames };
}
```

- [ ] **Step 2: Create Transform.tsx**

```tsx
import { useState } from 'react';
import ExcelJS from 'exceljs';
import { transformQpcrData } from '../../lib/qpcr-transform';

interface TransformProps {
  workbook: ExcelJS.Workbook | null;
  sheetName: string;
  onComplete: (geneNames: string[]) => void;
}

type Status = 'ready' | 'processing' | 'success' | 'error';

const statusColors: Record<Status, string> = {
  ready: 'var(--text-secondary)',
  processing: 'var(--accent)',
  success: 'var(--green)',
  error: 'var(--red)',
};

const statusLabels: Record<Status, string> = {
  ready: '就绪',
  processing: '处理中...',
  success: '成功',
  error: '失败',
};

export default function Transform({ workbook, sheetName, onComplete }: TransformProps) {
  const [status, setStatus] = useState<Status>('ready');

  const handleTransform = async () => {
    if (!workbook || !sheetName) return;
    setStatus('processing');
    try {
      const ws = workbook.getWorksheet(sheetName);
      if (!ws) throw new Error('工作表不存在');

      const { sheet, geneNames } = transformQpcrData(ws);

      // Remove old Transformed Data if exists
      const old = workbook.getWorksheet('Transformed Data');
      if (old) workbook.removeWorksheet(old.id);

      // Add transformed sheet
      workbook.addWorksheet('Transformed Data');
      const target = workbook.getWorksheet('Transformed Data')!;

      // Copy data
      sheet.eachRow((row, rowNumber) => {
        const targetRow = target.getRow(rowNumber);
        row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
          const targetCell = targetRow.getCell(colNumber);
          targetCell.value = cell.value;
          if (cell.font) targetCell.font = cell.font;
          if (cell.fill) targetCell.fill = cell.fill;
        });
      });

      target.columns.forEach((col, i) => { col.width = 15; });

      setStatus('success');
      onComplete(geneNames);
    } catch (e) {
      console.error(e);
      setStatus('error');
    }
  };

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 12, padding: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{
          width: 24, height: 24, borderRadius: 12,
          background: status === 'success' ? 'var(--green)' : 'var(--accent)',
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 600,
        }}>1</div>
        <span style={{ fontWeight: 500 }}>数据转换</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: statusColors[status] }}>{statusLabels[status]}</span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
        转换为转置表格，缺失值自动处理并标黄
      </p>
      <button onClick={handleTransform} disabled={!workbook || !sheetName || status === 'processing'} style={{
        width: '100%', padding: '8px 0', borderRadius: 8,
        background: 'var(--accent)', color: '#fff', fontWeight: 500,
        opacity: workbook && sheetName && status !== 'processing' ? 1 : 0.5,
      }}>
        {status === 'processing' ? '处理中...' : '执行转换'}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Update QpcrPage.tsx to include Transform**

```tsx
import { useState } from 'react';
import FileSelect from './FileSelect';
import Transform from './Transform';
import type { ExcelFile } from '../../lib/excel-io';
import { save } from '@tauri-apps/plugin-dialog';

export default function QpcrPage() {
  const [file, setFile] = useState<ExcelFile | null>(null);
  const [sheetName, setSheetName] = useState('');
  const [geneNames, setGeneNames] = useState<string[]>([]);

  const handleSave = async () => {
    if (!file) return;
    const path = await save({ defaultPath: file.name, filters: [{ name: 'Excel', extensions: ['xlsx'] }] });
    if (path) {
      const { saveExcelFile } = await import('../../lib/excel-io');
      await saveExcelFile(file.workbook, path);
    }
  };

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <FileSelect
        file={file}
        sheetName={sheetName}
        onFileSelect={f => { setFile(f); setSheetName(f.workbook.worksheets[0]?.name || ''); }}
        onSheetChange={setSheetName}
        onClear={() => { setFile(null); setSheetName(''); setGeneNames([]); }}
        onSave={handleSave}
      />
      <Transform
        workbook={file?.workbook || null}
        sheetName={sheetName}
        onComplete={setGeneNames}
      />
    </div>
  );
}
```

- [ ] **Step 4: Verify**

```bash
npm run tauri dev
```

Expected: Open Excel → select sheet → click "执行转换" → "Transformed Data" sheet created in workbook.

- [ ] **Step 5: Commit**

```bash
git add src/lib/qpcr-transform.ts src/pages/qPCR/
git commit -m "feat: implement qPCR data transform with column detection and missing value handling"
```

---

### Task 6: qPCR — Calculation Algorithm

**Covers:** [S7]

**Files:**
- Create: `src/lib/qpcr-calculate.ts`, `src/pages/qPCR/Calculate.tsx`
- Modify: `src/pages/qPCR/QpcrPage.tsx`

- [ ] **Step 1: Create qpcr-calculate.ts**

```tsx
import ExcelJS from 'exceljs';

export interface CalcResult {
  geneSheets: string[];
  summarySheet: string;
}

export function calculateQpcr(
  workbook: ExcelJS.Workbook,
  repeatCount: number,
  refGene: string,
): CalcResult {
  const srcSheet = workbook.getWorksheet('Transformed Data');
  if (!srcSheet) throw new Error('Transformed Data 工作表不存在');

  const headerRow = srcSheet.getRow(1);
  const lastCol = headerRow.cellCount;
  const lastRow = srcSheet.rowCount;

  // Get gene names from columns 3+
  const geneNames: string[] = [];
  const geneColMap = new Map<string, number>();
  for (let c = 3; c <= lastCol; c++) {
    const name = String(headerRow.getCell(c).value || '').trim();
    if (name && name !== refGene) {
      geneNames.push(name);
      geneColMap.set(name, c);
    }
  }

  const refCol = 3; // C column = ref gene
  const groupCol = 2; // B column = group name

  // Delete old gene sheets
  const existingNames = new Set<string>();
  workbook.eachSheet(s => {
    if (s.name !== 'Transformed Data' && s.name !== 'Summary_All_Genes' && s.name !== 'Sheet1') {
      existingNames.add(s.name);
    }
  });
  existingNames.forEach(name => {
    const ws = workbook.getWorksheet(name);
    if (ws) workbook.removeWorksheet(ws.id);
  });

  // Create or clear Summary
  let summaryWs = workbook.getWorksheet('Summary_All_Genes');
  if (summaryWs) {
    summaryWs = workbook.addWorksheet('Summary_All_Genes', { id: summaryWs.id });
  } else {
    summaryWs = workbook.addWorksheet('Summary_All_Genes');
  }
  summaryWs.getCell(1, 1).value = 'Gene';
  summaryWs.getCell(1, 2).value = 'Group_Name';
  for (let r = 1; r <= repeatCount; r++) {
    summaryWs.getCell(1, 2 + r).value = `Repeat${r}`;
  }
  summaryWs.getCell(1, 2 + repeatCount + 1).value = 'Average';
  summaryWs.getCell(1, 2 + repeatCount + 2).value = 'Stdev';
  summaryWs.getRow(1).eachCell(c => { c.font = { bold: true }; });

  let summaryRow = 2;

  for (const gene of geneNames) {
    const targetCol = geneColMap.get(gene)!;
    const ws = workbook.addWorksheet(gene.substring(0, 31));

    ws.getRow(1).values = ['TBP', gene, 'Relative Expression', 'Average', 'Stdev', 'Group_Name'];
    ws.getRow(1).eachCell(c => { c.font = { bold: true }; });

    const groupData = new Map<string, { values: number[]; avg: number; stdev: number }>();
    let outputRow = 2;

    for (let i = 2; i <= lastRow; i += repeatCount) {
      const groupName = String(srcSheet.getCell(i, groupCol).value || '').trim();
      if (!groupName) break;

      const reValues: number[] = [];
      let allValid = true;

      for (let r = 0; r < repeatCount; r++) {
        const currRow = i + r;
        const tbpVal = srcSheet.getCell(currRow, refCol).value;
        const tgVal = srcSheet.getCell(currRow, targetCol).value;

        const tbp = typeof tbpVal === 'number' ? tbpVal : parseFloat(String(tbpVal || ''));
        const tg = typeof tgVal === 'number' ? tgVal : parseFloat(String(tgVal || ''));

        if (!isNaN(tbp) && !isNaN(tg) && String(tbpVal || '').trim() !== '') {
          const re = Math.pow(2, -(tg - tbp));
          reValues.push(re);
          ws.getCell(outputRow + r, 1).value = tbp;
          ws.getCell(outputRow + r, 2).value = tg;
          ws.getCell(outputRow + r, 3).value = re;
          ws.getCell(outputRow + r, 6).value = groupName;
        } else {
          allValid = false;
        }
      }

      if (allValid && reValues.length === repeatCount) {
        const avg = reValues.reduce((a, b) => a + b, 0) / reValues.length;
        const variance = reValues.reduce((s, v) => s + (v - avg) ** 2, 0) / (reValues.length - 1 || 1);
        const stdev = Math.sqrt(variance);

        ws.getCell(outputRow, 4).value = avg;
        ws.getCell(outputRow, 5).value = stdev;

        groupData.set(groupName, { values: reValues, avg, stdev });

        // Summary row
        summaryWs.getCell(summaryRow, 1).value = gene;
        summaryWs.getCell(summaryRow, 2).value = groupName;
        for (let r = 0; r < repeatCount; r++) {
          summaryWs.getCell(summaryRow, 2 + r + 1).value = reValues[r];
        }
        summaryWs.getCell(summaryRow, 2 + repeatCount + 1).value = avg;
        summaryWs.getCell(summaryRow, 2 + repeatCount + 2).value = stdev;
        summaryRow++;
      }

      outputRow += repeatCount;
    }

    // Gene-level summary table for chart
    const summaryStart = outputRow + 2;
    ws.getCell(summaryStart, 1).value = 'Group_Name';
    ws.getCell(summaryStart, 2).value = 'Average';
    ws.getCell(summaryStart, 3).value = 'Stdev';
    ws.getRow(summaryStart).eachCell(c => { c.font = { bold: true }; });

    let chartRow = summaryStart + 1;
    for (const [name, data] of groupData) {
      ws.getCell(chartRow, 1).value = name;
      ws.getCell(chartRow, 2).value = data.avg;
      ws.getCell(chartRow, 3).value = data.stdev;
      chartRow++;
    }

    ws.columns.forEach(col => { col.width = 16; });
  }

  summaryWs.columns.forEach(col => { col.width = 16; });

  return { geneSheets: geneNames, summarySheet: 'Summary_All_Genes' };
}
```

- [ ] **Step 2: Create Calculate.tsx**

```tsx
import { useState } from 'react';
import ExcelJS from 'exceljs';
import { calculateQpcr } from '../../lib/qpcr-calculate';

interface CalculateProps {
  workbook: ExcelJS.Workbook | null;
  geneNames: string[];
}

type Status = 'ready' | 'processing' | 'success' | 'error';

const statusColors: Record<Status, string> = {
  ready: 'var(--text-secondary)',
  processing: 'var(--accent)',
  success: 'var(--green)',
  error: 'var(--red)',
};

const statusLabels: Record<Status, string> = {
  ready: '就绪',
  processing: '处理中...',
  success: '成功',
  error: '失败',
};

export default function Calculate({ workbook, geneNames }: CalculateProps) {
  const [repeatCount, setRepeatCount] = useState(2);
  const [refGene, setRefGene] = useState('');
  const [status, setStatus] = useState<Status>('ready');

  const handleCalculate = async () => {
    if (!workbook || !refGene) return;
    setStatus('processing');
    try {
      calculateQpcr(workbook, repeatCount, refGene);
      setStatus('success');
    } catch (e) {
      console.error(e);
      setStatus('error');
    }
  };

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 12, padding: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{
          width: 24, height: 24, borderRadius: 12,
          background: status === 'success' ? 'var(--green)' : 'var(--accent)',
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 600,
        }}>2</div>
        <span style={{ fontWeight: 500 }}>qPCR 计算</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: statusColors[status] }}>{statusLabels[status]}</span>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>重复数</label>
          <select value={repeatCount} onChange={e => setRepeatCount(Number(e.target.value))} style={{ width: '100%' }}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 2 }}>
          <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>参考基因</label>
          <select value={refGene} onChange={e => setRefGene(e.target.value)} style={{ width: '100%' }}>
            <option value="">选择参考基因</option>
            {geneNames.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      <button onClick={handleCalculate} disabled={!workbook || !refGene || status === 'processing'} style={{
        width: '100%', padding: '8px 0', borderRadius: 8,
        background: 'var(--accent)', color: '#fff', fontWeight: 500,
        opacity: workbook && refGene && status !== 'processing' ? 1 : 0.5,
      }}>
        {status === 'processing' ? '处理中...' : '执行计算'}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Update QpcrPage.tsx to include Calculate**

Add the Calculate component after Transform:
```tsx
import Calculate from './Calculate';

// In JSX, after Transform:
<Calculate workbook={file?.workbook || null} geneNames={geneNames} />
```

- [ ] **Step 4: Verify**

```bash
npm run tauri dev
```

Expected: After transform, gene names appear in dropdown. Select ref gene → click calculate → gene sheets + Summary_All_Genes created.

- [ ] **Step 5: Commit**

```bash
git add src/lib/qpcr-calculate.ts src/pages/qPCR/Calculate.tsx src/pages/qPCR/QpcrPage.tsx
git commit -m "feat: implement qPCR 2^(-ΔCt) calculation with gene sheets and summary"
```

---

### Task 7: Chart Generation via VBS

**Covers:** [S8]

**Files:**
- Create: `src/lib/chart-gen.ts`

- [ ] **Step 1: Create chart-gen.ts**

```tsx
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { Command } from '@tauri-apps/plugin-shell';

export async function generateVbsCharts(
  excelPath: string,
  geneNames: string[],
  repeatCount: number,
): Promise<void> {
  const vbsLines: string[] = [
    'Dim xlApp, xlWB',
    'Set xlApp = CreateObject("Excel.Application")',
    'xlApp.Visible = False',
    `Set xlWB = xlApp.Workbooks.Open("${excelPath.replace(/\\/g, '\\\\')}")`,
    '',
  ];

  for (const gene of geneNames) {
    const safeName = gene.replace(/"/g, '""');
    vbsLines.push(
      `Dim ws${gene.replace(/[^a-zA-Z0-9]/g, '_')}`,
      `Set ws${gene.replace(/[^a-zA-Z0-9]/g, '_')} = xlWB.Sheets("${safeName}")`,
      '',
      `With ws${gene.replace(/[^a-zA-Z0-9]/g, '_')}.ChartObjects.Add(10, 20, 400, 300).Chart`,
      `  .SetSourceData Source:=ws${gene.replace(/[^a-zA-Z0-9]/g, '_')}.Range("A1:B10"), PlotBy:=xlColumns`,
      '  .ChartType = 51', // xlColumnClustered
      `  .HasTitle = True`,
      `  .ChartTitle.Text = "${safeName}"`,
      '  .ChartTitle.Font.Italic = True',
      '  .HasLegend = False',
      '  .PlotArea.Format.Line.Visible = False',
      '  .ChartArea.Format.Line.Visible = False',
      '',
      '  With .Axes(xlCategory)',
      '    .TickLabels.Orientation = 45',
      '  End With',
      '',
      '  With .Axes(xlValue)',
      '    .HasTitle = True',
      '    .AxisTitle.Text = "Normalize to TBP"',
      '    .HasMajorGridlines = False',
      '  End With',
      '',
      '  If .SeriesCollection.Count > 0 Then',
      '    .SeriesCollection(1).Format.Fill.ForeColor.RGB = RGB(30, 142, 62)',
      '    .SeriesCollection(1).Format.Line.ForeColor.RGB = RGB(0, 0, 0)',
      `    If ${repeatCount} > 1 Then`,
      '      .SeriesCollection(1).HasErrorBars = True',
      '      .SeriesCollection(1).ErrorBar Direction:=xlY, Include:=xlBoth, Type:=xlCustom, Amount:=ws' + gene.replace(/[^a-zA-Z0-9]/g, '_') + '.Range("C2:C10"), MinusValues:=ws' + gene.replace(/[^a-zA-Z0-9]/g, '_') + '.Range("C2:C10")',
      '      .SeriesCollection(1).ErrorBars.Format.Line.ForeColor.RGB = RGB(0, 0, 0)',
      '    End If',
      '  End If',
      'End With',
      '',
    );
  }

  vbsLines.push(
    'xlWB.Save',
    'xlWB.Close',
    'xlApp.Quit',
    'Set xlApp = Nothing',
  );

  const vbsPath = excelPath.replace(/\.xlsx?$/i, '_charts.vbs');
  await writeTextFile(vbsPath, vbsLines.join('\r\n'));

  // Execute VBS via cscript
  await Command.create('cmd', ['/c', 'cscript', '//Nologo', vbsPath]).execute();
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/chart-gen.ts
git commit -m "feat: add VBS chart generation for qPCR results"
```

---

### Task 8: TIFF to JPG Conversion

**Covers:** [S9]

**Files:**
- Create: `src/lib/tiff-convert.ts`, `src/pages/tiff/TiffPage.tsx`, `src/pages/tiff/ConvertOptions.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create tiff-convert.ts**

```tsx
import { Command } from '@tauri-apps/plugin-shell';

export interface TiffOptions {
  folderPath: string;
  addWatermark: boolean;
  fontName: string;
  fontSize: number;
  fontBold: boolean;
  fontItalic: boolean;
  marginX: number;
  marginY: number;
  paddingX: number;
  paddingY: number;
  bgTransparency: string;
  jpegQuality: number;
}

const transparencyMap: Record<string, number> = {
  'opaque': 255,
  'semi': 210,
  'light': 150,
  'transparent': 0,
};

export async function convertTiff(options: TiffOptions): Promise<{ ok: number; failed: number; outputDir: string }> {
  const { folderPath, addWatermark, ...rest } = options;

  const ts = new Date().toISOString().replace(/[-:T]/g, '').substring(0, 15);
  const outputDir = `${folderPath}\\JPG_output_${ts}`;

  const script = `
Add-Type -AssemblyName System.Drawing
$SourceDir = '${folderPath.replace(/\\/g, '\\\\')}'
$OutputDir = '${outputDir.replace(/\\/g, '\\\\')}'
New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

$Files = Get-ChildItem -LiteralPath $SourceDir -File | Where-Object { $_.Extension -match '^\\.tiff?$' }
if (-not $Files -or $Files.Count -eq 0) { Write-Output 'NO_FILES'; exit 0 }

$style = [System.Drawing.FontStyle]::Regular
if (${rest.fontBold ? '$true' : '$false'}) { $style = $style -bor [System.Drawing.FontStyle]::Bold }
if (${rest.fontItalic ? '$true' : '$false'}) { $style = $style -bor [System.Drawing.FontStyle]::Italic }

$jpgCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
$encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [int64]${rest.jpegQuality})

$ok = 0; $failed = 0
foreach ($file in $Files) {
  try {
    $image = [System.Drawing.Image]::FromFile($file.FullName)
    $bitmap = New-Object System.Drawing.Bitmap($image.Width, $image.Height, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.Clear([System.Drawing.Color]::White)
    $graphics.DrawImage($image, 0, 0, $image.Width, $image.Height)
    if (${addWatermark ? '$true' : '$false'}) {
      $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
      $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
      $font = New-Object System.Drawing.Font('${rest.fontName}', ${rest.fontSize}, $style, [System.Drawing.GraphicsUnit]::Pixel)
      $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
      $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(${transparencyMap[rest.bgTransparency]}, 90, 90, 90))
      $label = $file.BaseName
      $maxWidth = [single]($image.Width - ${rest.marginX} - ${rest.paddingX})
      $sf = New-Object System.Drawing.StringFormat
      $sf.FormatFlags = [System.Drawing.StringFormatFlags]::MeasureTrailingSpaces
      $rect = New-Object System.Drawing.RectangleF(${rest.marginX}, ${rest.marginY}, $maxWidth, $image.Height)
      $textSize = $graphics.MeasureString($label, $font, $maxWidth, $sf)
      $bgRect = New-Object System.Drawing.RectangleF(${rest.marginX}, ${rest.marginY}, [Math]::Min($textSize.Width + 2 * ${rest.paddingX}, $maxWidth), $textSize.Height + 2 * ${rest.paddingY})
      $textPt = New-Object System.Drawing.PointF(${rest.marginX} + ${rest.paddingX}, ${rest.marginY} + ${rest.paddingY})
      $graphics.FillRectangle($bgBrush, $bgRect)
      $graphics.DrawString($label, $font, $textBrush, $rect, $sf)
    }
    $outPath = Join-Path $OutputDir ($file.BaseName + ".jpg")
    $bitmap.Save($outPath, $jpgCodec, $encoderParams)
    $ok++
    if ($graphics) { $graphics.Dispose() }
    if ($bitmap) { $bitmap.Dispose() }
    if ($image) { $image.Dispose() }
  } catch { $failed++ }
}
Write-Output "RESULT:$ok:$failed:$OutputDir"
`.trim();

  const result = await Command.create('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script]).execute();

  const output = result.stdout;
  const match = output.match(/RESULT:(\d+):(\d+):(.+)/);
  if (match) {
    return { ok: parseInt(match[1]), failed: parseInt(match[2]), outputDir: match[3].trim() };
  }
  return { ok: 0, failed: 0, outputDir };
}
```

- [ ] **Step 2: Create ConvertOptions.tsx**

```tsx
import { useState } from 'react';
import type { TiffOptions } from '../../lib/tiff-convert';

interface ConvertOptionsProps {
  onConvert: (options: TiffOptions) => void;
  isConverting: boolean;
}

export default function ConvertOptions({ onConvert, isConverting }: ConvertOptionsProps) {
  const [addWatermark, setAddWatermark] = useState(true);
  const [fontName, setFontName] = useState('Arial');
  const [fontSize, setFontSize] = useState(72);
  const [fontBold, setFontBold] = useState(true);
  const [fontItalic, setFontItalic] = useState(false);
  const [marginX, setMarginX] = useState(18);
  const [marginY, setMarginY] = useState(18);
  const [paddingX, setPaddingX] = useState(12);
  const [paddingY, setPaddingY] = useState(8);
  const [bgTransparency, setBgTransparency] = useState('semi');
  const [jpegQuality, setJpegQuality] = useState(95);

  const handleConvert = () => {
    onConvert({
      folderPath: '',
      addWatermark,
      fontName, fontSize, fontBold, fontItalic,
      marginX, marginY, paddingX, paddingY,
      bgTransparency, jpegQuality,
    });
  };

  const fieldStyle = { display: 'flex', flexDirection: 'column' as const, gap: 4 };
  const labelStyle = { fontSize: 11, color: 'var(--text-secondary)' };

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 12, padding: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <label style={{ fontSize: 13, fontWeight: 500 }}>添加文件名水印</label>
        <button onClick={() => setAddWatermark(!addWatermark)} style={{
          width: 36, height: 20, borderRadius: 10,
          background: addWatermark ? 'var(--accent)' : 'var(--bg-hover)',
          position: 'relative',
        }}>
          <div style={{
            width: 16, height: 16, borderRadius: 8, background: '#fff',
            position: 'absolute', top: 2,
            left: addWatermark ? 18 : 2,
            transition: 'left 180ms',
          }} />
        </button>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{addWatermark ? '是' : '否'}</span>
      </div>

      {addWatermark && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          <div style={fieldStyle}>
            <label style={labelStyle}>字体</label>
            <select value={fontName} onChange={e => setFontName(e.target.value)}>
              {['Arial', 'Calibri', 'Times New Roman', '微软雅黑', '黑体', '宋体'].map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>字号</label>
            <select value={fontSize} onChange={e => setFontSize(Number(e.target.value))}>
              {[36, 48, 60, 72, 96, 120].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>粗体</label>
            <button onClick={() => setFontBold(!fontBold)} style={{
              padding: '4px 0', borderRadius: 6,
              background: fontBold ? 'var(--accent)' : 'var(--bg-hover)',
              color: fontBold ? '#fff' : 'var(--text-primary)',
            }}>B</button>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>斜体</label>
            <button onClick={() => setFontItalic(!fontItalic)} style={{
              padding: '4px 0', borderRadius: 6,
              background: fontItalic ? 'var(--accent)' : 'var(--bg-hover)',
              color: fontItalic ? '#fff' : 'var(--text-primary)',
            }}>I</button>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>左边距</label>
            <input type="number" value={marginX} onChange={e => setMarginX(Number(e.target.value))} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>上边距</label>
            <input type="number" value={marginY} onChange={e => setMarginY(Number(e.target.value))} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>内边距 X</label>
            <input type="number" value={paddingX} onChange={e => setPaddingX(Number(e.target.value))} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>内边距 Y</label>
            <input type="number" value={paddingY} onChange={e => setPaddingY(Number(e.target.value))} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>背景透明度</label>
            <select value={bgTransparency} onChange={e => setBgTransparency(e.target.value)}>
              <option value="opaque">不透明</option>
              <option value="semi">半透明</option>
              <option value="light">较透明</option>
              <option value="transparent">全透明</option>
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>JPG 质量</label>
            <select value={jpegQuality} onChange={e => setJpegQuality(Number(e.target.value))}>
              {[80, 85, 90, 95, 98].map(q => (
                <option key={q} value={q}>{q}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <button onClick={handleConvert} disabled={isConverting} style={{
        width: '100%', padding: '8px 0', borderRadius: 8,
        background: 'var(--accent)', color: '#fff', fontWeight: 500,
        opacity: isConverting ? 0.5 : 1,
      }}>
        {isConverting ? '转换中...' : '开始转换'}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Create TiffPage.tsx**

```tsx
import { useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import ConvertOptions from './ConvertOptions';
import { convertTiff, type TiffOptions } from '../../lib/tiff-convert';

export default function TiffPage() {
  const [folderPath, setFolderPath] = useState('');
  const [folderName, setFolderName] = useState('');
  const [isConverting, setIsConverting] = useState(false);

  const handleSelectFolder = async () => {
    const selected = await open({ directory: true });
    if (selected) {
      setFolderPath(selected);
      setFolderName(selected.split(/[\\/]/).pop() || selected);
    }
  };

  const handleConvert = async (opts: TiffOptions) => {
    if (!folderPath) return;
    setIsConverting(true);
    try {
      const result = await convertTiff({ ...opts, folderPath });
      alert(`转换完成！成功 ${result.ok} 个，失败 ${result.failed} 个\n输出: ${result.outputDir}`);
    } catch (e) {
      alert(`转换失败: ${e}`);
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 16,
      }}>
        {folderPath ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 24, color: 'var(--green)' }}>📁</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500 }}>{folderName}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{folderPath}</div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-secondary)' }}>
            点击下方按钮选择 TIFF 文件夹
          </div>
        )}
        <button onClick={handleSelectFolder} style={{
          width: '100%', padding: '8px 0', borderRadius: 8,
          background: 'var(--accent)', color: '#fff', fontWeight: 500,
        }}>选择文件夹</button>
      </div>

      {folderPath && <ConvertOptions onConvert={handleConvert} isConverting={isConverting} />}
    </div>
  );
}
```

- [ ] **Step 4: Add tiff route to App.tsx**

```tsx
import TiffPage from './pages/tiff/TiffPage';

// In Routes:
<Route path="/tiff" element={<TiffPage />} />
```

- [ ] **Step 5: Verify**

```bash
npm run tauri dev
```

Expected: TIFF page shows folder picker, options panel, conversion works.

- [ ] **Step 6: Commit**

```bash
git add src/lib/tiff-convert.ts src/pages/tiff/ src/App.tsx
git commit -m "feat: implement TIFF to JPG conversion with watermark options"
```

---

### Task 9: System Features — Theme Toggle + Config Persistence

**Covers:** [S10]

**Files:**
- Create: `src/hooks/useTheme.ts`, `src/lib/config.ts`
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: Create config.ts**

```tsx
import { Store } from '@tauri-apps/plugin-store';

let store: Store | null = null;

async function getStore(): Promise<Store> {
  if (!store) {
    store = await new Store('config.json');
  }
  return store;
}

export async function loadConfig(): Promise<{ theme: string; alwaysOnTop: boolean }> {
  const s = await getStore();
  const theme = (await s.get<string>('theme')) || 'dark';
  const alwaysOnTop = (await s.get<boolean>('alwaysOnTop')) || false;
  return { theme, alwaysOnTop };
}

export async function saveTheme(theme: string): Promise<void> {
  const s = await getStore();
  await s.set('theme', theme);
  await s.save();
}

export async function saveAlwaysOnTop(value: boolean): Promise<void> {
  const s = await getStore();
  await s.set('alwaysOnTop', value);
  await s.save();
}
```

- [ ] **Step 2: Create useTheme.ts**

```tsx
import { useState, useEffect, useCallback } from 'react';
import { loadConfig, saveTheme } from '../lib/config';

export function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    loadConfig().then(cfg => {
      setTheme(cfg.theme as 'dark' | 'light');
    });
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    saveTheme(next);
  }, [theme]);

  return { theme, toggleTheme };
}
```

- [ ] **Step 3: Update Sidebar.tsx to use theme toggle**

Import and wire the theme toggle button:
```tsx
import { useTheme } from '../hooks/useTheme';

// Inside component:
const { theme, toggleTheme } = useTheme();

// Replace the moon button:
<button onClick={toggleTheme} style={{
  width: 36, height: 36, borderRadius: 8,
  background: 'transparent', color: 'var(--text-secondary)', fontSize: 14,
}}>{theme === 'dark' ? '☀️' : '🌙'}</button>
```

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useTheme.ts src/lib/config.ts src/components/Sidebar.tsx
git commit -m "feat: add theme toggle with persistent config"
```

---

### Task 10: System Features — About Modal + Auto-Update

**Covers:** [S10]

**Files:**
- Create: `src/components/Modal.tsx`
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: Create Modal.tsx**

```tsx
import { useEffect } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function Modal({ open, onClose, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 24, minWidth: 280,
      }}>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update Sidebar.tsx with About modal**

Add state and modal:
```tsx
import { useState } from 'react';
import Modal from './Modal';

// In component:
const [showAbout, setShowAbout] = useState(false);

// Replace info button:
<button onClick={() => setShowAbout(true)} style={{...}}>ℹ️</button>

// Add modal at end of return:
<Modal open={showAbout} onClose={() => setShowAbout(false)}>
  <div style={{ textAlign: 'center' }}>
    <div style={{
      width: 52, height: 52, borderRadius: 12,
      background: 'linear-gradient(135deg, #4285F4, #34A853)',
      margin: '0 auto 12px',
    }} />
    <h2 style={{ fontSize: 16, fontWeight: 600 }}>Mynx</h2>
    <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>v1.0.0</p>
    <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>效率工具集</p>
    <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>作者: Fang Guanghan</p>
    <button style={{
      marginTop: 16, padding: '8px 24px', borderRadius: 8,
      background: 'var(--accent)', color: '#fff', fontWeight: 500,
    }}>检查更新</button>
  </div>
</Modal>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Modal.tsx src/components/Sidebar.tsx
git commit -m "feat: add about modal"
```

---

### Task 11: Packaging + Polish

**Covers:** [S11]

**Files:**
- Modify: `src-tauri/tauri.conf.json`

- [ ] **Step 1: Update tauri.conf.json for packaging**

```json
{
  "bundle": {
    "active": true,
    "identifier": "com.fanguanghan.mynx",
    "icon": ["icons/32x32.png", "icons/128x128.png", "icons/128x128@2x.png", "icons/icon.ico"],
    "windows": {
      "installer": {
        "installMode": "both",
        "installMode": "both"
      }
    },
    "resources": [],
    "compression": "best"
  }
}
```

- [ ] **Step 2: Generate app icons**

```bash
npm run tauri icon ref/icon.svg
```

- [ ] **Step 3: Build release**

```bash
npm run tauri build
```

Expected: `src-tauri/target/release/bundle/` contains installer.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: configure packaging and build release"
```
