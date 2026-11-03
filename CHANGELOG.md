# Changelog

このプロジェクトは [Semantic Versioning](https://semver.org/lang/ja/) に従います。
形式は [Keep a Changelog](https://keepachangelog.com/ja/1.1.0/) に準拠します。

## [1.0.0] - 2026-10-30

初回公開。

### 機能
- 画像の切り抜き（自由／1:1・4:3・3:2・16:9 と縦向き比率、ドラッグ移動・リサイズ）
- 印刷サイズ（cm）と解像度（dpi）の指定、縦横比の固定、画素数を変えない原寸指定
- リサイズ方式 4 種（エリア平均／Lanczos／ブラウザ標準／最近傍）
- PNG・JPEG へ dpi 情報（pHYs／JFIF）を書き込み、WebP でも書き出し可
- 処理結果の確認ビュー（最大 3200% 相当までのズーム・パン）
- 一括処理（切り抜き範囲を全画像に適用）と ZIP 保存
- 入力形式: JPEG・PNG・WebP・GIF・BMP・SVG・TIFF、クリップボード貼り付け、ドラッグ＆ドロップ
- 日本語／English 表示切り替え、ライト／ダークテーマ対応
- すべてブラウザ内で処理。外部フォント・外部スクリプトを使わず、CSP で外部通信を禁止
- 重い Lanczos／エリア平均のリサイズは Web Worker で実行（画面が固まらない）
- canvas の面積上限が小さい端末（iOS Safari など）を検出し、大きすぎる画像・出力は警告して止める
