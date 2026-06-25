# Mynx 发版指南 (Release Guide)

本文档说明如何为 Mynx 发布新版本。整个流程**全自动**：你只需打 tag，GitHub Actions 会自动构建、签名、创建 Release。

---

## 📋 一次性准备（首次发版前必做）

这些只需配置一次，之后发版无需重复。

### 1. 配置 GitHub Secrets

打开仓库 → **Settings → Secrets and variables → Actions → New repository secret**，添加两个 secret：

| Secret 名称 | 值 | 说明 |
|---|---|---|
| `TAURI_SIGNING_PRIVATE_KEY` | 密钥文件 `mynx.key` 的**全部文本内容**（base64 字符串，形如 `dW50cnVzdGVk...==`） | 用于自动更新的签名验证 |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | 生成密钥时设置的密码 | 解密私钥用 |

> **如何生成密钥**（如果还没有）：本地运行 `npx tauri signer generate -w mynx.key`，按提示输入密码。生成的 `mynx.key` 是私钥（存到 secret），`.key.pub` 是公钥（已配置在 `tauri.conf.json` 的 `pubkey` 字段）。

> **如何获取密钥内容**：用文本编辑器打开 `mynx.key`，**复制全部内容**（一长串 base64 字符串，不要包含换行）粘贴到 secret。**不要**填文件路径。

---

## 🚀 日常发版流程（每次发新版本）

### 方法一：使用一键脚本（推荐）

```bash
# 1. 确保所有代码改动已提交，工作区干净
git status   # 应该显示 "nothing to commit"

# 2. 升级版本号并推送（会自动触发 CI 构建）
npm run release 1.9.0
```

脚本会自动完成：
- ✅ 同步版本号到 `package.json` / `tauri.conf.json` / `Cargo.toml`
- ✅ 创建 commit（消息 `release: v1.9.0`）
- ✅ 创建 tag `v1.9.0`
- ✅ 推送到 GitHub
- ✅ **触发 GitHub Actions 自动构建并发布 Release**

### 方法二：手动操作

如果想完全手动控制每一步：

```bash
# 1. 升级版本号（三处同步）
npm run version 1.9.0    # 同步 package.json → tauri.conf.json + Cargo.toml

# 2. 提交版本号改动
git add -A
git commit -m "release: v1.9.0"

# 3. 打 tag
git tag -a v1.9.0 -m "release: v1.9.0"

# 4. 推送代码 + tag（触发 CI）
git push origin main
git push origin v1.9.0
```

---

## 📦 Release 产物说明

CI 成功后会自动创建 GitHub Release，包含以下文件：

| 文件 | 说明 |
|---|---|
| `Mynx_1.9.0_x64-setup.exe` | NSIS 安装程序（双击安装，带语言选择） |
| `Mynx_1.9.0_x64-setup.exe.sig` | 安装程序签名（自动更新用） |
| `Mynx_1.9.0_portable.exe` | 便携版（免安装，直接运行） |
| `Mynx_1.9.0_portable.exe.sig` | 便携版签名 |
| `latest.json` | 自动更新清单文件（app 内置更新器读取此文件） |

---

## 🔍 监控构建状态

推送 tag 后：

1. 打开 **https://github.com/hanhan124/mynx/actions**
2. 查看 `Build & Release` workflow 运行状态
3. ⏳ 构建约需 10-15 分钟（首次会更久，后续有 Rust 缓存会快很多）
4. ✅ 绿色对勾 = 成功，Release 自动创建
5. ❌ 红色叉 = 失败，点进去查看日志排查

---

## 🛠️ 故障排查

### 构建失败怎么办？

1. 进入 **Actions 页面**，点击失败的 run
2. 展开 `Build (NSIS installer...)` 或 `Prepare release assets` 步骤查看日志
3. 日志里有 `==>` 开头的诊断信息，能快速定位问题

### 常见问题

#### Q: 提示 `failed to decode base64 secret key`
**A:** `TAURI_SIGNING_PRIVATE_KEY` secret 填错了。应该填**密钥内容**（base64 字符串），不是文件路径。打开 `mynx.key` 复制全部内容粘贴。

#### Q: 构建成功但没有 `.sig` 签名文件
**A:** 检查：
- `TAURI_SIGNING_PRIVATE_KEY` secret 是否非空
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` 是否正确
- 不影响安装和使用，但自动更新功能会不可用

#### Q: tag 推送后没触发 Actions
**A:** 确认 tag 以 `v` 开头（如 `v1.9.0`），且 workflow 文件在默认分支 `main` 上。

#### Q: 想重新发布同一个版本
```bash
# 删除远程 tag 和本地 tag，重新推送
git tag -d v1.9.0
git push origin :refs/tags/v1.9.0
git tag -a v1.9.0 -m "release: v1.9.0"
git push origin v1.9.0
```
> 注意：如果 GitHub 上已有同名的 Release，需要先在 Releases 页面手动删除旧 Release，新的才会创建。

#### Q: 版本号写错了想撤回
```bash
# 撤回最近的 commit（保留改动）
git reset --soft HEAD~1
# 重新来过
```

---

## 📐 架构说明

```
你 (打 tag v1.9.0)
  │
  ▼
GitHub Actions (Windows runner)
  │
  ├─ npm ci                    # 安装前端依赖
  ├─ cargo build (release)     # 编译 Rust
  ├─ tauri build               # 打包 NSIS 安装包（自动签名）
  ├─ 复制 mynx.exe → portable  # 制作便携版
  ├─ 签名便携版                 # 生成 .sig
  ├─ 生成 latest.json          # 自动更新清单
  │
  ▼
GitHub Release (自动创建)
  ├─ setup.exe + .sig
  ├─ portable.exe + .sig
  └─ latest.json
```

**关键设计**：签名密钥通过环境变量 `TAURI_SIGNING_PRIVATE_KEY_PATH` 传递给 Tauri build，由 Tauri 内部完成签名，CI 脚本不手动调用 `tauri signer` 命令（避开历史坑）。

---

## 🔗 相关文件

| 文件 | 作用 |
|---|---|
| `.github/workflows/release.yml` | CI 构建发布流水线 |
| `scripts/sync-version.cjs` | 版本号同步脚本（package.json → 其他两处） |
| `scripts/release.cjs` | 一键发版脚本（version + commit + tag + push） |
| `src-tauri/tauri.conf.json` | Tauri 配置（含更新器 pubkey、NSIS 配置） |
