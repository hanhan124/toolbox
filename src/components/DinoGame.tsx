import { RefreshCw } from "lucide-react";

interface DinoGameProps {
  onRetry: () => void;
}

export default function DinoGame({ onRetry }: DinoGameProps) {
  return (
    <div className="dino-scene">
      <div className="dino-ground">
        <div className="dino"></div>
        <div className="cactus"></div>
      </div>
      <div className="dino-message">
        <div className="dino-title">无法连接网络</div>
        <div className="dino-hint">请检查网络连接后重试</div>
        <button className="btn btn-primary dino-retry" onClick={onRetry}>
          <RefreshCw size={14} strokeWidth={1.8} />
          重试
        </button>
      </div>
    </div>
  );
}
