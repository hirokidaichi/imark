# imark Lint修正手順書
リポジトリ中のlintエラーを完全になくして。
（テストの実行はしなくて良い。ただlintエラーやtype checkが完了すれば良い。）
## Lintエラーの修正フロー

1. Lintエラーの確認
```bash
deno task lint
```

2. エラーの種類と対応方法

### よくあるLintエラーと修正方法

#### 1. `require-await`
- 非同期関数内で`await`を使用していない場合に発生
- 対応: 
  - 関数から`async`を削除
  - または必要な非同期処理を`await`で待つ

#### 2. `no-explicit-any`
- `any`型の使用を避ける
- 対応:
  - 具体的な型を指定
  - `unknown`型を使用し、型ガードで絞り込む

#### 3. `no-unused-vars`
- 未使用の変数の削除
- 対応:
  - 変数を使用する
  - 不要な場合は削除
  - 意図的に使用しない場合は`_`プレフィックスを付ける

#### 4. `no-empty`
- 空のブロックを避ける
- 対応:
  - 必要なロジックを追加
  - コメントで空ブロックの理由を説明

## コマンドリファレンス

```bash
# Lint実行
deno task lint

# 特定のディレクトリのみLint
deno lint src/commands/

```

## Lintルール設定

現在の設定（deno.json）:
```json
"lint": {
  "include": [
    "src/"
  ],
  "rules": {
    "tags": [
      "recommended"
    ],
    "exclude": [
      "require-await"
    ]
  }
}
```

## ベストプラクティス

1. コミット前に必ずLintチェックを実行
2. 型の使用を徹底し、`any`型を避ける
3. 未使用の変数や引数は削除
4. 非同期関数は適切に`await`を使用
5. エラーハンドリングは具体的な型で処理 