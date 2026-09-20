# Agent Workflow

CodexなどのAIエージェントがこのプロジェクトで作業するときの手順を定める。

プロジェクト共通の開発ルールについては `../CONTRIBUTING.md` を優先する。

## 作業開始時

コードを変更する前に、以下を確認する。

1. ワークスペースの`.out-of-code-insights/annotations.json`
2. 関係するファイル
3. `package.json`
4. 関連する既存実装
5. 関連する既存テスト

ソースコードや既存資料から確認できる事項を推測で判断しない。`manage-project-annotations` Skillは使用しない

## 実装

* 依頼された作業に必要な範囲だけ変更する
* 既存のプロジェクト構成とコーディングスタイルに従う
* 必要がない限り新しい依存パッケージを追加しない
* 既存APIとの互換性を維持する
* 依頼と無関係な問題を発見しても勝手に修正しない

## テスト

- テストコードは原則として `test/` 以下に配置する
- 機能追加、仕様変更、バグ修正では必要に応じて対応するテストを追加または更新する。
- バグ修正では、可能な限り再発防止テストを追加する。
- 既存テストを通すことだけを目的としてテスト内容を変更しない。

## Git

- 通常の開発では `develop` をホームポジションとし、featureブランチでの作業を終えたら `develop` に戻る
- 意図的にfeature、release、hotfixブランチで作業している場合を除き、HEADが `develop` を指していなければユーザーへ警告する
- `main` は公開済みの安定版として扱い、公開版の確認、hotfixの作成、releaseブランチの受け入れなど必要な場合に使用する
- `feature-*`や`release-*`は、ffせずに履歴を残す
- `hotfix-*`はなるべくff


| 操作                  | 方針          | 意味                    |
| ------------------- | ----------- | --------------------- |
| `feature → develop` | `--no-ff`   | `git commit -m "✨ develop: feature-*"`           |
| `release → main`    | `--no-ff`   |  `git commit -m "🔖 main: release-x.y.z"`        |
| `hotfix → main`    | `--ff` | `git commit -m "🐛 main: hotfix-x.y.z"` |
| `main → develop`    | `--ff` | リリース結果をdevelopへそのまま同期 |


ユーザーから明示的に指示されない限り、以下は実行しない。

* `git commit`
* `git push`
* `git reset --hard`
* force push
* ブランチの削除

調査のため、必要に応じて以下を使用してよい。

* `git status`
* `git diff`
* `git log`

コミットメッセージの作成を依頼された場合は、変更差分と `.gitmessage` を確認し、その形式に従って今回の変更内容を正確に反映する。

## annotation への対処

annotationの処理を依頼された場合は、`manage-project-annotations` Skillを使用する。

## READMEの作成・編集

READMEの作成や編集をする場合は、`write-readme`SKILLを使用する。

## CHANGELOGの作成・編集

CHANGELOGの作成や編集をする場合は、`write-changelog`SKILLを使用する。

## 開発ノートの作成・編集

調査で得た知識を「開発ノート」にまとめてと言われたら、`write-dev-knowledge`SKILLを使用する。

## 一時的な作業

次の対象となる作業では、`use-test-workspace`SKILLを使用する。

* 手動での動作確認
* VS Code拡張の検証用ワークスペース
* Markdownの表示確認
* npmパッケージの試験導入
* バグ再現用の最小環境
* 一時的なNode.jsプロジェクト
* 一時的な設定ファイル
* サンプル入力ファイル
* 実験用スクリプト
* 検証後に削除するファイル
* 一時的なfixture
* 外部パッケージや拡張機能の挙動確認


## 開発ログの記録

開発作業中に、将来のCodexが再利用すべき重要な情報が発生した場合は、`dev-log`SKILLを使用する。

主な対象:

* ブランチで行う作業の目的
* 重要な設計判断
* 採用しなかった実装方法とその理由
* 原因調査を必要としたエラー
* 調査によって確認できた原因や重要な事実
* 開発環境や設定の重要な変更
* テスト、Lint、Buildなどの重要な検証結果
* 修正によって問題が解決したことの確認
* 将来の変更時に注意すべき制約
* Git履歴やコードだけでは失われる判断理由

単純なファイル編集、軽微な修正、通常コマンドの成功結果などは記録しない。

## リリース時の確認

以下を必ず確認する

- `CHANGELOG.md` の日付が今日になっているか
