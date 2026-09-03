# アーキテクチャ設計書

対象: economic-choices / MVP 第一段階
最終更新: 2026-09-01

関連: [game-design.md](./game-design.md)（何を作るか） / [scenario-format.md](./scenario-format.md)（データ形式）

---

## 0. 結論サマリ

| 論点 | 結論 |
| --- | --- |
| モノレポにするか | **しない。** 単一 package.json + フォルダ分離 + 型/lint による境界強制 |
| ゲームロジックの置き場所 | `src/game-core/`（純粋 TypeScript。React / Next / DOM に非依存） |
| 分離の強制方法 | game-core 専用 tsconfig（`lib` から `DOM` を外す）+ ESLint の import 制限 |
| シナリオの置き場所 | リポジトリ直下 `scenarios/`（コードの外。ビルド時に静的 import + 実行時検証） |
| 状態管理 | 純粋関数 + 不変な `GameState`。React 側は `useReducer` で持つだけ |
| セーブ | `GameState` をそのまま JSON 化。保存先はインターフェース経由で差し替え |
| テスト | Vitest。game-core の単体テスト + シナリオ整合性検証 + 通しプレイテスト |
| 追加依存 | MVP では実質ゼロ（next / react / typescript / vitest / eslint のみ） |

---

## 1. モノレポは必要か

### 検討

現時点の「game-core の利用者」は **Next.js アプリ 1つだけ**。
将来増えるとしたら以下だが、いずれもモノレポを必要としない。

| 将来の利用者 | モノレポが要るか | 理由 |
| --- | --- | --- |
| 音声一括生成スクリプト | 不要 | 同一リポジトリの `scripts/` から相対 import すれば済む |
| Tauri デスクトップ版 | 不要 | Next.js の静的エクスポートをそのまま同梱する。**同じアプリ**であって別パッケージではない |
| シナリオ検証 CLI | 不要 | 同上 |

一方、モノレポには確実なコストがある: ワークスペース設定、ビルド順の管理、`tsconfig` project references、
パッケージ間の型解決、CI の複雑化、そして「どのパッケージに置くか」で毎回悩む時間。
MVP の目的（10分の短編を公開して反応を見る）に対して、これは投資として重い。

### 結論: 単一パッケージ + フォルダ分離

**モノレポの利点（境界の強制）は、フォルダ分離 + tsconfig + lint でほぼ再現できる。**
実際、game-core を DOM 非依存に保つ強制力は「別パッケージにすること」ではなく
「**その配下を DOM 型なしでコンパイルすること**」から来る（§4.3）。

### モノレポに移行すべきサイン

以下のどれかが起きたら移行する。移行コストは低い（`src/game-core/` を `packages/game-core/` に移して
`package.json` を足すだけ）。**フォルダ分離を守っている限り、いつでもできる。だから今はやらない。**

1. game-core を別リポジトリ / 他プロジェクトから使いたくなった
2. Web 版とデスクトップ版で UI が別アプリに分岐した
3. シナリオエディタが独立したアプリになった
4. game-core を npm パッケージとして公開する

---

## 2. レイヤと依存方向

```
┌──────────────────────────────────────────────┐
│  src/app, src/components   (React / Next.js)  │  画面・入力・演出
└───────────────┬──────────────────────────────┘
                │ 依存
┌───────────────▼──────────────────────────────┐
│  src/features/game        (React ↔ core 橋渡し)│  hooks / フォーマット
└───────┬───────────────────────┬───────────────┘
        │                       │
┌───────▼──────────────┐ ┌──────▼───────────────┐
│ src/platform/web     │ │  src/game-core       │  ★ 純粋 TypeScript
│  localStorage 保存   │ │   型・条件・効果      │    React / Next / DOM
│  アセットURL解決     │ │   遷移・検証・セーブ型 │    への依存を **禁止**
│  （IFの実装）        │ │   （IFの定義）        │
└──────────────────────┘ └──────────────────────┘
                                  ▲
                                  │ 読み込む（データ）
                          ┌───────┴────────┐
                          │  scenarios/*.json │
                          └──────────────────┘
```

**依存は必ず上から下へ。** game-core は誰にも依存しない（TypeScript 標準ライブラリのみ）。
プラットフォーム実装（localStorage 等）は game-core が定義した**インターフェースを実装する側**であり、
game-core から参照されることはない（依存性の逆転）。

---

## 3. ディレクトリ構造

```
economic-choices/
├── docs/
│   ├── game-design.md
│   ├── scenario-format.md
│   └── architecture.md
│
├── scenarios/                     ← シナリオデータ（コードの外側）
│   └── bread-price/
│       ├── scenario.json
│       └── README.md              （執筆メモ・変更履歴）
│
├── src/
│   ├── app/                       Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx               タイトル画面
│   │   └── play/page.tsx          ゲーム画面
│   │
│   ├── components/
│   │   ├── game/                  DialogueBox / ChoiceList / ParameterHud / EndingView
│   │   └── ui/                    汎用の小物
│   │
│   ├── features/game/
│   │   ├── useGameSession.ts      GameState を保持し core を呼ぶ hook
│   │   ├── useAutoSave.ts
│   │   └── format.ts              数値・単位の表示整形
│   │
│   ├── game-core/                 ★ 純粋 TypeScript レイヤ
│   │   ├── types/
│   │   │   ├── scenario.ts        Scenario / Scene / Choice / Condition / Effect
│   │   │   ├── state.ts           GameState / Cursor / HistoryEntry
│   │   │   └── view.ts            GameView（UI に渡す解決済みデータ）
│   │   ├── engine/                ★ scenario-engine
│   │   │   ├── conditions.ts      条件評価
│   │   │   ├── effects.ts         効果適用
│   │   │   ├── lines.ts           表示行の抽出・文字列補間
│   │   │   ├── transition.ts      Next の解決（goto / choices / branch / ending）
│   │   │   ├── session.ts         advance / choose / restart
│   │   │   └── view.ts            GameState → GameView の射影
│   │   ├── validate/
│   │   │   ├── schema.ts          構造検証
│   │   │   └── integrity.ts       参照整合性検証（未定義ID・到達不能など）
│   │   ├── save/
│   │   │   ├── format.ts          SaveData 型・シリアライズ・バージョン移行
│   │   │   └── storage.ts         SaveStorage インターフェース定義のみ
│   │   ├── tsconfig.json          ★ DOM 型を外した設定（§4.3）
│   │   └── index.ts               公開 API（バレル）
│   │
│   ├── platform/
│   │   └── web/
│   │       ├── localStorageSave.ts   SaveStorage の Web 実装
│   │       └── assetResolver.ts      論理パス → URL
│   │
│   └── content/
│       └── scenarios.ts           シナリオの静的 import・登録とシリーズ catalog metadata
│
├── tests/
│   ├── engine/                    game-core の単体テスト
│   ├── fixtures/                  game-core 専用の小型シナリオ
│   ├── scenario/                  本番シナリオとvalidatorの検証
│   └── playthrough/               通しプレイテスト
│
├── eslint.config.mjs
├── next.config.ts
├── tsconfig.json
├── vitest.config.ts
└── package.json
```

> **命名について**: ドキュメント上の「game-core」と「scenario-engine」は概念上の2層だが、
> 物理的には `src/game-core/` の `types/state.ts` と `engine/` に対応させる。
> パッケージを分けるほどの独立性はまだない。

---

## 4. game-core の責務

### 4.1 やること

1. **シナリオデータの型定義と検証** — 不正な JSON をアプリに入れない
2. **ゲーム状態の保持形式の定義** — `GameState`（純粋な JSON 値のみ）
3. **状態遷移** — 台詞送り、選択の適用、分岐解決、エンディング判定
4. **条件評価と効果適用** — クランプ・丸めを含む
5. **表示用データの射影** — `GameState` + `Scenario` → `GameView`
6. **セーブデータの形式とバージョン移行** — 保存**先**は知らない

### 4.2 やらないこと（禁止事項）

- React / Next.js の import
- `window` `document` `localStorage` `fetch` `navigator` などのブラウザ API
- `Date.now()` / `Math.random()` の**直接**使用（必要なら引数で受け取る）
- ファイル I/O、ネットワーク
- CSS / 色以外の見た目に関する決定（色は `characters[].color` としてデータ側にある）

> `Date.now()` と `Math.random()` を禁じる理由は、テストの決定性のため。
> 「同じ state + 同じ入力 → 常に同じ出力」を保つと、通しプレイテストが安定し、リプレイ・巻き戻し・
> 将来のデバッグ機能がすべて楽になる。時刻が必要なセーブ処理では、呼び出し側が `savedAt` を渡す。

### 4.3 境界の強制方法（重要）

**(a) game-core 専用 tsconfig で DOM 型を外す** — これが一番効く。

```jsonc
// src/game-core/tsconfig.json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "lib": ["ES2022"],        // DOM を含めない → window/document が型エラーになる
    "types": [],              // @types/node も入れない → process/fs も型エラー
    "noEmit": true
  },
  "include": ["./**/*.ts"]
}
```

`pnpm check:core` (= `tsc -p src/game-core/tsconfig.json`) を CI に入れる。
**うっかり `document.querySelector` を書いた瞬間にビルドが落ちる。**

**(b) ESLint で import を禁じる**

```js
// eslint.config.mjs（抜粋）
{
  files: ['src/game-core/**/*.ts'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: ['react', 'react-dom', 'next', 'next/*', '@/app/*', '@/components/*', '@/features/*', '@/platform/*']
    }]
  }
}
```

### 4.4 公開 API（`src/game-core/index.ts`）

```ts
// --- 読み込み・検証 ---
export function validateScenario(raw: unknown): ValidationResult;   // { ok, errors[], warnings[] }
export function loadScenario(raw: unknown): Scenario;               // 失敗時は ScenarioError を throw

// --- 進行（すべて純粋関数。GameState は不変。新しい state を返す） ---
export function createInitialState(scenario: Scenario): GameState;
export function advance(scenario: Scenario, state: GameState): GameState;              // 台詞送り
export function choose(scenario: Scenario, state: GameState, choiceId: string): GameState;
export function restart(scenario: Scenario): GameState;

// --- 表示 ---
export function getView(scenario: Scenario, state: GameState): GameView;

// --- 部品（テスト・将来のツール用に公開） ---
export function evaluateCondition(state: GameState, cond: Condition): boolean;
export function applyEffects(scenario: Scenario, state: GameState, effects: Effect[]): GameState;

// --- セーブ ---
export function toSaveData(state: GameState, meta: { savedAt: string; label?: string }): SaveData;
export function fromSaveData(scenario: Scenario, data: SaveData): LoadResult; // 互換性チェックつき
export type { SaveStorage } from './save/storage';
```

**UI から呼ぶのはこれだけ。** 内部モジュールを直接 import させない。

### 4.5 GameState

```ts
export type Cursor =
  | { phase: 'line';   sceneId: string; lineIndex: number }
  | { phase: 'choice'; sceneId: string; nextPath: NextPathStep[] }
  | { phase: 'ending'; endingId: string; lineIndex: number };

export type NextPathStep =
  | { type: 'branch'; index: number }
  | { type: 'choice'; id: string };

export interface HistoryEntry {
  type: 'scene' | 'choice';
  sceneId: string;
  choiceId?: string;
  deltas?: Record<string, number>;
}

export interface ChoiceHistoryEntry {
  sceneId: string;
  choiceId: string;
  text: string;
  deltas: Record<string, number>;
}

export interface GameState {
  scenarioId: string;
  scenarioVersion: string;
  cursor: Cursor;
  currentSceneId: string;
  parameters: Record<string, number>;
  flags: Record<string, boolean>;
  visitedScenes: string[];        // Set ではなく配列（JSON 化のため）
  history: HistoryEntry[];        // バックログ・リザルト・統計の材料
  choiceHistory: ChoiceHistoryEntry[]; // エンディング画面に表示する選択履歴
  reachedEndings: string[];       // 到達済みエンディング ID
  lastDeltas: Record<string, number>;  // 直前の変化量（HUD の差分表示用）
  finished: boolean;
}
```

`Cursor.nextPath` は、現在のシーンの `next` を起点に、どの `choice` と `branch` を通って
入れ子の選択肢へ到達したかを記録する。これにより、branch や入れ子 choices 内で選択待ち状態を
正確にセーブ／復元できる。

`currentSceneId` は UI・履歴で参照しやすいよう維持する。`line` / `choice` フェーズでは
`cursor.sceneId` と常に同じ値にし、セーブ復元時にも一致を検証する。`ending` フェーズでは
Cursor が `endingId` を持つため、`currentSceneId` は直前のシーン ID を保持する。

**制約**: `GameState` に入れてよいのは JSON プリミティブ / 配列 / プレーンオブジェクトのみ。
`Date` `Map` `Set` `undefined` `class` インスタンスを入れない。
→ `JSON.parse(JSON.stringify(state))` が完全に等価であること。これをテストで保証する（§11）。

### 4.6 進行モデルの不変条件

`advance()` の動作:

1. 現在シーンの**表示対象行**（`condition` を満たす行）がまだ残っていれば `lineIndex + 1`
2. 行を使い切ったら `scene.next` を解決する
   - `goto` / `branch` → 遷移先シーンへ。`onEnter` 効果を適用し、`visitedScenes` に追加し、`lineIndex = 0`
     （遷移先の表示行が 0 行なら、そのまま次の遷移を続けて解決する）
   - `choices` → `phase: 'choice'` になり、`advance()` はそれ以上進めない（`choose()` 待ち）
   - `ending` / `resolveEnding` → `phase: 'ending'`
3. 無限ループ防止: 1回の `advance()` での連続遷移に上限（例 64 回）を設け、超えたら `EngineError`

**不変条件: シーンの台詞を読んでいる間、パラメータとフラグは変化しない。**
効果が適用されるのは `onEnter`（入場時）と `choice.effects`（選択時）のみ。
これにより「行の表示条件」がシーン内で揺れず、表示行の集合が安定する。
（将来、行単位の効果が欲しくなったら、この不変条件を壊すことになるので慎重に判断する。）

---

## 5. scenario-engine の責務

`src/game-core/engine/` に置く、**シナリオデータの解釈**そのもの。

| モジュール | 責務 | 純度 |
| --- | --- | --- |
| `conditions.ts` | `Condition` を `GameState` に対して真偽値へ評価する | 純粋関数 |
| `effects.ts` | `Effect[]` を適用し、クランプ・丸め・差分を返す | 純粋関数 |
| `transition.ts` | `Next` を解決して次の `Cursor` を決める（`branch` の再帰含む） | 純粋関数 |
| `session.ts` | 上記を組み合わせて `advance` / `choose` / `restart` を提供 | 純粋関数 |
| `view.ts` | 表示行のフィルタ、`{{param.x}}` 補間、選択肢の可視/活性判定 | 純粋関数 |

Effect は配列順に1件ずつ適用する。各パラメータ効果は演算後、`integer !== false` なら四捨五入し、
その後に `min` / `max` でクランプする。`lastDeltas` には正規化前の値ではなく、実際に状態へ
反映された値と直前値との差を累積する。

**設計上の要点:**

- **シナリオ固有の分岐をここに書かない。** `if (choiceId === 'price-cap')` のようなコードが1行でも現れたら設計の失敗。
  エンジンが知ってよいのは「`Condition` という構造」「`Effect` という構造」までで、`budget` や `priceControl` という
  名前を知ってはならない。
- **`eval` / `new Function` を使わない。** 条件はデータ構造のまま評価する。
  （安全性の他に、将来 MOD で外部シナリオを読む際に致命的な穴を作らないため。）
- **`view.ts` は「UI が判断しなくて済む形」まで解決する。**
  UI 側に「この選択肢を出すべきか」を判断させない。`GameView.choices[i].enabled` を見るだけで描画できる状態にする。

```ts
export interface GameView {
  phase: 'line' | 'choice' | 'ending';
  background?: string;
  speaker: { id: string; name: string; role?: string; color?: string } | null;
  text: string;                 // {{param.x}} 補間済み
  canAdvance: boolean;
  prompt?: string;
  choices: ChoiceView[];        // phase==='choice' のときのみ非空
  params: ParamView[];          // 表示順・単位・直前の増減つき
  ending?: { id: string; title: string; rank?: string; summary?: string };
}

export interface ChoiceView {
  id: string;
  text: string;
  description?: string;
  enabled: boolean;             // false でも表示する（ifUnmet: 'disable'）
  unmetText?: string;
}
```

---

## 6. Web UI の責務

### やること

- 画面の描画とレイアウト、レスポンシブ対応
- 入力の受付（クリック / タップ / キーボード）→ `advance()` / `choose()` の呼び出し
- 演出（フェード、パラメータ増減のアニメーション）
- オートセーブの発火タイミングの決定
- エラー表示（シナリオ読み込み失敗、セーブ互換性の警告）

### やらないこと

- **ゲームのルール判断を一切しない。** 条件判定、パラメータ計算、分岐、エンディング決定は
  すべて game-core が済ませた `GameView` を描画するだけ。
- `characters[].role` は表示専用 metadata として `SpeakerView` へ射影し、存在する場合だけ人物名と併記する。
  `GameState` やセーブデータには保持しない。
- シナリオ ID やパラメータ ID をコンポーネントにハードコードしない
  （`params.map()` で回す。`popularity` という文字列が `components/` に現れたら赤信号）。

### 状態の持ち方

```ts
// src/features/game/useGameSession.ts（概略）
export function useGameSession(scenario: Scenario) {
  const [state, dispatch] = useReducer(reducer, scenario, createInitialState);
  const view = useMemo(() => getView(scenario, state), [scenario, state]);
  return {
    view,
    advance: () => dispatch({ type: 'advance' }),
    choose: (id: string) => dispatch({ type: 'choose', id }),
    restart: () => dispatch({ type: 'restart' }),
    state,   // セーブ用
  };
}
```

reducer の中身は `advance(scenario, state)` を呼ぶだけ。**ロジックは reducer にも書かない。**
状態管理ライブラリ（Redux / Zustand 等）は入れない — 状態は 1 つの不変オブジェクトで、
更新関数は既に純粋なので、`useReducer` で足りる。

### ページ構成

- `/` … シリーズホーム（scenario catalog / はじめから / つづきから）
- `/play` … ゲーム本体（クライアントコンポーネント）
- `output: 'export'`（静的エクスポート）で動く範囲に留める。Server Actions / Route Handlers / ISR は使わない
  → Tauri へそのまま持っていける（§10）

---

## 7. セーブシステム

### 7.1 形式

```ts
export interface SaveData {
  saveVersion: 1;              // セーブ形式の世代
  scenarioId: string;
  scenarioVersion: string;     // シナリオ側の semver
  savedAt: string;             // ISO8601 文字列（Date オブジェクトは持たない）
  label?: string;              // 「第2章 / 支持率 62%」など表示用
  state: GameState;
}
```

保存キー: `economic-choices:save:<scenarioId>:<slot>`
スロット: `auto` + `1` `2` `3`（MVP は `auto` と `1` だけでもよい）

### 7.2 保存先の抽象化

game-core は**インターフェースだけ**を持つ。実装は `src/platform/` に置いて注入する。

```ts
// src/game-core/save/storage.ts —— 定義のみ。実装を持たない
export interface SaveStorage {
  list(): Promise<SaveSlotInfo[]>;
  load(slot: string): Promise<SaveData | null>;
  save(slot: string, data: SaveData): Promise<void>;
  remove(slot: string): Promise<void>;
}
```

**localStorage は同期 API だが、あえて `Promise` を返す設計にする。**
Tauri のファイル API は非同期であり、後から同期 → 非同期へ変えるのは呼び出し側全体の変更になるため。

| プラットフォーム | 実装 |
| --- | --- |
| Web (MVP) | `localStorage`。JSON 文字列として保存 |
| Tauri | アプリデータディレクトリへの JSON ファイル書き込み |
| Steam | 上記 + Steam Cloud 同期対象ディレクトリ |

### 7.3 互換性の扱い

ロード時に 3 段階で判定する。

| 状況 | 挙動 |
| --- | --- |
| `saveVersion` が古い | 移行関数を通す（`migrations[1→2]`）。移行不能なら破棄して通知 |
| `scenarioVersion` が違う | 読み込みを試みる。`state.cursor` のシーン ID が存在しなければ最初から |
| 参照先のシーン/選択肢が消えている | 「シナリオが更新されたため最初から」と明示して初期化 |

セーブは**壊れることを前提**に扱う。`JSON.parse` の失敗、想定外の形、null をすべて握って
「セーブが読めなかった」と表示し、ゲームを起動不能にしない。

### 7.4 オートセーブのタイミング

- シーン遷移が完了した直後（`phase: 'line'` かつ `lineIndex === 0` になった時）
- 選択を確定した直後
- エンディング到達時

台詞送りのたびに保存しない（書き込み過多を避ける）。

---

## 8. アセット管理

### 8.1 原則: シナリオに URL を書かない

シナリオが持つのは**論理パス**のみ（`aide/worried.png`、`market.png`）。
URL への変換はプラットフォーム層の責務。

```ts
// src/game-core/types/… インターフェース定義
export interface AssetResolver {
  image(logicalPath: string): string;
  audio(logicalPath: string): string;
}

// src/platform/web/assetResolver.ts
export const webAssets: AssetResolver = {
  image: (p) => `/images/${p}`,
  audio: (p) => `/voice/${p}`,
};
// Tauri では convertFileSrc() を使った実装に差し替える
```

### 8.2 MVP でのプレースホルダー

- 背景 … CSS のグラデーション。`scene.background` の文字列をハッシュして色相を決めると、
  シーンが変わったことが視覚的に伝わる（画像を用意する前でも「場面が変わった感」が出る）。
- 立ち絵 … 描画しない。話者名の色付きラベルのみ（`characters[].color`）。
- 画像を追加するときに**シナリオ側の変更が不要**であること（既に `portrait` / `background` の
  フィールドが定義済み）を確認しておく。

### 8.3 配置

| 種類 | 置き場所 | 備考 |
| --- | --- | --- |
| 画像 | `public/images/<scenarioId>/...` | Git 管理。大きくなったら LFS を検討 |
| 音声 | `public/voice/<scenarioId>/...` | **生成物なので Git 管理しない**（`.gitignore`）。マニフェストのみ管理 |
| シナリオ | `scenarios/<id>/scenario.json` | Git 管理。差分レビューの対象 |

---

## 9. 将来: AivisSpeech 連携

### 方針

**シナリオデータから台詞を抽出して、一括生成 → 静的ファイルとして配信。**
実行時に音声合成エンジンを呼ばない（Web 版でエンジンを前提にできないため）。

### 仕組み

```
scenarios/bread-price/scenario.json
        │
        │  scripts/generate-voice.ts
        ▼
  1. 全 Line を走査（scenes[].lines[] と endings[].lines[]）
  2. speaker → characters[].voice（speakerId / styleId）を解決
  3. 読み上げ文字列 = line.voiceText ?? line.text
  4. キー = `${scenarioId}/${sceneId}/${line.id}`
  5. ハッシュ = sha1(読み上げ文字列 + speakerId + styleId + engineVersion)
     → manifest に同じハッシュがあればスキップ（差分生成）
  6. AivisSpeech Engine (localhost:10101) へ audio_query → synthesis
  7. public/voice/<scenarioId>/<sceneId>/<lineId>.wav と manifest.json を出力
```

```jsonc
// public/voice/bread-price/manifest.json
{
  "scenarioId": "bread-price",
  "generatedAt": "2026-09-01T00:00:00Z",
  "engine": { "name": "aivisspeech", "version": "x.y.z" },
  "entries": {
    "intro/l2": { "file": "intro/l2.wav", "hash": "…", "durationMs": 3240 }
  }
}
```

### 今のうちに決めておくこと（実装は後でよい）

1. **`Line.id` を音声対象の行に必ず付ける。** 配列の添字をキーにすると、行を1つ挿入した瞬間に全部ずれる。
2. **音声を付ける行では `{{param.x}}` を使わない。** 値が実行時に決まる文は事前生成できない。
   どうしても必要なら `voiceText` に数値を含まない文面を書く（例: 表示「価格は {{param.price}} 円」/
   音声「価格は、ご覧のとおりです」）。→ この制約は [scenario-format.md](./scenario-format.md) §8.2 に記載済み。
3. **音声は生成物。** Git に入れず、ビルド時 or リリース時に生成する。`manifest.json` だけは管理する。
4. **音声がなくてもゲームは完全に動く。** マニフェストに該当キーがなければ無音で進む。

---

## 10. 将来: Tauri / Steam 対応

### 移植の形

```
Next.js (output: 'export')  →  静的な HTML/JS/CSS  →  Tauri の frontendDist に同梱
```

game-core とシナリオはそのまま。差し替えるのは `src/platform/` 配下だけ。

### そのために MVP で守ること（再掲・厳守）

1. game-core に DOM / Node API を持ち込まない（§4.3 の tsconfig で機械的に強制）
2. Next.js のサーバー機能を使わない（Server Actions / Route Handlers / ISR / `next/image` の最適化サーバー）
3. `GameState` を純粋な JSON に保つ
4. アセットを URL 直書きしない
5. 保存 API を非同期インターフェースにしておく

### 移植時に新規実装が必要なもの

| 項目 | 内容 |
| --- | --- |
| セーブ | `SaveStorage` のファイルシステム実装 |
| アセット解決 | `AssetResolver` の Tauri 実装（`convertFileSrc`） |
| ウィンドウ | フルスクリーン切替、解像度、終了確認 |
| Steam 実績 | Rust 側で Steamworks を叩き、フロントから invoke。**エンディング ID / `rank` を実績キーにできるよう、ID を安定させておく** |
| Steam Cloud | セーブディレクトリを同期対象に指定 |
| MOD（任意） | 外部の `scenario.json` を読み込む。**検証（§12）を必ず通す。`eval` を使っていないことがここで効く** |

---

## 11. テスト方針

### 前提

**UI ではなくロジックをテストする。** game-core が純粋関数の集まりなので、
テストは「入力の state と scenario を作って、出力の state を assert する」だけになる。
DOM もモックも要らない。ここが分離の最大の見返り。

### ツール

**Vitest** を使う（TS をそのまま実行でき、設定がほぼ不要、Next.js と共存できる）。
MVP では React コンポーネントのテストは書かない。E2E（Playwright）はフェーズ2以降。

game-core の単体テストは `tests/fixtures/` の小型シナリオだけを使う。`bread-price` の実データを
直接使うのは、本番シナリオvalidationと通しプレイの統合テストに限定する。これにより本番の
数値バランスやシーン ID の変更を、エンジン仕様の破壊と誤認しない。

### テストの層

| 層 | 対象 | 内容 |
| --- | --- | --- |
| 単体 | `conditions.ts` | 全演算子、`all`/`any`/`not`、空配列（`all: []` は true / `any: []` は false）、未定義パラメータ |
| 単体 | `effects.ts` | `add` / `set` / `mul`、クランプ、丸め、適用順序、差分計算 |
| 単体 | `transition.ts` | `goto` / `branch`（`else` へ落ちる場合含む）/ `resolveEnding` の順序、上限超過で `EngineError` |
| 単体 | `view.ts` | 行の条件フィルタ、`{{param.x}}` 補間、`hide` / `disable` の判定 |
| 単体 | `save/format.ts` | **JSON ラウンドトリップ**（`fromSaveData(toSaveData(s))` が完全一致）、バージョン不一致時の挙動 |
| 統合 | シナリオ検証 | `scenarios/` の全 JSON が §12 の全ルールを通ること（**CI 必須**） |
| 統合 | 通しプレイ | 選択肢 ID の列を与えて `advance`/`choose` を回し、期待するエンディング ID に到達すること |

### 通しプレイテストの形（これが一番効く）

```ts
// tests/playthrough/bread-price.test.ts
const CASES = [
  { name: '価格統制で供給崩壊', choices: ['price-cap', 'wait'],       ending: 'shortage-collapse' },
  { name: '補助金で軟着陸',     choices: ['subsidy', 'targeted-support'], ending: 'soft-landing' },
  { name: '無策',               choices: ['deregulate', 'wait'],      ending: 'muddle-through' },
];

test.each(CASES)('$name', ({ choices, ending }) => {
  const s = playThrough(scenario, choices);      // advance を繰り返し、choice 待ちで次を選ぶヘルパ
  expect(s.cursor).toMatchObject({ phase: 'ending', endingId: ending });
});
```

シナリオを書き換えるたびにこれが落ちる = **意図しない分岐の変化に気づける**。
エンディングを追加したらケースを追加する、を運用ルールにする。

### CI

```
pnpm typegen           # Next.js の型を生成（next-env.d.ts はGit管理しない）
pnpm check:core        # game-core を DOM 型なしで型チェック
pnpm typecheck         # 全体の型チェック
pnpm lint
pnpm test              # Vitest（シナリオvalidationを含む）
pnpm build             # next build（static export）
```

---

## 12. シナリオ検証をどう実装するか

[scenario-format.md](./scenario-format.md) §12 の 11 ルールを実装する。

**判断: MVP では検証を手書きする（Zod 等を入れない）。**

理由:
- ルールの過半（未定義 ID 参照、到達不能シーン、`else` の欠落、フォールバックエンディングの有無）は
  **スキーマライブラリでは表現できない**。どのみち手書きのグラフ検査コードが要る。
- 型の正本は `types/scenario.ts` の `interface` にする。JSON は `unknown` として受け取り、
  検証を通したら `Scenario` として扱う（検証関数を型ガードにする）。
- 依存を1つも増やさずに済む。

再検討の条件: フォーマットが v2 で大きく複雑化した場合、または外部 MOD シナリオを受け入れる段階になった場合は
Zod（または JSON Schema）による構造検証の導入を検討する。

エラーは「どこが悪いか」を JSON パスで示す:
`scenes[3].next.branches[0].then.scene: 未定義のシーン "after-rationing" を参照しています`

---

## 13. 依存パッケージの方針

### MVP で入れるもの

| パッケージ | 用途 |
| --- | --- |
| `next` / `react` / `react-dom` | Web UI |
| `typescript` / `@types/*` | 型 |
| `vitest` | テスト |
| `eslint` / `eslint-config-next` | 静的検査 |

### 入れないもの（と、その理由）

| 候補 | 判断 |
| --- | --- |
| 状態管理ライブラリ（Redux / Zustand / Jotai） | 状態は不変な単一オブジェクト。`useReducer` で足りる |
| Zod / Yup | §12 のとおり、どのみち手書き検証が要る |
| アニメーションライブラリ | MVP の演出は CSS transition で足りる |
| UI コンポーネントライブラリ | 画面数が少なく、ノベルゲーム特有のレイアウトなので恩恵が薄い |
| ノベルゲームエンジン（Ren'Py / Tyrano 等） | 経済パラメータの扱いとデスクトップ移植方針が合わない。自作の方針を維持 |

**原則: game-core には実行時依存を1つも入れない。** ここが依存ゼロであることが、移植性の担保そのもの。
