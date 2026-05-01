# 操作がわかりやすい UI/UX — 設計ノート

「次に何をすればいいか」が一目で伝わるための原則と、SatoriCasino への適用案。

## 1. UI 原則

| 原則 | 要点 |
|---|---|
| **アフォーダンス（押せそうに見せる）** | 影・コントラスト・余白で押せる見た目に。押下で即座に視覚反応。 |
| **視覚階層** | サイズ・色・余白で「主 > 副 > 中立」を識別可能に。CTA は背景から浮かせる。 |
| **状態を全部見せる** | default / hover / active / focus / **disabled** / loading / error の差別化。disabled は理由をツールチップで。 |
| **即時フィードバック** | クリック→視覚（凹み・フラッシュ）+ 音 + 画面反応。応答が無いと "壊れた" と感じる。 |
| **コンテキスト・コールアウト** | 「次の一手」を矢印・脈動・スポットライトで指す（常時化しすぎない）。 |
| **粘着ヘッダー** | コイン・ロビー戻り・ヘルプは常に同じ位置に。 |
| **音と動の同期** | コイン落下音とコインアニメ、ボタン音と凹みは同フレームで。 |

## 2. ターン制ゲームでの「自分の番」表現

- 当該プレイヤーを発光・脈動（CSS `box-shadow` の breathe）
- 他プレイヤーは彩度ダウン（`filter: saturate(0.4)`）
- タイマーリングをアバター周囲に（既存 `TurnTimer` を当該席へ寄せる）
- アクションボタンは画面下センターに固定。自分のターン以外は disabled + 理由表示

## 3. SatoriCasino への適用案（優先度順）

### A. アクションボタン状態を 6 段階に厳密化（最小コスト・最大効果）
- 触る場所: `frontend/src/games/blackjack/PlayerBox.tsx`、`frontend/src/games/chinchiro/`
- disabled 時に `title` 属性で理由を表示（「他プレイヤーのターン」「持ちコイン不足」「ベット未確定」）
- hover でほのかな上昇、active で凹みの 2 パターンを CSS で

### B. "次にやること" のスポットライト
- ベット段階ではベットエリアだけが脈動、他は彩度ダウン
- 「あなたの番です」段階ではアクションボタン群だけが脈動
- `frontend/src/shared/components/SpotlightPulse.tsx`（ラッパーで `box-shadow` breathe）を新設

### C. 自席ハイライト＋他席ディム
- 自分の `PlayerBox` / `PlayerSeat` に黄金色のリング + 軽いスケールアップ
- 他席は `filter: saturate(0.5) brightness(0.85)`
- 触る場所: `PlayerBox.tsx`, `chinchiro/PlayerSeat.tsx`, `theme.css`

### D. フェーズインジケーター
- 画面上部に `Bet → Deal → Play → Result` の横プログレスバー（現在位置強調）
- `shared/components/PhaseStepper.tsx` を新設し、game ごとにラベル配列を渡す

### E. ベット UI のクリック圏拡大＋プレビュー
- チップに radial glow、合計表示は大きく中央上部
- 確定ボタンは画面で最も目立つ色
- コイン不足時は赤系 disabled + 残高ヒント

### F. 操作ヒントの常時バー（最下部）
- ショートカットキーを下部に薄く常時表示（"H: Hit / S: Stand / D: Double"）
- キーボード操作対応はそれ自体が UX 改善
- `App.tsx` 下層に `KeyHintBar` を追加

### G. 通信中の明示
- WS 切断・再接続中は半透明オーバーレイ＋スピナー
- `useGameSocket` の接続状態を `App.tsx` で監視 → `ConnectionOverlay`

### H. 初回プレイヤーツアー（Optional）
- 初回ログイン時のみ、ベット → アクション → 結果の 3 ステップで矢印付き説明
- `localStorage` フラグで一度だけ。`shared/components/Tour.tsx`

## 4. 着手順

1. **A**（ボタン状態厳密化）— 半日で全画面の体感が変わる
2. **C**（自席ハイライト＋他席ディム）— 「自分が今動くべき」が瞬時に伝わる
3. **B**（スポットライト・パルス）— フェーズ遷移直後の迷子をゼロに
4. **F**（キーボードヒントバー）— 上級者の体験を底上げ

## 5. 出典

- [Casino Website Design: UX/UI Guide 2025 - Slotegrator](https://slotegrator.pro/analytical_articles/ux-mistakes-to-avoid-while-designing-online-casino-interface.html)
- [Enhancing User Experience: Key Tips for Gaming Platforms - WANDR](https://www.wandr.studio/blog/user-experience-for-gaming-platforms-best-practices)
- [Online Casino Design Secrets](https://amazingarchitecture.com/articles/online-casino-design-secrets-how-uxui-transform-the-gaming-experience)
- [User Experience & Interface Design in Casino Gaming Apps](https://www.onlinedesignteacher.com/2024/02/user-experience-interface-design-in.html)
- [The Conversion Canvas: UI/UX Principles - affnook](https://affnook.com/online-gambling-website-design/)
- [Button State Design: 20 Best Examples 2025 - Mockplus](https://www.mockplus.com/blog/post/button-state-design)
- [Crafting the Perfect Call to Action - VERSIONS](https://versions.com/interaction/crafting-the-perfect-call-to-action/)
- [Call to Action Buttons: Best Practices - Smashing Magazine](https://www.smashingmagazine.com/2009/10/call-to-action-buttons-examples-and-best-practices/)
- [Mastering Intuitive Game UI Design - Zigpoll](https://www.zigpoll.com/content/what-are-the-best-practices-for-designing-intuitive-user-interfaces-that-enhance-player-engagement-without-overwhelming-the-game's-aesthetic)
- [Intuitive Game UI/UX Design - Wayline](https://www.wayline.io/blog/intuitive-game-ui-ux-design)
- [How to Highlight UI Elements Effectively - FasterCapital](https://fastercapital.com/content/How-to-Highlight-UI-Elements-Effectively.html)
- [サイトやアプリのユーザビリティを向上させる35のポイント - ベイジ](http://baigie.me/sogitani/2014/04/usability/)
- [第20回 ボタンのデザインと使い分け - gihyo.jp](https://gihyo.jp/design/serial/01/ui-design-unsung/0020)
- [Game UI Database](https://www.gameuidatabase.com/)
- [Turn Based Strategy UI Design - Ryan Hall](https://turnwolf.artstation.com/projects/4K4Bl)
- [Strategy Game Battle UI - Medium / treeform](https://medium.com/@treeform/strategy-game-battle-ui-3b313ffd3769)
