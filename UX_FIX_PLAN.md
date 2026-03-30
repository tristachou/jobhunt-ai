# UX Fix Plan — Job Application Tracking System

> 基於 2026-03-26 的 first-time user review + 2026-03-26 架構討論。
> 已確認決策標 ✅；需要後續討論的標 ⚠️。

---

## 兩種使用者 (User Personas)

這個工具實際上服務兩種用戶，設計必須同時支援：

### Persona A — Tracker 型用戶（主流）
不需要 AI。只想要：
- 建立 2–3 份自己寫的履歷模板（e.g. "General", "Frontend focused"）
- 每次投遞時選一份，打開 Editor 自己微調
- 記錄投遞狀態、追蹤進度
- JD 可貼可不貼，不影響流程

### Persona B — 工程師型用戶（進階）
懂 AI，像現有作者一樣：
- 維護帶有 `{{placeholder}}` 的 base.md + config.json
- 貼 JD 讓 AI 選 stack、偵測技能、填 placeholder
- 選擇是否同時 AI 生成 cover letter
- 看 fit score + detected skills

**關鍵設計原則：一個 form，JD 是否填入決定 AI 功能是否出現。不需要兩套 UI。**

---

## 已確認的決策

| # | 項目 | 決策 |
|---|------|------|
| C1 | `user/base.md` 個人資料問題 | 加 `base.example.md` + `cover-letter/template.example.md`；開源前把個人 `base.md` / `template.md` 加入 `.gitignore` |
| A1 | Editor autosave | 保留 autosave + 加失敗通知（紅色 banner）+ 手動存檔（Ctrl+S / Save 按鈕） |
| D6 | Gemini timeout | 後端 60s，前端 65s |
| E-Q1 | config.json | 選項 A（共用），不做 per-template config |
| G-Q1 | Form 生成 placeholder | 不做，form 只生靜態 markdown |
| G-Q2 | Form/Markdown 雙向同步 | 不做，form 只負責建立，之後只在 markdown editor 改 |
| AI 多模板策略 | 方向 A：有 `{{placeholder}}` 的模板走現有 AI 流程，沒有的直接用；`tailor.js` 邏輯不動 |
| 開源策略 | `base.md` / `config.json` / `template.md` 個人資料 gitignore；repo 只放 `*.example.*` 示範檔案供 Persona B 參考 |
| E-Q2 | Cover letter 控制 | 獨立 checkbox，與 AI customize resume 分開；兩者都預設 ON，但只在 JD 有值時顯示 |
| E-Q3 | 申請記錄另存為模板 | 確認做，Editor 加「Save as template」按鈕 |

---

## Phase A — 靜默失敗 (Silent Failures) 【最高優先】

| # | 問題 | 修法 |
|---|------|------|
| A1 | **Editor autosave 失敗無通知** | `catch` 加紅色 banner "Save failed — your changes were not saved"；加 Ctrl+S + Save 按鈕手動觸發 |
| A2 | **Cover letter 沒 template 靜默跳過** | `/analyze` response 加 `cover_letter_available: false`；Editor 顯示黃色 banner "Cover letter template not found — add `user/cover-letter/template.md` to enable" |
| A3 | **Gemini 回傳格式壞掉整個 500** | `tailor.js` 加 response shape guard：check `stack` (string), `detected_skills` (array), `fit_score` (0–100 number)；任一不符 throw 有意義的 error |
| A4 | **PDF download 無 loading state** | 按鈕 click 後立即 disabled + "Generating PDF…"；完成後 reset；防止連點 |
| A5 | **Soft skill injection 靜默 no-op** | `tailor.js` return 加 `soft_skills_injected: boolean`；result card 如果 false 顯示提示 |

---

## Phase B — 錯誤訊息品質 【高優先】

| # | 問題 | 修法 |
|---|------|------|
| B1 | **GEMINI_API_KEY 未設定** | server 啟動時 check；回傳 "Gemini API key not configured — set GEMINI_API_KEY in backend/.env" |
| B2 | **Gemini 429 quota exceeded** | axios catch 識別 HTTP 429 → "API quota exceeded. Try again later or check your Gemini billing." |
| B3 | **`user/base.md` 或 `config.json` 不存在** | `tailor.js` check files on load；throw "Missing user config: `user/base.md` not found. Copy `user/base.example.md` to get started." |
| B4 | **PDF 404 訊息誤導** | 改成 "Resume markdown not saved — try re-generating from New Application" |
| B5 | **Settings 存檔失敗但顯示 "Saved"** | 成功 badge 移到 `then()`；`catch()` 顯示紅色 "Save failed" |

---

## Phase C — 第一次使用者體驗 【高優先】

| # | 問題 | 修法 |
|---|------|------|
| C1 | **`user/base.md` 是作者個人資料** | 加 `user/base.example.md`（格式示範，無個人資料）；`user/cover-letter/template.example.md` |
| C2 | **"Stack" 術語沒解釋** | 改 label 為 "Resume variant"；加 tooltip 說明 |
| C3 | **支援的 stack 從未列出** | New Application form AI 開關旁顯示可用 variants |
| C4 | **JD textarea 無 hint** | Placeholder: "Paste the full job description here. Leave blank to skip AI analysis." |
| C5 | **Settings prompts `{{tokens}}` 無文件** | 每個 prompt textarea 下加 collapsible "Available tokens" 說明 |

---

## Phase D — 穩健性 & 驗證 【中優先】

| # | 問題 | 修法 |
|---|------|------|
| D1 | **Puppeteer 無 timeout** | `page.setContent` / `page.pdf` 加 `{ timeout: 60000 }`；用 `Promise.race` 加 60s 上限 |
| D2 | **`fit_score` 無邊界檢查** | clamp: `Math.max(0, Math.min(100, score))` |
| D3 | **Prompt token 驗證** | `PUT /prompts` check tailor 含 `{{JD}}`，coverletter 含 `{{TEMPLATE}}` |
| D4 | **theme 參數無驗證** | 白名單：只接受 `/^[a-z0-9-]+$/` |
| D5 | **`status_log` JSON.parse 無保護** | try/catch on JSON.parse；損壞設成 `[]` |
| D6 | **Gemini 無 timeout** | 後端 Promise.race 60s；前端 AbortController 65s |

---

## Phase E — 多履歷模板功能 (New Feature) 【重要】

### E.1 — New Application Form 重新設計

JD 改為選填，以此驅動整個 form 的 AI 功能顯示邏輯。

```
┌─ Job Title (required) ────────┐  ┌─ Company (required) ─────────┐
└───────────────────────────────┘  └──────────────────────────────┘

┌─ Resume Template ─────────────────────────────────────────────────┐
│  [C# Backend ▼]                             [ Preview template → ] │
└───────────────────────────────────────────────────────────────────┘

┌─ Theme ────┐  ┌─ Source ───────────┐  ┌─ URL ──────────────────┐
└────────────┘  └────────────────────┘  └────────────────────────┘

┌─ Job Description ─────────────────────────────────────────────────┐
│  Paste the full job description. Leave blank to skip AI analysis. │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘

[ 只在 JD 有值時顯示 ↓ ] ──────────────────────────────────────────
  ☑ AI customize resume    ☑ AI generate cover letter
────────────────────────────────────────────────────────────────────

                                          [ Save & Track ]  [ Analyze → ]
                                                ↑                 ↑
                                           JD 空白時          JD 有值時
```

**兩個送出路徑：**

| 情境 | 按鈕 | 行為 |
|------|------|------|
| JD 空白 | "Save & Track" | 直接用選中的模板建立 application record，status = `not_started`，跳到 Editor |
| JD 有值，AI ON | "Analyze →" | 現有 `/api/analyze` 流程 |
| JD 有值，AI OFF | "Analyze →" 變成 "Save & Track" | 存 JD 但跳過 AI，用模板 markdown 直接存入 resume_md |

**Cover letter checkbox 邏輯：**
- 只在 JD 有值時顯示
- 預設 ON
- 取消勾選 → `generateCoverLetter` 不執行，`cover_md` 存空字串
- 有些公司不需要 cover letter → 直接取消即可

---

### E.2 — DB Schema 變更

**新增 table: `resume_templates`**
```sql
CREATE TABLE IF NOT EXISTS resume_templates (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  markdown   TEXT NOT NULL,
  is_default INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT
)
```

**`applications` table 新增欄位：**
```sql
ALTER TABLE applications ADD COLUMN resume_template_id INTEGER;
```

**Migration（server 啟動時執行）：**
- 如果 `resume_templates` 是空的，把 `user/base.md` import 為第一個模板，name = "Default"，is_default = 1
- 舊的 applications 的 `resume_template_id` 為 NULL（不影響現有功能）

---

### E.3 — 新增 API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/resume-templates` | 列出所有模板（id, name, is_default，不含 markdown） |
| POST | `/api/resume-templates` | 建立新模板 `{ name, markdown }` |
| GET | `/api/resume-templates/:id` | 取得單一模板（含 markdown） |
| PUT | `/api/resume-templates/:id` | 更新 `{ name?, markdown? }` |
| DELETE | `/api/resume-templates/:id` | 刪除（最後一份不能刪） |
| PATCH | `/api/resume-templates/:id/default` | 設為預設 |

**`POST /api/analyze` 新增 optional fields：**
```json
{
  "job_title": "...",
  "company": "...",
  "jd": "...",
  "resume_template_id": 2,
  "generate_cover_letter": true
}
```

**新增 `POST /api/applications` (Persona A 直接存，不走 AI)：**
```json
// Request
{ "job_title": "...", "company": "...", "resume_template_id": 1,
  "source": "linkedin", "url": "...", "jd": "" }

// Response
{ "id": 43 }
// → frontend redirect to /editor/43
```

---

### E.4 — Resumes 管理頁面

Sidebar 加 "Resumes" 項目。

```
┌─ Resumes ─────────────────────────────────────────────[ + New Resume ]─┐
│                                                                         │
│  ● Default (C# Backend)       last edited Mar 20    [ Edit ] [ ···]    │
│  ○ Python / Django            last edited Mar 15    [ Edit ] [ ···]    │
│  ○ General (no placeholders)  last edited Mar 10    [ Edit ] [ ···]    │
│                                                                         │
│  ● = default template                                                   │
└─────────────────────────────────────────────────────────────────────────┘
```

`[ ··· ]` dropdown：Set as default / Duplicate / Delete

**Edit 頁：** 和現有 Editor 幾乎一樣的 split view（左 markdown，右 preview），頂部加 Name 欄位和 "Set as default" 按鈕。唯一差別：這裡改的是模板，不是特定 application。

---

### E.5 — Editor 加「Save as template」

場景：AI 幫你生了一份好的 → 你手動調了一下 → 想存成新模板給以後用。

Editor 右上角加按鈕「Save as template」：
- 點擊 → modal：輸入 template name（預設帶入 company + job_title）
- 確認 → POST `/api/resume-templates` 帶目前的 `resume_md`

---

### E.6 — Preview Template Modal

New Application form 的「Preview template →」：
- 點擊 → side panel 或 modal，顯示選中模板的 HTML render（POST `/api/preview`）
- 讓用戶在投遞前確認選了對的版本

---

## Phase G — Resume Builder（Form → Markdown） 【重要，服務 Persona A】

### 背景

直接用 markdown 對非技術用戶太困難：
- 要懂 `~ text` 的右側標記語法
- 要懂 YAML front matter
- 要知道 `{{placeholder}}` 怎麼運作
- 完全沒有 UI 引導

**設計原則：Form builder 是建立模板的另一個入口，生出同樣的 markdown，存進同樣的 `resume_templates` table。**

```
[Build with form]          [Edit as markdown]
      ↓                           ↓
   填表單                   直接寫 markdown
      ↓                           ↓
   生成 markdown ──────────────────┘
      ↓
  存入 resume_templates
      ↓
  可在 Markdown Editor 繼續微調
```

---

### G.1 — Resumes 頁面入口

「+ New Resume」點擊後，出現兩個選項：

```
┌─ How would you like to create your resume? ────────────────────┐
│                                                                 │
│   [ 📝 Build with form ]      [ </> Edit as markdown ]          │
│   Fill in your information    Write or paste markdown directly  │
│   — recommended for          — for advanced users with         │
│     most users                 existing templates               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### G.2 — Resume Builder 表單設計

**生成靜態 markdown（無 `{{placeholder}}`）**，適合 Persona A。
Persona B 可以事後在 Markdown Editor 裡手動加 placeholder。

```
┌─ New Resume ─ Build with form ─────────────────────────────────┐
│  Template name: [ My Resume __________________________ ]       │
├────────────────────────────────────────────────────────────────┤
│  PERSONAL INFO                                                 │
│  Name    [ _________________________ ]                         │
│  Email   [ _________________________ ]                         │
│  Phone   [ _________________________ ]                         │
│  Location [ ________________________ ]  (e.g. Sydney, NSW)     │
│  LinkedIn [ ________________________ ]  (URL or username)      │
│  Portfolio [ _______________________ ]  (optional)             │
├────────────────────────────────────────────────────────────────┤
│  SUMMARY                                                       │
│  [ ______________________________________________________ ]    │
│  [ ______________________________________________________ ]    │
├────────────────────────────────────────────────────────────────┤
│  SKILLS                             [ + Add skill group ]      │
│  ┌─ Programming Languages ─────────────────────── [ × ] ─┐    │
│  │  [ JavaScript, TypeScript, Python______________ ]       │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─ Frameworks ────────────────────────────────── [ × ] ─┐    │
│  │  [ React, Node.js, Express __________________ ]         │    │
│  └─────────────────────────────────────────────────────┘    │
├────────────────────────────────────────────────────────────────┤
│  EXPERIENCE                         [ + Add position ]         │
│  ┌──────────────────────────────────────────────────────┐     │
│  │  Job Title  [ _________________ ]                     │     │
│  │  Company    [ _________________ ]   Location [ _____ ]│     │
│  │  Start date [ _______ ]  End date [ _______ ] ☐ Current│    │
│  │  Bullets:                                             │     │
│  │    [ ─────────────────────────────────────────────── ]│     │
│  │    [ ─────────────────────────────────────────────── ]│     │
│  │    [ + Add bullet ]                                   │     │
│  └──────────────────────────────────────────────────────┘     │
├────────────────────────────────────────────────────────────────┤
│  EDUCATION                          [ + Add education ]        │
│  ┌──────────────────────────────────────────────────────┐     │
│  │  Degree      [ __________________________ ]           │     │
│  │  Institution [ __________________________ ]           │     │
│  │  Location    [ ____________ ]  Year [ _____ ]         │     │
│  └──────────────────────────────────────────────────────┘     │
├────────────────────────────────────────────────────────────────┤
│  CERTIFICATIONS (optional)          [ + Add cert ]             │
└────────────────────────────────────────────────────────────────┘
                                      [ Cancel ]  [ Preview → ]
```

右側 live preview（POST `/api/preview`）隨填隨更新。

---

### G.3 — Markdown 生成邏輯

後端新增 `POST /api/resume-templates/build`：
```json
// Request
{
  "name": "My Resume",
  "personal": { "name": "Jane Smith", "email": "...", "phone": "...", "location": "...", "linkedin": "...", "portfolio": "..." },
  "summary": "Experienced full-stack engineer...",
  "skills": [ { "label": "Programming Languages", "items": "JavaScript, TypeScript, Python" } ],
  "experience": [
    {
      "title": "Senior Engineer",
      "company": "Acme Corp",
      "location": "Sydney",
      "start": "Jan 2022",
      "end": "Present",
      "bullets": ["Built microservices...", "Led team of 3..."]
    }
  ],
  "education": [ { "degree": "B.Sc. Computer Science", "institution": "UNSW", "location": "Sydney", "year": "2020" } ],
  "certifications": []
}

// Response
{ "id": 5, "markdown": "---\nname: Jane Smith\n..." }
```

生成的 markdown 格式與現有 `base.md` 完全相同（Oh My CV 語法），可以直接用 `renderer.js` render。

---

### G.4 — Cover Letter Builder（簡版）

同樣概念，更簡單。Cover Letter 的 template 只有 6 個 placeholder，可以用 form 填入：

```
┌─ Cover Letter Template ────────────────────────────────────────┐
│  Opening paragraph:  [ _________________________________ ]      │
│  Why this industry:  [ _________________________________ ]      │
│  Key strengths:      [ _________________________________ ]      │
│  Call to action:     [ _________________________________ ]      │
│                                                                 │
│  Preview ↓                                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Dear Hiring Manager,                                      │  │
│  │ [your opening]                                            │  │
│  │ ...                                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

⚠️ 這個較低優先，先做 G.1–G.3 就夠了。

---

### G.5 — ⚠️ 需要討論的問題

**Q1 — Persona B 的需求：form 要不要支援生成「含 placeholder 的」版本？** ✅

- **決策：Phase G MVP 先不做**，等 form builder 穩定後再評估

**Q2 — form builder 和 markdown editor 要怎麼雙向同步？** ✅

- **決策：單向**——form 只能用來「建立」，建完之後只能在 markdown editor 裡改

**Q3 — 這個功能優先順序？** ✅

- **決策：Phase E 做完後再 plug in**——G 是 E 的「create template」UX 改善，等 E 穩定後接上

---

## Phase F — 其他 UX 打磨 【低優先】

| # | 修法 |
|---|------|
| F1 | JD 少於 100 字顯示 warning（不擋送出） |
| F2 | 刪除確認加說明："This will permanently remove all saved data including markdown." |
| F3 | Status badge 加 icon（不只用顏色區分，解決色盲問題） |
| F4 | Dashboard 載入失敗加 error message |
| F5 | New Application 的 Theme selector 旁加 "Preview →" link |

---

## 建議執行順序

```
Phase A + B      →   Phase D (D1–D3)   →   Phase C   →   Phase E   →   Phase F
(bug fixes)           (robustness)       (onboarding)   (new feature)    (polish)
  1–2 天               半天                 半天            3–4 天          之後
```

Phase A + B + C + D 不影響 Phase E 架構，可以立刻開工。
Phase E 設計已定案，可以在 A–D 做完後接著做。

---

## 開放問題（Phase E 開工前需確認）

1. **E.3 — `POST /api/applications` 要另開 endpoint 還是 `/api/analyze` 加判斷？** ✅
   - **決策：方案 B（分開）**——另開 `POST /api/applications` 給 Persona A；`/api/analyze` 保持給 Persona B，語義清楚

2. **Resumes 頁面的 Edit，要用 modal 還是獨立頁面 `/resumes/:id`？** ✅
   - **決策：獨立頁面 `/resumes/:id`**——split view，UI 和 Editor 共用

3. **模板要不要有 preview image（縮圖）？** ✅
   - **決策：先不做**
