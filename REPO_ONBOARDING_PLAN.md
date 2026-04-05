# Repo Onboarding Fix Plan

> 基於 2026-04-05 的 first-time developer UX review。
> 目標：讓第一次 clone 這個 repo 的人能順利跑起來，且覺得這是一個維護良好的開源專案。

狀態標記：`[ ]` 待做、`[~]` 進行中、`[x]` 完成

---

## Phase 1 — 壞掉的 Getting Started 🔴 必須

| # | 問題 | 修法 | 狀態 |
|---|------|------|------|
| 1.1 | README step 1 `cd jobhunt-ai` 應為 `cd jobhunt-ai` | 修 README clone 指令 | `[x]` |
| 1.1 | README step 3 `cp resumes/base.md` — `resumes/` 不存在 | 改成 `cp user/base.example.md user/base.md` | `[x]` |
| 1.1 | README step 3 `cp resumes/config.json` — 同上 | 改成 `cp user/config.example.json user/config.json` | `[x]` |
| 1.2 | 沒有 `backend/.env.example` | 新增，包含三個變數 + 說明 | `[x]` |
| 1.2 | README step 4 只提 `GEMINI_API_KEY`，漏掉 `GEMINI_MODEL` | 更新說明指向 `.env.example` | `[x]` |

---

## Phase 2 — 結構清理 🟡 建議

| # | 問題 | 修法 | 狀態 |
|---|------|------|------|
| 2.1 | `.gitignore` 殘留 `oh-my-cv-main/` 死路徑 | 刪除 3 行殘留 | `[x]` |
| 2.2 | 根目錄 `cover-letter/` 與 `user/cover-letter/` 角色不清 | 在 README 補一句說明：「root `cover-letter/` 是 example source，`user/cover-letter/` 是你的個人複本（gitignored）」 | `[x]` |
| 2.3 | README 主題表格 4 個 `(Placeholder)` 令人失望 | 改成簡短誠實的說明，移除 placeholder 措辭 | `[x]` |

---

## Phase 3 — 開發者體驗 🟡 建議

| # | 問題 | 修法 | 狀態 |
|---|------|------|------|
| 3.1 | 沒有 `npm run setup` | 新增 `scripts/setup.js`：偵測 example 檔是否已複製，未複製則自動 cp + 印出提示；root `package.json` 加 `"setup"` script | `[x]` |
| 3.2 | CI 沒有跑 tests | `.github/workflows/` 新增 `test.yml`：push / PR 時跑 `cd backend && npm test` | `[x]` |
| 3.3 | 沒有 ESLint 設定 | backend 加 `.eslintrc.cjs`（Node/CommonJS）；frontend 補 `eslint.config.js`（已有 TS，補規則即可） | `[x]` |

---

## Phase 4 — 加分項 🟢 專業感

| # | 問題 | 修法 | 狀態 |
|---|------|------|------|
| 4.1 | README 沒有截圖 | 加 Screenshots 區塊，6 頁各有說明 + placeholder；建 `docs/screenshots/` 目錄 | `[~]` 等待截圖 |
| 4.2 | 沒有 Issue / PR template | 新增 `.github/ISSUE_TEMPLATE/bug_report.md`、`feature_request.md`、`PULL_REQUEST_TEMPLATE.md` | `[ ]` |
| 4.3 | `tailor.js` comment 用個人公司名稱（Orefox / Phygitalker） | 改成通用描述：「first employer block」/ 「second employer block」 | `[ ]` |
| 4.4 | 沒有 CONTRIBUTING.md | 新增基本貢獻指南：fork → branch → PR 流程、如何跑 tests | `[ ]` |

---

## 執行順序

```
Phase 1 → Phase 2 → Phase 3 → Phase 4
(跑得起來) (看得懂) (開發友善) (專業感)
```

每個 step 獨立、不互相依賴，做完一個確認後繼續。

---

## 進度紀錄

| 日期 | 完成項目 | 備註 |
|------|----------|------|
| 2026-04-05 | Phase 1 全部完成 | 修 README 三個壞指令；新增 `backend/.env.example` |
| 2026-04-05 | Phase 2 全部完成 | 清 `.gitignore` 死路徑；README 補 cover-letter 說明；修主題表格 |
| 2026-04-05 | Phase 3 全部完成 | `npm run setup` script；CI test job；ESLint backend + frontend |
