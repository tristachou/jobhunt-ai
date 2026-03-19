# Refactoring Plan — Job Apply Bot v2

> 狀態：草稿，討論中。未定案前不動手實作。
> 最後更新：2026-03-18

---

## 一、為什麼要重構

現在的系統有幾個根本問題：

### 問題 1 — 沒有中繼點（最痛）
```
JD → AI → PDF   ← 全自動，沒有人工確認
```
PDF 生出來才發現有問題，只能整個重跑。想改一個字也要重新呼叫 AI。

### 問題 2 — Oh My CV 是個太重的依賴
- 要跑 Nuxt dev server（pnpm workspace、symlink 問題、port 衝突）
- Puppeteer 要 inject IndexedDB 才能傳資料進去
- Oh My CV 升版或壞掉 → 整個 export 死掉
- 實際上它只做一件事：把 markdown render 成好看的 PDF

**結論：Oh My CV 全部移除，改用自己的 HTML template + Puppeteer。**
（`resumes/resume.css` 本來就已經外部化了，這一步不難。）
QA. 這步驟真的不難嗎resume.css 會可以改主題顏色layout + 調整排版嗎? 因為主要是考量ohmycv 的這些功能都有了

### 問題 3 — Markdown 沒有保存
現在每次 Generate 只存 PDF 路徑，不存 markdown。
想看「當時 AI 幫我改了什麼」，只能翻 PDF。

### 問題 4 — Prompt 寫死在程式碼裡
換 prompt 就要改 `tailor.js` / `coverletter.js`，不方便別人用或自己調整。

---

## 二、目標架構（to-be）

### 核心概念：把 pipeline 拆成兩個階段

```
┌─────────────────────────────────────────────────────┐
│  Stage 1 — Analyze                                  │
│  POST /analyze                                      │
│  JD → Gemini → resume_md + cover_md                 │
│  → 存進 DB（不產生 PDF）→ 回傳 markdown 給 UI      │
└─────────────────────────────────────────────────────┘
              ↓  用戶看到 markdown，可以直接在 UI 編輯
┌─────────────────────────────────────────────────────┐
│  Stage 2 — Export                                   │
│  POST /export/:id                                   │
│  從 DB 拿 resume_md + cover_md（已含用戶修改）      │
│  → HTML template → Puppeteer → PDF                  │
│  → 更新 DB 的 PDF 路徑                              │
└─────────────────────────────────────────────────────┘
```

### 新的 status flow
```
(new) → analyzed → exported → applied → interview → rejected
```
- `analyzed`：AI 跑完，markdown 已存，還沒出 PDF
- `exported`：PDF 已產生，可以下載

QA. 我在思考的是 不要儲存pdf 而是去儲存markdown 萬一我之後要上架 存markdown 比較省空間 用戶每次點進去可以根據markdown 在編輯器顯示即可 (當然還是要可以export pdf 但可能是一次性提供下載連結?)
---

## 三、移除 Oh My CV 的方案

### 現在的 base.md 格式（Oh My CV 特有）

```markdown
---
name: Hsin-Yu Chou
header:
  - text: "email: ..."
    link: mailto:...
---

## Experience

**Job Title**
  ~ Brisbane, Australia      ← Oh My CV 特有語法：右側標註

Company Name
  ~ Feb 2025 - July 2025    ← 同上
```

`~` 這個語法是 Oh My CV 自己定義的，瀏覽器不認識。

### 兩個選擇

**選擇 A — 保留現有 base.md 格式，自己寫 renderer**
- 寫一個 `renderResume(markdown)` → HTML
- 解析 `~ text` 為右對齊的副標題
- 解析 YAML front matter 為 header 區塊
- 優點：base.md 不用改、config.json 不用改
- 缺點：要自己維護 parser，有點工

**選擇 B — 重新設計 base.md 為標準 markdown**
- 把 `~ Brisbane` 改成普通文字或 HTML comment
- YAML front matter 變成設定，不塞進 markdown
- 優點：用標準 markdown library（如 `marked.js`）直接 render，不用自己 parse
- 缺點：現有 base.md 要改、config.json 的 bullets 也要調整格式

**我的建議：選擇 A**
原因：保留現有的 base.md 和 config.json 不動，只需要寫一個 renderer，
工作量可控，也不影響你已經調好的履歷內容。

QA. 可以去抄下ohmycv 的rendering 邏輯嗎? 或是B 也可以 我覺得標準markdown 可能還是比較好? 但是排版可以確保可以重現嗎?

---

## 四、UI 中繼編輯（回答你的 Q2）

AI 生成 markdown 之後，你要在哪裡編輯？

**選項 A — 嵌在現有頁面（推薦 Phase 1）**
```
[Generate 表單]
     ↓ 填完按 Analyze
[Result 區塊]
  Fit Score: 87  Stack: csharp
  ┌─────────────────┬─────────────────┐
  │  Resume MD       │  Cover Letter MD │
  │  (textarea,      │  (textarea,      │
  │   可直接編輯)    │   可直接編輯)    │
  └─────────────────┴─────────────────┘
  [Export PDFs →]
```

**選項 B — 獨立 /editor 頁（Phase 2，更好用）**
```
主頁 Analyze → 跳到 /editor?id=42
左半：markdown textarea
右半：即時 HTML preview（iframe render）
底部：[Save Draft] [Export PDF]
```

**Phase 1 做選項 A，Phase 2 可以升級到選項 B。**
兩者後端 API 完全一樣，只是 UI 不同。

QA. 我覺得B比較好

---

## 五、Prompt 管理（Phase 2）

現在 prompt 寫在 `tailor.js` 和 `coverletter.js` 裡面。

### 方案：`resumes/prompts.json` + 設定頁

```json
{
  "tailor": {
    "system": "You are a resume tailoring expert...",
    "template": "Given this job description:\n\n{{jd}}\n\nAnd these available stacks:\n\n{{stacks}}\n\nReturn JSON: { stack, detected_skills, fit_score }"
  },
  "coverletter": {
    "system": "You are a professional cover letter writer...",
    "template": "..."
  }
}
```

- `GET /prompts` → 回傳目前 prompts
- `PUT /prompts` → 存回 `prompts.json`
- UI 加「Settings」頁面，可以在網頁上直接編輯 prompt，不用開程式碼

QA. 這部分我覺得沒想法 可以按照你推薦的

---

## 六、評分系統（Phase 3，之後討論）

現在只有一個 `fit_score: 0-100`（Gemini 給的），不夠細。

未來方向（等你研究其他系統後再設計）：
- 多維度：技術符合度、年資符合度、關鍵字覆蓋率
- Rule-based layer 疊在 Gemini 分析上面
- UI 顯示 breakdown（不只一個數字）

QA. 這部分我還沒想法 可以按照你推薦的 或者是之後再處理 可以加到plan to do 

---

## 七、需要改的檔案總覽

### 移除
- `oh-my-cv-main/` — 整個刪掉（先備份）
- `backend/server.js` — 移除 Oh My CV spawn / proxy 邏輯

### 新增
- `resumes/resume.template.html` — HTML wrapper（header + CSS 內嵌）
- `backend/renderer.js` — 把 base.md 格式 parse 成 HTML
- `resumes/prompts.json` — prompt 設定（Phase 2）

### 修改
- `backend/server.js` — `/process` 拆成 `/analyze` + `/export/:id`
- `backend/exporter.js` — 移除 Oh My CV 相關，改用 renderer.js
- `backend/db.js` — 新增 `resume_md`, `cover_md`, `exported_at` 欄位
- `backend/.env` — 移除 `OHMYCV_PATH`, `OHMYCV_PORT`
- `frontend/` — 兩階段 UI（Analyze → 看/改 markdown → Export）

### 不動
- `resumes/base.md` — 格式不變
- `resumes/config.json` — 不動
- `resumes/resume.css` — 繼續用，直接 inline 進 HTML template
- `backend/tailor.js` — 邏輯不變，只是 prompt 來源改成 prompts.json（Phase 2）
- `backend/coverletter.js` — 同上
- `backend/db.js` CRUD 邏輯 — 只加新欄位，不動現有 function

---

## 八、實作 Phases

### Phase 1 — 核心重構（最高優先）✅ 完成
1. 寫 `renderer.js`：base.md 格式 → HTML（含 `~` 語法支援）
2. 改 `exporter.js`：移除 Oh My CV，改用 renderer.js
3. 改 `server.js`：`/process` 拆成 `/analyze` + `/export/:id`
4. 改 `db.js`：加 `resume_md`, `cover_md` 欄位
5. 改前端：兩步驟 UI（editor.html）
6. 測試：整個 pipeline 跑通
7. 移除 `oh-my-cv-main/`

### Phase 2 — Prompt 管理 ✅ 完成
1. 建 `resumes/prompts.json`
2. 改 `tailor.js` / `coverletter.js` 讀 prompts.json
3. 加 `GET/PUT /prompts` API
4. 前端加 Settings 頁

### Phase 3 — 評分系統（待設計）
- 等你研究其他履歷評分系統後再定

### Phase 4 — 前端現代化（開源準備）

**目標**：把 vanilla JS frontend 換成 React + Vite + TypeScript + Tailwind + shadcn/ui，為開源做準備。

**決策記錄（2026-03-19）**：
- Framework: React + Vite + TypeScript
- CSS: Tailwind CSS
- Components: shadcn/ui（source code 複製進專案，不鎖定上游版本）
- Dev 架構：前後端分離（frontend dev server port 5173，backend port 3000）
- Prod 架構：`npm run build` 把 frontend build 到 `backend/public/`，由 express serve
- Vite proxy：dev 環境下 `/api/*` → `localhost:3000`（不需要 CORS 設定）
- API prefix：所有 backend route 加 `/api` prefix（`/analyze` → `/api/analyze`）
- 根目錄 `package.json`：用 `concurrently` 同時啟動前後端

**新專案結構**：
```
Job-Apply-Bot/
├── backend/                 ← 幾乎不動
│   ├── public/              ← 新增，存 Vite build 產物
│   ├── server.js            ← 加 /api prefix + serve public/
│   └── ...
├── frontend/                ← 整個換成 Vite React 專案
│   ├── src/
│   │   ├── pages/
│   │   │   ├── NewApplication.tsx
│   │   │   ├── History.tsx
│   │   │   ├── Editor.tsx
│   │   │   └── Settings.tsx
│   │   ├── components/
│   │   │   ├── ui/          ← shadcn/ui 元件
│   │   │   ├── ApplicationTable.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   └── ScoreBar.tsx
│   │   ├── lib/
│   │   │   └── api.ts       ← 所有 fetch 邏輯
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
└── package.json             ← 根目錄，concurrently 腳本
```

**實作步驟**：
1. 根目錄 `package.json` + `concurrently`
2. 建立 Vite + React + TypeScript + Tailwind 專案（在 `frontend/`）
3. 安裝 shadcn/ui，加入常用元件（Button, Table, Badge, Dialog, Input）
4. 把 backend 所有 route 加 `/api` prefix
5. `server.js` 加 production `express.static('public')`
6. `vite.config.ts` 加 proxy + build outDir 指向 `backend/public`
7. 逐頁遷移：NewApplication → History → Settings → Editor
8. 整合測試（dev + prod build 都確認）

---

## 九、Open Questions（等你確認）

1. **Renderer**：選擇 A（自己 parse `~` 語法）還是 B（改 base.md 格式）？
   → 我建議 A，你同意嗎？

2. **Editor UI**：Phase 1 的 inline textarea 夠用嗎？
   或者你一開始就想要 preview（HTML 即時預覽）？

3. **Oh My CV 移除時機**：Phase 1 做完確認 PDF 品質 OK 再刪？
   還是一開始就直接移除？

4. **DB Migration**：現有的 applications 記錄，新欄位填 NULL 就好嗎？
   （不需要保留舊 markdown，因為本來就沒有存）

5. **resume.template.html**：你對現在的 PDF 外觀滿意嗎（字型、排版）？
   還是這次重構順便重設計版面？

---

## 十、Senior Engineer 的話（直說）

**做得好的地方**
- 用 `node:sqlite` 跳過 native 編譯問題，是對的決定
- 把 resume CSS 外部化（`resume.css`），有預見到這個需求
- API 設計乾淨（REST, JSON）
- 前端純 vanilla JS，不引入不必要的框架

**最大的問題不是技術，是 workflow**
一個工具好不好用，看的是「出錯的時候有多痛」。
現在 Gemini 給了一個你不滿意的履歷，你只能整個重跑，AI 費用、時間都浪費了。
Phase 1 的中繼編輯解決這個問題，ROI 最高。

**Oh My CV 其實一直是個風險**
它是為了讓使用者在瀏覽器裡互動操作的工具，你卻用 Puppeteer 從背後注入 IndexedDB 來控制它，這是「hack」不是「整合」。遲早會壞，而且壞了很難 debug。用 `page.setContent()` 直接 render HTML 是更正規的做法，cover letter PDF 現在就是這樣做的，效果也很好。

**Prompt 管理值得投資**
不只是方便你自己調，更是讓這個工具可以被別人使用的關鍵。
一個人的 prompt 偏好跟另一個人的不一樣，這個設計把「user preference」和「code logic」正確地分開了。
