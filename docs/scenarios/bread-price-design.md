# 「パンの値段を下げろ！」本番シナリオ設計書

対象: economic-choices 第一作 / `scenario.json` 実装前の設計正本
最終更新: 2026-09-02
準拠: [scenario-format.md](../scenario-format.md) `formatVersion: 1`

このドキュメントは、`scenarios/bread-price/scenario.json` へ機械的に変換するための完成設計である。
**台詞は本番稿**であり、プレースホルダーではない。実装時はこの文書を正本とし、差異が出たらこちらを先に直す。

---

## 1. 作品コンセプト

### 中心にある問い

> **「価格を下げることと、商品を豊富にすることは、同じだろうか？」**

### 副テーマ

> **「合法な価格」「実際に払われる価格」「実際に手に入るかどうか」は、同じではない。**

### 舞台

人口およそ12万人の地方都市。小麦の不作と輸送費の上昇が重なり、
食パン一斤の店頭価格が **平時の120〜150円から240円前後** へ上がっている。
プレイヤーは就任4か月目の市長。1年のあいだに3回、政策を決める。

### 本作が取らない立場

この作品は、次のいずれの主張もしない。

- 「市場に任せれば全部解決する」
- 「政府が介入すれば必ず失敗する」
- 「価格統制を支持する人は経済を知らない」
- 「非公式市場は犯罪者の集まりである」
- 「商人は社会のために働く善人である」

**どの政策にも、短期的な利益と、遅れて来る代償を必ず両方持たせる。**
反対の立場を取る人物を、無知にも悪人にも描かない。
市場側の人物（黒田）も善人として美化せず、採算で動く普通の商売人として描く。

### 設計上の中核: 同じ価格政策でも結末が二つに割れる

本作の主張は、次の**対比**によって数値で示される（§14 の到達検証より）。

| 経路 | 公定価格 | 正規供給 | 非公式市場 | **foodAccess** | エンディング |
| --- | --- | --- | --- | --- | --- |
| 価格統制 → 維持 → **非公式市場を黙認** → 恒久化 | 160円 | 16 | 66 | **57** | 表の市場、裏の市場 |
| 価格統制 → 維持 → **非公式市場を摘発** → 恒久化 | 160円 | 18 | 34 | **27** | 安いパン、空の棚 |

**同じ価格、ほぼ同じ正規供給。それでも市民が実際に食べられる度合いは 2 倍以上違う。**
価格の数字だけを見ていると、この差は見えない。これが本作の設計の芯である。

---

## 2. パラメータ定義

| id | 表示名 | 範囲 | 初期値 | 単位 | goodDirection | 表示 |
| --- | --- | --- | --- | --- | --- | --- |
| `popularity` | 支持率 | 0–100 | 50 | % | `up` | 表示 |
| `budget` | 政策余力 | 0–100 | 100 | — | `up` | 表示 |
| `supply` | 正規市場の供給 | 0–120 | 60 | — | `up` | 表示 |
| `price` | 正規店頭価格 | 0–600 | 240 | 円 | **`neutral`** | 表示 |
| `informalMarket` | 非公式市場の規模 | 0–100 | 5 | — | **`neutral`** | 表示 |
| `foodAccess` | 食料入手のしやすさ | 0–100 | 55 | — | `up` | 表示 |
| `marketRisk` | 取引上の不確実性 | 0–100 | 10 | — | `down` | 表示 |
| `policyChanges` | 政策転換回数 | 0–10 | 0 | 回 | `neutral` | **非表示** |

### 各パラメータの意味（実装者・執筆者向けの定義）

**`price` — 正規市場での一般的な店頭価格。**
価格上限規制がある場合は**公定価格／合法的店頭価格**を表す。
非公式市場で実際に支払われている価格は、この値には含まれない。

**`supply` — 正規の店舗・流通経路でどれだけ商品が流れているか。**
社会全体の食料アクセスそのものではない。ここが 20 でも、
非公式市場が機能していれば市民は食べられている場合がある。

**`informalMarket` — 非公式市場の規模。**
規制価格を超えた販売、個人間取引、転売、無許可販売、地域間の非公式流通を含む。
**この値そのものに善悪の評価を持たせない。** 高いことは、良くも悪くもない。
正規市場が供給できないとき、非公式市場は食料アクセスを**改善する**ことがある。

**`foodAccess` — 市民が実際にパン・食料を入手できている度合い。本作で最も重要な指標。**
正規供給 + 非公式供給 − 価格負担、をおおまかに表す。
「公定価格150円・正規供給30・informalMarket 50・foodAccess 65」という状態は成立する。

**`marketRisk` — 非公式市場における取引上の不確実性。**
品質保証の弱さ、販売者の素性の分かりにくさ、返品・契約保護の弱さ、衛生の確認しにくさ、
詐欺的商品が混ざる可能性を表す。**犯罪度ではない。**
`informalMarket` が大きいほど `marketRisk` も自動的に高い、という設計にはしない。
本作では「非公式市場 66 / marketRisk 27」という**規模が大きく比較的秩序だった**状態も、
「非公式市場 34 / marketRisk 15」という状態も、どちらも成立する。

**`policyChanges` — 大きな政策転換の回数。通常は非表示。**
制度の予測可能性を測る内部指標。**一度の合理的な政策転換では不利益を出さない。**
3回以上かつ支持率が低い場合にのみ、専用エンディングへ分岐する。

### ⚠ `price` の goodDirection を `neutral` にする理由

UI は `goodDirection` を使って増減を「良い変化／悪い変化」に色分けする。
`price` を `down`（＝安いほど良い）にすると、**UI が本作のテーマと正反対の主張をしてしまう。**
価格が下がった瞬間に画面が緑になり、その裏で `supply` と `foodAccess` が落ちていることが
相対的に弱く見える。`informalMarket` も同様の理由で `neutral` とする。

---

## 3. フラグ定義

すべて `initialState.flags` に `false` で宣言する（フォーマット上、未宣言フラグの使用は検証エラー）。

### 現在の制度状態（今どうなっているか）

| フラグ | 意味 |
| --- | --- |
| `priceCapActive` | 価格上限規制が現在有効 |
| `subsidyActive` | パン屋への補助金が現在有効 |
| `deregulated` | 流通・参入規制の緩和が行われている |
| `targetedSupportActive` | 困窮世帯への限定支援が現在有効 |
| `rationingActive` | 購入量制限（配給制）が現在有効 |
| `informalTolerated` | 非公式の食品取引を当面黙認している |
| `crackdownActive` | 非公式取引の摘発を実施した |
| `permanentized` | 緊急措置を恒久制度化した |

### 履歴（過去に一度でもやったか）— 台詞とエンディングの出し分けに使う

| フラグ | 意味 |
| --- | --- |
| `everPriceCap` / `everSubsidy` / `everDeregulate` | 各政策を一度でも実施した |
| `everTargetedSupport` / `everRationing` / `everCrackdown` / `everTolerated` | 同上 |
| `everReversed` | 一度でも政策を撤回・転換した |

### 内部区別フラグ

| フラグ | 意味 |
| --- | --- |
| `illicitGoodsAppeared` | **非公式な食品取引とは別に**、明確に規制対象の商品が同じ流通網に混じり始めた |

> **重要**: `illicitGoodsAppeared` は `informalMarket` の大きさとは独立に扱う。
> 「非公式食品市場が育ったから必ず犯罪市場になる」とは描かない。
> このフラグが立つのは **黙認を選び、市が線引きを明示しなかった場合のみ**であり、
> 摘発ルートや価格緩和ルートでは立たない。

---

## 4. 登場人物

| id | 名前 | 色 | 役割 | 話し方 |
| --- | --- | --- | --- | --- |
| `narrator` | （地の文） | `#9aa3b5` | 状況描写 | 短い断定文。感情を説明しない |
| `misaki` | 佐藤 美咲 | `#7fb2e5` | 市民代表・二児の母 | 生活の具体。「今日食べられるか」 |
| `yamada` | 山田 浩一 | `#d9a05b` | 家族経営のパン屋（三代目） | 淡々。職人の言い方。愚痴らない |
| `kuroda` | 黒田 誠 | `#9b8ec4` | 食品卸 | 短くドライ。採算の話を隠さない |
| `takahashi` | 高橋 玲奈 | `#7ec9a5` | 福祉担当 | 冷静。線引きの難しさを正直に言う |
| `fujii` | 藤井 慎一 | `#e08a7a` | 財政担当 | 事務的。「できます。ただし別の予算を使います」 |
| `analyst` | 解説 | `#b9c0cc` | **エンディング後のみ登場** | 説明役。本編には一切出さない |

### 人物設計の原則

**佐藤美咲** — 制度の是非ではなく、明日の朝食を基準に話す。
非公式市場について「合法かどうかより、実際に買えるかどうか」という市民の視点を担当する。
**同情されるだけの弱者にしない。** 自分の判断で非公式市場を使い、それを隠さない。

**山田浩一** — 値上げしたいのではなく、営業を続けたい。
価格規制下で非公式販売へ誘われる場面があるが、**犯罪者としては描かない。**
誘われたという事実を市に伝える側として登場させる。

**黒田誠** — 「この街のために運ぶわけじゃない。採算が合えば運びます」。
価格上昇が他地域から供給を呼ぶ仕組みを、本人の行動で示す。
**利益追求を善とも悪とも断じない。** 補助金が出れば卸値を上げる、という描写も入れる。

**高橋玲奈** — 市場価格と生活保障を分離する考え方を担当。
限定支援の推進役だが、**線引きの外側にいる人の問題を自分から口にする。**

**藤井慎一** — 機会費用の担当。「できます。しかし別の予算を使います」。
特定の政策に反対も賛成もしない。**代償を数える人**として一貫させる。

**登場人物に経済学の講義をさせない。** 経済のしくみは、店の状況・行列・在庫・
市民の体験・財政報告・業者の行動から自然に分かるようにする。
`analyst` はエンディング到達後にのみ話す（§16）。

---

## 5. 全体フロー

```
[PROLOGUE]  prologue-street → prologue-bakery → prologue-office
                                                      ↓
[DECISION 1]                                    decision-1
                    ┌──────────┬──────────┬──────────┐
                    A 価格規制   B 補助金    C 規制緩和   D 限定支援
                    ↓          ↓          ↓          ↓
                  d1-cap   d1-subsidy d1-deregulate d1-targeted
                    ↓          ↓          ↓          ↓
[3週間後]         w3-cap   w3-subsidy w3-deregulate w3-targeted
                    └──────────┴────┬─────┴──────────┘
                                    ↓
                               w3-council
                                    ↓
[DECISION 2]                   decision-2   （6択・方針転換可）
                                    ↓
                               d2-router  ← 表示行なし（分岐専用）
                    ┌───────────────┴───────────────┐
          統制/配給あり                          それ以外
      d2-results-controlled                 d2-results-open
                    └───────────────┬───────────────┘
                                    ↓
                   informalMarket >= 35 ?
                    ┌─────Yes─────┐         └─No─┐
                    ↓             │              │
[非公式市場イベント] informal-intro │              │
                    ↓             │              │
              informal-decision   │              │
          ┌─────────┬────────┬────┘              │
       摘発       黙認     価格緩和                 │
          ↓         ↓         ↓                  │
  ...-crackdown-after / -tolerate-after / -relax-after
          └─────────┴─────────┴──────────┬───────┘
                                          ↓
                                     m6-router  ← 表示行なし
              ┌────────┬────────┬────────┴────────┐
          統制継続    補助継続    緩和済み          その他
             ↓          ↓          ↓               ↓
[6か月後]  m6-cap   m6-subsidy  m6-market      m6-common
             └────────┴────┬───┴───────────────┘
                            ↓
                       m6-council
                            ↓
[DECISION 3]           decision-3   （緊急措置の出口）
                            ↓
                        d3-results
                            ↓
[3か月後]              m9-epilogue
                            ↓
                      resolveEnding
                            ↓
[ENDING] 7種 → [RESULT] → [ECONOMICS解説]
```

**シーン総数 31。** うち 2 つ（`d2-router` / `m6-router`）は表示行を持たない分岐専用シーン。

### 政策転換について

プレイヤーは最初の選択に縛られない。
価格統制 → 供給不足 → 上限緩和 → 市場開放、も、
規制緩和 → 世論反発 → 補助金導入、も可能。
**一度の合理的な政策転換を悪く描かない。** DECISION 2 の台詞で明示する。

ただし転換が重なると `policyChanges` が増え、
「三か月後が分からない街」であること自体が業者と市民のコストになる（§14 `policy-drift`）。
発生条件は **3回以上の転換 かつ 支持率 45 以下** とし、一度や二度では発生しない。

Decision 3では、価格上限から市場価格へ戻す、補助・配給を終了する、または価格上限・配給から
市場価格と限定支援へ切り替える場合だけ `policyChanges` を +1 する。
限定支援の恒久化・新規開始、情報公開、現状維持、現在の緊急措置の単純な恒久化では増やさない。

---

## 6. Scene 一覧

| # | Scene ID | 区分 | 背景（論理パス） | 主な登場人物 | 行数 | next |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `prologue-street` | PROLOGUE | `street-morning.png` | narrator, misaki | 8 | goto `prologue-bakery` |
| 2 | `prologue-bakery` | PROLOGUE | `bakery-yamada.png` | narrator, yamada, misaki | 7 | goto `prologue-office` |
| 3 | `prologue-office` | PROLOGUE | `mayors-office.png` | narrator, fujii, takahashi, kuroda | 9 | goto `decision-1` |
| 4 | `decision-1` | 判断① | `mayors-office.png` | fujii | 2 | choices ×4 |
| 5 | `d1-cap` | 直接効果 | `bakery-cheap.png` | narrator, misaki, yamada, fujii | 5 | goto `w3-cap` |
| 6 | `d1-subsidy` | 直接効果 | `bakery-yamada.png` | narrator, yamada, fujii | 5 | goto `w3-subsidy` |
| 7 | `d1-deregulate` | 直接効果 | `city-gate.png` | narrator, kuroda, yamada, fujii | 5 | goto `w3-deregulate` |
| 8 | `d1-targeted` | 直接効果 | `welfare-desk.png` | narrator, takahashi, misaki, fujii | 5 | goto `w3-targeted` |
| 9 | `w3-cap` | 3週間後 | `empty-shelf.png` | narrator, misaki, yamada, fujii | 7 | goto `w3-council` |
| 10 | `w3-subsidy` | 3週間後 | `bakery-yamada.png` | narrator, yamada, kuroda, misaki, fujii | 7 | goto `w3-council` |
| 11 | `w3-deregulate` | 3週間後 | `city-gate.png` | narrator, kuroda, misaki, yamada, fujii | 7 | goto `w3-council` |
| 12 | `w3-targeted` | 3週間後 | `welfare-desk.png` | narrator, takahashi, misaki, fujii, yamada | 7 | goto `w3-council` |
| 13 | `w3-council` | 共通 | `council-room.png` | narrator, fujii, takahashi | 5 | goto `decision-2` |
| 14 | `decision-2` | 判断② | `council-room.png` | fujii, takahashi | 3 | choices ×6 |
| 15 | `d2-router` | 分岐専用 | — | **なし（行数 0）** | 0 | branch |
| 16 | `d2-results-controlled` | 10日後 | `back-lot.png` | narrator, misaki, yamada, fujii | 6 | branch |
| 17 | `d2-results-open` | 10日後 | `market-street.png` | narrator, kuroda, yamada, misaki, takahashi, fujii | 6 | branch |
| 18 | `informal-intro` | イベント | `back-lot.png` | narrator, misaki, kuroda, takahashi, fujii | 8 | goto `informal-decision` |
| 19 | `informal-decision` | イベント判断 | `council-room.png` | fujii, takahashi | 2 | choices ×3 |
| 20 | `informal-crackdown-after` | イベント結果 | `back-lot-empty.png` | narrator, takahashi, misaki | 5 | goto `m6-router` |
| 21 | `informal-tolerate-after` | イベント結果 | `back-lot.png` | narrator, takahashi, misaki, fujii | 5 | goto `m6-router` |
| 22 | `informal-relax-after` | イベント結果 | `bakery-yamada.png` | narrator, yamada, misaki, fujii | 5 | goto `m6-router` |
| 23 | `m6-router` | 分岐専用 | — | **なし（行数 0）** | 0 | branch |
| 24 | `m6-cap` | 6か月後 | `empty-shelf.png` | narrator, yamada, misaki, kuroda, fujii | 5 | goto `m6-council` |
| 25 | `m6-subsidy` | 6か月後 | `bakery-yamada.png` | narrator, yamada, kuroda, fujii, takahashi | 5 | goto `m6-council` |
| 26 | `m6-market` | 6か月後 | `market-street.png` | narrator, kuroda, misaki, yamada, fujii | 5 | goto `m6-council` |
| 27 | `m6-common` | 6か月後 | `market-street.png` | narrator, misaki, yamada, takahashi, fujii | 5 | goto `m6-council` |
| 28 | `m6-council` | 共通 | `council-room.png` | narrator, fujii, takahashi | 5 | goto `decision-3` |
| 29 | `decision-3` | 判断③ | `mayors-office-night.png` | narrator, fujii, takahashi | 3 | choices ×8 |
| 30 | `d3-results` | 結果 | `council-room.png` | narrator, yamada, misaki, takahashi, fujii | 6 | goto `m9-epilogue` |
| 31 | `m9-epilogue` | 3か月後 | `street-morning.png` | narrator, misaki, yamada, kuroda, takahashi, fujii | 8 | `resolveEnding` |

> `d2-router` / `m6-router` は `lines: []` の分岐専用シーン。
> エンジンは表示行が 0 のシーンをそのまま次の遷移へ解決する（`engine/transition.ts` の `enterScene`）。
> **これらを `visited` 条件の対象にしないこと**（必ず通過するため条件として無意味）。

---

## 7〜12. 各 Scene の詳細（背景・台詞・選択肢・effects・conditions・next）

台詞の `id` は全編で一意。将来の音声生成キーは `bread-price/<sceneId>/<lineId>` を想定する。
**⚠印の行は `{{param.x}}` を含むため、音声を付ける段階で `voiceText`（数値を含まない読み上げ文）が必要。**

### 1. `prologue-street` — 朝の商店街

背景 `street-morning.png` / onEnter なし

| line id | 話者 | 台詞 | condition |
| --- | --- | --- | --- |
| `ps-01` | narrator | 十二万人が暮らすこの市の朝は、商店街のシャッターが上がる音から始まる。 | — |
| `ps-02` | narrator | 三か月前まで、食パン一斤は百三十円だった。 | — |
| `ps-03` | misaki | ……二百四十円。先週より、また十円上がってる。 | — |
| `ps-04` | misaki | 上の子が「おかわり」って言うのを、聞こえなかったふりをしました。 | — |
| `ps-05` | narrator | 列に並んでいるのは、あなたに投票した人たちだ。 | — |
| `ps-06` | misaki | 市長さん。難しい話は、私には分かりません。 | — |
| `ps-07` | misaki | ただ、明日の朝、子どもに何を食べさせればいいのか教えてください。 | — |
| `ps-08` | narrator | 市長就任から、四か月目のことだった。 | — |

next: `{ "type": "goto", "scene": "prologue-bakery" }`

---

### 2. `prologue-bakery` — 山田ベーカリー

背景 `bakery-yamada.png` / onEnter なし

| line id | 話者 | 台詞 | condition |
| --- | --- | --- | --- |
| `pb-01` | narrator | 商店街の角で、山田ベーカリーは三代続いている。 | — |
| `pb-02` | yamada | 小麦が一・八倍、電気が一・四倍。運送屋にも先月、値上げを頼まれました。 | — |
| `pb-03` | yamada | 二百四十円で売って、ようやく去年と同じくらいです。 | — |
| `pb-04` | yamada | 儲けたくて上げてるわけじゃないんです。明日も窯に火を入れたいだけで。 | — |
| `pb-05` | misaki | ……分かってます。山田さんが悪いなんて、思ってません。 | — |
| `pb-06` | misaki | でも、分かっていても、財布の中身は増えないんです。 | — |
| `pb-07` | narrator | 二人とも正しかった。そして、二人とも困っていた。 | — |

next: `{ "type": "goto", "scene": "prologue-office" }`

---

### 3. `prologue-office` — 市長室

背景 `mayors-office.png` / onEnter なし

| line id | 話者 | 台詞 | condition |
| --- | --- | --- | --- |
| `po-01` | narrator | 市長室の机には、三つの書類が並んでいる。どれも「至急」と押してある。 | — |
| `po-02` | fujii | 市の政策余力は {{param.budget}}。今年度、自由に動かせる分です。 ⚠ | — |
| `po-03` | fujii | 先に申し上げます。何をするにも、この数字から引かれます。 | — |
| `po-04` | takahashi | 就学援助と生活相談の窓口が、先月から混んでいます。 | — |
| `po-05` | takahashi | 全員が同じように困っているわけではありません。困り方に差があります。 | — |
| `po-06` | kuroda | 市外の卸です。呼ばれたので来ました。 | — |
| `po-07` | kuroda | 言っておきますが、私はこの街のために運ぶわけじゃない。採算が合えば運びます。 | — |
| `po-08` | fujii | 支持率は {{param.popularity}}。三か月後の議会までに、何かは決めないと。 ⚠ | — |
| `po-09` | narrator | 誰も、正解を持っていなかった。 | — |

next: `{ "type": "goto", "scene": "decision-1" }`

---

### 4. `decision-1` — 最初の判断【判断①】

背景 `mayors-office.png` / onEnter なし

| line id | 話者 | 台詞 |
| --- | --- | --- |
| `d1-01` | fujii | 四つ、案があります。 |
| `d1-02` | fujii | どれも筋は通っています。通らないのは、代償のほうです。 |

next: `type: "choices"` / prompt: **「最初の対応を決めてください」**

#### 選択肢 A `d1-price-cap` 「パンの価格に上限を設ける」

> 一斤百六十円を上限とする条例。明日から、誰でも安く買える。
> その値段で焼き続けられるかどうかは、店の側の事情になる。

condition: なし（**無条件選択肢**）

| effect | 値 |
| --- | --- |
| `price` | **set 160** |
| `popularity` | +14 |
| `supply` | −8 |
| `foodAccess` | **+4** ← 直後は「安く買えた人」がいる |
| `informalMarket` | +5 |
| `budget` | −5 |
| flag | `priceCapActive` = true, `everPriceCap` = true |

next: goto `d1-cap`

#### 選択肢 B `d1-subsidy` 「パン屋へ補助金を出す」

> 仕入れ値の一部を市が肩代わりする。店は焼き続けられる。
> 財政からは、毎月、確実に出ていく。

condition: `{ "param": "budget", "op": ">=", "value": 35 }` / ifUnmet: `disable`
unmetText: 「政策余力が足りません（35 必要）」

| effect | 値 |
| --- | --- |
| `budget` | −35 |
| `supply` | +12 |
| `price` | −30 |
| `popularity` | +8 |
| `foodAccess` | +8 |
| flag | `subsidyActive` = true, `everSubsidy` = true |

next: goto `d1-subsidy`

#### 選択肢 C `d1-deregulate` 「流通・販売・参入の規制を緩和する」

> 市外業者の搬入と臨時販売所を認める。荷は増える。
> 地元の店と商店会は反発する。効果が出るまで少し時間がかかる。

condition: なし（**無条件選択肢**）

| effect | 値 |
| --- | --- |
| `supply` | +6 ← 直後の効果は小さい |
| `price` | −5 |
| `popularity` | −6 |
| `foodAccess` | +2 |
| `budget` | −3 |
| `marketRisk` | +2 |
| flag | `deregulated` = true, `everDeregulate` = true |

next: goto `d1-deregulate`

#### 選択肢 D `d1-targeted` 「低所得世帯を限定して支援する」

> 対象世帯へ食料費を直接支給する。価格には触れない。
> 「誰が対象か」を決める仕事が、このあとずっと残る。

condition: `{ "param": "budget", "op": ">=", "value": 18 }` / ifUnmet: `disable`
unmetText: 「政策余力が足りません（18 必要）」

| effect | 値 |
| --- | --- |
| `budget` | −18 |
| `popularity` | +3 ← 対象外の市民には響かない |
| `foodAccess` | +9 |
| `supply` | +2 |
| flag | `targetedSupportActive` = true, `everTargetedSupport` = true |

next: goto `d1-targeted`

---

### 5. `d1-cap` — 価格規制の直後

背景 `bakery-cheap.png` / onEnter なし

| line id | 話者 | 台詞 |
| --- | --- | --- |
| `c1-01` | narrator | 条例は三日で通った。値札は一晩で書き換わった。 |
| `c1-02` | misaki | 百六十円。……本当に、百六十円でした。 |
| `c1-03` | misaki | 久しぶりに、レジで小銭を数えなくていい買い物をしました。 |
| `c1-04` | yamada | 今日の分は焼きました。明日の分の小麦を、まだ買っていません。 |
| `c1-05` | fujii | 支持率が {{param.popularity}} まで上がりました。歓迎されています、今は。 ⚠ |

next: goto `w3-cap`

---

### 6. `d1-subsidy` — 補助金の直後

背景 `bakery-yamada.png` / onEnter なし

| line id | 話者 | 台詞 |
| --- | --- | --- |
| `s1-01` | narrator | 市は、小麦の仕入れ値の一部を肩代わりすると発表した。 |
| `s1-02` | yamada | 助かります。来月の仕入れの心配を、しなくて済みます。 |
| `s1-03` | narrator | 店頭価格は二百十円まで下がり、棚には昨日より多くのパンが並んだ。 |
| `s1-04` | fujii | 残りの余力は {{param.budget}}。申し上げたとおり、確実に減りました。 ⚠ |
| `s1-05` | fujii | それと、これは毎月です。一度きりの支出ではありません。 |

next: goto `w3-subsidy`

---

### 7. `d1-deregulate` — 規制緩和の直後

背景 `city-gate.png` / onEnter なし

| line id | 話者 | 台詞 |
| --- | --- | --- |
| `g1-01` | narrator | 市外業者の搬入許可と、臨時販売所の届出制が、その週のうちに施行された。 |
| `g1-02` | kuroda | 手続きが減ったので、来週から週二便に増やします。採算が合うので。 |
| `g1-03` | yamada | ……駅前に、うちより安い臨時の店が出ました。 |
| `g1-04` | yamada | 恨んではいません。ただ、うちには三代分の設備の借金があるので。 |
| `g1-05` | fujii | 商店会から抗議文が届いています。支持率は {{param.popularity}} です。 ⚠ |

next: goto `w3-deregulate`

---

### 8. `d1-targeted` — 限定支援の直後

背景 `welfare-desk.png` / onEnter なし

| line id | 話者 | 台詞 |
| --- | --- | --- |
| `t1-01` | narrator | 対象世帯への食料費の直接支給が決まった。価格には手をつけなかった。 |
| `t1-02` | takahashi | 千二百世帯に通知を出しました。申請してくれたのは、まだ七割です。 |
| `t1-03` | misaki | うちは……対象でした。正直、助かりました。 |
| `t1-04` | misaki | 隣の家は、少しだけ収入が多くて外れたそうです。気まずくて、まだ話していません。 |
| `t1-05` | fujii | 余力は {{param.budget}} まで下がりました。価格は二百四十円のままです。 ⚠ |

next: goto `w3-targeted`

---

### 9. `w3-cap` — 三週間後（価格規制ルート）

背景 `empty-shelf.png`
**onEnter**: `supply` −16 / `informalMarket` +18 / `foodAccess` **−14** / `marketRisk` +5 / `budget` −4 / `popularity` −6

| line id | 話者 | 台詞 |
| --- | --- | --- |
| `w3c-01` | narrator | 三週間後。値札は変わらず百六十円だった。 |
| `w3c-02` | narrator | ただし、その値札の下に、パンは載っていなかった。 |
| `w3c-03` | misaki | 朝七時に並んで、買えたのは二回だけです。 |
| `w3c-04` | misaki | 安いんです。安いんですけど、無いんです。 |
| `w3c-05` | yamada | 百六十円だと、焼くほど赤字になります。だから焼く数を減らしました。 |
| `w3c-06` | yamada | 昨日、知らない人に声をかけられました。「うちに卸さないか」と。 |
| `w3c-07` | fujii | 正規の供給は {{param.supply}}。届け出のない取引の話が、こちらにも入っています。 ⚠ |

next: goto `w3-council`

---

### 10. `w3-subsidy` — 三週間後（補助金ルート）

背景 `bakery-yamada.png`
**onEnter**: `budget` −16 / `supply` +6 / `price` −5 / `foodAccess` +3 / `popularity` −2

| line id | 話者 | 台詞 |
| --- | --- | --- |
| `w3s-01` | narrator | 三週間後。窯の火は消えていなかった。 |
| `w3s-02` | yamada | おかげさまで、いつもどおり焼けています。従業員も戻しました。 |
| `w3s-03` | kuroda | 補助が出ると聞いて、うちも卸値を少し上げさせてもらいました。 |
| `w3s-04` | kuroda | 悪く思わないでください。市が払うと決まった以上、そこに合わせるのが商売です。 |
| `w3s-05` | misaki | 二百五円。……高いままですけど、買えるだけましです。 |
| `w3s-06` | fujii | 補助の実績が積み上がっています。余力は {{param.budget}}。 ⚠ |
| `w3s-07` | fujii | 来年度の道路と学校の修繕を、どこかで削る話になります。 |

next: goto `w3-council`

---

### 11. `w3-deregulate` — 三週間後（規制緩和ルート）

背景 `city-gate.png`
**onEnter**: `supply` +22 / `price` −35 / `foodAccess` +10 / `popularity` −4 / `marketRisk` +3

| line id | 話者 | 台詞 |
| --- | --- | --- |
| `w3g-01` | narrator | 三週間後。市の入口の交通量が、目に見えて増えていた。 |
| `w3g-02` | kuroda | 週二便が四便になりました。他社も入ってきています。 |
| `w3g-03` | narrator | 店頭価格は二百円前後まで下がり、棚は埋まった。 |
| `w3g-04` | misaki | 買えるようになりました。……ただ、どこの小麦か書いていない袋もあって。 |
| `w3g-05` | yamada | 先週、同じ商店街の一軒が店を閉めました。四十年やっていた店です。 |
| `w3g-06` | yamada | うちはまだ大丈夫です。「まだ」ですが。 |
| `w3g-07` | fujii | 支持率は {{param.popularity}}。商店会は、もう次の選挙の話をしています。 ⚠ |

next: goto `w3-council`

---

### 12. `w3-targeted` — 三週間後（限定支援ルート）

背景 `welfare-desk.png`
**onEnter**: `budget` −8 / `foodAccess` +2 / `popularity` −3 / `supply` +3 / `price` −5

| line id | 話者 | 台詞 |
| --- | --- | --- |
| `w3t-01` | narrator | 三週間後。店頭価格は二百三十五円。ほとんど動いていない。 |
| `w3t-02` | takahashi | 支給は届いています。対象世帯の欠食の相談は、はっきり減りました。 |
| `w3t-03` | takahashi | 問題は、対象の外側です。基準を一万円超えただけの世帯から、毎日電話が来ます。 |
| `w3t-04` | misaki | 助かっている人がいるのは知っています。でも、うちの隣は助かっていません。 |
| `w3t-05` | narrator | 「必要な人へ」という言葉は、「必要でない人」を決める作業でもあった。 |
| `w3t-06` | fujii | 審査と支給の事務費が、想定より膨らんでいます。余力は {{param.budget}}。 ⚠ |
| `w3t-07` | yamada | 値段は下がっていませんが、お客さんは戻ってきました。それだけでもありがたい。 |

next: goto `w3-council`

---

### 13. `w3-council` — 三週間目の庁議

背景 `council-room.png` / onEnter なし

| line id | 話者 | 台詞 |
| --- | --- | --- |
| `wc-01` | narrator | 三週間目の庁議。書類の束は、最初より厚くなっている。 |
| `wc-02` | fujii | 現状です。価格 {{param.price}} 円、正規の供給 {{param.supply}}、余力 {{param.budget}}。 ⚠ |
| `wc-03` | takahashi | それと、市民が実際に食べ物を手に入れられている度合い。今は {{param.foodAccess}} 程度と見ています。 ⚠ |
| `wc-04` | takahashi | 値段と、買えるかどうかは、別の数字です。ここを一緒にすると判断を誤ります。 |
| `wc-05` | fujii | 次の一手を決めましょう。前回と違う方向でも構いません。 |

next: goto `decision-2`

---

### 14. `decision-2` — 二度目の判断【判断②】

背景 `council-room.png` / onEnter なし

| line id | 話者 | 台詞 |
| --- | --- | --- |
| `d2-01` | fujii | 方向を変えるなら、変える理由を説明できるようにしてください。 |
| `d2-02` | fujii | 制度が三か月ごとに変わる街では、誰も来年の計画を立てられません。 |
| `d2-03` | takahashi | それでも、間違いを認めないよりはましです。 |

> **この 2 行が「政策転換は悪ではない」という本作の立場の明示である。** 実装時に削らないこと。

next: `type: "choices"` / prompt: **「二つ目の判断をしてください」**

#### `d2-price-cap` 「価格に上限を設ける」

> 一斤百六十五円を上限とする。すぐに効く。効いたあとのことは、まだ分からない。

condition: `{ "not": { "flag": "priceCapActive" } }` / ifUnmet: `hide`

`price` **set 165** / `popularity` +12 / `supply` −14 / `informalMarket` +10 / `foodAccess` −2 /
`budget` −5 / `policyChanges` **+1** / flag `priceCapActive`=true, `everPriceCap`=true

next: goto `d2-router`

#### `d2-relax-cap` 「上限価格を引き上げる」

> 上限を二百十五円へ。棚は戻りやすくなる。
> 安くすると約束した市長が、値上げを決めることになる。

condition: `{ "flag": "priceCapActive" }` / ifUnmet: `hide`

`price` **set 215** / `supply` +20 / `informalMarket` −12 / `foodAccess` +8 / `popularity` **−10** /
`marketRisk` −4 / `policyChanges` **+1** / flag `priceCapActive`=**false**, `everReversed`=true

next: goto `d2-router`

#### `d2-subsidy` 「パン屋への補助を出す・増やす」

> 仕入れを支え、店を営業させ続ける。毎月出ていく。

condition: `{ "param": "budget", "op": ">=", "value": 30 }` / ifUnmet: `disable`
unmetText: 「政策余力が足りません（30 必要）」

`budget` −28 / `supply` +12 / `price` −20 / `popularity` +6 / `foodAccess` +7 /
flag `subsidyActive`=true, `everSubsidy`=true

next: goto `d2-router`

#### `d2-targeted` 「困窮世帯への限定支援を始める・広げる」

> 価格ではなく、人に配る。線引きの事務は増える。

condition: `{ "param": "budget", "op": ">=", "value": 20 }` / ifUnmet: `disable`
unmetText: 「政策余力が足りません（20 必要）」

`budget` −20 / `foodAccess` +9 / `popularity` +4 /
flag `targetedSupportActive`=true, `everTargetedSupport`=true

next: goto `d2-router`

#### `d2-rationing` 「一人あたりの購入量を制限する」

> 並んだ人に行き渡らせる。整理券の管理と、その転売が始まる。

condition: `{ "param": "budget", "op": ">=", "value": 15 }` / ifUnmet: `disable`
unmetText: 「政策余力が足りません（15 必要）」

`budget` −15 / `popularity` +7 / `foodAccess` +4 / `informalMarket` +12 / `supply` −3 /
`marketRisk` +2 / `policyChanges` **+1** / flag `rationingActive`=true, `everRationing`=true

next: goto `d2-router`

#### `d2-hold` 「現行の方針を維持する」

> 新しい代償は増やさない。今の代償は、そのまま続く。

condition: なし（**無条件選択肢**。検証ルール「無条件の選択肢が最低1つ」を満たす）

`popularity` −4 / `foodAccess` −1 / `supply` −2

next: goto `d2-router`

---

### 15. `d2-router` — 分岐専用（表示行なし）

背景 なし / `lines: []` / onEnter なし

next:
```jsonc
{ "type": "branch",
  "branches": [
    { "when": { "any": [ { "flag": "priceCapActive" }, { "flag": "rationingActive" } ] },
      "then": { "type": "goto", "scene": "d2-results-controlled" } }
  ],
  "else": { "type": "goto", "scene": "d2-results-open" } }
```

---

### 16. `d2-results-controlled` — 十日後（統制または配給が有効）

背景 `back-lot.png`
**onEnter**: `informalMarket` **+14** / `supply` −6 / `foodAccess` −2 / `marketRisk` +2

| line id | 話者 | 台詞 | condition |
| --- | --- | --- | --- |
| `rc-01` | narrator | 決定から十日。窓口の電話は減り、路地の人通りが増えた。 | — |
| `rc-02` | misaki | 商店街の裏に、車で来る人がいるんです。パン、あります。二百九十円で。 | — |
| `rc-03` | misaki | 高いです。高いですけど、あるんです。 | — |
| `rc-04` | misaki | 昨日は買いました。安くて無いより、高くてあるほうが、今日は助かるので。 | `{ "param": "informalMarket", "op": ">=", "value": 30 }` |
| `rc-05` | yamada | うちの整理券を、駅前で買い取っている人がいます。 | `{ "flag": "rationingActive" }` |
| `rc-06` | fujii | 正規の供給は {{param.supply}}。非公式の取引規模は {{param.informalMarket}} と見ています。 ⚠ | — |

next:
```jsonc
{ "type": "branch",
  "branches": [
    { "when": { "param": "informalMarket", "op": ">=", "value": 35 },
      "then": { "type": "goto", "scene": "informal-intro" } }
  ],
  "else": { "type": "goto", "scene": "m6-router" } }
```

---

### 17. `d2-results-open` — 十日後（統制・配給なし）

背景 `market-street.png`
**onEnter**: `informalMarket` −3 / `supply` +4 / `foodAccess` +2 / `price` −5

| line id | 話者 | 台詞 | condition |
| --- | --- | --- | --- |
| `ro-01` | narrator | 決定から十日。市場は、静かに動き続けていた。 | — |
| `ro-02` | kuroda | 値段が付いていれば、荷は動きます。付かなければ止まります。単純な話です。 | — |
| `ro-03` | yamada | お客さんの顔ぶれが、少し戻りました。 | — |
| `ro-04` | misaki | 前より買えます。前より高いですけど。 | `{ "param": "price", "op": ">=", "value": 210 }` |
| `ro-05` | takahashi | 支給の対象世帯からは、苦情がほとんど来なくなりました。 | `{ "flag": "targetedSupportActive" }` |
| `ro-06` | fujii | 正規の供給は {{param.supply}}、価格は {{param.price}} 円です。 ⚠ | — |

next: `d2-results-controlled` と**同一の branch**（`informalMarket >= 35` → `informal-intro` / else → `m6-router`）

---

## 13. 非公式市場イベント

**発生条件: `informalMarket >= 35`**（`d2-results-*` の末尾で判定）

到達する主な経路は「価格統制を続けた」「配給制を導入した」ルート。
規制緩和ルートや補助金ルートでは通常発生しない。**これは罰ではなく、状況の描写である。**

### 18. `informal-intro` — 公民館の駐車場

背景 `back-lot.png` / onEnter なし

| line id | 話者 | 台詞 |
| --- | --- | --- |
| `ii-01` | narrator | 四週目。市内三か所で、届け出のない販売が常態化していた。 |
| `ii-02` | narrator | 平日の夕方、公民館の駐車場。折りたたみ机の上に、パンが並ぶ。 |
| `ii-03` | misaki | 私、そこで買っています。隠しません。 |
| `ii-04` | misaki | 正規のお店は、安いけれど朝で終わります。私は仕事があります。 |
| `ii-05` | kuroda | 私の荷も、一部はそちらへ流れています。買う人がいるので。 |
| `ii-06` | takahashi | 食品衛生の担当が困っています。誰が売っているのか、把握できていません。 |
| `ii-07` | takahashi | それと、同じ場所で食品以外のものも売られ始めています。出所の説明がつかない物です。 |
| `ii-08` | fujii | 食べ物の話と、それ以外の話を、同じ紙に書かないでください。分けて決めましょう。 |

> `ii-08` は本作の**概念的区別の宣言**である。
> 「非公式な食品取引」と「明確に違法な商品の市場」を混ぜないという設計方針を、
> 登場人物の口から一度だけ明示する。削らないこと。

next: goto `informal-decision`

---

### 19. `informal-decision` — 非公式市場をどう扱うか【イベント判断】

背景 `council-room.png` / onEnter なし

| line id | 話者 | 台詞 |
| --- | --- | --- |
| `id-01` | fujii | 非公式の取引を、市としてどう扱いますか。 |
| `id-02` | takahashi | どれを選んでも、誰かの今日の食事に影響します。 |

next: `type: "choices"` / prompt: **「非公式市場への方針を決めてください」**

#### `informal-crackdown` 「徹底的に摘発する」

> 一斉の指導と告発を行う。詐欺的な販売や出所不明の商品は減る。
> そこで買っていた人の、今日の分も減る。

condition: なし（**無条件選択肢**）

| effect | 値 | 意味 |
| --- | --- | --- |
| `informalMarket` | −22 | 取引は表から消える |
| `foodAccess` | **−12** | **そこで食べていた人が食べられなくなる** |
| `budget` | −12 | 執行コスト |
| `marketRisk` | −6 | 詐欺・出所不明品は実際に減る |
| `popularity` | −3 | 買っていた層の反発 |
| `supply` | +2 | 一部は正規へ戻る |
| flag | `crackdownActive`=true, `everCrackdown`=true | |

> **単純な善行として描かない。** 摘発には本物の成果（`marketRisk` 低下）があり、
> 本物の被害（`foodAccess` 低下）もある。両方を必ず台詞に出す。

next: goto `informal-crackdown-after`

#### `informal-tolerate` 「食品の取引に限って、当面は黙認する」

> 食品衛生の最低限だけ示し、摘発はしない。買える人は増える。
> 「どこまで許すのか」を、これから毎週決めることになる。

condition: なし（**無条件選択肢**）

| effect | 値 | 意味 |
| --- | --- | --- |
| `informalMarket` | +10 | 取引が定着する |
| `foodAccess` | **+18** | **正規market の不足を実際に埋める** |
| `marketRisk` | +6 | 保証のない取引が増える |
| `popularity` | +2 | 買えるようになった層の支持 |
| `budget` | −3 | 衛生指導の紙一枚分 |
| `policyChanges` | +1 | 法執行方針の転換 |
| flag | `informalTolerated`=true, `everTolerated`=true, `illicitGoodsAppeared`=**true** | |

> `marketRisk` は +6 に留める。**規模（+10）に比べて上がり方を小さくしてある。**
> 「非公式市場が大きい＝危険」という自動的な結びつきを、数値の設計でも否定する。

next: goto `informal-tolerate-after`

#### `informal-relax-price` 「価格規制を緩めて、正規の市場へ戻す」

> 上限を引き上げ、店が売れるようにする。裏へ回る理由そのものが減る。
> 安くすると約束した市長が、値上げを決めることになる。

condition: `{ "flag": "priceCapActive" }` / ifUnmet: `hide`

`price` **set 215** / `supply` +24 / `informalMarket` −20 / `foodAccess` +8 / `popularity` **−11** /
`marketRisk` −5 / `policyChanges` **+1** / flag `priceCapActive`=**false**, `everReversed`=true

next: goto `informal-relax-after`

---

### 20. `informal-crackdown-after` — 摘発の翌週

背景 `back-lot-empty.png` / onEnter なし

| line id | 話者 | 台詞 |
| --- | --- | --- |
| `ica-01` | narrator | 一斉指導の翌週、公民館の駐車場は空になった。 |
| `ica-02` | takahashi | 出所不明の商品と、偽の支給券が数件見つかりました。そこは成果です。 |
| `ica-03` | misaki | ……買えなくなりました。正規のお店には、やっぱり朝しかありません。 |
| `ica-04` | misaki | 悪いことをしていた自覚は、正直ありません。ただ、無くなりました。 |
| `ica-05` | narrator | 取引は消えた。需要は消えなかった。 |

next: goto `m6-router`

---

### 21. `informal-tolerate-after` — 黙認の決定後

背景 `back-lot.png` / onEnter なし

| line id | 話者 | 台詞 |
| --- | --- | --- |
| `ita-01` | narrator | 市は、食品の非公式販売について、当面の指導を見送ると決めた。 |
| `ita-02` | takahashi | 手洗い設備と表示だけ、紙一枚でお願いしました。断る人はいませんでした。 |
| `ita-03` | misaki | 前より買いやすくなりました。値段は高いままです。 |
| `ita-04` | takahashi | ただ、同じ場所で売られている食品以外の商品については、市は何も保証できません。 |
| `ita-05` | fujii | 「どこまでを食品と呼ぶか」で、毎週会議をすることになりました。 |

next: goto `m6-router`

---

### 22. `informal-relax-after` — 上限価格の引き上げ後

背景 `bakery-yamada.png` / onEnter なし

| line id | 話者 | 台詞 |
| --- | --- | --- |
| `ira-01` | narrator | 上限価格は二百十五円へ引き上げられた。市長の会見は、十二分で終わった。 |
| `ira-02` | yamada | 焼けます。二百十五円なら、焼けます。 |
| `ira-03` | misaki | 値上げですよね、これ。……分かっています。分かっていますけど。 |
| `ira-04` | narrator | 公民館の駐車場から、車は少しずつ減っていった。 |
| `ira-05` | fujii | 支持率は {{param.popularity}}。説明を求める陳情が、四十七件来ています。 ⚠ |

next: goto `m6-router`

---

### 23. `m6-router` — 分岐専用（表示行なし）

背景 なし / `lines: []` / onEnter なし

next:
```jsonc
{ "type": "branch",
  "branches": [
    { "when": { "flag": "priceCapActive" }, "then": { "type": "goto", "scene": "m6-cap" } },
    { "when": { "flag": "subsidyActive" },  "then": { "type": "goto", "scene": "m6-subsidy" } },
    { "when": { "flag": "deregulated" },    "then": { "type": "goto", "scene": "m6-market" } }
  ],
  "else": { "type": "goto", "scene": "m6-common" } }
```

> 評価順が意味を持つ。統制が生きているなら、それが最も強く街を規定する。

---

### 24. `m6-cap` — 六か月後（価格上限が続いている）

背景 `empty-shelf.png`
**onEnter**: `supply` −8 / `informalMarket` +8 / `foodAccess` −3 / `marketRisk` +2 / `budget` −6 / `popularity` −3

| line id | 話者 | 台詞 |
| --- | --- | --- |
| `m6c-01` | narrator | 六か月後。条例は生きている。値札も百六十円のままだ。 |
| `m6c-02` | yamada | 週三日にしました。焼く日を減らせば、赤字の日も減るので。 |
| `m6c-03` | misaki | 正規のお店で買えたのは、今月に入って一度です。 |
| `m6c-04` | kuroda | この街への正規の便は、来月から半分にします。採算が合わないので。 |
| `m6c-05` | fujii | 正規の供給 {{param.supply}}、非公式の規模 {{param.informalMarket}}。差が開いています。 ⚠ |

next: goto `m6-council`

---

### 25. `m6-subsidy` — 六か月後（補助金が続いている）

背景 `bakery-yamada.png`
**onEnter**: `budget` **−18** / `supply` +6 / `foodAccess` +4 / `popularity` −3 / `price` −5

| line id | 話者 | 台詞 |
| --- | --- | --- |
| `m6s-01` | narrator | 六か月後。店は開いている。市の口座からは、毎月同じ額が出ていく。 |
| `m6s-02` | yamada | 助かっています。ただ、補助がいつまでかを聞かれると、答えられません。 |
| `m6s-03` | kuroda | 補助を見込んだ卸値になっています。市が止めれば、そこも戻ります。 |
| `m6s-04` | fujii | 余力は {{param.budget}}。学校の屋上防水を、来年度に送りました。 ⚠ |
| `m6s-05` | takahashi | 補助は全員に届きます。困っていない家にも、同じだけ届いています。 |

next: goto `m6-council`

---

### 26. `m6-market` — 六か月後（市場が回っている）

背景 `market-street.png`
**onEnter**: `supply` +10 / `price` −20 / `foodAccess` +6 / `popularity` +2 / `budget` −4

| line id | 話者 | 台詞 |
| --- | --- | --- |
| `m6m-01` | narrator | 六か月後。市外からの搬入は日常になった。価格は {{param.price}} 円まで落ち着いている。 ⚠ |
| `m6m-02` | kuroda | もう特別なことはしていません。普通の商売です。 |
| `m6m-03` | misaki | 買えます。値段も、去年ほどではないけれど戻ってきました。 |
| `m6m-04` | yamada | うちは残りました。商店街で二軒、残りませんでした。 |
| `m6m-05` | fujii | 支持率は {{param.popularity}}。危機が終わると、誰も理由を覚えていません。 ⚠ |

next: goto `m6-council`

---

### 27. `m6-common` — 六か月後（そのほか）

背景 `market-street.png`
**onEnter**: `supply` +2 / `price` −5 / `foodAccess` +1 / `budget` −4 / `popularity` −2

| line id | 話者 | 台詞 |
| --- | --- | --- |
| `m6n-01` | narrator | 六か月後。劇的なことは、何も起きなかった。 |
| `m6n-02` | misaki | 慣れました。……慣れたくは、なかったんですけど。 |
| `m6n-03` | yamada | 続いています。良くも悪くも、続いています。 |
| `m6n-04` | takahashi | 窓口の相談件数は、危機前の一・四倍で止まっています。 |
| `m6n-05` | fujii | 価格 {{param.price}} 円、供給 {{param.supply}}、余力 {{param.budget}}。 ⚠ |

next: goto `m6-council`

---

### 28. `m6-council` — 期限の話

背景 `council-room.png` / onEnter なし

| line id | 話者 | 台詞 |
| --- | --- | --- |
| `mc-01` | narrator | 緊急対応として始めたものには、たいてい期限が書いてある。 |
| `mc-02` | fujii | 条例と補助の期限が、三か月後に来ます。 |
| `mc-03` | fujii | 延ばすなら議会の議決が要ります。止めるなら、止める説明が要ります。 |
| `mc-04` | takahashi | 決めない、という選択もあります。期限が来れば、勝手に終わります。 |
| `mc-05` | fujii | それも決定です。ただ、誰も説明しなかった決定になります。 |

next: goto `decision-3`

---

### 29. `decision-3` — 三度目の判断【判断③・出口】

背景 `mayors-office-night.png` / onEnter なし

| line id | 話者 | 台詞 |
| --- | --- | --- |
| `d3-01` | narrator | 三度目の判断は、始めることではなく、終わらせることについてだった。 |
| `d3-02` | fujii | 緊急措置を、どうしますか。 |
| `d3-03` | takahashi | 今の暮らしが、この措置の上に載っている人がいます。そこだけは忘れないでください。 |

next: `type: "choices"` / prompt: **「緊急措置の出口を決めてください」**

Decision 3のchoice定義は8件。現在の制度状態と予算で絞り込み、実際の表示数は3〜4件とする。

#### `d3-permanent` 「現在の緊急措置を恒久制度にする」

> 期限を外し、制度として続ける。市民は計画を立てられる。
> 市も、同じ額を毎年払い続ける。

condition: `{ "any": [ { "flag": "priceCapActive" }, { "flag": "subsidyActive" }, { "flag": "rationingActive" } ] }` / ifUnmet: `hide`

`budget` −25 / `popularity` +5 / `supply` −4 / `informalMarket` +6 / `marketRisk` +2 /
flag `permanentized`=true
（`policyChanges` は増えない。**継続は転換ではない**）

next: goto `d3-results`

#### `d3-phase-out-price` 「価格上限を三か月かけて解除する」

> 価格上限を段階的に外し、価格と供給を市場へ戻す。
> 棚は戻る。負担も戻る。

condition: `{ "flag": "priceCapActive" }` / ifUnmet: `hide`

`price` +40 / `supply` +22 / `informalMarket` −18 / `foodAccess` +6 / `popularity` **−9** /
`marketRisk` −5 / `budget` −8 / `policyChanges` **+1** /
flag `priceCapActive`=false, `subsidyActive`=false, `rationingActive`=false, `everReversed`=true

next: goto `d3-results`

#### `d3-phase-out-support` 「補助と購入制限を三か月かけて終了する」

> 現在の補助や購入制限を段階的に終える。
> 支援を受ける側にも、売る側にも、三か月の準備期間を置く。

condition: `not priceCapActive` **かつ** (`subsidyActive` **または** `rationingActive`) / ifUnmet: `hide`

`price` +20 / `supply` +6 / `informalMarket` −10 / `foodAccess` +1 / `popularity` −9 /
`marketRisk` −3 / `budget` −4 / `policyChanges` **+1** /
flag `subsidyActive`=false, `rationingActive`=false, `everReversed`=true

next: goto `d3-results`

#### `d3-market-return-with-support` 「価格は市場に戻し、困窮世帯支援へ切り替える」

> 一律の措置を終えて価格を市場に戻し、必要な世帯だけを支える。
> 「誰が必要か」を決める仕事が、毎年ここに残る。

condition: (`priceCapActive` **または** `rationingActive`) **かつ** `budget >= 20` / ifUnmet: `hide`

`budget` −20 / `supply` +14 / `price` +20 / `informalMarket` −12 / `foodAccess` +9 /
`popularity` −3 / `marketRisk` −3 / `policyChanges` **+1** /
flag `targetedSupportActive`=true, `everTargetedSupport`=true, `priceCapActive`=false,
`subsidyActive`=false, `rationingActive`=false, `everReversed`=true

next: goto `d3-results`

#### `d3-support-permanent` 「現在の限定支援を恒久制度にする」

> すでに行っている困窮世帯への限定支援を、毎年続く制度にする。
> 価格や流通には新たに介入しない。

condition: `targetedSupportActive` **かつ**
`not any(priceCapActive, rationingActive, subsidyActive)` **かつ** `budget >= 15` / ifUnmet: `hide`

`budget` −15 / `foodAccess` +5 / `popularity` +1 / `marketRisk` −1 /
flag `permanentized`=true

`price` / `supply` / `informalMarket` / `policyChanges` は変化させない。

next: goto `d3-results`

#### `d3-support-new` 「価格には介入せず、困窮世帯支援を恒久制度として始める」

> 価格と流通には手を加えず、困窮世帯への限定支援だけを新しい恒久制度として始める。

condition: `not any(priceCapActive, rationingActive, targetedSupportActive, subsidyActive)` **かつ**
`budget >= 20` / ifUnmet: `hide`

`budget` −20 / `foodAccess` +8 / `popularity` +2 / `supply` +2 /
`informalMarket` −3 / `marketRisk` −1 /
flag `targetedSupportActive`=true, `everTargetedSupport`=true, `permanentized`=true

`price` / `policyChanges` は変化させない。補助金が有効な状態では、文言との矛盾を避けるため表示しない。

next: goto `d3-results`

#### `d3-monitor` 「価格には介入せず、在庫と価格の公表を続ける」

> 市がやるのは、数字を毎日出すことだけ。
> 安上がりで、劇的でもない。

condition: `{ "not": { "any": [ { "flag": "priceCapActive" }, { "flag": "subsidyActive" }, { "flag": "rationingActive" } ] } }` / ifUnmet: `hide`

`budget` −5 / `supply` +6 / `price` −10 / `foodAccess` +4 / `popularity` +1 / `marketRisk` −3

> 「分散した知識」に対応する選択肢。**情報を配ることも政策である**という提示。

next: goto `d3-results`

#### `d3-nothing` 「決めない。今日は何も動かさない」

> 新しい決定はしない。今ある制度はそのまま進み、期限のあるものは期限を迎える。

condition: なし（**無条件選択肢**）

`popularity` −5 / `foodAccess` −2 / `informalMarket` +4 / `budget` −3

next: goto `d3-results`

---

### 30. `d3-results` — 告示

背景 `council-room.png` / onEnter なし

| line id | 話者 | 台詞 | condition |
| --- | --- | --- | --- |
| `dr-01` | narrator | 決定は三日後に告示された。 | — |
| `dr-02` | yamada | 続くと分かれば、設備の更新もできます。……続くなら。 | `{ "flag": "permanentized" }` |
| `dr-03` | misaki | 終わるんですね。……分かりました。準備します。 | `{ "flag": "everReversed" }` |
| `dr-04` | takahashi | 対象世帯の名簿を、毎年更新する仕事が増えました。 | `{ "flag": "targetedSupportActive" }` |
| `dr-05` | misaki | 何も変わらないと聞きました。それが答えなんですね。 | `{ "not": { "any": [ { "flag": "permanentized" }, { "flag": "everReversed" }, { "flag": "targetedSupportActive" } ] } }` |
| `dr-06` | fujii | 三か月後、また同じ机で報告します。 | — |

next: goto `m9-epilogue`

---

### 31. `m9-epilogue` — 三か月後

背景 `street-morning.png` / onEnter なし（**最終判定の直前に数値を動かさない**）

| line id | 話者 | 台詞 | condition |
| --- | --- | --- | --- |
| `ep-01` | narrator | それから三か月。市の朝は、以前と同じ音で始まる。 | — |
| `ep-02` | narrator | 商店街のシャッターが上がる。上がらないシャッターも、二枚ある。 | — |
| `ep-03` | misaki | 今日は買えました。 | `{ "param": "foodAccess", "op": ">=", "value": 60 }` |
| `ep-04` | misaki | 今日も、買えませんでした。 | `{ "param": "foodAccess", "op": "<", "value": 45 }` |
| `ep-05` | yamada | 窯には火を入れています。何年か先のことは、まだ考えられません。 | — |
| `ep-06` | kuroda | 私は次の街へ行きます。ここはもう、普通の相場に戻ったので。 | `{ "param": "supply", "op": ">=", "value": 85 }` |
| `ep-07` | takahashi | 窓口は、まだ開いています。 | — |
| `ep-08` | fujii | 記録は残します。次にこの机に座る人のために。 | — |

next: `{ "type": "resolveEnding" }`

---

## 14. エンディング

`resolveEnding` は **配列の先頭から順に評価し、最初に条件を満たしたもの**を採用する。
**配列の最後（`mixed-ledger`）は条件を持たない**（フォーマット検証の必須ルール）。

| # | id | タイトル | rank | 条件 |
| --- | --- | --- | --- | --- |
| 1 | `the-city-pays` | 市が払います | `normal` | `budget <= 15` |
| 2 | `policy-drift` | 政策迷走 | `bad` | `policyChanges >= 3` **かつ** `popularity <= 45` |
| 3 | `two-markets` | 表の市場、裏の市場 | `normal` | `informalMarket >= 45` **かつ** `supply <= 60` |
| 4 | `cheap-bread-empty-shelves` | 安いパン、空の棚 | `bad` | `priceCapActive` **かつ** `supply <= 50` |
| 5 | `for-those-who-need` | 必要な人へ | `good` | `targetedSupportActive` **かつ** `foodAccess >= 65` |
| 6 | `price-called-bread` | 高値が呼んだパン | `good` | `supply >= 85` かつ `foodAccess >= 65` かつ `not priceCapActive` かつ `not rationingActive` |
| 7 | `mixed-ledger` | 混ざった帳簿 | `normal` | **条件なし（フォールバック）** |

### 到達検証（19経路をシミュレーションした結果の抜粋）

| 経路 | pop | budget | supply | price | informal | **food** | risk | 転換 | → エンディング |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A統制→維持→**黙認**→恒久化 | 58 | 57 | 16 | 160 | 66 | **57** | 27 | 1 | 表の市場、裏の市場 |
| A統制→維持→**摘発**→恒久化 | 53 | 48 | 18 | 160 | 34 | **27** | 15 | 0 | 安いパン、空の棚 |
| A統制→配給→黙認→恒久化 | 69 | 42 | 15 | 160 | 78 | **62** | 29 | 2 | 表の市場、裏の市場 |
| A統制→配給→価格緩和→補助・購入制限終了 | 43 | 68 | 59 | 230 | 24 | 57 | 11 | **3** | 政策迷走 |
| A統制→緩和→情報公開 | 47 | 82 | 68 | 195 | 13 | 60 | 8 | 1 | 混ざった帳簿 |
| B補助→補助増額→恒久化 | 64 | **0** | 96 | 175 | 8 | 79 | 12 | 0 | 市が払います |
| B補助→維持→補助終了 | 40 | 27 | 92 | 215 | 0 | 72 | 7 | 1 | 高値が呼んだパン |
| C緩和→維持→情報公開 | **39** | 88 | 106 | 165 | 2 | **78** | 12 | 0 | 高値が呼んだパン |
| C緩和→限定支援→限定恒久 | 47 | 58 | 102 | 175 | 2 | **89** | 14 | 0 | 必要な人へ |
| C緩和→配給→何もしない | 44 | 75 | 89 | 180 | 35 | 73 | 19 | 1 | 混ざった帳簿 |
| D限定→維持→限定恒久 | 45 | 55 | 69 | 225 | 2 | 73 | 9 | 0 | 必要な人へ |
| D限定→価格統制→価格上限解除 | 50 | 55 | 59 | 205 | 19 | 65 | 9 | 2 | 必要な人へ |

**全 7 エンディングが到達可能。** そして、

- **完全勝利は存在しない。** 表中で最高の `foodAccess` 89 を出す経路は支持率 47。
  支持率最高の 69 を出す経路は正規供給 15。`budget` 88 を残す経路は支持率 39。
- **同じ「価格統制」から、正反対の結末に分かれる。**（1行目と2行目）
- **`informalMarket` が高く `marketRisk` が中程度**の状態（66/27）が成立する。
  規模の大きさと危険性は連動しない。

### 各エンディングの本文

#### 1. `the-city-pays` 「市が払います」 rank: `normal`

| line id | 話者 | 台詞 | condition |
| --- | --- | --- | --- |
| `tcp-01` | narrator | パンはあった。値段も、危機の前ほどではないが落ち着いた。 | — |
| `tcp-02` | narrator | 市の口座には、ほとんど何も残っていなかった。 | — |
| `tcp-03` | fujii | 来年度の予算編成を始めました。削る欄から埋めています。 | — |
| `tcp-04` | fujii | 学校の防水、橋の点検、図書館の開館日。どれも、今日は困りません。 | — |
| `tcp-05` | yamada | 補助が切れたら、その日から二百四十円に戻します。戻すしかありません。 | `{ "flag": "everSubsidy" }` |
| `tcp-06` | narrator | 市は、危機を買い取った。支払いは、これから何年もかけて行われる。 | — |

summary: 供給と生活は守られた。その費用は、まだ来ていない年度から前借りされている。

#### 2. `policy-drift` 「政策迷走」 rank: `bad`

| line id | 話者 | 台詞 | condition |
| --- | --- | --- | --- |
| `pd-01` | narrator | 一年のあいだに、市の方針は三度変わった。 | — |
| `pd-02` | yamada | 設備の見積もりを二回取って、二回とも断りました。三か月後が分からないので。 | — |
| `pd-03` | kuroda | この街は、今は避けています。契約が読めない街には、荷を置きにくいので。 | — |
| `pd-04` | misaki | どれが今の制度なのか、正直、もう分かりません。 | — |
| `pd-05` | narrator | どの一手も、それ自体は筋が通っていた。 | — |
| `pd-06` | narrator | ただ、次に何が来るか分からないこと自体が、新しいコストになっていた。 | — |

summary: 個々の判断は誤りではなかった。変わり続けること自体が、市民と業者の計画を壊した。

> **「間違いを認めて政策を変えたこと」を罰していない。** 罰しているのは、
> 街が方針を予測できなくなったこと。だから発生条件は転換 3 回**かつ**支持率 45 以下とし、
> 一度や二度の転換では絶対に発生しない。

#### 3. `two-markets` 「表の市場、裏の市場」 rank: `normal`

| line id | 話者 | 台詞 | condition |
| --- | --- | --- | --- |
| `tm-01` | narrator | 商店街の値札は百六十円のままだ。棚は、たいてい空だ。 | — |
| `tm-02` | narrator | 公民館の駐車場では、同じパンが二百九十円で売られている。そちらには、ある。 | — |
| `tm-03` | misaki | 高いです。おかしいとも思います。 | — |
| `tm-04` | misaki | でも、うちの子は今週も朝ごはんを食べました。 | — |
| `tm-05` | yamada | 表の店を続けているのは、意地みたいなものです。 | — |
| `tm-06` | takahashi | 同じ場所で、食品以外のものも動き始めています。そちらは、市が何も保証できません。 | `{ "flag": "illicitGoodsAppeared" }` |
| `tm-07` | takahashi | 売っている人の顔は、だいたい分かるようになりました。それが良いことなのかは、まだ分かりません。 | `{ "param": "marketRisk", "op": "<", "value": 35 }` |
| `tm-08` | narrator | 市は、この市場を作らなかった。ただ、消すこともできなかった。 | — |
| `tm-09` | narrator | 市場を禁じることと、取引そのものを消すことは、同じだろうか。 | — |

summary: 公定価格は低いまま、実際の取引は別の場所へ移った。多くの市民はそこで食料を確保しているが、そこに市の保証はない。

#### 4. `cheap-bread-empty-shelves` 「安いパン、空の棚」 rank: `bad`

| line id | 話者 | 台詞 | condition |
| --- | --- | --- | --- |
| `ces-01` | narrator | 条例は守られた。価格は百六十円のままだ。 | — |
| `ces-02` | narrator | その値段で買えたと答えた市民は、月に一度か二度だと言う。 | — |
| `ces-03` | misaki | 安いんです。ずっと、安いままなんです。 | — |
| `ces-04` | yamada | 週に二日だけ焼いています。それ以上焼くと、赤字の日が増えるので。 | — |
| `ces-05` | misaki | 少し前まで、裏で買えました。今はそれもありません。 | `{ "flag": "everCrackdown" }` |
| `ces-06` | narrator | 一部の市民は、まだどこかで手に入れている。多くは、そうではない。 | `{ "param": "informalMarket", "op": ">=", "value": 20 }` |
| `ces-07` | narrator | 価格は下がった。パンは減った。この二つは、別々の出来事ではなかった。 | — |

summary: 合法な価格は最後まで低く保たれた。ただし、その価格で買える機会そのものが減っていった。

#### 5. `for-those-who-need` 「必要な人へ」 rank: `good`

| line id | 話者 | 台詞 | condition |
| --- | --- | --- | --- |
| `ftn-01` | narrator | 店頭価格は市場のままだ。安くはない。 | — |
| `ftn-02` | narrator | 棚には、たいていパンがある。 | — |
| `ftn-03` | misaki | うちは支給を受けています。それで、なんとかなっています。 | — |
| `ftn-04` | takahashi | 対象は千四百世帯。毎年、名簿を作り直します。 | — |
| `ftn-05` | takahashi | 基準の一円外側にいる人からは、今年も電話が来ます。私はまだ、答えを持っていません。 | — |
| `ftn-06` | yamada | 値段を決めるのはうちです。払えない人を支えるのは市です。……分かりやすくは、なりました。 | — |
| `ftn-07` | narrator | 誰も歓声を上げなかった。窓口だけが、これからも開き続ける。 | — |

summary: 価格を市場に任せ、生活の保障は行政が引き受けた。線引きの負担と事務費は、毎年ここに残る。

#### 6. `price-called-bread` 「高値が呼んだパン」 rank: `good`

| line id | 話者 | 台詞 | condition |
| --- | --- | --- | --- |
| `pcb-01` | narrator | 危機の三か月目、パンは二百四十円だった。 | — |
| `pcb-02` | narrator | 一年後、棚は埋まり、価格は {{param.price}} 円まで戻っている。 ⚠ | — |
| `pcb-03` | kuroda | 高かったから運びました。それだけです。感謝はいりません。 | — |
| `pcb-04` | misaki | 高い時期は、本当にきつかったです。あれを「調整」と呼ぶ人とは、まだ話せません。 | — |
| `pcb-05` | yamada | 商店街で二軒、閉まりました。四十年と、六十年の店です。 | — |
| `pcb-06` | yamada | 残ったのが、うちが正しかったからだとは思っていません。 | — |
| `pcb-07` | narrator | 値段は、荷を呼んだ。呼ばれるまでの数か月は、誰かが耐えていた。 | — |

summary: 価格の上昇が市外から供給を呼び戻し、棚は埋まった。その数か月の負担と、退出した店は戻らない。

#### 7. `mixed-ledger` 「混ざった帳簿」 rank: `normal` / **条件なし**

| line id | 話者 | 台詞 | condition |
| --- | --- | --- | --- |
| `ml-01` | narrator | 一年が過ぎた。都市は、はっきりした答えを出さなかった。 | — |
| `ml-02` | narrator | いくつかの政策は効いた。いくつかは、効く前に終わった。 | — |
| `ml-03` | misaki | 去年よりましです。おととしよりは、ずっと悪いです。 | — |
| `ml-04` | yamada | 続いています。それ以上のことは、言えません。 | — |
| `ml-05` | fujii | 記録には、こう書きます。「複数の措置を併用し、決定的な悪化は避けた」。 | — |
| `ml-06` | fujii | 決定的な改善も、避けました。 | — |
| `ml-07` | narrator | 帳簿には、赤も黒も並んでいる。 | — |

summary: 複数の政策の長所と短所が打ち消し合った。破綻はしなかったが、どの問題も解決していない。

---

## 15. Result 画面

**現行の `EndingView` コンポーネントで表示できる範囲**（UI 変更なし）。

| 表示要素 | データ源 | 備考 |
| --- | --- | --- |
| エンディング名・rank | `ending.title` / `ending.rank` | |
| 本文 | `ending.narrative`（＝表示された ending lines） | |
| 一行総括 | `ending.summary` | |
| 最終パラメータ | `view.params` | `policyChanges` は非表示設定のため出ない |
| 選択履歴 | `state.choiceHistory` | 選んだ選択肢の `text` が並ぶ |

### プレイヤーに読み取ってほしい対比

Result 画面で `price` と `foodAccess` が並ぶことに意味がある。

- 「価格 160 円 / foodAccess 27」→ **安いが、食べられていない**
- 「価格 160 円 / foodAccess 57」→ **安く、正規では買えず、それでも食べられている**
- 「価格 235 円 / foodAccess 77」→ **高いが、食べられている**

この 3 行が並ぶことが、本作の結論の代わりである。**地の文で説明しない。**

---

## 16. ECONOMICS 解説（全文）

エンディング到達後に表示する解説。**話者は `analyst`（解説）。本編には一切登場させない。**

### 実装方式（UI を変更しない前提）

現行エンジンにはエンディング後の追加画面がない。そこで、
**各エンディングの `lines` の末尾に、そのルートに関係する解説カードを 4 枚だけ `analyst` の台詞として追加する。**
`EndingView` の `narrative` にそのまま並ぶため、UI 変更は不要。

全 12 枚は以下に全文を書く。将来 Result 画面に解説パネルを作る場合は、ここから全文を流用する。

### カード全文

**E01 希少性**
> 小麦が減っても、パンを食べたい人の数は減りませんでした。
> 足りないものを、誰がどれだけ持つかを決める方法は、必ず何かしら必要になります。
> 値段で決めるか、行列で決めるか、行政が決めるか。方法が違うだけで、選ばれなかった人は必ず出ます。

**E02 需要と供給**
> 値段が上がると、買う量は少し減り、売りたい量は増えます。
> この二つが釣り合うところに、店頭の値段は落ち着こうとします。
> 釣り合う前の値段で止めると、片側だけが動きます。

**E03 価格シグナル**
> 黒田さんは、この街を助けるために荷を運んだのではありません。
> 「この街は高い」という情報が、運ぶ価値があると伝えたから運びました。
> 値段は、支払いの額であると同時に、遠くの人へ届く合図でもあります。

**E04 価格上限**
> 上限を決めると、その値段で買えた人は確かに得をします。
> 同時に、その値段では売りたくない人が売るのをやめます。
> だから「安く買えるようになる」ことと「買えるようになる」ことは、同じではありません。

**E05 補助金**
> 補助金は、値段を下げながら供給も保てる、数少ない方法です。
> ただし、支払いは消えたのではなく、市の会計へ移っただけです。
> そして、補助が出ると分かった相手は、その分だけ値をつけ直すことがあります。

**E06 参入障壁**
> 市外の業者が入りにくい仕組みは、地元の店を守ります。
> 同じ仕組みが、足りないときに荷が入ってくるのも遅らせます。
> 守ることと閉じることは、平時には区別できても、危機には同じ形をしています。

**E07 限定支援**
> 全員の値段を下げる代わりに、困っている人にお金を渡す方法です。
> 値段の合図を壊さずに済むので、供給は減りにくくなります。
> 代わりに「誰が困っているか」を誰かが決めなければならず、その線の外側には必ず人がいます。

**E08 機会費用**
> 藤井さんは、どの政策にも賛成も反対もしませんでした。
> 彼が数えていたのは、その政策のために「やらなかったこと」です。
> 予算に使い道を書くことは、同時に、別の使い道を消すことでもあります。

**E09 分散した知識**
> 市長室には、市内の在庫も、各家庭の事情も、全部は集まりません。
> 山田さんは自分の窯のことを知り、美咲さんは自分の台所のことを知っています。
> 中央で正しく決めるのが難しいのは、意欲や能力の問題ではなく、情報がそもそも散らばっているからです。

**E10 非公式市場**
> 取引を禁じても、需要と供給そのものは消えません。
> 買いたい人と売りたい人が残っていれば、取引は別の場所へ移ります。
> 公民館の駐車場に人が集まったのは、そこにしか市場が残っていなかったからです。

**E11 非公式市場のもう一つの側面**
> 非公式市場は、正規市場が届かなくなった食料を人々へ届けることがあります。
> 同時に、そこでの取引には返品も保証も届出もありません。
> そして同じ流通経路には、食品以外の、規制の対象になる商品も入り込むことがあります。
> **食料が非公式に流れることと、犯罪市場ができることは、同じではありません。**
> ただし、経路が同じになると、区別する仕事は行政の側に残ります。

**E12 「値段」と「手に入るか」は別の数字**
> このゲームには、価格と `foodAccess` という二つの数字がありました。
> 公定価格が最も低かった結末で、市民が最も食べられていたわけではありません。
> 合法な価格、実際に払われた価格、実際に手に入ったかどうか。この三つは、いつも同じではありません。

**E13 制度の予測可能性**（`policy-drift` 専用）
> 政策を変えること自体は、失敗ではありません。効かないと分かったら変えるべきです。
> ただし、山田さんが設備の見積もりを断ったのは、政策の中身のせいではありませんでした。
> 三か月後が分からないこと自体が、投資と契約をためらわせます。

### エンディング別の解説カード割り当て（各4枚）

| エンディング | 解説カード |
| --- | --- |
| `the-city-pays` | E05 補助金 / E08 機会費用 / E02 需要と供給 / E12 値段と入手 |
| `policy-drift` | **E13 予測可能性** / E03 価格シグナル / E08 機会費用 / E12 値段と入手 |
| `two-markets` | E04 価格上限 / **E10 非公式市場** / **E11 もう一つの側面** / E12 値段と入手 |
| `cheap-bread-empty-shelves` | E01 希少性 / E04 価格上限 / E10 非公式市場 / E12 値段と入手 |
| `for-those-who-need` | E07 限定支援 / E03 価格シグナル / E08 機会費用 / E12 値段と入手 |
| `price-called-bread` | E03 価格シグナル / E06 参入障壁 / E01 希少性 / E12 値段と入手 |
| `mixed-ledger` | E02 需要と供給 / E08 機会費用 / E09 分散した知識 / E12 値段と入手 |

**E12 はすべてのエンディングに入れる。** これが本作の問いそのものだからである。

---

## 17. 実装時の注意

### 17.1 現行 `scenario.json` からの差分

現在の `scenarios/bread-price/scenario.json` は**エンジン検証用の骨組み**であり、本設計で全面的に差し替える。

| 項目 | 現行 | 本設計 |
| --- | --- | --- |
| パラメータ | `blackMarket` | **`informalMarket` に置換** |
| パラメータ | — | **`foodAccess` / `marketRisk` / `policyChanges` を追加** |
| `budget` | −200〜500 / 初期 100 | **0〜100 / 初期 100** |
| `supply` | 0〜200 / 初期 80 | **0〜120 / 初期 60** |
| `price` | 初期 320 | **初期 240** |
| `price` の goodDirection | `down` | **`neutral`**（§2 の理由） |
| 登場人物 | 3人 | **7人**（`analyst` 含む） |
| シーン | 11 | **31** |
| エンディング | 5 | **7** |
| `meta.estimatedMinutes` | 5 | **12** |
| `meta.version` | 0.1.0 | **1.0.0** |

### 17.2 エンジンに手を入れずに済ませるための約束

1. **`foodAccess` は計算式ではなく手書きの効果である。**
   エンジンに派生パラメータの機能はない。すべての `effects` / `onEnter` に明示的に書く。
   数値を変えるときは §18 の検算を必ず回し、`supply` / `informalMarket` との整合が崩れていないか見る。

2. **分岐専用シーン（`d2-router` / `m6-router`）は `lines: []`。**
   エンジンは表示行 0 のシーンをそのまま次へ解決する（`engine/transition.ts` の `enterScene`）。
   ただし `visitedScenes` と `history` には残るので、**`visited` 条件の対象にしない。**

3. **各 `choices` に無条件の選択肢を必ず 1 つ。**
   `decision-1` → `d1-price-cap` / `d1-deregulate`、`decision-2` → `d2-hold`、
   `informal-decision` → `informal-crackdown` / `informal-tolerate`、`decision-3` → `d3-nothing`。
   検証ルール「条件なしの選択肢が最低1つ必要」を満たしている。

4. **`endings` の最後（`mixed-ledger`）に `condition` を付けない。** 検証エラーになる。

5. **フラグは全 17 個を `initialState.flags` に `false` で宣言する。** 未宣言フラグの使用は検証エラー。

6. **`ifUnmet` の使い分け**
   - `disable` + `unmetText`: 財政が理由のもの（「その手はあるが、いま金がない」を見せる）
   - `hide`: 制度の有無が条件のもの（存在しない制度の撤回は選べない）

7. **台詞 ID は全編で一意。** 将来の音声キーは `bread-price/<sceneId>/<lineId>`。

8. **⚠ 印の行は `{{param.x}}` を含む。** 音声を付ける段階で `voiceText`（数値を含まない読み上げ文）が必要。
   例: 表示「余力は {{param.budget}}。」/ 音声「余力は、お手元の数字のとおりです。」

9. 実装後に `pnpm validate` と `pnpm test` を回す。
   通しプレイテストのケースは §14 の到達表からそのまま起こせる。

### 17.3 執筆・改稿時に壊してはいけないもの

- `d2-01` 〜 `d2-03`（「間違いを認めないよりはましです」）
  → 政策転換を悪としない、という本作の立場の明示。
- `ii-07` / `ii-08`（食品の話と、それ以外の話を分ける）
  → 非公式食品市場と違法商品市場を概念的に区別する宣言。
- `ica-05`（取引は消えた。需要は消えなかった。）
  → 摘発の帰結を一行で示す本作の核。
- `tm-09`（市場を禁じることと、取引そのものを消すことは、同じだろうか。）
  → プレイヤーに残す問い。答えを書かない。
- `wc-04`（値段と、買えるかどうかは、別の数字です。）
  → 中心テーマの提示。ここだけは説明的でよい。

### 17.4 描写の禁止事項（改稿時のチェックリスト）

- 価格統制を支持する市民・職員を、無知や愚か者として描かない。
- 規制緩和を支持する人物を、冷酷な人間として描かない。
- 黒田を悪役にしない。同時に、街の恩人にもしない。
- 非公式市場の売り手を犯罪者集団として描かない。同時に、義賊にもしない。
- 山田を「非公式販売に手を染めた人」として描かない（誘われた事実を報告する側に留める）。
- 地の文で政策を評価しない。評価は数値と、登場人物の生活の描写に任せる。

---

## 18. プレイテストで調整する項目

**本設計の数値は「最初のプレイテスト用バランス」であり、最終値ではない。**
特定の結論を勝たせるために逆算した数値は使っていない（§14 の到達表がその検証結果）。

### 優先度：高（最初のテストで必ず見る）

| 項目 | 現在値 | 見るポイント |
| --- | --- | --- |
| `foodAccess` の初期値と全増減 | 初期 55 | **最重要。** 「安いが買えない」と「高いが買える」の差が体感できるか |
| 非公式市場イベントの発生閾値 | `informalMarket >= 35` | 統制ルートで確実に、緩和ルートでは滅多に起きないか |
| `informal-tolerate` の `foodAccess` +18 | +18 | 大きすぎると黙認が万能に、小さすぎると本作の主張が消える |
| `informal-crackdown` の `foodAccess` −12 | −12 | 摘発が「単なる悪手」になっていないか（`marketRisk` −6 と釣り合うか） |
| 補助金ルートの財政消耗 | −35 / −16 / −28 / −18 | 出口を選べば生き残り、拡大し続けると破綻する、になっているか |
| 1周の所要時間 | **実測見積 8〜12 分** | 表示行数は最大 105 行（イベントあり・エンディング本文と解説込み）。短ければ prologue と 6か月後シーンを増やす |

### 優先度：中

| 項目 | 現在値 |
| --- | --- |
| `the-city-pays` の閾値 | `budget <= 15` |
| `two-markets` の閾値 | `informalMarket >= 45` かつ `supply <= 60` |
| `policy-drift` の閾値 | `policyChanges >= 3` かつ `popularity <= 45` |
| 価格統制の `supply` 減少幅 | 直後 −8 / 3週間後 −16 / 6か月後 −8 |
| `decision-2` の選択肢数 | 6（条件により実際の表示は 3〜5） |
| エンディングの `rank` 配分 | good 2 / normal 3 / bad 2 |

### 優先度：低（本文が固まってから）

- 各シーンの行数バランス（現在 5〜9 行）
- `misaki` の登場頻度（現在いちばん多い。多すぎないか）
- `kuroda` の登場が少ないルート（限定支援ルート）で、価格シグナルの説明が弱くならないか
- 背景画像の論理パス名（現在は仮）

### 調整してはいけないもの

**「特定の政策が常に最適になる」方向へは調整しない。**
19 経路のシミュレーションで、`foodAccess` 最高値の経路が支持率で劣り、
支持率最高の経路が正規供給で劣る、という関係を維持すること。
どれか一つの政策が全指標で勝つ状態になったら、それはバランス調整の失敗である。

---

## 19. 設計セルフチェック結果

本設計書に対して機械的な検証を実行した結果（2026-09-02 時点）。

| 検査項目 | 結果 |
| --- | --- |
| Scene ID の重複 | **なし**（31 シーン、すべて一意） |
| Scene 一覧表と本文見出しの一致 | **一致**（31 / 31） |
| line ID の重複 | **なし**（210 行、すべて一意） |
| 未定義シーンへの遷移 | **なし** |
| どこからも参照されないシーン | **なし**（`prologue-street` が開始点） |
| `{{param.x}}` の参照先 | すべて定義済みパラメータ（21 行が該当、⚠ 印と完全一致） |
| 使用フラグの宣言漏れ | **なし**（17 個すべて §3 に宣言） |
| エンディング数と最後のフォールバック | 7 種、最後の `mixed-ledger` は条件なし ✅ |
| 全エンディングの到達可能性 | **7/7 到達確認**（19 経路シミュレーション、§14） |
| 無条件選択肢の有無 | 4 つの `choices` すべてに 1 つ以上あり |
| 1 周の表示行数 | 最大 105 行 → 読み 5 秒/行 + 判断 4 回で **約 10〜12 分** |

### 話者別の行数バランス

| 話者 | 行数 | 備考 |
| --- | --- | --- |
| narrator | 62 | 地の文 |
| misaki | 40 | 最多。市民視点が本作の軸のため意図的 |
| fujii | 39 | 数値報告を担当するため多い |
| yamada | 30 | |
| takahashi | 25 | |
| kuroda | 14 | **最少。限定支援ルートで登場が薄くなる**（§18 の調整項目） |
| analyst | 0 | **本編には登場しない**（解説カードのみ） |

### 主張の中立性チェック

- どの初期政策（A〜D）からも、`good` ランクのエンディングに到達できる経路がある。
- `foodAccess` 最高値の経路（93）は支持率 43。支持率最高の経路（69）は正規供給 15。
  **全指標で勝つ政策は存在しない。**
- 価格統制ルートは、非公式市場の扱い次第で `foodAccess` 27 にも 57 にもなる。
  **政策そのものではなく、その後の判断が結末を分ける。**
- 摘発（`informal-crackdown`）には実際の成果（`marketRisk` −6、偽支給券の摘発）がある。
  単なる悪手として設計していない。
- 非公式市場の規模（+10）に対して `marketRisk`（+6）の上がり方を小さくしてある。
  **規模と危険性は連動しない。**
