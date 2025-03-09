# imark 🖼️✨

![GitHub License](https://img.shields.io/github/license/hirokidaichi/imark)

![サンプル画像](samples/beautiful-mountain-landscape-snow-peaks-.webp)

AI搭載の画像認識・生成ツール - 画像を理解し、創造する

## Why imark?

imarkは単なる画像処理ツールではありません。画像とAIの力を組み合わせた多機能CLIツールです：

- 🔍 **スマートな画像認識** - 画像の内容を自動的に理解し、詳細なキャプションを生成
- 📚 **整理された画像目録** - 大量の画像を自動で分類・整理
- 🎨 **多彩な画像生成** - テキスト入力から10種類以上のスタイルで高品質な画像を作成
- 🌐 **多言語対応** - 日本語・英語でのキャプション生成
- 📊 **柔軟な出力形式** - Markdown、JSONなど様々な形式に対応

## 概要

imarkは、AIの力を使って画像ファイルを自動認識し、整理された目録を作成するためのCLIツールです。
画像内容の詳細な解析や、テキストからの高品質な画像生成まで、画像処理のワークフローを効率化します。

## 特徴

- 画像ファイルの自動認識と分類
- AIを活用した画像キャプションの自動生成
- AIを活用した画像生成機能
- 複数言語対応（日本語、英語など）
- 柔軟な出力フォーマット（Markdown、JSON）
- 操作ログの管理と表示

## インストール

以下の2つの方法でインストールできます：


### 1. ソースコードからのインストール

```bash
git clone https://github.com/hirokidaichi/imark.git
cd imark
deno task install
```

`imark configure`をつかって、API KEYをセットアップする。

```
imark configure
環境変数 GOOGLE_API_KEY が設定されています。
? 環境変数の値を使用しますか？ (y/n) › Yes
設定を保存しました。
```

## 使用方法

### 基本的なコマンド

```bash
# 指定したディレクトリの画像を解析して目録を作成
imark catalog /path/to/images

# 単一画像のキャプションを生成
imark caption image.jpg

# AIを使用して画像を生成
imark gen "画像の説明"

# AIの画像の読み取りと画像の作成ができるMCP Serverにもなる
imark mcp 

# 操作ログを表示
imark log
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

#### genコマンド

AIを使用して画像を生成します。

```bash
imark gen [options] <description>

オプション：
  -s, --size <size>     画像サイズ（hd, fullhd, 2k, 4k）
  -t, --type <type>     画像スタイル（realistic, illustration, flat, anime, watercolor, oil-painting, pixel-art, sketch, 3d-render, corporate, minimal, pop-art）
  -r, --ratio <ratio>   アスペクト比（16:9, 4:3, 1:1, 9:16, 3:4）
  -o, --output <dir>    出力ディレクトリ
```

#### mcpコマンド

Model Context Protocol（MCP）サーバーとして動作し、AIを活用した画像処理機能を提供します。

```bash
imark mcp [options]

オプション：
  --debug    デバッグモードで実行（詳細なログ出力）
```

主な機能：
- 画像キャプション生成（captionTool）
- AI画像生成（generateTool）

##### Claude Codeのでの利用
claudeコマンドで利用する場合は、次のような設定で利用できます。
```
claude mcp add imark imark mcp
```

##### Cursor IDEでの利用

###### **Editor全体の場合**
コマンドの設定時に次のコマンドを登録してください。
```
imark mcp
```

###### **プロジェクト毎の場合**

`.cursor/mcp.json`の設定により、Cursor上でMCPサーバーとして認識され、AI画像処理機能を直接利用できます：

```json
{
  "mcpServers": {
    "imark": {
      "type": "command",
      "command": "imark",
      "args": ["mcp"],
      "disabled": false
    }
  }
}
```

技術的な詳細：
- Gemini APIとImageFX APIを利用した画像処理
- StdioServerTransportによるMCPプロトコルの実装
- デバッグモードによる詳細なログ出力機能

#### logコマンド

操作ログを表示します。

```bash
imark log [options]

オプション：
  -n, --number <number> 表示するログの数
  -f, --format <format> 出力フォーマット（text, json）
```

対応している画像形式：
- jpg/jpeg
- png
- gif
- webp
- heic/heif

## サンプル画像生成例

以下は、`imark gen`コマンドを使用して生成できる様々なスタイルの画像例です：

| スタイル | コマンド | 生成例 |
|---------|---------|--------|
| リアリスティック | `imark gen "beautiful mountain landscape with snow peaks" -t realistic -s fullhd --aspect-ratio "16:9"` | ![realistic](samples/beautiful-mountain-landscape-snow-peaks-.webp) |
| アニメ | `imark gen "cute anime girl with cat ears" -t anime -s fullhd --aspect-ratio "1:1"` | ![anime](samples/cute-anime-girl-with-cat-ears.webp) |
| フラット | `imark gen "simple modern email icon" -t flat -s fullhd --aspect-ratio "1:1"` | ![flat](samples/simple-modern-email-icon.webp) |
| 水彩画 | `imark gen "colorful bouquet of spring flowers" -t watercolor -s fullhd --aspect-ratio "1:1"` | ![watercolor](samples/colorful-bouquet-of-spring-flowers.webp) |
| ピクセルアート | `imark gen "retro style game character" -t pixel-art -s fullhd --aspect-ratio "1:1"` | ![pixel-art](samples/retro-style-game-character.webp) |
| 3Dレンダリング | `imark gen "futuristic skyscraper with glass and steel" -t 3d-render -s fullhd --aspect-ratio "1:1"` | ![3d-render](samples/futuristic-skyscraper-glass-steel.webp) |
| コーポレート | `imark gen "professional business team meeting in modern office" -t corporate -s fullhd --aspect-ratio "16:9"` | ![corporate](samples/professional-business-team-meeting-offic.webp) |
| ミニマル | `imark gen "abstract geometric minimal logo design" -t minimal -s fullhd --aspect-ratio "1:1"` | ![minimal](samples/abstract-geometric-minimal-logo-design.webp) |
| ポップアート | `imark gen "colorful pop art style portrait of a woman" -t pop-art -s fullhd --aspect-ratio "1:1"` | ![pop-art](samples/colorful-pop-art-portrait-of-a-woman.webp) |
| スケッチ | `imark gen "pencil sketch portrait of an elderly man" -t sketch -s fullhd --aspect-ratio "1:1"` | ![sketch](samples/pencil-sketch-portrait-of-an-elderly-man.webp) |

各スタイルのオプションを組み合わせることで、様々な用途に合わせた画像を生成できます。
詳細なオプションについては、`imark gen --help`を参照してください。

[サンプル画像の完全なカタログはこちら](samples/catalog.md)をご覧ください。

## キャプション生成サンプル

以下は、`imark caption`コマンドを使用して生成したキャプションの例です：

| 画像 | 日本語キャプション | English Caption |
|------|------------------|-----------------|
| ![mountain](samples/beautiful-mountain-landscape-snow-peaks-.webp) | 壮大な山脈と、その麓に広がる野花の群生を捉えた風景。中心には雪に覆われた鋭いピークを持つマッターホルンを思わせる山が聳え、夕日の光が山肌を照らし、前景には黄色と紫色の野花が咲き乱れています。 | A breathtaking landscape photograph showcasing a majestic mountain range at sunset, with a snow-capped peak dominating the center, surrounded by vibrant wildflowers in the foreground creating a stunning composition of natural beauty. |

各画像に対して、日本語と英語の両方でキャプションを生成できます。キャプションは画像の内容を詳細に分析し、視覚的な要素や雰囲気を自然な言葉で表現します。

## キャプションを使用した画像生成

キャプションを使用して新しい画像を生成することもできます。既存の画像のキャプションを元に、異なるスタイルで画像を生成する例を示します：

```bash
# 既存の画像からキャプションを生成し、それを元に新しい画像を生成する
imark gen "$(imark caption samples/beautiful-mountain-landscape-snow-peaks-.webp)" --type pixel-art --output samples
```

### 生成例

| 元画像 | 生成画像（ピクセルアート） |
|--------|--------------------------|
| ![original](samples/beautiful-mountain-landscape-snow-peaks-.webp) | ![pixel-art](samples/matterhorn-sunset-swiss-alps-landscape-h.webp) |

このように、キャプションを介して画像の内容を保持しながら、異なる表現スタイルで再生成することができます。

## 開発者向け情報

## ライセンス

MIT

## 作者

Hiroki Daichi