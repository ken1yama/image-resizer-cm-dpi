# 画像リサイズ（cm・dpi 指定） / Image Resizer (cm / dpi)

画像を切り抜き、**印刷サイズ（cm）と解像度（dpi）を指定**してリサイズ・保存するブラウザアプリです。
`index.html` 1 ファイルだけで動作し、**画像はブラウザの中だけで処理されます（外部へ送信しません）**。

**Version 1.0.0** ・ [CHANGELOG](CHANGELOG.md) ・ [MIT License](LICENSE)

- 公開ページ: [https://ken1yama.github.io/image-resizer-cm-dpi/](https://ken1yama.github.io/image-resizer-cm-dpi/)

## 特長

- **切り抜き** — ドラッグで範囲指定、移動・リサイズ、縦横比プリセット（1:1、4:3、3:2、16:9、縦向き）
- **cm × dpi 指定** — 幅・高さ（cm）と解像度（100／300／600 または任意）から出力画素数を算出。縦横比の固定、画素数を変えない原寸指定も可能
- **PNG／JPEG に dpi を書き込み** — Word や Illustrator などで指定した cm サイズとして扱われます（WebP は dpi を書き込めません）
- **リサイズ方式を選択** — エリア平均（図・グラフ・文字向け）／ Lanczos（写真向け）／ブラウザ標準／最近傍（ドット絵向け）
- **結果の確認** — 実際に書き出したデータ（JPEG は圧縮後）をそのまま表示。最大 3200% までズーム、ドラッグで移動
- **一括処理** — 基準画像で指定した切り抜き範囲を全画像に適用し、ZIP で保存
- **入力** — JPEG・PNG・WebP・GIF・BMP・SVG・TIFF／クリップボード貼り付け／ドラッグ＆ドロップ
- 日本語・English 切り替え、ライト／ダーク自動対応

## 使い方

1. 画像をドロップ（またはクリックして選択、`Ctrl/⌘+V` で貼り付け）
2. 必要なら切り抜き範囲を指定
3. 幅または高さ（cm）と dpi を入力
4. リサイズ方式と保存形式を選び、「処理して結果を確認」→「書き出して保存」

ローカルで使う場合は `index.html` をダウンロードしてブラウザで開くだけです。

## プライバシーと注意点

- 画像データはブラウザ内で処理され、アップロードされません。外部のフォントやスクリプトも読み込まず、通信は一切行いません。`Content-Security-Policy` でも外部通信を禁止しています。
- 出力ファイルに元画像の EXIF（撮影情報・位置情報など）は引き継がれません。
- 出力サイズの上限は一辺 16,384 px かつ約 120 メガピクセルです。iOS Safari のように canvas の面積上限が小さい端末（約 16.7 メガピクセル）は自動で検出し、上限を超える設定には警告を出して処理を止めます。端末のメモリ次第では、上限以内でも失敗することがあります。
- HEIC など、ブラウザが開けない形式は JPEG／PNG に変換してからお使いください。
- 「クリップボードにコピー」では貼り付け先で dpi が引き継がれないことがあります。サイズを厳密に守りたいときは保存したファイルを挿入してください。

## 色について

出力は **sRGB** です。ブラウザは Adobe RGB など ICC プロファイル付きの画像を sRGB に変換して読み込み、出力ファイルには ICC プロファイルを埋め込みません（sRGB として扱われます）。
そのため、sRGB より広い色域の色は丸められ、CMYK の JPEG は RGB に変換されます。印刷で色を厳密に管理したい場合は、このツールでは色管理ができないことにご注意ください。

## 開発

ビルド不要です。`index.html` を編集してブラウザで開くだけで動作確認できます。

```bash
python3 -m http.server 8000   # http://localhost:8000/ を開く
```

### テスト

Playwright（Chromium）で、出力サイズ・dpi の書き込み・一括処理（ZIP）・外部通信がないことなどを確認します。
`push` と Pull Request のたびに GitHub Actions でも実行されます。

```bash
npm install
npx playwright install chromium
npm test
```

バージョン表記が `index.html`・`README.md`・`CHANGELOG.md` で食い違っていないかも、このテストで検査されます。

### バージョン

[Semantic Versioning](https://semver.org/lang/ja/) に従います。バージョンの基準は `index.html` の
`<meta name="app-version">` で、画面下部のフッター表示もこれを読み込みます。リリース時は次を揃えてください。

1. `index.html` の `<meta name="app-version">` とファイル先頭コメントの `Version`
2. `CHANGELOG.md` に新しい節を追加
3. `README.md` 冒頭の Version
4. Git タグ `vX.Y.Z`

1〜3 は `npm test` で一致を確認できます。

### 同梱ライブラリ

TIFF の読み込みのために [pako](https://github.com/nodeca/pako) 2.1.0 と
[UTIF.js](https://github.com/photopea/UTIF.js) 3.1.0 を `index.html` に埋め込んでいます。
ライセンスは [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md) を参照してください。

## ライセンス

[MIT License](LICENSE)

---

## English

A single-file, browser-only image resizer for **print-oriented sizes: set the output in cm and dpi**.
Crop, resize (area-average / Lanczos / browser / nearest), write dpi metadata into PNG and JPEG, batch-process
with one shared crop, and save as a ZIP. Open `index.html` in a browser; images never leave your device.
The UI is available in Japanese and English. Licensed under MIT (see [LICENSE](LICENSE) and
[THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md)).
