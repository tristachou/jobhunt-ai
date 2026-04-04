# Demo Mode Plan — Job Application Tracking System

> 基於 2026-04-04 的討論。
> 目標：部署一個純靜態 demo 網站，讓訪客看到完整 UI 畫面（含 PDF 下載），不需要後端，不消耗任何 API key。
> 已確認決策標 ✅；需要後續討論的標 ⚠️。

---

## 核心決策

| # | 項目 | 決策 |
|---|------|------|
| D1 | 托管方式 | 靜態托管（GitHub Pages 或 Netlify） ✅ |
| D2 | 後端需求 | 不需要，完全靜態 ✅ |
| D3 | PDF 處理方式 | 本地預先產好 PDF，放進 repo 作為靜態檔案 ✅ |
| D4 | Preview 處理方式 | 本地預先渲染好 HTML，hardcode 成 `.ts` 常數 ✅ |
| D5 | Mock layer 位置 | 集中在 `frontend/src/lib/api.ts`，不散進 component ✅ |
| D6 | Build 方式 | `VITE_DEMO_MODE=true` 環境變數控制，加 `build:demo` script ✅ |
| D7 | 對 main 的影響 | 零影響，真實功能完全不受 demo mode 干擾 ✅ |
| D8 | 假資料 | 完全虛構的人名公司，不含任何個人資料 ✅ |

---

## 架構說明

### 正常模式 vs Demo 模式

```
正常模式：
  前端 component
      ↓ 呼叫 api.ts
  fetch('/api/...')
      ↓
  後端 Express → Gemini / SQLite / Puppeteer
      ↓
  回傳真實資料

Demo 模式：
  前端 component
      ↓ 呼叫 api.ts（完全相同）
  DEMO_MODE check → true
      ↓ 直接回傳 MOCK_DATA，fetch 完全不執行
  後端從未被呼叫到
```

### 靜態檔案結構

```
frontend/public/demo/
  resume.pdf               ← 預先產好的假履歷 PDF
  coverletter.pdf          ← 預先產好的假 cover letter PDF

frontend/src/lib/
  demo-data.ts             ← 假 application 列表 + 假 preview HTML
  api.ts                   ← 加 mock layer（改動集中在這）
```

---

## Phase 1 — 準備假資料

### 1.1 — 設計假 Application 資料

設計 3 筆假 application，涵蓋不同狀態，讓 History 頁面看起來真實：

```
#1  Stripe        Senior Frontend Engineer   fit_score: 91   status: interview
#2  Canva         Full Stack Developer       fit_score: 78   status: applied
#3  Atlassian     Backend Engineer           fit_score: 85   status: not_started
```

每筆都有完整的 `resume_md`、`cover_md`、`stack_used`、`detected_skills`。

### 1.2 — 準備假履歷 Markdown

為 #1（Stripe / Senior Frontend Engineer）準備一份完整的假履歷 markdown：
- 使用虛構人名（e.g. "Alex Chen"）
- 使用現有的 Oh My CV 語法
- 技能、經歷、學歷全部虛構
- 這份 markdown 同時用來：
  - 本地跑一次 renderer.js + Puppeteer 產 PDF
  - 本地跑一次 preview API 產 HTML 字串

### 1.3 — 本地產出靜態檔案

在正式加 demo mode 之前，先用現有後端跑一次：

```bash
# 1. 啟動後端
npm run dev

# 2. 用假資料呼叫 preview API，把 HTML 字串存起來
# （用 curl 或自己寫一個小 script）

# 3. 用假資料呼叫 PDF export，把 PDF 存起來
# → resume.pdf    放進 frontend/public/demo/
# → coverletter.pdf 放進 frontend/public/demo/
```

產出後這些靜態檔案就 commit 進 repo，之後不需要再重新產。

---

## Phase 2 — Mock Layer

### 2.1 — `frontend/src/lib/demo-data.ts`（新檔）

```ts
// 假 application 列表
export const MOCK_APPLICATIONS: Application[] = [ ... ]

// 假的 preview HTML（本地預先渲染好，hardcode 在這）
export const MOCK_PREVIEW_HTML = `<!DOCTYPE html>...`

// 假的 analyze 結果
export const MOCK_ANALYZE_RESULT: AnalyzeResult = { ... }

// 假的 templates 列表
export const MOCK_TEMPLATES: ResumeTemplate[] = [ ... ]

// 假的 theme CSS（classic theme 的 CSS 直接 hardcode）
export const MOCK_STYLE = { theme: 'classic', css: '...' }
```

### 2.2 — `frontend/src/lib/api.ts` 改動

在 `api.ts` 最前面加 demo mode 判斷：

```ts
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true'
```

每個 function 的改動原則：

| API function | Demo 行為 |
|---|---|
| `getApplications()` | 回傳 `MOCK_APPLICATIONS` |
| `getApplication(id)` | 從 `MOCK_APPLICATIONS` 找對應 id |
| `analyze()` | 回傳 `MOCK_ANALYZE_RESULT`（延遲 1.5s 模擬 loading） |
| `preview()` | 回傳 `MOCK_PREVIEW_HTML` |
| `getPdfUrl()` | 回傳 `/demo/resume.pdf` 或 `/demo/coverletter.pdf` |
| `patchApplication()` | 回傳 `{ ok: true }`（假成功） |
| `deleteApplication()` | 回傳 `{ ok: true }`（假成功） |
| `getStyle()` | 回傳 `MOCK_STYLE` |
| `getThemes()` | 回傳含 classic 的假 themes 陣列 |
| `getTemplates()` | 回傳 `MOCK_TEMPLATES` |
| `saveStyle()` | 回傳 `{ ok: true }` |
| `savePrompts()` | 回傳 `{ ok: true }` |
| `createTemplate()` | 回傳 `{ id: 99 }` |

### 2.3 — Clone Prompt（取代 Banner）

不在頁面頂部常駐 banner，改成**訪客真的想操作時才跳提示**，更精準。

觸發點（所有「寫入」動作）：

| 動作 | 觸發位置 |
|---|---|
| 點 "Analyze" 送出表單 | New Application 表單 |
| 點 "Save & Track" | New Application 表單 |
| 在 Editor 編輯 markdown | Editor 頁面（有改動時） |
| 點 "Export PDF" | Editor 頁面 |
| 改 status / follow up | History 頁面 |
| 點 Delete | History 頁面 |
| 儲存 prompt / style | Settings / Style 頁面 |

觸發後顯示 Modal：

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   This is a read-only demo.                                     │
│                                                                 │
│   Want to use it for real? Clone the project and set it up      │
│   with your own resume and API key.                             │
│                                                                 │
│   [ View on GitHub → ]                    [ Close ]            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

"View on GitHub →" 連到你的 repo URL。

實作方式：在 `api.ts` 的 mock layer 裡，寫入類的 function 不回傳假成功，改成 `throw new DemoModeError()`，讓 component 的現有 error handling 捕捉後顯示這個 modal。

---

## Phase 3 — Build 設定

### 3.1 — `frontend/.env.demo`（新檔）

```env
VITE_DEMO_MODE=true
```

### 3.2 — `package.json` 新增 script

```json
{
  "scripts": {
    "build:demo": "cd frontend && vite build --mode demo --outDir ../demo-dist"
  }
}
```

輸出到 `demo-dist/`（獨立於正常 build 的 `backend/public/`），方便部署。

### 3.3 — `.gitignore`

```
demo-dist/
```

---

## Phase 4 — 部署

### 4.1 — 手動部署（最簡單，先這樣）

```bash
npm run build:demo
# 把 demo-dist/ 的內容 push 到 gh-pages branch
# 或拖進 Netlify
```

### 4.2 — GitHub Actions 自動部署（之後可加）

每次 push to `main` → 自動 `build:demo` → deploy 到 GitHub Pages。

```yaml
# .github/workflows/demo.yml
name: Deploy Demo
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm run install:all
      - run: npm run build:demo
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./demo-dist
```

---

## 改動範圍總覽

| 檔案 | 改動類型 | 說明 |
|---|---|---|
| `frontend/src/lib/api.ts` | 修改 | 加 mock layer，每個 function 前加 DEMO_MODE 判斷 |
| `frontend/src/lib/demo-data.ts` | 新增 | 所有假資料集中在這裡 |
| `frontend/public/demo/resume.pdf` | 新增 | 預先產好的假履歷 PDF |
| `frontend/public/demo/coverletter.pdf` | 新增 | 預先產好的假 cover letter PDF |
| `frontend/.env.demo` | 新增 | `VITE_DEMO_MODE=true` |
| `package.json` | 修改 | 加 `build:demo` script |
| `.gitignore` | 修改 | 加 `demo-dist/` |
| `.github/workflows/demo.yml` | 新增（可選） | 自動部署 |

**不需要改動的檔案：**
- 所有 backend 檔案（完全不動）
- 所有 React component（不動，demo 行為全在 api.ts）
- `vite.config.ts`（不動）

---

## 執行順序

```
Phase 1 (準備假資料)
    ↓
Phase 2 (mock layer)     ← 主要工作
    ↓
Phase 3 (build 設定)     ← 15 分鐘
    ↓
Phase 4 (部署)           ← 手動先，之後再加 CI
```

---

## 開放問題

（無）

---

## 已確認的細節

| 項目 | 決策 |
|---|---|
| 假資料內容 | 完全虛構（人名、公司、技能、經歷），但沿用 `base.example.md` 的 markdown 結構 ✅ |
| `analyze()` loading 模擬 | 不做，直接回傳結果 ✅ |
| Demo 提示方式 | 不做常駐 banner；寫入動作觸發時跳 Modal，引導訪客去 clone repo ✅ |
