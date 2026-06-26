/**
 * Shared update check logic.
 *
 * Two callers:
 * - UpdateNotification (auto-check, silent when already latest)
 * - AboutModal  (manual check, shows toast when already latest)
 */
import { check, type Update } from "@tauri-apps/plugin-updater";
import { getVersion } from "@tauri-apps/api/app";
import { compareVersions } from "@/lib/version";

/* ---- types ------------------------------------------------------------ */
export interface UpdateInfo {
  version: string;
  body?: string;
  /** true when app is running as portable */
  isPortable: boolean;
  /** For installed mode: Tauri updater handle */
  installedUpdate?: Update;
  /** For portable mode: direct download URL */
  portableUrl?: string;
}

export type CheckResult =
  | { found: true; info: UpdateInfo }
  | { found: false };

/* ---- endpoint ---------------------------------------------------------- */
const LATEST_JSON_URL =
  "https://github.com/hanhan124/mynx/releases/latest/download/latest.json";

/* ---- helpers ----------------------------------------------------------- */

/** Detect portable vs installed (no Tauri invocation needed here — caller supplies it). */
export async function detectPortable(): Promise<boolean> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<boolean>("is_portable");
  } catch {
    return false;
  }
}

/** Fetch and parse latest.json, returns version + body. Retries once on transient failures. */
async function fetchLatestMeta(): Promise<{
  version: string;
  body: string;
}> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const resp = await fetch(LATEST_JSON_URL, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!resp.ok) {
        if (resp.status === 404 || resp.status === 403) {
          throw new Error(
            "更新信息获取失败 (404)，请确认 GitHub Release 已包含 latest.json",
          );
        }
        if (resp.status >= 500) {
          throw new Error(`服务器暂时不可用 (${resp.status})，请稍后重试`);
        }
        throw new Error(`GitHub API 返回 ${resp.status}`);
      }
      const json = await resp.json();
      return {
        version: json.version,
        body: json.body || json.notes || "",
      };
    } catch (e) {
      lastError = e;
      if (attempt === 0 && e instanceof DOMException && e.name === "AbortError") {
        // timeout on first attempt — retry
        continue;
      }
      if (attempt === 0 && e instanceof Error && e.message.includes("500")) {
        // server error — retry
        continue;
      }
      // don't retry other errors (404, CSP block, etc.)
      break;
    }
  }

  throw lastError;
}

/* ---- main entry -------------------------------------------------------- */

/**
 * Check for updates.
 *
 * @param isPortable  Whether running as portable (call `detectPortable()` first).
 * @returns           CheckResult with version info if a newer release exists.
 */
export async function checkForUpdates(
  isPortable: boolean,
): Promise<CheckResult> {
  if (isPortable) {
    // Portable path: fetch latest.json, compare versions
    const latest = await fetchLatestMeta();
    const current = await getVersion();

    if (compareVersions(latest.version, current) <= 0) {
      return { found: false };
    }

    const ghBase = `https://github.com/hanhan124/mynx/releases/download/v${latest.version}`;
    return {
      found: true,
      info: {
        version: latest.version,
        body: latest.body,
        isPortable: true,
        portableUrl: `${ghBase}/Mynx_${latest.version}_portable.exe`,
      },
    };
  }

  // Installed path: use Tauri's built-in updater plugin
  const update = await check();
  if (!update) {
    return { found: false };
  }

  return {
    found: true,
    info: {
      version: update.version,
      body: update.body,
      isPortable: false,
      installedUpdate: update,
    },
  };
}
