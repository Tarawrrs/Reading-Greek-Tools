# Reading Greek Tools 內容擴增 SOP

這套流程的目標是：每次擴增 textbook Section 或修正詞條時，只重做必要的查核，不再重新推斷已確認的設計與資料規則。

## 1. 先定義變更範圍

1. 記錄目標 Section／segment／頁碼與《Reading Greek: Grammar and Exercises》段落號。
2. 逐頁分開擷取《Text and Vocabulary》的 running vocabulary 和《Grammar and Exercises》的 summary learning vocabulary；兩者互補，不能用 learning list 代替 running list。保留來源頁碼；可與前節重複，但索引顯示時合併同一 lexeme。
3. 同步擷取該階段教材明列、值得查閱的：
   - declension / conjugation paradigms；
   - syntax and writing rules；
   - irregular stems or forms explicitly introduced by the book.
4. 不因為「後面會用到」就提前補全教材尚未介紹的 paradigm。

## 2. Vocabulary 資料規約

每筆新資料先完成下列欄位，再放入 HTML 的 JSON：

| Field | Rule |
| --- | --- |
| `g` | running vocabulary 用課文實際形式；learning-list 資料用印在列表上的 headword，保留重音與 breathing |
| `lemma` | 教材或字典型；不用去重音字串當 identity |
| `en` | 該課文中的 contextual gloss，不假裝是唯一字典義 |
| `section`, `segment`, `page` | 實際出處；總學習詞彙表使用印刷的區段範圍與《Grammar and Exercises》頁碼，不臆造首次出現的細分段落 |
| `pos` | 必須是既有 filter 之一；片語用 `Phrase` |
| `class` | 名詞用 1a–3h；動詞先標 present pattern（ω-verb、α/ε/ο-contract、-μι／athematic），再標 middle voice 或教材已介紹的 irregular stem／future 特性 |
| `headword` | 可直接顯示的 dictionary form |
| `lexemeId` | 只在同形異義或跨資料集需穩定合併時填寫 |
| `morph` | 只填經教材／語法表確認的 parsing；不以字尾猜測 |

關鍵原則：

- Search normalization 可忽略重音與 breathing；lexeme identity 不可忽略。
- `εἰς / εἷς`、`τίς / τις`、`πῶς / πως` 必須分離。
- 片語和例句不能假裝成 lemma；用 `Phrase` 分類。
- 既有 META 不足時加 explicit metadata，不再擴張 heuristic 去猜。
- 動詞的 `-ομαι` 只表示 middle 形式，不能據此判定是否 contract 或是否 deponent。教材確認的例外與複合類型放在 HTML 的 `verb-types` 明確對照表；新增動詞先核對這張表與課本，再讓 UI 套用 fallback。尤其檢查 `-άομαι`、`-έομαι`、`-όομαι`、`-μι`、少數只部分縮約的 `πλέω` 類，以及詞表列出的變化形。
- Sections 6–8 的總學習詞彙表放在 `vocabulary-next` 的 compact `groups` 裡：每組記錄教材區段、書頁，每個 `entries` row 是 `[headword, gloss, POS, optional class]`。執行時展開為同一索引，但 UI 必須明示「learning list」，不能標成 running-text form。
- 從 Section 3 起補入的課文隨頁詞彙放在 `vocabulary-running`，每組記錄《Text and Vocabulary》印刷頁碼，每個 row 是 `[text form, lemma, contextual gloss, POS, optional class, optional display headword]`。既有 lexeme 合併顯示，不覆蓋先前來源；`learn` 固定為 false。
- 語法已引入、卻不在總學習詞彙表的必要模型（例如 3h `ὀφρύς`）放在 `vocabulary-grammar`，來源標為 `grammar`，不加 learning-list 星號。
- 介詞帶不同格且意思不同時，查閱介面應保留 case label；片語不得冒充一般詞形。

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

先把新核對的每一張 running-vocabulary 頁面的 distinct lexemes、固定片語和難以從 dictionary form 搜到的詞形記到 `data/textbook-vocabulary-checks.json`。只記人工對照原頁確認過的項目；PDF 複製出亂碼時要看原頁，不從亂碼猜希臘字。這份清單是獨立於網站的來源清單，新增後用下面的檢查列出漏字，僅補真正缺的資料。每頁都標 `segment` 和印刷頁碼；沒有列入清單的頁面仍視為未審完，不宣稱 Section 全覆蓋。

在開啟瀏覽器前先執行：

```bash
node scripts/validate-content.mjs
```

它會檢查：

- embedded JSON 可解析且必要欄位完整；
- 已核對的 textbook running-vocabulary 頁面是否每個 headword / 固定片語都能在索引找到；另核對新補詞形、segment 與頁碼；
- Sections 6–8 的總學習詞彙分組、詞性及名詞／動詞分類；
- `verb-types` 對照表的詞條存在性，以及教材 middle contract 模型不會退化成籠統的 middle 標籤；
- Section / segment / page 範圍；
- 重複 ID、重複 card ID、缺少 source reference；
- 已知 accent-sensitive lexeme 是否有獨立 identity；
- 教材標示 irregular 的動詞是否需要人工審核 Conjugation。

Error 必須修正後才可發佈；warning 需要審核並說明為何不增加 paradigm。

一次更新的最省工順序：鎖定新頁碼 → 更新來源清單 → 執行檢查取得缺項 → 只編輯缺項與必要 metadata → 再跑檢查 → 抽查搜尋、詞性、來源標示。不要每次重讀已核對頁，也不要從字尾猜動詞或名詞類別。只補部分頁面時，同步更新網站的覆蓋說明。

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
3. 只 stage 此次實際修改的網站與維護檔；不 stage PDF、tmp 或 QA 圖。
4. Commit to `main`，再 push `origin/main`；不 force-push。
5. 回報 commit，並明確區分「已 push」與「Pages 已完成部署」。
