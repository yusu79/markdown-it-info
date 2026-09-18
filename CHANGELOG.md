# Changelog

[English](#changelog) | [日本語](#日本語)

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/).

## [1.1.0] - 2026-09-18

### Added

- Configure additional classes and HTML attributes through JavaScript options, `env.frontmatter.markdown.note`, or attributes on the opening line of a box.
- Configure settings for individual box types and override box colors.
- Embed box styling and icons in generated HTML with `embedCss` or `{css=true}`; embedding is off by default and can be disabled per box with `{css=false}`.

### Changed

- Untitled boxes omit the title by default. Set `defaultTitle` to a string to restore an automatic title.
- Rename the visual presets, reference stylesheets, sample images, and generated HTML classes to `bordered`, `solid`, and `pastel`. The former `default`, `qiita`, and `zenn` preset values remain available as aliases.

## [1.0.0]

### Added

- Initial release.

## 日本語

[English](#changelog) | [日本語](#日本語)

すべての重要な変更をこのファイルに記録します。
フォーマットは [Keep a Changelog](https://keepachangelog.com/ja/1.1.0/) に基づき、バージョニングは [Semantic Versioning](https://semver.org/lang/ja/) を採用しています。

## [1.1.0] - 2026-09-18

### 追加

- JavaScriptオプション、`env.frontmatter.markdown.note`、またはボックス開始行の属性から、追加のclassとHTML属性を指定できるようにしました。
- ボックスのタイプ別設定と色の上書きを追加しました。
- `embedCss`または`{css=true}`で、生成HTMLにボックスのスタイルとアイコンを埋め込めるようにしました。初期値はオフで、`{css=false}`によりボックス単位で無効にできます。

### 変更

- タイトルを指定しないボックスでは、初期状態でタイトルを省略するようにしました。`defaultTitle`に文字列を指定すると自動タイトルを設定できます。
- デザイン設定、参照CSS、サンプル画像、生成HTMLのclass名を`bordered`、`solid`、`pastel`へ変更しました。従来の設定値`default`、`qiita`、`zenn`は互換用エイリアスとして引き続き使用できます。

## [1.0.0]

### 追加

- 最初のリリース。
