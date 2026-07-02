# 「夜の上質な遊技場」リデザイン (2026-07)

2026-07 の全面リデザインの記録。旧 `theme.css`(3,771 行モノリス)を廃止し、トークン駆動のレイヤード CSS に置き換えた。**視覚言語に関する記述はこのノートが最新**であり、`tone-and-manner.md` の §3(色)・§4(タイポグラフィ/シェイプ)の具体値はここで上書きされる(情報設計・モーション・コピー・責任あるゲーミングの原則は引き続き有効)。

## なぜ作り直したか

旧デザインの構造的問題:

1. **デザインシステム不在** — トークンは色 20 個のみ。spacing / type-scale / radius スケールが無く、px/rem 生値 840 箇所・ハードコード色 ~360 箇所・border-radius 11 種が蓄積していた。
2. **ディスプレイフォントが Latin-only** — Cinzel は日本語グリフを持たないため、JA 主体サイトなのに見出しがほぼ全てシステムフォント代替+不自然な letter-spacing で描画されていた(安っぽさの最大要因)。
3. **すべてが暗緑** — アプリ外殻も卓面も同系の暗緑で、「卓」がどこにも見えない。チンチロの碗は黒い穴、暗色ダイスが沈む。
4. **ヒエラルキー崩壊** — ロビーに同一見た目のボタン 7 個、Cinzel+大文字+tracking が見出し/ラベル/ボタン全部に適用され「全部が見出し」。

## コンセプト

**ランプの灯る大人の賭場。** 和モダンの品 × カジノテーブルの艶 × 祝祭演出。

### 中核となる 3 つの決定

1. **Chrome / Stage の分離** — アプリの外殻(ヘッダー・ロビー・パネル・ドック)は温かい炭色(`--bg-*` / `--surface-*`)。彩度のあるフェルト緑は**遊技の舞台専用**(`--stage-*`、`.game-table` のランプライト背景と碗・ロビーのゲームタイルのみ)。構造そのもので階層を作る。
2. **日本語ファースト・タイポグラフィ** — display = Shippori Mincho B1 (700/800)、body = Zen Kaku Gothic New (400/500/700)。Cinzel は `--font-logo` としてロゴタイプ専用に格下げ。**ボタンは見出しではない**: コントロールは body 書体・uppercase なし・tracking なし。金額は `.num`(tabular-nums)。
3. **シグネチャ = ランプライト** — 温かい光溜まり(radial の `--stage-lamp`)+フェルト+木のリム(`--stage-rim`)。auth のヒーロー、ロビーのゲームタイル、ゲーム卓面で同じモチーフを反復する。

## トークンシステム (`styles/tokens.css`)

- **色**: chrome(bg-0/1, surface-1..3)/ stage(felt, lamp, rim)/ アクセント(gold, red, success, info, warn)/ テキスト 3 階調(hi/mid/low)。**生 hex は tokens.css と cosmetics.css のみ**。中間色は `color-mix(in srgb, var(--x) N%, …)` で合成する。
- **物体色**: カード象牙・チップ・ダイス・碗の漆はテーマではなく「実体の色」として独立トークン(`--card-*` / `--chip-*` / `--dice-*` / `--bowl-*`)。
- **スケール**: spacing `--sp-1..10`(4px 基調)、type `--fs-xs..2xl`(clamp() 流体)、radius 3 種(`--r-sm/card/pill`)、shadow 2 種、z ladder、motion duration。
- `color-scheme: dark` を宣言(meta + tokens)— Chrome の自動ダークモード/Dark Reader の再ペイント抑止。

コントラストは全ペア実測で WCAG AA(4.5:1)以上。`--text-low` は装飾・大型テキスト専用。

## CSS レイヤー構成

`styles/index.css` が import マニフェスト(= カスケード順):

```
tokens → base → components → auth → info → header → lobby
       → game → chinchiro → overlays → cosmetics → ads → motion
```

- `cosmetics.css` は game/chinchiro の後(スキンの `!important` 上書きを勝たせる)。スキンのクラス名は Firestore の `equipped` データと **ハード契約** — 改名禁止。テーブルテーマは `--stage-*` を上書きして舞台を照らし直す方式。
- `motion.css` は常に最後。**新しい decorative animation を追加したら同一コミットで必ずここの reduced-motion 集約に登録する。**

## UX の主な変更

- **ヘッダー**: ロゴ+(ゲーム中のみ streak)+コイン+ **UserMenu**(名前/W-L-D/効果音/BGM/言語/ログアウトを収容。useModalA11y でフォーカストラップ)。
- **ロビー**: ウォレットストリップ(デイリーボーナス/コイン不足時のみバイルアウト/広告視聴 — 各チップに状態サブテキスト)+静かなナビ(リーダーボード/実績/ショップ)。「参加」は本物の `<button>`(行クリックも維持、ボタンは `aria-hidden` + `tabIndex=-1` で二重タブストップ回避)。ゲームタイルにライブ人数表示。
- **ゲーム画面**: `PhaseStepper`(bet → 出目/ターン → 結果)が常時可視。≥1024px はステージ+右サイドログの 2 カラム grid(ログは内部スクロールのままなので単一スクロール領域規約は無傷)。カードは SVG スート+象牙面(フォントグリフのスート崩れを根絶)、チンチロは漆の碗×象牙ダイス。BankerArea は ≥768px で横組み(席を fold 内に)。
- **モバイル**: ≤600px でステッパーはアクティブステップのみ表示(=フェーズラベルとして機能)。

## 射倖心と誠実さのバランス(2026-07 の方針)

ユーザー指示により**高揚感の演出は第一級の設計目標**: 勝利・ジャックポットの祝祭(金の光芒・シェイク・紙吹雪・カウントアップ)、anticipation、ストリーク炎、卓ヒートは維持・増幅する。

ただし誠実さの一線は不変(`responsible-gaming-pass.md`):
- **near-miss は通常の負け**(anticipation なし・負け SFX・控えめ表示)。負けを勝ちに見せない。
- 損失は中立表示(赤の loss-shaming なし)、bailout コピーは de-shamed のまま。
- 「勝ったときは最高に派手に、負けたときは正直に」。

## 検証記録 (2026-07-03)

- 全コミットで `npm run build` 通過、バックエンド 149 テスト不変。
- ヘッドレス Chrome(拡張なし)で auth/lobby/BJ/チンチロ × 1440/390 スクリーンショット確認。コスメ(midnight)購入→装着→描画、reduced-motion 強制、コントラスト 14 ペア AA 合格。
- 注意: 開発者環境の Chrome には Dark Reader が入っており、実配色と大きく異なって見える。視覚確認は必ず拡張なし(ヘッドレス/シークレット)で行うこと。
