# ECONOMIC CHOICES — Steam Playtest 公開ロードマップ

> **内部制作資料。GitHub Pages / シリーズホームには掲載しない。**
>
> ゴール：第一シナリオ「パンの値段を下げろ！」を、単独でも作品として成立する完成度まで仕上げ、Steam Playtest で外部プレイヤーに公開し、実プレイデータと感想を集める。

最終更新: 2026-09-04

---

## 0. 方針

### 公開形態

- Steam本体ページ：**ECONOMIC CHOICES**
- 状態：Coming Soon
- 公開テスト：**Steam Playtest**
- Playtest収録内容：第一シナリオ「パンの値段を下げろ！」
- 参加方式：可能なら Open signup
- 本編レビューや評価を汚さず、テスト参加者を集めることを優先

### 今回やらないこと

- Scenario 02「許可証がなければ働けません」の実装
- Scenario 03「災害の日、1000円の水」の実装
- Live2D
- 高度なアニメーション
- macOS / Linux対応を必須条件にすること
- 大規模分析基盤を先に作ること
- パン編の経済パラメータを人間テスト前に再調整すること

### 完成の定義

Steam Playtestへ出す時点で、以下を満たす。

1. シナリオ本文・分岐・エンディングが最終監査済み
2. 主要人物に立ち絵がある
3. 主要場面に背景がある
4. BGM / SEがある
5. 必要範囲のボイスがある
6. ノベルゲームとして最低限の操作性がある
7. Windowsデスクトップ版として安定動作する
8. Steamから起動・終了・セーブ・再開できる
9. プレイ後にフィードバックを送れる
10. 初見プレイヤーが説明なしで最後まで遊べる

---

# Phase A — パン編の内容を凍結する

## A-1. 全ルート意味監査

### 作業

- 全choice列を再列挙
- 全Ending到達確認
- stateと台詞の意味矛盾確認
- 過去flagと現在flagの不一致確認
- 同じイベントを「初めて」と誤記していないか確認
- crackdown / register / tolerate / relax-price の後続台詞確認
- `foodAccess` / `marketRisk` / `informalMarket` の説明がプレイヤーの感覚と一致するか確認

### 完了条件

- validator成功
- 全テスト成功
- 既知の意味矛盾ゼロ
- Ending名・本文を一度凍結

### 原則

この段階では数値バランスを不用意に変更しない。

---

## A-2. テキスト最終編集

### 確認項目

- 一文が長すぎない
- 同じ説明を別人物が繰り返していない
- 経済用語を台詞だけで説明しすぎていない
- 市民・行政・事業者それぞれに合理的な動機がある
- 黒田を市場万能論の代弁者にしない
- 取締り派を愚かにしない
- 登録制を作者推奨の安全策に見せすぎない
- Ending後のEconomics解説が説教臭くない

### 完了条件

- 台詞・Ending・Economics解説の本文凍結
- 以後、誤字・重大矛盾以外では大幅改稿しない

---

# Phase B — ビジュアル

## B-1. アートディレクションを固定

最初に1ページのアート仕様を作る。

決めるもの：

- 世界観：現代日本に近い架空都市
- 絵柄
- 頭身
- 線の太さ
- 彩度
- 光源
- 背景の描き込み量
- キャラクターの立ち位置
- 画面内サイズ
- 表情差分のルール

一度決めたら全キャラクターで統一する。

---

## B-2. 主要人物の立ち絵

最低限：

- 佐藤 美咲 / 市民代表
- 山田 浩一 / パン屋
- 黒田 誠 / 食品卸
- 高橋 玲奈 / 市・福祉担当
- 藤井 慎一 / 市・財政担当

### 表情差分

各人物、最低4種：

- neutral
- concern
- angry / assertive
- relief / positive

必要なら個別追加。

### narrator / ECONOMICS

- narrator：立ち絵不要
- ECONOMICS：人物化しなくてもよい

### 完了条件

- 5人物の通常立ち絵
- 必須表情差分
- 透過PNG
- ファイル命名規則統一

---

## B-3. 背景

最低候補：

- 市長室
- 市役所会議室
- パン屋
- 商店街 / スーパー
- 倉庫 / 流通現場
- 市街地
- 非公式取引が起きている街角
- Ending用の街の朝 / 棚 / 行列等

### 原則

全sceneに別背景を作る必要はない。

「場所が変わった」と理解できる最低限の背景セットを優先する。

---

## B-4. Steam用画像素材

後工程で必要になるため、ゲーム内アートと並行して素材を確保する。

- capsule用メインビジュアル
- library artwork
- header
- screenshots
- ロゴ

Steamの正確な寸法は申請時点のSteamworks仕様を再確認する。

---

# Phase C — 音声・音楽

## C-1. ボイス方針

第一候補：AivisSpeech Engine

### キャラごとに固定

- 佐藤：voice A
- 山田：voice B
- 黒田：voice C
- 高橋：voice D
- 藤井：voice E

voice ID / model / style / speed / pitch / volumeを設定ファイルに保存する。

### ボイス対象

優先度1：キャラクター台詞

優先度2：重要なEnding台詞

優先度3：Economics解説

narratorは無音でもよい。

### 完了条件

- 同一人物の声が全sceneで一貫
- 台詞変更後の音声差し替え方法が確立
- 再生成可能な設定を保存

---

## C-2. BGM

最低限の曲数：

1. Title / Scenario select
2. 日常・会話
3. 緊張・危機
4. 政策判断
5. Ending / reflection

ループ前提。

音楽が主張しすぎないこと。

---

## C-3. SE

最低限：

- choice決定
- 次へ
- parameter変化
- alert
- Ending表示
- UI open / close

---

# Phase D — ノベルゲームUI完成

## D-1. バックログ

必須。

### 要件

- 過去台詞閲覧
- speaker / role表示
- 選択履歴も分かる
- 現在sceneへ戻れる

---

## D-2. Auto

### 要件

- 台詞を自動送り
- ボイスがある場合はボイス終了後に進む
- choiceで停止
- ユーザー操作で解除

---

## D-3. Skip

### 推奨

- 既読のみSkipを基本
- choiceで停止
- 未読Skipは設定で許可するか後回し

---

## D-4. Settings

最低限：

- Master volume
- BGM volume
- SE volume
- Voice volume
- Text speed
- Auto speed
- Fullscreen

必要なら：

- voice個別ON/OFF

---

## D-5. ESCメニュー

- Resume
- Save
- Load
- Settings
- Scenario select
- Quit game

Web版ではQuitを隠してもよい。

Desktop版でのみ表示可能な設計にする。

---

## D-6. 入力

最低限：

- Mouse / touch
- Enter / Space：次へ
- Arrow / number keys：choice操作
- Esc：menu

---

# Phase E — セーブ・Desktop互換

## E-1. Save format維持

現在のsaveVersion互換をできる限り維持する。

Tauri導入だけを理由にGameState構造を変えない。

---

## E-2. Web / Desktop storage abstraction

現在localStorageに直接依存している箇所があれば、storage adapterで抽象化する。

例：

- WebStorageAdapter
- DesktopStorageAdapter

Game-coreはストレージを知らないまま維持する。

---

# Phase F — Tauri 2

## F-1. 導入方針

- Next.js static exportを維持
- `out/` をTauri frontendDistとして利用
- game-coreを変更しない
- Web版とDesktop版を同じUIコードから生成

---

## F-2. 最初の対象

Windows x64

### 最低確認環境

- Windows 11
- 1920x1080
- 1366x768
- windowed
- fullscreen

---

## F-3. Desktop固有機能

最低限：

- Quit
- fullscreen
- app version表示
- セーブ永続化

Steam API連携は必要最低限から開始する。

Achievements等はPlaytest公開の必須条件にしない。

---

## F-4. Windows build acceptance

- clean install可能
- 起動可能
- 1周完走可能
- save / load成功
- 2周目成功
- 音声再生成功
- fullscreen切替成功
- app終了後もsave維持
- crashなし

---

# Phase G — フィードバック導線

## G-1. Ending後 CTA

Ending後に必ず表示：

**この作品について意見を聞かせてください**

Button：

`感想を送る`

---

## G-2. アンケート

最初は外部フォームでよい。

質問：

1. 一番迷った選択はどこでしたか？
2. なぜその選択をしましたか？
3. 結果に納得できましたか？
4. 作者に「正しい選択」へ誘導されている感じがしましたか？
5. もう一度別ルートを遊びたいと思いましたか？
6. ECONOMIC CHOICESの別シナリオも遊びたいですか？
7. 一番直してほしいところは何ですか？

追加：

- Ending
- choice history
- playtime

をユーザーがコピーして貼れる形にする。

---

## G-3. 特に確認したい項目

### 非公式市場

- crackdown
- register
- tolerate
- relax-price

のどれを選んだか。

その理由。

### register偏重

registerが明らかな「作者推奨の正解」に見えていないか。

人間テスト前に数値調整しない。

---

# Phase H — 最低限の匿名プレイ分析

## 優先度：中

公開を遅らせない範囲で実装。

取得候補：

- game_start
- game_complete
- ending_id
- choice_id
- replay_start
- playtime

### 原則

- 個人情報を収集しない
- 不要な識別子を持たない
- Privacy説明を準備
- Steam公開を遅らせるなら初回は省略可

---

# Phase I — Steamworks

## I-1. アカウント / App登録

- Steamworks Partner登録
- App Credit購入
- ECONOMIC CHOICES App作成

---

## I-2. Store page

シリーズとして説明する。

### 概要

ECONOMIC CHOICESは、経済政策・社会制度を題材にした短編選択シミュレーションシリーズ。

### 現在遊べる内容

- パンの値段を下げろ！

### 開発予定としてのみ表示

- 許可証がなければ働けません
- 災害の日、1000円の水

未実装であることを明示する。

---

## I-3. Playtest

- Playtest AppID作成
- Windows build upload
- branch / depot設定
- testerから起動確認
- Open signup検討

---

## I-4. Steam審査前チェック

- Store page内容と実装内容が一致
- 未実装要素を実装済みのように書かない
- screenshotsが現在buildと一致
- 外部リンク正常
- Privacy関連確認
- third-party asset / voice / musicの利用条件確認

---

# Phase J — 公開前QA

## J-1. 自動検証

毎回：

```bash
pnpm check:core
pnpm typegen
pnpm typecheck
pnpm lint
pnpm test
pnpm validate
pnpm build
git diff --check
```

Tauri導入後はDesktop buildも追加。

---

## J-2. 手動通しプレイ

最低限、異なるルートで5周。

確認：

- 全choice押下
- disabled理由
- parameter HUD
- voice
- BGM切替
- save / load
- backlog
- auto
- skip
- Ending
- feedback
- restart
- scenario select

---

## J-3. 新規ユーザー視点

初回起動時に説明なしで、

- 何をするゲームか理解できる
- 次に何を押すか分かる
- 数値の意味をおおむね理解できる
- choiceを決定できる
- Endingまで進める

こと。

---

# Phase K — Steam Playtest公開後

## K-1. 最初に見る数字

優先順位：

1. 完走率
2. リプレイ率
3. choice分布
4. Ending分布
5. register選択率
6. feedback送信率

---

## K-2. 定性フィードバック

特に分類する：

- 話が分かりにくい
- 経済用語が難しい
- choiceが明らかすぎる
- 作者の誘導を感じる
- 結果が納得できない
- UI操作が分からない
- テキストが長い
- キャラが弱い
- 絵 / 音声の問題
- もっと遊びたい

---

## K-3. 修正優先順位

1. Crash / save破損
2. 進行不能
3. 意味矛盾
4. UI理解不能
5. choice誘導感
6. テキストテンポ
7. balance
8. 演出強化

「数値の好み」より先に、意味・操作・理解を修正する。

---

# 実行順チェックリスト

## Milestone 1 — Content Lock

- [ ] 全ルート監査
- [ ] 台詞最終編集
- [ ] Ending凍結
- [ ] Economics解説凍結

## Milestone 2 — Visual Alpha

- [ ] アート仕様
- [ ] 5人立ち絵
- [ ] 表情差分
- [ ] 基本背景
- [ ] 立ち絵表示実装
- [ ] 背景表示実装

## Milestone 3 — Audio Alpha

- [ ] voice mapping
- [ ] AivisSpeech生成pipeline
- [ ] キャラ台詞音声
- [ ] BGM
- [ ] SE
- [ ] volume settings

## Milestone 4 — VN Feature Complete

- [ ] backlog
- [ ] auto
- [ ] skip
- [ ] settings
- [ ] ESC menu
- [ ] keyboard input
- [ ] fullscreen

## Milestone 5 — Desktop Alpha

- [ ] Tauri 2
- [ ] Windows build
- [ ] save compatibility
- [ ] quit
- [ ] desktop QA

## Milestone 6 — Feedback Ready

- [ ] Ending CTA
- [ ] feedback form
- [ ] history copy
- [ ] playtime
- [ ] optional analytics

## Milestone 7 — Steam Ready

- [ ] Steamworks registration
- [ ] ECONOMIC CHOICES App
- [ ] Store assets
- [ ] Store copy
- [ ] Coming Soon
- [ ] Playtest AppID
- [ ] build upload
- [ ] Valve review

## Milestone 8 — Public Playtest

- [ ] Playtest open
- [ ] feedback collection
- [ ] first 50 players review
- [ ] first 100 players review
- [ ] v1 feedback fixes

---

# 最初に着手するタスク

次の実装作業は **Visual Alpha** へ進む前に、以下の順とする。

1. パン編の最終Content Lock監査
2. アートディレクション決定
3. 佐藤美咲のデザイン確定
4. 山田浩一のデザイン確定
5. 残り3人物へ展開
6. 立ち絵表示機能実装
7. 背景表示機能実装

最初の1人を確定するまでは、5人分を一気に生成しない。

---

# リリース判断

Steam Playtestへ進んでよい条件：

- Content Lock済み
- 5人物の立ち絵あり
- 基本背景あり
- BGM / SEあり
- 必要なvoiceあり
- VN基本機能あり
- Windows build安定
- feedback導線あり
- 自動テスト成功
- 手動5周成功

上記を満たしたら、パン編は「テストするための試作品」ではなく、**外部公開可能な第一作品**として扱う。
