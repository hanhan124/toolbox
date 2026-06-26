import { useState, useEffect } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/core";
import Modal from "@/components/Modal";
import AppMark from "@/components/AppMark";
import { showToast } from "@/components/Toast";
import { compareVersions } from "@/lib/version";
import { Globe } from "lucide-react";

interface AboutModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AboutModal({ open, onClose }: AboutModalProps) {
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [appVersion, setAppVersion] = useState("...");

  useEffect(() => {
    getVersion().then(setAppVersion).catch(() => setAppVersion("?"));
  }, []);

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    try {
      const portable = await invoke<boolean>("is_portable").catch(() => false);
      if (portable) {
        const resp = await fetch(
          "https://github.com/hanhan124/mynx/releases/latest/download/latest.json",
        );
        if (resp.ok) {
          const latest: { version: string } = await resp.json();
          const current = await getVersion();
          if (
            latest.version.replace(/^v/, "") !== current.replace(/^v/, "") &&
            compareVersions(latest.version, current) > 0
          ) {
            showToast(
              `发现新版本: v${latest.version}，请在右下角通知中更新`,
              "info",
            );
          } else {
            showToast("当前已是最新版本", "success");
          }
        } else {
          showToast("检查更新失败", "info");
        }
      } else {
        const { check } = await import("@tauri-apps/plugin-updater");
        const update = await check();
        if (update) {
          showToast(`发现新版本: ${update.version}`, "info");
        } else {
          showToast("当前已是最新版本", "success");
        }
      }
    } catch {
      showToast("检查更新失败", "info");
    } finally {
      setCheckingUpdate(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="关于">
      <div className="about-header">
        <AppMark size={48} />
        <div className="about-header-text">
          <div className="about-app-name">Mynx</div>
          <div className="about-app-desc">让工作更简单</div>
        </div>
      </div>

      <div className="about-info">
        <div className="about-row">
          <span>版本</span>
          <span>v{appVersion}</span>
        </div>
        <div className="about-row">
          <span>作者</span>
          <span>Han</span>
        </div>
        <div className="about-row">
          <span>技术栈</span>
          <span>Tauri · React · Rust</span>
        </div>
      </div>

      <div className="about-links">
        <button
          className="btn btn-full"
          onClick={() => {
            import("@tauri-apps/plugin-shell").then(({ open }) =>
              open("https://github.com/hanhan124/mynx"),
            );
          }}
        >
          <Globe size={14} strokeWidth={1.8} />
          GitHub
        </button>
      </div>

      <button
        className="btn btn-primary about-check"
        onClick={handleCheckUpdate}
        disabled={checkingUpdate}
      >
        {checkingUpdate ? "检查中..." : "检查更新"}
      </button>

      <div className="about-copyright">© 2026 Han · MIT License</div>
    </Modal>
  );
}
