# imark
画像の認識と目録の書き出し

## 概要

imarkは、画像ファイルを自動で認識し、整理された目録を作成するためのCLIツールです。
画像ファイルの内容を解析し、AI Agentの補助をして効率的な管理を可能にします。

## 特徴

- 画像ファイルの自動認識と分類
- AIを活用した画像キャプションの自動生成
- 複数言語対応（日本語、英語など）
- 柔軟な出力フォーマット（Markdown、JSON）

## インストール

以下の2つの方法でインストールできます：

### 1. 直接インストール

```bash
deno install -A -f --name imark https://raw.githubusercontent.com/hirokidaichi/imark/main/src/main.ts
```

### 2. ソースコードからのインストール

```bash
git clone https://github.com/hirokidaichi/imark.git
cd imark
deno task install
```

## 使用方法

### 基本的なコマンド

```bash
# 指定したディレクトリの画像を解析して目録を作成
imark catalog /path/to/images

# 単一画像のキャプションを生成
imark caption image.jpg
```

### コマンドとオプション

#### captionコマンド

単一の画像に対してキャプションを生成します。

```bash
imark caption [options] <image>

オプション：
  -l, --lang <lang>      出力言語（ja: 日本語, en: 英語）
  -f, --format <format>  出力フォーマット（markdown または json）
  -c, --context <context> コンテキスト情報（.mdファイルパスまたはテキスト）
```

#### catalogコマンド

ディレクトリ内の画像を一括でキャプション生成します。

```bash
imark catalog [options] <directory>

オプション：
  -l, --lang <lang>      出力言語（ja: 日本語, en: 英語）
  -f, --format <format>  出力フォーマット（markdown または json）
  -c, --context <context> コンテキスト情報（.mdファイルパスまたはテキスト）
  -o, --output <file>    出力ファイル名（指定がない場合は標準出力）
```

対応している画像形式：
- jpg/jpeg
- png
- gif
- webp
- heic/heif

## 開発者向け情報

### 必要要件

- Deno 2.1.x

### 開発環境のセットアップ

```bash
git clone https://github.com/hirokidaichi/imark.git
cd imark
deno task check-all  # lint、format、testをすべて実行
```

## ライセンス

MIT

## 作者

Hiroki Daichi
