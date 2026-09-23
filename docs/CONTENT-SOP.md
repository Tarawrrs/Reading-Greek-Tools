# Reading Greek Tools 內容擴增 SOP

這套流程的目標是：每次擴增 textbook Section 或修正詞條時，只重做必要的查核，不再重新推斷已確認的設計與資料規則。

## 1. 先定義變更範圍

1. 記錄目標 Section／segment／頁碼與《Reading Greek: Grammar and Exercises》段落號。
2. 只擷取該階段首次引入的：
   - learning vocabulary；
   - declension / conjugation paradigms；
   - syntax and writing rules；
   - irregular stems or forms explicitly introduced by the book.
3. 不因為「後面會用到」就提前補全教材尚未介紹的 paradigm。

## 2. Vocabulary 資料規約

每筆新資料先完成下列欄位，再放入 HTML 的 JSON：

| Field | Rule |
| --- | --- |
| `g` | 課文實際形式，保留重音與 breathing |
| `lemma` | 教材或字典型；不用去重音字串當 identity |
| `en` | 該課文中的 contextual gloss，不假裝是唯一字典義 |
| `section`, `segment`, `page` | 首次或當次出處 |
| `pos` | 必須是既有 filter 之一；片語用 `Phrase` |
| `class` | 名詞用 1a–3g，動詞用 ω-verb / contract / middle-deponent / irregular |
| `headword` | 可直接顯示的 dictionary form |
| `lexemeId` | 只在同形異義或跨資料集需穩定合併時填寫 |
| `morph` | 只填經教材／語法表確認的 parsing；不以字尾猜測 |

關鍵原則：

- Search normalization 可忽略重音與 breathing；lexeme identity 不可忽略。
- `εἰς / εἷς`、`τίς / τις`、`πῶς / πως` 必須分離。
- 片語和例句不能假裝成 lemma；用 `Phrase` 分類。
- 既有 META 不足時加 explicit metadata，不再擴張 heuristic 去猜。

## 3. 跨分頁一致性

新增一個 Section 時，按這個矩陣檢查：

| Textbook introduces | Update |
| --- | --- |
| noun / adjective / pronoun family | Vocabulary metadata + Declension |
| regular tense / mood / voice | Vocabulary metadata + Conjugation + Grammar usage if needed |
| irregular verb form or stem | Vocabulary metadata + `#irregular-verbs` audit |
| syntax / word order / particles | Grammar, inserted at first prerequisite position |
| accent / contraction interaction | Existing writing card or contraction table; avoid duplicate rules |

內容位置依「先備知識 → 首次出現」排序，不以「最近新增」排在頁底。

## 4. 固定自動檢查

在開啟瀏覽器前先執行：

```bash
node scripts/validate-content.mjs
```

它會檢查：

- embedded JSON 可解析且必要欄位完整；
- Section / segment / page 範圍；
- 重複 ID、重複 card ID、缺少 source reference；
- 已知 accent-sensitive lexeme 是否有獨立 identity；
- 教材標示 irregular 的動詞是否需要人工審核 Conjugation。

Error 必須修正後才可發佈；warning 需要審核並說明為何不增加 paradigm。

## 5. 最小瀏覽器 QA

每次只重測受影響的 workflow，但下列為必測：

1. Desktop 1280 px：四個主分頁、搜尋、POS filter、section filter。
2. Phone 390 px：頁面不橫向 overflow；Vocabulary 使用 card；寬語法表只在 wrapper 內橫捲。
3. Keyboard：`/` focus search；Apple keyboard mapping；Backspace；Tab focus visible。
4. Lexeme regression：搜尋 `εις`、`τις`、`πως`，確認重音相關詞不被合併。
5. Contract toggle：每格只顯示 contracted 或 uncontracted 一種形式。
6. Print：控制項目隱藏，表格無裁切。

## 6. 發佈

1. `git diff --check`
2. `node scripts/validate-content.mjs`
3. 只 stage `Reading-Greek-1-2.html`、SOP 與 validator；不 stage PDF、tmp 或 QA 圖。
4. Commit to `main`，再 push `origin/main`；不 force-push。
5. 回報 commit，並明確區分「已 push」與「Pages 已完成部署」。
