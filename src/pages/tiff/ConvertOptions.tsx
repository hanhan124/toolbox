import { useState } from "react";
import type { TiffOptions } from "../../lib/tiff-convert";

const FONTS = ["Arial", "Calibri", "Times New Roman", "微软雅黑", "黑体", "宋体"];
const SIZES = [36, 48, 60, 72, 96, 120];
const TRANSPARENCY = [
  { label: "不透明", value: 1.0 },
  { label: "半透明", value: 0.6 },
  { label: "较透明", value: 0.3 },
  { label: "全透明", value: 0.1 },
];
const QUALITIES = [80, 85, 90, 95, 98];

interface ConvertOptionsProps {
  onConvert: (options: TiffOptions) => void;
  loading: boolean;
}

export default function ConvertOptions({ onConvert, loading }: ConvertOptionsProps) {
  const [watermark, setWatermark] = useState(false);
  const [font, setFont] = useState("Arial");
  const [fontSize, setFontSize] = useState(72);
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [margin, setMargin] = useState(20);
  const [padding, setPadding] = useState(10);
  const [transparency, setTransparency] = useState(0.6);
  const [quality, setQuality] = useState(95);

  const handleConvert = () => {
    onConvert({
      watermark,
      font,
      fontSize,
      bold,
      italic,
      margin,
      padding,
      transparency,
      quality,
    });
  };

  return (
    <div className="convert-options">
      <div className="opt-row">
        <span className="opt-label">水印</span>
        <button
          className={`toggle-btn ${watermark ? "toggle-btn--on" : ""}`}
          onClick={() => setWatermark(!watermark)}
        >
          <span className="toggle-thumb" />
        </button>
      </div>

      {watermark && (
        <div className="opt-grid">
          <div className="opt-field">
            <span className="opt-label-sm">字体</span>
            <select value={font} onChange={(e) => setFont(e.target.value)}>
              {FONTS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          <div className="opt-field">
            <span className="opt-label-sm">字号</span>
            <select value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))}>
              {SIZES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="opt-field">
            <span className="opt-label-sm">样式</span>
            <div className="style-btns">
              <button
                className={`style-btn ${bold ? "style-btn--active" : ""}`}
                onClick={() => setBold(!bold)}
              >
                <b>B</b>
              </button>
              <button
                className={`style-btn ${italic ? "style-btn--active" : ""}`}
                onClick={() => setItalic(!italic)}
              >
                <i>I</i>
              </button>
            </div>
          </div>

          <div className="opt-field">
            <span className="opt-label-sm">透明度</span>
            <select
              value={transparency}
              onChange={(e) => setTransparency(Number(e.target.value))}
            >
              {TRANSPARENCY.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="opt-field">
            <span className="opt-label-sm">边距</span>
            <input
              type="number"
              value={margin}
              onChange={(e) => setMargin(Number(e.target.value))}
              min={0}
              max={200}
            />
          </div>

          <div className="opt-field">
            <span className="opt-label-sm">内距</span>
            <input
              type="number"
              value={padding}
              onChange={(e) => setPadding(Number(e.target.value))}
              min={0}
              max={100}
            />
          </div>
        </div>
      )}

      <div className="opt-row" style={{ marginTop: 12 }}>
        <span className="opt-label">JPG 质量</span>
        <select value={quality} onChange={(e) => setQuality(Number(e.target.value))}>
          {QUALITIES.map((q) => (
            <option key={q} value={q}>{q}</option>
          ))}
        </select>
      </div>

      <button
        className="convert-btn"
        onClick={handleConvert}
        disabled={loading}
      >
        {loading ? "转换中..." : "开始转换"}
      </button>
    </div>
  );
}
