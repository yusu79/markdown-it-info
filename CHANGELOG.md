# Changelog

[English](#changelog) | [日本語](#日本語)

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/).

## [1.1.2] - 2026-09-21

### Fixed

- Keep headings inside boxes visually styled while excluding them from the document heading hierarchy, preventing VS Code folding range and document symbol errors.
- Render titleless boxes that begin with a heading using the correct body background and a single icon when CSS is embedded.
- Keep titleless rendering stable while typing incomplete opening-line attributes such as `{css}` or `{tag}`.

## [1.1.1] - 2026-09-19

### Fixed

- Add shared and type-specific classes together for JavaScript options and YAML front matter, while continuing to replace duplicate HTML attributes with the more specific value.

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

## [1.1.2] - 2026-09-21

### 修正

- ボックス内の見出しを視覚的な見出しとして表示しつつ、文書の見出し階層から除外し、VS Codeのfolding rangeとdocument symbolのエラーを防ぐようにしました。
- CSS埋め込み時、見出しから始まるタイトルなしボックスに正しい本文背景色を使用し、アイコンを1つだけ表示するようにしました。
- `{css}`や`{tag}`など、開始行の属性を入力途中でもタイトルなし表示を維持するようにしました。

## [1.1.1] - 2026-09-19

### 修正

- JavaScriptオプションとYAMLフロントマターで、共通classとタイプ別classを追加して併用できるようにしました。同名のHTML属性は、引き続きより個別の値で上書きします。

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
