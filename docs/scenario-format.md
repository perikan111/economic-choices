# シナリオフォーマット仕様（案 v1）

対象: economic-choices / `formatVersion: 1`
最終更新: 2026-09-01

シナリオは **1本 = 1つの JSON ファイル**。プログラムコードにシナリオ固有の分岐を一切書かない。
エンジンはこの仕様だけを解釈し、シナリオを追加するときはデータを足すだけで済むようにする。

---

## 0. 設計方針

| 方針 | 理由 |
| --- | --- |
| **独自スクリプト言語を作らない** | パーサ・評価器・エラー処理の保守コストが本体を上回る |
| **条件と効果は「データ構造」で表す** | JSON のまま検証でき、`eval` 不要、型を付けられる、AI が生成しやすい |
| **分岐の仕組みは1種類に絞る**（`branch`） | 「シーンにも選択肢にも別々の分岐記法がある」状態を避ける |
| **表示用の文字列と論理 ID を分ける** | 後から多言語化・音声・立ち絵を足せる |
| **すべて JSON シリアライズ可能** | セーブ、Tauri 移植、テストのしやすさに直結する |

**やらないこと（意図的な制限）**:
- 任意の式（`(a + b) * 2 > c` のような算術式）は書けない。比較は「パラメータ ⇔ 定数」のみ。
- ループ・変数宣言・関数はない。
- 乱数はない（MVP は完全決定的。将来はシード付きで追加する）。

これらが本当に必要になったら、そのとき最小限だけ拡張する（§10）。

---

## 1. 全体構造

```jsonc
{
  "formatVersion": 1,   // フォーマットの世代。破壊的変更時にインクリメント
  "meta":         {},   // シナリオのメタ情報
  "characters":   [],   // 話者の定義
  "parameters":   [],   // パラメータの「型定義」（表示名・上下限）
  "initialState": {},   // 開始時の値（パラメータの初期値・フラグ・開始シーン）
  "scenes":       [],   // シーン本体
  "endings":      []    // エンディング（判定条件つき）
}
```

`parameters` と `initialState` を分けている理由:
`parameters` は「このシナリオにどんな指標が存在し、どう表示するか」の**定義**。
`initialState` は「どこから始まるか」の**初期値**。
将来 難易度別の初期値や、途中から始まるデバッグ用エントリを足すとき、定義を触らずに済む。

---

## 2. meta

```json
{
  "id": "bread-price",
  "title": "パンの値段を下げろ！",
  "version": "0.1.0",
  "locale": "ja-JP",
  "author": "economic-choices",
  "summary": "小麦不足でパン価格が高騰した都市。市長として、価格・供給・財政のバランスを取る。",
  "estimatedMinutes": 10,
  "tags": ["price-control", "subsidy", "shortage"]
}
```

| フィールド | 必須 | 説明 |
| --- | --- | --- |
| `id` | ✅ | シナリオ識別子。セーブデータのキー・音声ファイルのディレクトリ名に使う。`[a-z0-9-]+` |
| `title` | ✅ | 表示タイトル |
| `version` | ✅ | シナリオ内容のバージョン。semver。セーブ互換性の判定に使う |
| `locale` | | 既定 `ja-JP` |
| `estimatedMinutes` | | 一覧表示用 |

---

## 3. characters

```json
[
  { "id": "narrator", "name": "", "color": "#8a8a8a" },
  { "id": "mayor", "name": "あなた", "color": "#3b6ea5" },
  {
    "id": "aide",
    "name": "リーゼ",
    "role": "財政補佐官",
    "color": "#a5603b",
    "portrait": "aide/base.png",
    "defaultExpression": "normal",
    "expressions": { "normal": "aide/normal.png", "worried": "aide/worried.png" },
    "voice": { "engine": "aivisspeech", "speakerId": 888753760, "styleId": 0 }
  }
]
```

- `role` は任意。UI 上で人物名と併記する短い役割・肩書き（例: `財政補佐官｜リーゼ`）。
  `portrait` や `voice` と同じ表示用 metadata であり、条件・効果・ゲーム状態には影響しない。
- `portrait` / `expressions` は**論理パス**。URL への変換はプラットフォーム層の責務（[architecture.md](./architecture.md) §6）。
- `defaultExpression` は台詞側で `expression` を省略したときの表情ラベル。指定する場合は
  `expressions` に同名のキーが必要。画像 ID は `<characterId>.<expression>` として扱う。
- `voice` は将来の一括音声生成用。MVP では読み飛ばして構わない（存在しても無視できる）。
- `id: "narrator"` は慣習として地の文に使う。エンジン上の特別扱いはしない（`name` が空なら名前欄を出さない、という UI 側の判断だけ）。

---

## 4. parameters

```json
[
  {
    "id": "budget",
    "label": "市財政",
    "min": -200,
    "max": 500,
    "integer": true,
    "display": { "visible": true, "order": 2, "unit": "億", "goodDirection": "up" }
  }
]
```

| フィールド | 必須 | 説明 |
| --- | --- | --- |
| `id` | ✅ | 条件式・効果から参照する識別子 |
| `label` | ✅ | 表示名 |
| `min` / `max` | | 適用後にこの範囲へクランプする。省略時は無制限 |
| `integer` | | `true` なら効果適用後に四捨五入。既定 `true` |
| `display.visible` | | HUD に出すか。既定 `true`。内部変数として隠したい値は `false` |
| `display.order` | | HUD 内の並び順 |
| `display.unit` | | 単位（`%`、`円` など） |
| `display.goodDirection` | | `up` / `down` / `neutral`。増減の色分けに使う（UI ヒント。ロジックには影響しない） |

**パラメータはシナリオ側で自由に定義できる。**
`popularity` / `budget` などをエンジンにハードコードしない。エンジンは「`parameters` に定義された ID の集合」しか知らない。

---

## 5. initialState

```json
{
  "startScene": "intro",
  "params": { "popularity": 50, "budget": 100, "supply": 80, "price": 320, "blackMarket": 5 },
  "flags": { "priceControl": false, "subsidy": false, "rationing": false }
}
```

- `params` のキーは `parameters` に定義済みでなければ検証エラー。逆に、定義済みで `params` にないものも検証エラー（書き忘れ防止）。
- `params` の初期値が対応するパラメータ定義の `min` / `max` を外れている場合は検証エラー。実行時に黙ってクランプしない。
- `flags` は **boolean のみ**。ここに宣言していないフラグを効果で立てるのは検証エラー（タイポ防止のため事前宣言を必須にする）。

---

## 6. 条件式（Condition）

すべての「条件」はこの1つの型で表現する。選択肢の表示条件も、シーン分岐も、台詞の出し分けも、エンディング判定も同じ記法。

### 6.1 リーフ（葉）

```jsonc
// パラメータ比較（value は数値リテラルのみ）
{ "param": "budget", "op": ">=", "value": 40 }

// フラグ（value 省略時は true とみなす）
{ "flag": "priceControl", "value": true }
{ "flag": "subsidy" }

// 訪問済みシーン
{ "visited": "black-market-emerges" }
```

`op` に使えるのは `"=="` `"!="` `"<"` `"<="` `">"` `">="` の6つだけ。

### 6.2 組み合わせ

```jsonc
{ "all": [ CondA, CondB ] }   // AND（空配列は true）
{ "any": [ CondA, CondB ] }   // OR （空配列は false）
{ "not": CondA }              // NOT
```

入れ子は自由。

```json
{
  "all": [
    { "param": "supply", "op": "<", "value": 60 },
    { "any": [
      { "flag": "priceControl" },
      { "param": "blackMarket", "op": ">=", "value": 30 }
    ]},
    { "not": { "flag": "subsidy" } }
  ]
}
```

> `budget < 20 ならこの選択肢を表示` → `{ "param": "budget", "op": "<", "value": 20 }`
> `flag.priceControl === true なら別のシーンへ` → `{ "flag": "priceControl", "value": true }`

**条件が省略されているフィールドは、常に真として扱う。**（`condition` 未指定＝無条件）

**「選択したこと」を条件にしたい場合はフラグを使う。**
`chose: "price-cap"` のような専用条件はあえて用意しない。選択肢の `effects` でフラグを立てれば同じことができ、
「意味のある選択だけが後に影響する」という意図がデータ上に明示されるため。

---

## 7. 効果（Effect）

```jsonc
// パラメータ操作
{ "param": "budget",     "op": "add", "value": -40 }   // 加算（負数で減算）
{ "param": "price",      "op": "mul", "value": 0.6 }   // 乗算
{ "param": "popularity", "op": "set", "value": 30 }    // 代入

// フラグ操作（value 省略時は true）
{ "flag": "priceControl", "value": true }
```

適用ルール:

1. 配列の**先頭から順に**適用する（同一パラメータへの複数効果は順序が意味を持つ）。
2. 各効果の適用後、`integer` が `false` でなければ四捨五入し、その後 `min` / `max` でクランプする。
3. `effects` は **決定的**。同じ状態 + 同じ効果 → 常に同じ結果。

### 適用されるタイミング

| 場所 | タイミング |
| --- | --- |
| `scene.onEnter` | そのシーンに**遷移した瞬間**に1回 |
| `choice.effects` | その選択肢を選んだ直後、`next` を解決する前 |
| `ending.effects` | （任意）エンディング確定時 |

> **セーブとの関係**: `onEnter` は遷移時に適用済みの状態が保存されるため、ロードで二重適用は起きない。
> 同じシーンに再訪した場合は再度適用される（仕様）。1回だけにしたいならフラグでガードする。

---

## 8. シーンと遷移

### 8.1 Scene

```jsonc
{
  "id": "after-price-cap",
  "background": "market-empty.png",
  "onEnter": [ { "param": "blackMarket", "op": "add", "value": 10 } ],
  "lines": [ /* Line[] */ ],
  "next": { /* Next */ }
}
```

| フィールド | 必須 | 説明 |
| --- | --- | --- |
| `id` | ✅ | シナリオ内で一意 |
| `lines` | ✅ | 台詞の配列（空配列可） |
| `next` | ✅ | 台詞を読み終えた後の遷移 |
| `onEnter` | | 入場時に適用する効果 |
| `background` | | 背景の論理パス（MVP では未使用でよい） |
| `bgm` | | BGM の論理パス（将来用） |

### 8.2 Line（台詞）

```json
{
  "id": "l3",
  "speaker": "aide",
  "expression": "worried",
  "text": "財政の余力は {{param.budget}} 億。……使い道を誤れば来年度が持ちません。",
  "condition": { "param": "budget", "op": "<", "value": 120 }
}
```

- `condition` を満たさない行は**その場でスキップ**される。シーンを分けずに細かい出し分けができる。
- `expression` は話者の `characters[].expressions` にある表情ラベルを指定する。省略時は
  `characters[].defaultExpression`、それもなければ `portrait` を使う。
- `id` は音声ファイルの対応付けに使う。**音声を付ける予定の行には必ず付ける**（配列の添字だと行の挿入でずれる）。
- `text` 内で `{{param.<id>}}` を使うと、表示時点の値に置換される。置換は**表示直前**に行う（保存されるのは元の文字列）。
  - 使えるのは `{{param.<id>}}` のみ。式は書けない。未定義 ID は検証エラー。
  - **音声を付ける行では `{{}}` を使わない**（事前生成できないため）。どうしても必要なら `voiceText` に置換なしの文面を書く。

### 8.3 Next（遷移）— 4種類

`next` は判別可能なユニオン。**`branch.then` が再び `Next` を取る**ので、これだけで任意の分岐が書ける。

```jsonc
// (1) 単純遷移
{ "type": "goto", "scene": "second-decision" }

// (2) 選択肢
{ "type": "choices", "prompt": "どの政策を実行しますか？", "choices": [ /* Choice[] */ ] }

// (3) 条件分岐（上から順に評価し、最初に一致した then を採用）
{
  "type": "branch",
  "branches": [
    { "when": { "flag": "priceControl" }, "then": { "type": "goto", "scene": "black-market-emerges" } },
    { "when": { "param": "supply", "op": "<", "value": 60 }, "then": { "type": "goto", "scene": "shortage-warning" } }
  ],
  "else": { "type": "goto", "scene": "second-decision" }
}

// (4) 終了
{ "type": "ending", "ending": "soft-landing" }   // エンディングを名指し
{ "type": "resolveEnding" }                      // endings を上から判定して自動選択
```

`branch` に一致がなく `else` もない場合は**検証エラー**（実行時に詰むのを防ぐため、`else` は必須とする）。

### 8.4 Choice（選択肢）

```json
{
  "id": "subsidy",
  "text": "パン屋へ補助金を出す",
  "description": "価格を据え置いたまま供給を支える。財政を 40 億消費する。",
  "condition": { "param": "budget", "op": ">=", "value": 40 },
  "ifUnmet": "disable",
  "unmetText": "財政が不足しています（40億必要）",
  "effects": [
    { "param": "budget", "op": "add", "value": -40 },
    { "param": "supply", "op": "add", "value": 20 },
    { "flag": "subsidy", "value": true }
  ],
  "next": { "type": "goto", "scene": "after-subsidy" }
}
```

| フィールド | 必須 | 説明 |
| --- | --- | --- |
| `id` | ✅ | シーン内で一意。履歴・統計に記録される |
| `text` | ✅ | ボタンの文言 |
| `next` | ✅ | 選択後の遷移（`Next` と同じ型。`branch` も書ける） |
| `condition` | | 満たさないときの扱いは `ifUnmet` による |
| `ifUnmet` | | `"hide"`（既定）: 存在ごと隠す / `"disable"`: 選択不可で表示 |
| `unmetText` | | `disable` 時に理由として表示する文言 |
| `description` | | 補足説明（トレードオフの提示に使う） |
| `effects` | | 選択直後に適用 |

**`hide` と `disable` の使い分け**:
- `disable` … 「その手はあるが、いま条件が足りない」ことを見せたい（例: 財政不足の補助金）。
- `hide` … 「まだ存在しない手」（例: 闇市場が生まれる前の取締り強化）。

**全選択肢が `hide` で消えた場合は検証・実行時ともにエラー**とする。各 `choices` には
無条件の選択肢を最低1つ含めること（検証で強制する）。

---

## 9. endings

```json
[
  {
    "id": "fiscal-crisis",
    "title": "支払えない約束",
    "rank": "bad",
    "condition": { "param": "budget", "op": "<", "value": 0 },
    "lines": [ { "id": "e1", "speaker": "narrator", "text": "パンは安かった。来年度の予算は、もうない。" } ],
    "summary": "価格は抑えたが、財政が破綻した。"
  },
  {
    "id": "muddle-through",
    "title": "とりあえずの均衡",
    "rank": "normal",
    "lines": [ { "id": "e1", "speaker": "narrator", "text": "劇的な解決はなかった。明日も店は開く。" } ],
    "summary": "決定打はないまま、都市はどうにか持ちこたえた。"
  }
]
```

| フィールド | 必須 | 説明 |
| --- | --- | --- |
| `id` `title` `lines` | ✅ | |
| `condition` | | `resolveEnding` 用。**上から順に評価し最初に一致したもの**を採用 |
| `rank` | | `good` / `normal` / `bad` / `true` など。UI の見せ方と実績用 |
| `summary` | | リザルト画面 / 共有用の1行 |
| `effects` | | 確定時に適用（統計用パラメータの記録など） |

**配列の最後の要素は `condition` を持ってはならない**（＝必ずどれかに落ちるフォールバック）。検証で強制する。
また、最後より前に条件なしの要素を置いてはならない。上から最初に一致した ending を採用するため、
後続の ending が遮蔽されて永久に評価されなくなる。

---

## 10. 完全な例（抜粋版）

そのまま動かせる最小構成。実際の第一作はこれを拡張する。

```json
{
  "formatVersion": 1,
  "meta": {
    "id": "bread-price",
    "title": "パンの値段を下げろ！",
    "version": "0.1.0",
    "locale": "ja-JP",
    "summary": "小麦不足でパン価格が高騰した都市。市長として、価格・供給・財政のバランスを取る。",
    "estimatedMinutes": 10
  },
  "characters": [
    { "id": "narrator", "name": "", "color": "#8a8a8a" },
    { "id": "aide", "name": "財政補佐官 リーゼ", "color": "#a5603b" }
  ],
  "parameters": [
    { "id": "popularity", "label": "支持率", "min": 0, "max": 100, "display": { "order": 1, "unit": "%", "goodDirection": "up" } },
    { "id": "budget", "label": "市財政", "min": -200, "max": 500, "display": { "order": 2, "unit": "億", "goodDirection": "up" } },
    { "id": "supply", "label": "パン供給量", "min": 0, "max": 200, "display": { "order": 3, "goodDirection": "up" } },
    { "id": "price", "label": "パン価格", "min": 0, "max": 2000, "display": { "order": 4, "unit": "円", "goodDirection": "down" } },
    { "id": "blackMarket", "label": "闇市場規模", "min": 0, "max": 100, "display": { "order": 5, "goodDirection": "down" } }
  ],
  "initialState": {
    "startScene": "intro",
    "params": { "popularity": 50, "budget": 100, "supply": 80, "price": 320, "blackMarket": 5 },
    "flags": { "priceControl": false, "subsidy": false }
  },
  "scenes": [
    {
      "id": "intro",
      "lines": [
        { "id": "l1", "speaker": "narrator", "text": "小麦の不作から三週間。市場のパンは平時の二倍の値をつけている。" },
        { "id": "l2", "speaker": "aide", "text": "市長。現在のパン価格は {{param.price}} 円。市民の我慢は限界です。" },
        { "id": "l3", "speaker": "aide", "text": "財政の余力は {{param.budget}} 億しかありません。", "condition": { "param": "budget", "op": "<", "value": 120 } }
      ],
      "next": { "type": "goto", "scene": "first-decision" }
    },
    {
      "id": "first-decision",
      "lines": [
        { "id": "l1", "speaker": "aide", "text": "最初の一手を、お決めください。" }
      ],
      "next": {
        "type": "choices",
        "prompt": "どの政策を実行しますか？",
        "choices": [
          {
            "id": "price-cap",
            "text": "価格上限規制を敷く",
            "description": "パンの上限価格を条例で定める。供給側の反発は避けられない。",
            "effects": [
              { "param": "price", "op": "mul", "value": 0.6 },
              { "param": "popularity", "op": "add", "value": 12 },
              { "param": "supply", "op": "add", "value": -25 },
              { "flag": "priceControl", "value": true }
            ],
            "next": { "type": "goto", "scene": "after-price-cap" }
          },
          {
            "id": "subsidy",
            "text": "パン屋へ補助金を出す",
            "description": "価格を据え置いたまま供給を支える。財政を 40 億消費する。",
            "condition": { "param": "budget", "op": ">=", "value": 40 },
            "ifUnmet": "disable",
            "unmetText": "財政が不足しています（40億必要）",
            "effects": [
              { "param": "budget", "op": "add", "value": -40 },
              { "param": "supply", "op": "add", "value": 20 },
              { "param": "price", "op": "add", "value": -60 },
              { "flag": "subsidy", "value": true }
            ],
            "next": { "type": "goto", "scene": "after-subsidy" }
          },
          {
            "id": "deregulate",
            "text": "輸入・流通規制を緩和する",
            "description": "他都市からの搬入を認める。効果が出るまで時間がかかる。",
            "effects": [
              { "param": "supply", "op": "add", "value": 30 },
              { "param": "price", "op": "add", "value": -40 },
              { "param": "popularity", "op": "add", "value": -5 }
            ],
            "next": { "type": "goto", "scene": "after-deregulate" }
          }
        ]
      }
    },
    {
      "id": "after-price-cap",
      "lines": [
        { "id": "l1", "speaker": "narrator", "text": "翌朝、値札は書き換えられた。そして棚は空になった。" },
        { "id": "l2", "speaker": "aide", "text": "供給量が {{param.supply}} まで落ちています。裏で売る者が出ています。" }
      ],
      "next": {
        "type": "branch",
        "branches": [
          {
            "when": { "param": "supply", "op": "<", "value": 60 },
            "then": { "type": "goto", "scene": "black-market-emerges" }
          }
        ],
        "else": { "type": "goto", "scene": "second-decision" }
      }
    },
    {
      "id": "black-market-emerges",
      "onEnter": [ { "param": "blackMarket", "op": "add", "value": 25 } ],
      "lines": [
        { "id": "l1", "speaker": "narrator", "text": "裏通りに、二倍の値でパンを売る列ができていた。" }
      ],
      "next": { "type": "goto", "scene": "second-decision" }
    },
    {
      "id": "after-subsidy",
      "lines": [ { "id": "l1", "speaker": "aide", "text": "店は開いています。ただ、金庫は軽くなりました。" } ],
      "next": { "type": "goto", "scene": "second-decision" }
    },
    {
      "id": "after-deregulate",
      "lines": [ { "id": "l1", "speaker": "aide", "text": "荷は動き始めました。市内の業者からは抗議が来ています。" } ],
      "next": { "type": "goto", "scene": "second-decision" }
    },
    {
      "id": "second-decision",
      "lines": [ { "id": "l1", "speaker": "aide", "text": "次の手を決める時間です。" } ],
      "next": {
        "type": "choices",
        "choices": [
          {
            "id": "crackdown",
            "text": "闇市場の取締りを強化する",
            "condition": { "param": "blackMarket", "op": ">=", "value": 20 },
            "ifUnmet": "hide",
            "effects": [
              { "param": "blackMarket", "op": "add", "value": -20 },
              { "param": "supply", "op": "add", "value": -10 },
              { "param": "popularity", "op": "add", "value": -8 }
            ],
            "next": { "type": "goto", "scene": "finale" }
          },
          {
            "id": "targeted-support",
            "text": "低所得世帯に限定して支援する",
            "condition": { "param": "budget", "op": ">=", "value": 25 },
            "ifUnmet": "disable",
            "unmetText": "財政が不足しています（25億必要）",
            "effects": [
              { "param": "budget", "op": "add", "value": -25 },
              { "param": "popularity", "op": "add", "value": 6 }
            ],
            "next": { "type": "goto", "scene": "finale" }
          },
          {
            "id": "wait",
            "text": "様子を見る",
            "description": "何もしない、という判断もまた判断である。",
            "effects": [ { "param": "popularity", "op": "add", "value": -4 } ],
            "next": { "type": "goto", "scene": "finale" }
          }
        ]
      }
    },
    {
      "id": "finale",
      "lines": [ { "id": "l1", "speaker": "narrator", "text": "一ヶ月が過ぎた。都市は、あなたの選んだかたちになっている。" } ],
      "next": { "type": "resolveEnding" }
    }
  ],
  "endings": [
    {
      "id": "fiscal-crisis",
      "title": "支払えない約束",
      "rank": "bad",
      "condition": { "param": "budget", "op": "<", "value": 0 },
      "lines": [ { "id": "e1", "speaker": "narrator", "text": "パンは安かった。来年度の予算は、もうない。" } ],
      "summary": "価格は抑えたが、財政が破綻した。"
    },
    {
      "id": "shortage-collapse",
      "title": "空の棚",
      "rank": "bad",
      "condition": {
        "all": [
          { "param": "supply", "op": "<", "value": 50 },
          { "param": "blackMarket", "op": ">=", "value": 40 }
        ]
      },
      "lines": [ { "id": "e1", "speaker": "narrator", "text": "値札の数字は小さい。だが、その値段で買えるパンは、どこにもない。" } ],
      "summary": "価格だけを見て、実体を失った。"
    },
    {
      "id": "soft-landing",
      "title": "静かな朝",
      "rank": "good",
      "condition": {
        "all": [
          { "param": "price", "op": "<=", "value": 250 },
          { "param": "supply", "op": ">=", "value": 90 },
          { "param": "popularity", "op": ">=", "value": 55 }
        ]
      },
      "lines": [ { "id": "e1", "speaker": "narrator", "text": "行列は消えた。誰もあなたに感謝しなかった。それが、うまくいったということだ。" } ],
      "summary": "供給を保ったまま価格を戻した。代償は、静かに支払われた財政だった。"
    },
    {
      "id": "muddle-through",
      "title": "とりあえずの均衡",
      "rank": "normal",
      "lines": [ { "id": "e1", "speaker": "narrator", "text": "劇的な解決はなかった。それでも、明日も店は開く。" } ],
      "summary": "決定打はないまま、都市はどうにか持ちこたえた。"
    }
  ]
}
```

---

## 11. TypeScript 型定義（`game-core/types/scenario.ts` の骨子）

この型がフォーマットの正本。JSON はこの型に**実行時検証**を通してから使う。

```ts
export type ComparisonOp = '==' | '!=' | '<' | '<=' | '>' | '>=';

export type Condition =
  | { param: string; op: ComparisonOp; value: number }
  | { flag: string; value?: boolean }
  | { visited: string }
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition };

export type Effect =
  | { param: string; op: 'add' | 'set' | 'mul'; value: number }
  | { flag: string; value?: boolean };

export type Next =
  | { type: 'goto'; scene: string }
  | { type: 'choices'; prompt?: string; choices: Choice[] }
  | { type: 'branch'; branches: Branch[]; else: Next }
  | { type: 'ending'; ending: string }
  | { type: 'resolveEnding' };

export interface Branch { when: Condition; then: Next; }

export interface Choice {
  id: string;
  text: string;
  description?: string;
  condition?: Condition;
  ifUnmet?: 'hide' | 'disable';
  unmetText?: string;
  effects?: Effect[];
  next: Next;
}

export interface CharacterDef {
  id: string;
  name: string;
  role?: string;
  color?: string;
  portrait?: string;
  defaultExpression?: string;
  expressions?: Record<string, string>;
  voice?: Record<string, string | number>;
}

export interface Line {
  id?: string;
  speaker: string;
  text: string;
  voiceText?: string;
  expression?: string;
  condition?: Condition;
}

export interface Scene {
  id: string;
  lines: Line[];
  next: Next;
  onEnter?: Effect[];
  background?: string;
  bgm?: string;
}

export interface ParameterDef {
  id: string;
  label: string;
  min?: number;
  max?: number;
  integer?: boolean;
  display?: {
    visible?: boolean;
    order?: number;
    unit?: string;
    goodDirection?: 'up' | 'down' | 'neutral';
  };
}

export interface Ending {
  id: string;
  title: string;
  lines: Line[];
  condition?: Condition;
  rank?: string;
  summary?: string;
  effects?: Effect[];
}

export interface Scenario {
  formatVersion: 1;
  meta: ScenarioMeta;
  characters: CharacterDef[];
  parameters: ParameterDef[];
  initialState: { startScene: string; params: Record<string, number>; flags: Record<string, boolean> };
  scenes: Scene[];
  endings: Ending[];
}
```

---

## 12. 検証ルール（ロード時 / CI で必ず実行）

**構造検証**（型どおりか）に加えて、以下の**参照整合性**を必ずチェックする。
シナリオはデータなので、間違いはコンパイルエラーではなくランタイムの詰みとして現れる。ここが品質の要。

1. `id` の重複がない（scenes / choices（シーン内）/ endings / parameters / characters / 同一scene内のlines）
2. すべての `goto.scene` / `branch` の遷移先 / `startScene` が実在する
3. すべての `ending.ending` 参照が実在する
4. 条件・効果が参照する `param` / `flag` がすべて宣言済み
5. `line.speaker` がすべて `characters` に存在する
6. `defaultExpression` / `line.expression` が話者の `expressions` に存在する
7. `{{param.x}}` の `x` がすべて宣言済み
8. `branch` に `else` がある
9. すべての `choices` に、条件なし（＝常に選べる）選択肢が1つ以上ある
10. `endings` の最後の要素に `condition` がなく、最後より前に条件なし ending がない
11. `initialState.params` が各パラメータ定義の `min` / `max` 内にある
12. 到達不能なシーンがない（`startScene` からのグラフ探索で警告）
13. `resolveEnding` または `ending` に到達しない経路がない（終端のないループの検出。警告）

---

## 13. 拡張ポイント（今は作らないが、塞がない）

| 将来の要求 | 拡張方法 | 破壊的変更か |
| --- | --- | --- |
| 立ち絵・表情 | `Line.expression`（既に定義済み）を UI が解釈するだけ | いいえ |
| 音声 | `Line.id` + `characters[].voice` から生成。マニフェスト参照 | いいえ |
| BGM / SE | `Scene.bgm`、`Line.se` を追加 | いいえ |
| パラメータ同士の比較 | `{ param, op, value: { param: "x" } }` のように `value` をユニオン化 | いいえ（後方互換） |
| ターン経過による自動変動 | `Scenario.rules: { onTurn: Effect[] }` を追加 | いいえ |
| 需給から価格を導出する式 | `derived: [{ id, from: [...], formula: ... }]` の新規セクション | いいえ |
| 乱数イベント | 状態に `rngSeed` を追加し、`{ type: 'random', weights: [...] }` を `Next` に追加 | いいえ |
| 多言語 | `text` を `{ ja: "...", en: "..." }` に。または `textKey` + 別ファイル | **はい**（`formatVersion: 2`） |

**ルール**: 破壊的変更をするときは `formatVersion` を上げ、旧バージョンのローダを残す。
