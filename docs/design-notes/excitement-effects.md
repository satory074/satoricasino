# 射倖心を煽る演出 — 設計ノート

SatoriCasino（Blackjack / Chinchiro）に「次の一手を打ちたくなる」演出を入れるためのリサーチノート。心理学・パチンコ/スロット研究をまとめ、実装の取っ掛かりを併記する。

> **⚠️ 2026-06 更新 — ニアミス増幅は撤去済み。** 下表の「ニアミス効果（Near-Miss）」「LDW」は射倖心研究としては有効だが、SatoriCasino では**意図的に採用しない**。負け確定後にニアミスを煽る演出は典型的ダークパターン（losses disguised as wins）であり、[`tone-and-manner.md`](./tone-and-manner.md) §9 で明示禁止、[`responsible-gaming-pass.md`](./responsible-gaming-pass.md) で撤去内容を記録している。`near_miss` は通常の負けと同じ演出（anticipation/テンション/揺れなし、`LOSS` 表示、事実サブテキスト）。このノートは「なぜ効くか」の理解のために残すが、**実装指針ではない**。

## 1. 心理メカニズム

| メカニズム | 概要 | ゲームへの含意 |
|---|---|---|
| **可変比率強化（Variable Ratio Reinforcement）** | 報酬間隔がランダムなほどドーパミン応答が強い（Skinner）。 | 配当・演出昇格を「ランダムだが当たれば派手」に。等間隔でないこと。 |
| **ニアミス効果（Near-Miss）** | "あと一歩で大当たり" は実勝利と近い脳活動を起こす。 | チンチロで「ピンゾロまであと1個」、BJ で「21にあと1」を視覚的に強調。 |
| **損失を勝利に偽装（LDW）** | 賭け80→戻り65 でも勝利風 SE/演出 を出すと勝ち記憶に化ける。 | push（引き分け）で控えめな祝福音。やりすぎ注意（UK Gambling Commission が規制対象）。 |
| **段階的期待醸成（Reach / Suspense Build-up）** | 「ここまで来てる！」と段階的にシグナルを刻むと中断しにくい。 | カード・ダイスを1枚/1個ずつ "溜め" を入れて公開。BGM の盛り上がりを段階化。 |
| **プレミア演出** | 当たり時にしか出ない演出 = 出た瞬間に勝利確定。希少性が記憶価値を上げる。 | BJ ナチュラル21、チンチロのピンゾロ/シゴロ専用カットイン。 |
| **コントロール錯覚** | プレイヤーがアクション介在 = "自分の腕で勝った" 錯覚。 | アクションボタン押下に振動風アニメ + SE。 |
| **ホットハンド / ギャンブラーの誤謬** | 連勝中は流れ、連敗中は反動と感じる偏見。両方とも継続を促す。 | 連勝/連敗を可視化（ストリーク表示）。 |
| **賑やかな環境＋勝利刷り込み** | 環境音と勝利が結びつくと "華々しい成功体験" として記憶される。 | 他席（AI ボット含む）の勝利をフロア全体に共有。 |
| **速いテンポ＝反省させない** | プレイ間隔が短いほど熟考が減り継続される。 | 次ラウンド自動進行、`new_round` 後の待機を短く。 |

## 2. パチンコ/スロットの定石パターン

- **リーチ**: 同一図柄が「あと1つで揃う」状態でアニメ長尺化。
- **スーパーリーチ**: ノーマルから派生する尺の長い演出。発生率が低いほど信頼度が高い。
- **先読み（保留変化）**: 結果が決まる前から「次のラウンド怪しいぞ」と暗示。
- **連続演出**: 複数ラウンドにまたがって発展。3連勝で BGM 切替、5連勝で背景変化。
- **プレミア演出**: 超レア結果でしか出ない一発確定カットイン。
- **音と画の同期（cinematic punch）**: コイン落下音とコインアニメを同フレームで一致。
- **ロール感（rolling sound）**: 大勝利では SE/BGM の長さを「勝利演出の尺」と一致。

## 3. SatoriCasino 既存資産との対応

- 音響合成: `frontend/src/shared/audio/sounds.ts` の `tone()` / `noiseBurst()` / `chord()`。新 `SoundId` を足すだけで増やせる（CLAUDE.md の audio sharp edge に注意）。
- カード演出: `frontend/src/games/blackjack/`。ダイス: `frontend/src/games/chinchiro/Die.tsx`。エントリーアニメは CSS `@keyframes`（バックグラウンドタブで止まらない）採用済み。
- 共通演出コンポ: `frontend/src/shared/components/`。プレミア演出は別レイヤーのフルスクリーン Overlay として追加するのが綺麗。
- バックエンド演出ヒント: `backend/main.py` の `_broadcast_blackjack` / `_broadcast_chinchiro` に `effect_hint` を足すのが最小侵襲。WS envelope は 1 種なので追加フィールドはそのまま乗る。
- フロア賑やかし: AI ボット（`_run_bot_driver`）が他席で勝つイベントを `floor_event` として broadcast。

## 4. 実装案（優先度順）

1. **ニアミス強調**: BJ で 19/20、チンチロでゾロ目残り1個の時に視覚強調。`BlackjackGame.tsx` / `ChinchiroGame.tsx` の結果直前。
2. **段階的期待醸成（リーチ）**: チンチロ1個目・2個目がゾロ目候補なら3個目だけ尺長め＋BGM フィルタ抜き。
3. **プレミア演出**: ピンゾロ / シゴロ / ナチュラル21専用フルスクリーンカットイン。`shared/components/PremierOverlay.tsx` を新設。
4. **連勝ストリーク**: 3/5/10 連勝で段階的演出。`App.tsx` 上層でカウンタ保持し各ゲームへ props で渡す。
5. **フロア賑やかし**: AI ボット大勝で全テーブルへ `floor_event` broadcast。
6. **コントロール錯覚強化**: ヒット/ロール押下時の触感（CSS scale + bass thump）強化。
7. **LDW 風小演出**: BJ push で控えめ祝福音（要配慮）。

## 5. 出典

- [射幸心 - Wikipedia](https://ja.wikipedia.org/wiki/%E5%B0%84%E5%B9%B8%E5%BF%83)
- [「射幸心」とは？ - eigobu.jp](https://eigobu.jp/magazine/shakoshin)
- [ギャンブルにハマる人たちの心理「リーチ目の法則」 - weblan3](https://weblan3.com/blog/2012/10/30/18/)
- [そもそも射幸心ってなんですか？ - PiDEA X](https://www.pidea.jp/articles/1678756858)
- [Variable Reward Schedules - Prof. Boston](https://www.teachboston.org/variable-reward-schedules-gambling/)
- [The Slot Machine Psyche - PlayStation Universe](https://www.psu.com/news/the-slot-machine-psyche-how-variable-ratio-reinforcement-drives-modern-gaming-engagement/)
- [The Psychology of Gambling - Vegas-Aces](https://www.vegas-aces.com/articles/psychology-gambling/)
- [How Gambling Manipulates Us - Nova Scotia](https://gamblingriskinformednovascotia.ca/how-gambling-manipulates-us)
- [Losses Disguised as Wins - Techopedia](https://www.techopedia.com/losses-disguised-as-wins)
- [Measuring Gamblers’ Behaviour: Negative Sounds and LDWs - PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC8144080/)
- [LDWs in Modern Multi-Line Video Slot Machines (PDF)](https://uwaterloo.ca/reasoning-decision-making-lab/sites/default/files/uploads/files/DixFugetal_10c.pdf)
- [パチンコの信頼度の仕組み](https://xn--u9j3iub5080abs7bxbc.com/reach-300)
- [リーチ (パチンコ) - Wikipedia](https://ja.wikipedia.org/wiki/%E3%83%AA%E3%83%BC%E3%83%81_(%E3%83%91%E3%83%81%E3%83%B3%E3%82%B3))
- [パチンコの先読みとは？ - アミュタメ](https://www.amuse-p.com/blog/sakiyomi/)
- [期待度（信頼度）とは？ - SANKYO](https://www.sankyo-fever.jp/beginner/qa/o_46.php)
- [Anticipation and suspense in slot machine design](https://www.casinocitytimes.com/john-robison/article/ask-the-slot-expert-anticipation-and-suspense-in-slot-machine-design-67754)
- [Slot Machine Psychology: Why You Keep Spinning - oobp](https://www.oobp.org/psychology-behind-slot-machines/)
- [Biases in casino betting - Cambridge Core](https://www.cambridge.org/core/journals/judgment-and-decision-making/article/biases-in-casino-betting-the-hot-hand-and-the-gamblersfallacy/8A9D1813D42FFA25634E7FD26A46D484)
- [The Illusion of Control in Online Games - MakerStations](https://www.makerstations.io/the-illusion-of-control-in-online-games/)
