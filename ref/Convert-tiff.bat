@echo off
setlocal
chcp 65001 >nul
title TIFF 转 JPG 工具

powershell -NoProfile -ExecutionPolicy Bypass -Command "$bat='%~f0'; $text=[IO.File]::ReadAllText($bat,[Text.Encoding]::UTF8); $mark='# POWERSHELL_CODE_START'; $idx=$text.LastIndexOf($mark); if($idx -lt 0){Write-Host '找不到 PowerShell 代码段。'; exit 1}; Invoke-Expression $text.Substring($idx + $mark.Length)"

echo.
pause
exit /b

# POWERSHELL_CODE_START
Add-Type -AssemblyName System.Drawing

# ============================================================
# 可调整参数：按需要改这里即可
# ============================================================
$FontName = "Arial"          # 字体名称，例如 Arial、Calibri、Times New Roman
$FontSize = 72               # 字体大小，数字越大文字越大
$FontBold = $true            # 是否粗体：$true 是，$false 否
$FontItalic = $false         # 是否斜体：$true 是，$false 否

$MarginX = 18                # 文字背景距离图片左边的距离
$MarginY = 18                # 文字背景距离图片上边的距离
$PaddingX = 12               # 灰色背景左右内边距
$PaddingY = 8                # 灰色背景上下内边距

$TextColor = [System.Drawing.Color]::White
$BackgroundColor = [System.Drawing.Color]::FromArgb(210, 90, 90, 90)  # 灰色背景；第1个数字是透明度 0-255
$JpegQuality = 95            # JPG质量，1-100；推荐 90-98
# ============================================================

$ErrorActionPreference = "Stop"
$SourceDir = Split-Path -Parent $bat
if (-not $SourceDir) { $SourceDir = (Get-Location).Path }

Write-Host ""
Write-Host "========================================"
Write-Host " TIFF 转 JPG 工具"
Write-Host " 当前文件夹：$SourceDir"
Write-Host "========================================"
Write-Host ""
Write-Host "请选择运行方式："
Write-Host "  1. 转换为 JPG，并在左上角添加文件名"
Write-Host "  2. 只转换为 JPG，不添加文件名"
Write-Host "  3. 退出"
Write-Host ""

$choice = Read-Host "请输入 1 / 2 / 3"
switch ($choice) {
    "1" { $AddFileName = $true }
    "2" { $AddFileName = $false }
    "3" { Write-Host "已退出。"; return }
    default { Write-Host "输入无效，已退出。"; return }
}

$TimeStamp = Get-Date -Format "yyyyMMdd_HHmmss"
$OutputDir = Join-Path $SourceDir "JPG_output_$TimeStamp"
New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

$Files = Get-ChildItem -LiteralPath $SourceDir -File | Where-Object { $_.Extension -match '^\.tiff?$' }
if (-not $Files -or $Files.Count -eq 0) {
    Write-Host "当前文件夹没有找到 .tif 或 .tiff 文件。"
    return
}

$style = [System.Drawing.FontStyle]::Regular
if ($FontBold) { $style = $style -bor [System.Drawing.FontStyle]::Bold }
if ($FontItalic) { $style = $style -bor [System.Drawing.FontStyle]::Italic }

$jpgCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
$encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [int64]$JpegQuality)

$ok = 0
$failed = 0

foreach ($file in $Files) {
    $image = $null
    $bitmap = $null
    $graphics = $null
    $font = $null
    $textBrush = $null
    $bgBrush = $null

    try {
        $image = [System.Drawing.Image]::FromFile($file.FullName)
        $bitmap = New-Object System.Drawing.Bitmap($image.Width, $image.Height, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        $graphics.Clear([System.Drawing.Color]::White)
        $graphics.DrawImage($image, 0, 0, $image.Width, $image.Height)

        if ($AddFileName) {
            $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
            $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

            $font = New-Object System.Drawing.Font($FontName, $FontSize, $style, [System.Drawing.GraphicsUnit]::Pixel)
            $textBrush = New-Object System.Drawing.SolidBrush($TextColor)
            $bgBrush = New-Object System.Drawing.SolidBrush($BackgroundColor)

            $label = $file.BaseName
            $maxWidth = [single]($image.Width - $MarginX - $PaddingX)

            $stringFormat = New-Object System.Drawing.StringFormat
            $stringFormat.FormatFlags = [System.Drawing.StringFormatFlags]::MeasureTrailingSpaces

            $textLayoutRect = New-Object System.Drawing.RectangleF(
                [single]$MarginX,
                [single]$MarginY,
                [single]$maxWidth,
                [single]$image.Height
            )

            $textSize = $graphics.MeasureString($label, $font, [single]$maxWidth, $stringFormat)

            $bgRect = New-Object System.Drawing.RectangleF(
                [single]$MarginX,
                [single]$MarginY,
                [single]([Math]::Min($textSize.Width + 2 * $PaddingX, $maxWidth)),
                [single]($textSize.Height + 2 * $PaddingY)
            )
            $textPoint = New-Object System.Drawing.PointF([single]($MarginX + $PaddingX), [single]($MarginY + $PaddingY))

            $graphics.FillRectangle($bgBrush, $bgRect)
            $graphics.DrawString($label, $font, $textBrush, $textLayoutRect, $stringFormat)
        }

        $outPath = Join-Path $OutputDir ($file.BaseName + ".jpg")
        $bitmap.Save($outPath, $jpgCodec, $encoderParams)
        $ok++
        Write-Host ("完成：" + $file.Name)
    }
    catch {
        $failed++
        Write-Host ("失败：" + $file.Name + " -> " + $_.Exception.Message)
    }
    finally {
        if ($graphics) { $graphics.Dispose() }
        if ($bitmap) { $bitmap.Dispose() }
        if ($image) { $image.Dispose() }
        if ($font) { $font.Dispose() }
        if ($textBrush) { $textBrush.Dispose() }
        if ($bgBrush) { $bgBrush.Dispose() }
    }
}

Write-Host ""
Write-Host "========================================"
Write-Host "处理完成"
Write-Host "成功：$ok 个"
Write-Host "失败：$failed 个"
Write-Host "输出文件夹：$OutputDir"
Write-Host "========================================"
