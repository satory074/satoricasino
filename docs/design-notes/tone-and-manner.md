# SatoriCasino トンマナ (Tone & Manner)

SatoriCasino のビジュアル・モーション・音響・コピーを貫く統一原則をまとめる。視覚や音はすでに `theme.css` と `sounds.ts` に実装されており、コピーは `i18n/locales/ja.ts` に蓄積されているが、それらの「なぜ」と「どう揃えるか」を一枚にした文書がなかった。新ゲーム追加時(CLAUDE.md「Adding a new game」)や新コンポーネント実装時の判断基準として、まずここを参照する。

姉妹ノート:
- [`excitement-effects.md`](./excitement-effects.md) — 興奮レイヤー(near-miss / zone / tier-up / count-up)の実装根拠
- [`ui-ux-clarity.md`](./ui-ux-clarity.md) — 「次に何を押せばいいか」を明示する UI 規約

このドキュメントは両者の上位文書として、より広い「らしさ」の原則を扱う。

---

## 1. 目的と非ゴール

**目的**
- 視覚・音響・コピーを一貫させ、画面ごとに別アプリに見える事故を防ぐ
- 新規貢献者が「らしさ」の判断基準を 30 分で把握できるようにする
- 仮想コイン専業のため、ダークパターンに陥らない明示的な歯止めを置く

**非ゴール**
- 実装の手取り足取り(個別実装は CLAUDE.md と各コンポーネントを参照)
- 営業/マーケティング向けのブランドガイド(本書はプロダクト内の体験に閉じる)

---

## 2. ブランド・エッセンス

### 一行ステートメント

> **「日本の酒場の親しみやすさを纏った、プチ・モナコ。」**

本物のカジノの格式と、日本の伝統博打(チンチロ)の人懐っこさが同居する空間を目指す。深夜にひとりで開いてもいいし、誰かを呼んで観戦させてもいい。緊張と笑いが両立する。

### 4つの中核価値

| 価値 | 意味 | 表れ方の例 |
|---|---|---|
| **Festive** (祝祭性) | 「いま起きていること」を見逃させない | ジャックポット時の画面震動・rim-glow・count-up SFX |
| **Refined** (品格) | 安っぽくない、けばけばしくない | Cinzel 見出し、深緑フェルト、控えめな金量 |
| **Honest** (正直) | プレイヤーを騙さない、隠さない | 確率・配当の事前開示、敬体コピー、近接敗北の正直な明示 |
| **Inclusive** (排除しない) | 初心者・外国人・モバイル・観戦者を弾かない | i18n 必須、スペクテイトモード、touch 代替、reduced-motion 対応 |

矛盾する選択を迫られたときは、上から順に優先する(Festive > Refined > Honest > Inclusive)わけではなく、**Honest を一番下に置かない**ことが肝要。「賭け事の高揚」を「騙して惹きつける」と取り違えない。

---

## 3. ボイス(不変)とトーン(可変)

Atlassian / Mailchimp 流に、**ボイスは常に同じ、トーンは文脈で変わる**。

### ボイス属性(常に効かせる4つ)

1. **礼節がある** — 敬体「です・ます・ください」を基本とする。命令形は避ける(「ベットしろ」ではなく「ベットしてください」)。
2. **劇場性がある** — 重要な瞬間は短く・大きく・大文字で言い切る(「BLACKJACK!!」「ピンゾロ!!」「TIER UP!」)。
3. **遊び心がある** — 機械翻訳的な硬さを避け、「親が振っている…」「他プレイヤー待機中…」のような擬人化と省略を使う。
4. **正直である** — 負けや近接敗北を矮小化しない(「あと 1 で勝ちだった…」「22… たった 1 点超過」)。曖昧な希望表現で次回プレイを煽らない。

### トーン・キャリブレーション(文脈ごとに変える)

| 文脈 | 文字数 | 句読点 | 装飾 | 例 |
|---|---|---|---|---|
| **ジャックポット時** | 短い(1〜6字) | `!!` で締める | ALL CAPS / 絵文字可 | `BLACKJACK!!` `ピンゾロ!!` `🔥 ストリーク MAX!!` |
| **通常勝利** | 短い(1〜10字) | `!` で締める | 軽め | `WIN!` `レベルアップ!` `購入しました!` |
| **ニアミス** | 中(8〜20字) | `…` で余韻 | なし | `あと 1 で勝ちだった…` `わずか {n} 点差…` |
| **敗北** | 短い(1〜8字) | なし | なし | `LOSS` `BUST` `目なし` |
| **待機・進行中** | 中(10〜20字) | `…` | なし | `親が振っている…` `他のプレイヤーが思考中…` |
| **エラー・操作不可** | 中(10〜25字) | 句点なし | なし | `今は操作できないフェーズです` `バーストしているため操作できません` |
| **指示・誘導** | 中(8〜16字) | なし | なし | `← ゲーム選択に戻る` `サイコロを振る` |

**ルール**:
- 絵文字は感情のピーク(ジャックポット相当)でのみ使う。常用しない。
- ALL CAPS は「結果」「TIER UP」「LOSS」など状態ラベル限定。本文に持ち込まない。
- `!!` は最高潮にしか使わない。`!` は通常勝利。`…` は未解決感(ニアミス・待機)。`。` は基本使わず、句点なしで体言止めか「です」「ます」で終える。

---

## 4. ビジュアル言語

### 4.1 カラーパレット

すべて `frontend/src/styles/theme.css` の CSS 変数として定義済み。**コード内ではハードコードせず変数を参照する**。

#### コアパレット(`:root`、theme.css:1〜26)

| 役割 | 変数 | 値 | 用途 |
|---|---|---|---|
| 背景・暗 | `--felt-dark` | `#0a1612` | アプリ最下層、モーダル背景 |
| 背景・中 | `--felt-mid` | `#0b3d2c` | テーブル本体 |
| 背景・明 | `--felt-light` | `#0e5238` | テーブル上のハイライト面 |
| アクセント・主 | `--gold` | `#f4c430` | ボタン、アクセント線、ベットチップ |
| アクセント・暗 | `--gold-soft` | `#d4a017` | グラデーション下地 |
| アクセント・極 | `--gold-bright` | `#ffd84a` | ジャックポット、最高輝度 |
| 緊張色 | `--crimson` | `#c41e3a` | 敗北、危険、tier-2 ストリーク |
| 緊張色・暗 | `--crimson-dark` | `#8a142a` | グラデ下地 |
| 涼色 | `--neon` | `#3aa9ff` | PUSH、tier-1 ストリーク、情報系 |
| テキスト | `--text` (`--cream`) | `#f5f1e8` | 本文 |
| テキスト・補 | `--text-mute` | `#a8b3a4` | キャプション、disabled |
| 状態・成功 | `--success` | `#22c55e` | 勝ち通知、達成 |
| 状態・危険 | `--danger` | `#ef4444` | バースト |
| 状態・警告 | `--warn` | `#f59e0b` | 警告 |

**配色原則**(外部ベストプラクティス: Lounge Lizard / Slotegrator):
- ベースは深緑+クリーム、アクセントはゴールド、興奮はクリムゾン、情報はネオンの **4 色軸** で完結させる。これに収まらない色を導入したくなったら一度立ち止まる。
- ゴールドは安易に多用しない。**画面の 10〜15% 程度**に抑える(ボタン、アクセント、勝利演出)。塗りつぶし面ではなく**輪郭・テキスト・薄い透明グラデ**で使う。
- テーマ別カラー(blackjack/chinchiro/roulette/baccarat/poker/slot/wheel)は theme.css:2334〜2522 にある。新ゲーム追加時はこの並びを尊重し、カードゲームなら `--card-bg/--card-border` を、テーブルテーマなら `--felt-*` 三兄弟を上書きする。

### 4.2 タイポグラフィ

| 役割 | フォント | ウェイト | 用途 |
|---|---|---|---|
| Display | `--font-display` (Cinzel, Playfair Display, Georgia, serif) | 500 / 700 / 900 | ロゴ、見出し、結果表示 |
| Body | `--font-body` (Inter, system-ui, sans-serif) | 400 / 500 / 600 / 700 | 本文、ボタン、UI ラベル |

**慣習**:
- ロゴ・結果オーバーレイ・テーブル名見出しは Cinzel 900 + `letter-spacing: 0.15em〜0.2em` で「儀式感」を出す。
- 本文サイズはハードコードせず `clamp()` で **下限・推奨vw・上限** を指定する(例: 結果表示 `clamp(2.5rem, 8vw, 5.5rem)`)。上限値は PC 表示の意図サイズ。
- 見出しに ALL CAPS を使うのは Cinzel のみ。Inter で大文字を多用するとノイズになる。
- 本文では絵文字を避ける。バッジ・通知のヘッドラインに限り使用可(🔥 など)。

### 4.3 形状・余白・影

```
--radius-card: 8px;     /* カード、ボタン、入力欄、モーダル外側 */
--radius-pill: 999px;   /* バッジ、StreakBadge、TableHeatBadge */
--shadow-card: 0 4px 12px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.6) inset;  /* 浮き上がり感 */
--shadow-soft: 0 8px 32px rgba(0,0,0,0.45);                                       /* モーダル、ドロワー */
```

- 角丸は基本 `--radius-card` か `--radius-pill` の二択。中間値を新設しない。
- 影は二段階で十分。ホバー時に新しい影を作るのではなく、**既存の影に `transform: translateY(-1px)` を組み合わせて**「持ち上がる」感じを出す。
- モーダルは `--shadow-soft` + `backdrop-filter: blur(6px)` のガラス風が標準(現行 ResultOverlay と一致)。

### 4.4 レスポンシブ三段階

CLAUDE.md の「Sharp edges」と同期。サイズは **`clamp(min, vw, max)` か `min(Npx, 100%)`** のどちらかで書く。生の固定 `width: 280px` を増やすたびに iPhone SE での横スクロールが復活する。

| メディアクエリ | 用途 |
|---|---|
| `@media (max-width: 600px)` | 文字サイズの微調整のみ |
| `@media (max-width: 480px)` | レイアウトリフロー(列スタック、ヘッダ要素の隠蔽、ロゴ縮小、ログ高さ制限) |
| `@media (hover: none) and (pointer: coarse)` | キーボード前提 UI(`.key-hint-bar`)を隠す。**新規にキーボード専用 UI を作るときはタッチ代替を必ず用意する** |

---

## 5. モーション言語

### 5.1 CSS @keyframes vs Framer Motion

| 用途 | 採用 | 理由 |
|---|---|---|
| カード出現、サイコロ転がし、結果オーバーレイの 3 フェーズ、画面震動、ストリーク点滅 | **CSS `@keyframes`** | コンポジタ駆動でバックグラウンドタブでも動く |
| レイアウト遷移、ホバー、一回限りの fade-in、リスト並び替え | **Framer Motion** | 凍結が許容できる演出 |

**理由**: ブラウザは非アクティブタブで `requestAnimationFrame` を停止するため、Framer Motion の進行中アニメは凍る。ジャックポット中にタブを切り替えて戻ってきたら結果が止まっていた、というバグを避けるためにゲームの核心アニメはすべて CSS に寄せる。

### 5.2 結果オーバーレイ 3 フェーズ

`ResultOverlay` がすべての勝敗演出を駆動する。フェーズ遷移は CSS の `@keyframes` と JS タイマで合流する。

| フェーズ | 何が起きる | 主な keyframes | 標準時間 |
|---|---|---|---|
| **Anticipation** | 暗転 + 色付きオーブが脈動。ジャックポット級では rotating golden zone も出る | `backdrop-darken` `anticipation-pulse` `zone-pulse` `zone-rays` | 0〜1.0s(kind により可変、`push`/`wakare` はスキップ) |
| **Reveal** | テキスト爆発 (scale 0.2→1.4→1)、rim-glow 発火、画面震動(該当時) | `reveal-explode` `rim-flash-in` `screen-shake` | 0.4〜0.7s |
| **Afterglow** | 金額が 0 から count-up、テキストが afterglow-shrink でフェード | `afterglow-shrink` `amount-pop` `amount-mega-glow` `rim-fade-out` | 0.5〜1.7s |

**timing scale**: `getTiming(kind, amount)` が結果の重みで時間を伸縮する(例: pinzoro 3.4s 総時間 / lose 1.15s)。通常 `win` も `amount >= 200` で big、`>= 500` で mega に格上げされ、reveal の派手さが変わる。

**BGM 駆動**: ResultOverlay は anticipation 入りで `setBgmTension(level)` を呼び、afterglow 完了で `decayBgmTension()` する。**ゲームコンポーネント側で BGM tension を直接触らない**(チンチロの最終投擲の特例除く)。

### 5.3 ジャックポット級演出の発動条件

「ジャックポット級」= `pinzoro` / `arashi` / `blackjack` などの最高位結果。発動するもの:

- **rim-glow**: フルスクリーンの内向きゴールド光(`inset 0 0 220px 60px gold/0.55`)
- **screen-shake**: `.game-section` に `is-shaking` クラス付与 → `screen-shake 0.5s`
- **count-up SFX**: 金額カウントアップ中に `count_up` を 1 ステップごと(mega は 3 ステップごと)に再生、ピッチ漸増
- **confetti**: ゲームコンポーネント側で `onReveal` のタイミングで発火
- **anticipation_jackpot SFX**: ゲームコンポーネント側で overlay セット時に `play("anticipation_jackpot")` する。**ResultOverlay は anticipation SFX を鳴らさない**(各ゲームが結果を予知して鳴らすほうがタイミングが合う)。

新しいジャックポット種別を追加するときは:
1. `ResultOverlay.tsx` の `ResultKind` 型に追加
2. `RIM_GLOW_KINDS` / `POSITIVE_AMOUNT_KINDS` に分類追加
3. `getTiming()` に anticipation/reveal/afterglow 値を追加
4. ゲームコンポーネントの `onReveal` で SFX + confetti + `is-shaking` を発火

### 5.4 ゲーミフィケーション視覚

| 要素 | 視覚言語 | 主な keyframes |
|---|---|---|
| **StreakBadge tier-1** (3 連勝) | ネオン青背景 + 軽い青グロー | (静的) |
| **StreakBadge tier-2** (5 連勝) | 赤グラデ + `streak-flicker 1.6s` 点滅 | `streak-flicker` |
| **StreakBadge tier-3** (10 連勝) | 強ゴールド + 複合グロー + `streak-flicker 1.2s` 高速 + `streak-tier-up` 一発 | `streak-flicker` `streak-tier-up` `tier-up-toast` |
| **TableHeatBadge `.hot`** | 赤系背景 + `heat-pulse 1.4s` | `heat-pulse` |
| **TableHeatBadge `.ultra-hot`** | ゴールド+赤グラデ + `heat-pulse 0.9s` 高速 | `heat-pulse` |
| **CTA ボタン** (押せる時) | `ActionButton highlight` で `cta-pulse 1.2s` のゴールド脈動 | `cta-pulse` |
| **near-miss** | 背景クリムゾンフラッシュ + オーブ揺れ | `near-miss-flash` `near-miss-orb-shake` |

### 5.5 prefers-reduced-motion

`@media (prefers-reduced-motion: reduce)` で **`screen-shake` 系・連続点滅系を無効化**する。新しい持続的アニメ(2 秒以上ループ・揺れ・点滅)を追加するときは必ずこのメディアクエリで `animation: none` か穏やかな代替に差し替える。一回限りの fade/scale は許容する。

---

## 6. 音響言語

### 6.1 全 SFX をシンセ生成する哲学

`frontend/src/shared/audio/sounds.ts` がすべての SFX を Web Audio API で合成する。**音声アセットファイルを置かない**。

理由:
- バンドルサイズの肥大化を避ける(初回読込が速い = モバイル体験向上)
- ライセンス・著作権の罠を踏まない
- ピッチシフト・テンポ変化を実行時にパラメータ化できる(例: `chip_place` がベット額に応じて高音化)

新しい音を増やしたくなったら、まず既存の `tone()` / `noiseBurst()` / `chord()` ヘルパで作れないか検討する。素材を探しに行かない。

### 6.2 SFX 一覧

| ID | 用途 | カテゴリ |
|---|---|---|
| `card_deal` `card_flip` | カード配布・めくり | ゲーム動作 |
| `chip_place` `chip_payout` | チップ置き・払い戻し(ベット額でピッチシフト) | ゲーム動作 |
| `dice_shake` `dice_land` | サイコロ振り・着地 | ゲーム動作 |
| `button_click` | UI ボタン | UI |
| `hit` `stand` | ブラックジャックのヒット/スタンド | アクション |
| `win` `big_win` `blackjack` | 通常勝ち / 大勝ち / ブラックジャック | 勝利 |
| `lose` `bust` `push` | 負け / バスト / 引き分け | 敗北 |
| `pinzoro` `arashi` `shigoro` `hifumi` `menashi` | チンチロ役 | 役判定 |
| `count_up` `tick` | 金額カウントアップ / タイマ | フィードバック |
| `near_miss` | 近接敗北 | 演出 |
| `bonus` | 日次ボーナス受取 | 演出 |
| `heartbeat` | 緊張時の心音 | 緊張 |
| `anticipation_jackpot` `anticipation_win` `anticipation_lose` | 結果直前の予感音 | 緊張 |

`SoundId` 型は `GameRouter.tsx` / `BlackjackGame.tsx` / `ChinchiroGame.tsx` でローカルに再宣言されている(歴史的事情)。**`sounds.ts` に新 ID を足したら、これら 3 ファイルの `SoundId` ユニオンも更新する**。

### 6.3 BGM tension layer

`startBgm()` が常時走る合成グラフを作り、`setBgmTension(0|1|2|3)` でゲイン/フィルタを動的に変える。

| level | 構成 | 文脈 |
|---|---|---|
| **0** | 110Hz 正弦波ドローン + 0.12Hz LFO | 通常待機・ロビー |
| **1** | + 220Hz 矩形波 | 軽い緊張(ベット中・ヒット悩み) |
| **2** | + 440Hz 三角波 + 3Hz トレモロ | 中緊張(ジャックポット級 anticipation) |
| **3** | ゲイン増幅 + フィルタ 800Hz | 最高緊張(チンチロ最終投擲、巨額勝負) |

**重要**: tension oscillator は常時 `start()` 済みでゲインで gating している。**個別 SFX 再生時のように `start()`/`stop()` を呼ぶと fresh-AudioContext の race を踏む**(`tone()` の clamp パターンが対策しているのと同じ理由)。tension の駆動は ResultOverlay が担うのが原則、例外は最終投擲モードのチンチロのみ。

---

## 7. マイクロコピー (UX Writing)

### 7.1 基本原則

- **敬体**: 「です・ます・ください」を基本。命令形は緊急時(エラー)でも使わない。
- **短文**: 1 行 25 字を超えたら分割するか体言止めにする。モバイルで折り返すコピーは伝わらない。
- **一義的**: 「処理に失敗しました」のような無情報な汎用文は禁止。失敗理由を具体的に示す(`コインが足りません` `今は操作できないフェーズです`)。
- **絵文字は感情ピーク限定**: `🔥` はストリーク MAX/超ホット卓のみ。本文・通知の常用は禁止。
- **句点ルール**: 結果ラベルは句点なし。説明文は「です」「ます」で終え句点も置かない(現行 `ja.ts` と統一)。

### 7.2 コンテキスト別サンプル

| 文脈 | OK 例 | NG 例 | NG の理由 |
|---|---|---|---|
| 大勝利 | `BLACKJACK!!` `ピンゾロ!!` | `おめでとう!ブラックジャック達成しました🎉🎰💰` | 装飾過剰、「おめでとう」は冗長 |
| 通常勝利 | `WIN!` `+150 コイン` | `あなたは150コインをゲットしました!すごいですね!` | 冗長、おだてが媚びになる |
| ニアミス | `あと 1 で勝ちだった…` `わずか {n} 点差…` | `惜しい!次は勝てるはず!` | 次回プレイを煽る扇動 |
| 敗北 | `LOSS` `BUST` | `残念!でも次がんばろう!` | 媚び、扇動 |
| エラー | `コインが足りません` `今は操作できないフェーズです` | `エラーが発生しました` `処理に失敗` | 何が悪いか不明 |
| 待機 | `親が振っている…` `他プレイヤー待機中…` | `Loading...` `お待ちください` | 何が起きてるか不明 |
| 解放/操作可 | `サイコロを振る` `ベット {bet} 完了 — 他プレイヤー待機中…` | `クリックして続行` `タップで進む` | デバイス言及は壊れる、可能アクションが不明 |

### 7.3 使う言葉 / 避ける言葉

**使う**: ベット、コイン、ハンド、ターン、フェーズ、親、ジャックポット、ストリーク、レベルアップ、ピンゾロ/アラシ/シゴロ/ヒフミ(チンチロ役は固有名詞、英訳しない)

**避ける**: お金、現金、課金、無料(本アプリは仮想コインのみで現金概念がないため、誤解を招く)、すごい・最高(媚び)、絶対・必ず(賭け事に断定はない)、限定オファー・期間限定(FOMO 扇動)、エラー・処理失敗(無情報)

### 7.4 サーバ vs クライアント責務

- **サーバ**: stable な enum ID と数値のみ返す(`HandName.value = "pinzoro"`, `Result.value = "blackjack"`, `table_id = "bj-low"`)
- **クライアント**: `i18n/locales/{ja,en}.ts` で全表示文字列を解決する

サーバが日本語文字列を返してはいけない。i18n の言語切替が壊れるため。新しい結果種別を追加するときも、サーバは ID だけ、クライアントが `ja.ts` と `en.ts` の両方にエントリを足す(`Translation` 型が英訳の存在を強制する)。

---

## 8. 責任あるゲーミング & ダークパターン回避

SatoriCasino は**現金を扱わない**(課金なし、コイン換金なし、出金なし)が、それでもデザインで人をハックしないために以下を遵守する。外部研究: UX Magazine "Dark UX" / arXiv 2412.05039 / Ethical Games。

### 守る原則

| 原則 | 具体的にやっていること |
|---|---|
| **透明性** | 確率(チンチロの役の発生確率、配当倍率)はゲーム内ヘルプで公開する。隠さない |
| **回復可能性** | コイン破産時は無料で 500 コイン bailout、広告を見れば 1000 まで増やせる(「課金で救済」をやらない) |
| **時間の尊重** | 強制的な連続プレイ誘導(「あと N 戦で報酬」など毎日の onboarding 牽引)はしない。デイリーチャレンジは 3 個固定・スキップ可 |
| **比較煽動の抑制** | リーダーボードはあるが、ロビーや結果画面で「他プレイヤーは N 連勝中!」のような他者比較プッシュをしない |
| **広告の透明性** | 報酬広告は「見ると何が貰えるか」を事前明示(`ads.watchToDouble` = 「広告を見て2倍」)。日次上限を持つ |
| **退出の容易さ** | テーブル離脱・ログアウトは常に 1 タップ。確認モーダルでフリクションを増やさない |

### 避けるパターン

- **隠しコスト**: チンチロの「banker は 5 倍払う可能性がある」を伏せず、ベット時に `coins >= bet * 5` で防御する(CLAUDE.md「Sharp edges」)
- **損失を勝利に偽装**: BUST を派手な祝祭演出で隠さない。負け演出は短く・控えめに(`getTiming("lose") = 1.15s`)
- **疑似ジャックポット**: 小勝ちを大勝ちのように見せない。`win` は `amount >= 200` 以上で初めて big、`>= 500` で mega にエスカレートする(段階的)
- **FOMO 期間限定**: 「あと N 時間でロスト!」のような時限プレッシャーを表示しない。デイリーチャレンジのリセットは粛々と起きる
- **ストリーク継続強要**: 連勝は表示するが「途切れたら惜しい」のリマインダー通知を出さない

新機能を入れるときは「これはユーザーの利益か、それとも滞在時間の利益か」を一度自問する。後者だけなら却下する。

---

## 9. アクセシビリティ

| 観点 | 方針 |
|---|---|
| **コントラスト** | 本文(text on felt-mid)で WCAG AA 相当を確保。`--text-mute` は 14px 以上で使う |
| **モーション** | `prefers-reduced-motion: reduce` で持続点滅・画面震動を無効化(§5.5) |
| **入力デバイス** | キーボード前提 UI には touch 代替を必ず付ける(`@media (hover: none)` で `.key-hint-bar` を隠す事例参照) |
| **色だけに頼らない** | 勝敗・状態は色 + テキストラベルの二重表示(`WIN!` を緑色だけで示さない) |
| **絵文字に頼らない** | `🔥` は装飾、情報本体は文字列(`ホット卓`)。スクリーンリーダで意味を失わない |
| **i18n** | サーバから表示文字列を返さない(§7.4)。新キーは `ja.ts` ⇄ `en.ts` の双方更新を `Translation` 型が強制 |

---

## 10. 新ゲーム追加時のトンマナ準拠チェックリスト

CLAUDE.md「Adding a new game」と併用する。コード配線が済んだあとに以下を確認する。

- [ ] テーマカラーは `--felt-*` 三兄弟の上書きで実現したか(新規色変数を増やしていないか)
- [ ] カードゲームなら `--card-bg` / `--card-border` を上書きしたか(theme.css:2334〜の並びに従う)
- [ ] 見出し・結果テキストは Cinzel、本文は Inter になっているか
- [ ] 画面幅 320px(iPhone SE)で横スクロールが出ないか(全要素 `clamp()` か `min(Npx, 100%)`)
- [ ] 持続的な点滅・揺れに `prefers-reduced-motion` の代替があるか
- [ ] ゲーム固有の役・結果が増えたら `ResultKind` / `RIM_GLOW_KINDS` / `POSITIVE_AMOUNT_KINDS` / `getTiming()` を更新したか
- [ ] ジャックポット級結果に anticipation SFX、reveal で confetti と `is-shaking`、afterglow で count-up SFX が連動するか
- [ ] 新 SFX を増やしたら `sounds.ts` だけでなく `GameRouter` / 各ゲームの `SoundId` 型も更新したか
- [ ] BGM tension は ResultOverlay 経由で動くか(直接駆動するなら理由を明文化)
- [ ] サーバから表示文字列を返していないか(enum ID のみ)
- [ ] `ja.ts` と `en.ts` 両方に新キーを足したか(`Translation` 型エラーがないか `npm run build` で確認)
- [ ] エラー文・待機文が「Loading…」「エラー」のような無情報文になっていないか
- [ ] 結果表示が§3 のトーン表に沿っているか(大勝利は `!!`、ニアミスは `…`、敗北は装飾なし)
- [ ] 勝利演出が負けより派手で、負け演出が勝利を上回らないか(loss は短く控えめ)
- [ ] 「もう一回プレイ」を煽る扇動コピーを足していないか

---

## 11. 参考文献

外部リサーチで参照した一次/二次資料。判断に迷ったときは原典に当たる。

**カジノ UI / 配色**
- Lounge Lizard, [Top 10 Color Palettes for Casino Branding Success](https://www.loungelizard.com/blog/top-10-color-palettes-for-casino-branding/)
- Slotegrator, [Casino Website Design: UX/UI & SEO Guide](https://slotegrator.pro/analytical_articles/ux-mistakes-to-avoid-while-designing-online-casino-interface.html)
- Designer Daily, [Modern UI Trends Reshaping Online Casino Platforms](https://www.designer-daily.com/modern-ui-trends-reshaping-online-casino-platforms-in-2025-181225)

**モーション / Game Juice**
- The Design Lab, [Making Gameplay Irresistibly Satisfying Using Game Juice](https://thedesignlab.blog/2025/01/06/making-gameplay-irresistibly-satisfying-using-game-juice/)
- GammaStack, [How Graphics and Animation Affect the Success of Mini Casino Games](https://www.gammastack.com/blog/how-graphics-and-animation-affect-the-success-of-your-mini-casino-games/)

**トーン・オブ・ボイスの文書化**
- Atlassian Design System, [Voice and Tone Principles](https://atlassian.design/content/voice-and-tone-principles/)
- Mailchimp, [Voice and Tone Style Guide](https://styleguide.mailchimp.com/voice-and-tone/)
- Wise Design, [Tone of Voice](https://wise.design/foundations/tone-of-voice)
- PatternFly, [Brand Voice and Tone](https://www.patternfly.org/ux-writing/brand-voice-and-tone/)

**ダークパターン回避 / 責任あるゲーミング**
- UX Magazine, [Dark UX: The Elements of The Video Gambling Experience](https://uxmag.com/articles/dark-ux-the-elements-of-the-video-gambling-experience)
- arXiv 2412.05039, [Level Up or Game Over: Exploring How Dark Patterns Shape Mobile Games](https://arxiv.org/html/2412.05039v1)
- Ethical Games, [Learn More](http://ethicalgames.org/learn-more)
- Medium / jacob gruver, [The Dark Side of Gamification](https://medium.com/@jgruver/the-dark-side-of-gamification-ethical-challenges-in-ux-ui-design-576965010dba)
