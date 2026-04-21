# Prompt Integration Plan
## 將模組化 prompts/ 整合進 tailor pipeline

> 狀態：討論中（未實作）
> 最後更新：2026-04-22

---

## 背景

### 現在的問題

| 檔案 | 現況 |
|------|------|
| `tailor.js` | 只讀 `user/prompts.json` 的 `tailor` 字串，沒有 archetype detection、沒有 ATS rules |
| `coverletter.js` | 已修好，現在用 `callLLM()` 走 Ollama ✅ |
| `evaluator.js` | 已讀 `_shared.md` + `_profile.md` + `evaluate.md` ✅ |
| `user/base.md` | 還有 `{{placeholders}}`，DB seed 會把它 import 成 default template，導致 AI 拿到舊版 CV |
| `user/cv.md` | 乾淨、完整，是正確的 content pool |

### 原始設計的問題

`prompts/` 裡的檔案是為 **Claude/ChatGPT agent（chat 模式）** 設計的：
- 使用者貼 JD → AI 讀 system context → 多輪對話
- 這些檔案原本是 system prompt，不是 single-shot JSON prompt
- 直接餵給 Ollama 的 `/api/generate`（single call）效果不穩定

所以整合前需要**調整寫法**，讓它適合 one-shot JSON output。

---

## 目標工作流程

```
JD 貼入
  → 偵測 archetype（_shared.md archetypes 表）
  → 根據 archetype 決定強調哪些 CV 內容（_profile.md adaptive framing）
  → 套用 ATS + 寫作規範（_shared.md rules）
  → 輸出 tailored resume JSON（pdf.md output format）
```

---

## 整合方案比較

### 方案 A：直接拼接（最快）

```
prompt = _shared.md + _profile.md + pdf.md
         （把 {{CV}} 和 {{JD}} 替換）
```

**優點：** 改動最小，`tailor.js` 只換讀取來源
**缺點：**
- 這些檔案是 chat-style 寫法，Ollama 小模型可能被 instruction 量壓垮
- gemma3:27b context window 吃得消，但輸出品質不保證

### 方案 B：重寫成 one-shot prompt（推薦）

把 `_shared.md`、`_profile.md`、`pdf.md` 的**關鍵內容精煉**成一個新的 `prompts/tailor-v2.md`，專門為 single LLM call 設計：

```
prompts/tailor-v2.md 結構：

1. Role + 核心規則（5 條，從 _shared.md 精煉）
2. Archetype table（從 _shared.md 複製，讓 AI 先偵測）
3. Adaptive framing（從 _profile.md 的 table 精煉）
4. Tailoring instructions（從 pdf.md 的 What to change / NOT to change）
5. ATS + 寫作規範（從 _shared.md 的 Writing rules）
6. Output format JSON（帶 archetype、keywords_injected 欄位）
7. {{CV}} 和 {{JD}} placeholder
```

**優點：**
- prompt 比方案 A 短 30-40%，Ollama 更穩定
- 專門為 JSON output 設計，減少格式錯誤
- 不動 `_shared.md` 和 `_profile.md`（保留給未來 agent 用）

**缺點：** 需要花時間寫新 prompt，且之後更新 `_profile.md` 要記得同步 `tailor-v2.md`

### 方案 C：兩階段 call（最準但最慢）

```
Call 1: JD → detect archetype + extract top keywords（輕量）
Call 2: archetype + keywords + CV + JD → tailor resume（主力）
```

**優點：** 每個 call 的 instruction 更聚焦，品質最好
**缺點：** 兩倍時間，對 gemma3:27b 本地跑可能要 5-10 分鐘

---

## 需要解決的其他問題

### 1. base.md vs cv.md

- `user/base.md` 有 `{{placeholders}}`，被 DB seed 當成 default template import
- `user/cv.md` 是正確的 content pool
- **解法：** 把 `base.md` 內容換成跟 `cv.md` 一樣，或改 seed 邏輯讀 `cv.md`

### 2. `keywords_injected` 欄位

- `pdf.md` 的 output format 有 `keywords_injected` array
- `tailor.js` 目前不處理這個欄位
- **解法：** 可存進 DB（加新欄位）或忽略（只 log）

### 3. `prompts.json` 的 `tailor` 字串

- 目前 Settings 頁面可以編輯 `prompts.json` 的內容
- 如果改成讀 `prompts/tailor-v2.md`，Settings 頁面的 prompt editor 要跟著更新
- **選項：** Settings 改成顯示/編輯 `tailor-v2.md` 檔案內容

### 4. coverletter prompt

- coverletter 目前也讀 `prompts.json`
- 要不要也升級成讀 `prompts/` 的模組化版本？（之後可做）

---

## 建議實作順序

1. **先修 base.md**（立刻解決 AI 拿到錯誤 CV 的問題）
2. **寫 `prompts/tailor-v2.md`**（方案 B）— 跟使用者一起討論內容
3. **改 `tailor.js`** 讀新 prompt 檔
4. **更新 `tailor.js` output** 處理 `keywords_injected`（可選）
5. **更新 Settings 頁面** prompt editor 指向新檔案

---

## 開放問題（待討論）

- [ ] 選方案 A、B 還是 C？
- [ ] `keywords_injected` 要存 DB 還是忽略？
- [ ] coverletter 也要升級嗎？
- [ ] Settings prompt editor 要對應到哪個檔案？
- [ ] `_profile.md` 的內容需要更新嗎（薪資目標、target roles）？
