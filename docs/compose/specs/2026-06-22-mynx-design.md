# Mynx Desktop Toolkit — Design Spec

## [S1] Problem

Researchers need a desktop tool to process qPCR experiment data (Excel-based) and batch-convert TIFF images to JPG. Current workflow uses separate VBA macros and PowerShell scripts, lacking a unified UI.

## [S2] Solution Overview

Mynx is a Tauri v2 desktop app (React + TypeScript) with a sidebar-based navigation, dark/light theme, and two functional modules: qPCR Tools and TIFF-to-JPG converter. All Excel processing uses ExcelJS (pure JS, no native addons). TIFF conversion calls PowerShell via tauri-plugin-shell.

## [S3] App Shell

- Frameless window, 440×620 default, 360×380 minimum
- Custom title bar (36px): feature name left, window controls right (pin/minimize/maximize/close)
- Left sidebar (52px): app icon top, nav items middle, theme/about buttons bottom
- Nav items: icon + text, selected = blue highlight, hover = gray, press = scale(0.94)
- Theme CSS variables for dark (#1a1a1c) and light (#f8f9fa) modes
- Global components: loading overlay, toast notifications (3s), modal, custom scrollbar

## [S4] Home Page

- Centered app icon (52×52), "Mynx" title, "效率工具集" subtitle
- Tool cards: gradient icon + title + description, hover = blue border + lift + shadow
- Click card → navigate to module

## [S5] qPCR File Selection

- File display card: icon + filename + path
- Buttons: Open (system dialog, .xlsx/.xls), Save As, Clear
- After selection: worksheet dropdown picker

## [S6] qPCR Data Transform

- Reads selected Excel worksheet
- Auto-detects columns: Target/Gene/基因 → target, Sample/Group/样本/分组 → sample, Cq/Ct → Ct
- Pivots: groups by sample, each sample's genes become columns
- Output: num | group name | gene1 | gene2 | ...
- Missing values: if gene has partial data in group, fill with available; if all missing, fill 50; yellow background
- Writes to "Transformed Data" sheet, bold headers, preserves original data

## [S7] qPCR Calculation

- Reads "Transformed Data" sheet
- User sets: repeat count (1-10, default 2), reference gene dropdown
- Per gene (excluding reference): ΔCt = Ct(target) - Ct(ref), RE = 2^(-ΔCt)
- Groups by repeat count, computes mean + stdev per group
- Creates per-gene sheets: TBP | Target | RE | Average | Stdev | Group_Name
- Creates Summary_All_Genes sheet
- Deletes old gene sheets before recreating

## [S8] Chart Generation

- Via VBS script calling Excel COM (Windows only)
- Per-gene clustered column chart, title = gene name (italic)
- X-axis labels rotated 45°, Y-axis "Normalize to TBP", no major gridlines
- Bar color #1E8E3E (green), black border
- Error bars if repeat count > 1

## [S9] TIFF to JPG

- Folder picker → display folder name + path
- Options: watermark toggle, font (6 choices), size (6 choices), bold/italic, margins, padding, background transparency, JPG quality (80-98)
- Conversion via PowerShell System.Drawing: load TIFF → bitmap (24bppRgb, white bg) → optional watermark → JPEG save
- Output: "JPG_output_YYYYMMDD_HHmmss" folder

## [S10] System Features

- Always-on-top toggle (pin button), persists to config
- Theme toggle, persists to config
- Auto-update: check GitHub Releases 3s after launch, download + prompt restart
- About modal: icon, version, author, homepage link, update button
- Config: userData/config.json (theme, alwaysOnTop)
- File lock detection before write, error dialogs

## [S11] Packaging

- Tauri bundler: Mynx-${version}-setup.exe
- App ID: com.fanguanghan.mynx
- Custom installer UI (WeChat-style), install dir selection, desktop + start menu shortcuts
- Max compression
