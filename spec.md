了解しました！

Denoのライブラリを活用し、可能な限り公式またはコミュニティ提供のTypeScript SDKを利用する方針で調査を行います。

具体的には、以下を調査します：
- **Gemini APIのTypeScript SDK**: 公式またはDeno対応のライブラリがあるかを確認。
- **DenoのHTTPクライアントライブラリ**: `fetch`を使わずにAPI通信を行う手段を調査。
- **CLIパーサー**: `cliffy` を使用し、サブコマンドやオプションを適切に処理する方法。
- **画像ファイルのBase64エンコード**: Denoのライブラリで実装可能な方法を検討。
- **ファイル入出力**: Markdown/JSON出力のためのDeno標準ライブラリの活用。

調査が完了したら、具体的な手順書と仕様書としてまとめます。

## 1. Gemini APIのTypeScript SDKの利用

**公式SDKの有無:** GoogleはGeminiモデル用にJavaScript/TypeScript向けの公式SDK「Google AI JavaScript SDK」を提供しています ([@google/generative-ai - npm](https://www.npmjs.com/package/@google/generative-ai#:~:text=Google%20AI%20SDK%20for%20JavaScript))。このSDKはnpmパッケージ`@google/generative-ai`として公開されており、TypeScriptの型定義も含まれています ([How to use Google Gemini with Node.js and TypeScript](https://www.rootstrap.com/blog/how-to-use-google-gemini-with-node-js-and-typescript#:~:text=To%20use%20Gemini%20with%20Node,API%20and%20has%20TypeScript%20support))。Node.jsやDenoなどのJavaScriptランタイムで利用可能で、Gemini 1.5/2.0モデルに統一的にアクセスできます。

**Deno環境での利用:** Denoはnpmパッケージを直接インポートして利用できるため ([Node and npm support](https://docs.deno.com/runtime/fundamentals/node/#:~:text=Deno%20has%20native%20support%20for,specifiers.%20For%20example))、公式SDKもDenoで使用できます。例えば、次のようにインポート可能です（Deno実行時に`--allow-net`等必要な許可を付与）:

```ts
import { GoogleGenerativeAI } from "npm:@google/generative-ai";
```

このSDKを用いると、APIキーを指定してクライアントを初期化し、モデルを取得してプロンプトを送信することができます ([@google/generative-ai - npm](https://www.npmjs.com/package/@google/generative-ai#:~:text=const%20,ai))。例えば、Gemini 1.5 Flashモデルを使って画像にキャプションを付けるには以下のようなコードになります ([@google/generative-ai - npm](https://www.npmjs.com/package/@google/generative-ai#:~:text=const%20prompt%20%3D%20,%7D%2C)):

```ts
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
const prompt = "画像の内容を説明してください。";  // 言語オプションに応じて変更
const image = {
  inlineData: {
    data: base64ImageData,       // 画像ファイルをBase64エンコードした文字列
    mimeType: "image/png",       // 画像のMIMEタイプ
  },
};
const result = await model.generateContent([ prompt, image ]);
console.log(result.response.text());  // 生成されたキャプションを表示
``` 

上記のように、画像ファイルをBase64文字列に変換して`inlineData`としてプロンプトに含めることで、Geminiのビジョン機能を利用したキャプション生成が可能です ([@google/generative-ai - npm](https://www.npmjs.com/package/@google/generative-ai#:~:text=const%20prompt%20%3D%20,%7D%2C))。Gemini APIではテキストと画像を組み合わせたマルチモーダルな入力を受け付け、画像に対する説明や質問応答を生成できます ([Explore vision capabilities with the Gemini API  |  Google AI for Developers](https://ai.google.dev/gemini-api/docs/vision#:~:text=Gemini%20models%20are%20able%20to,capabilities%20include%20the%20ability%20to))。

**SDKが使えない場合の代替:** Denoから直接REST APIを呼び出すことも可能です。Gemini APIのエンドポイントに対してHTTPリクエストを送信し、画像データとプロンプトをJSONペイロードで渡す方法です。例えば、REST APIではユーザープロンプト内の一部として画像ファイル（Base64化データ＋MIMEタイプ）を含める構造でリクエストを送ります ([Send an Image as a Prompt to Gemini using the API - Questions about Thunkable - Community](https://community.thunkable.com/t/send-an-image-as-a-prompt-to-gemini-using-the-api/3133824#:~:text=%E2%80%9Ccontents%E2%80%9D%3A%20%5B%20,the%20Internet%E2%80%9D%2C%20%E2%80%9CmimeType%E2%80%9D%3A%20%E2%80%9Cimage%2Fjpeg%E2%80%9D)) ([Send an Image as a Prompt to Gemini using the API - Questions about Thunkable - Community](https://community.thunkable.com/t/send-an-image-as-a-prompt-to-gemini-using-the-api/3133824#:~:text=,%E2%80%9Ctemperature%E2%80%9D%3A%201%2C%20%E2%80%9CtopK%E2%80%9D%3A%2064))。Denoには標準で`fetch`が組み込まれているため、追加ライブラリなしでHTTPリクエストを送信できます。また、より便利なHTTPクライアントとして、Fetch APIをラップした軽量ライブラリの**Ky**などもDeno/Bun/Nodeで動作し、使いやすいとされています ([ky - NPM](https://www.npmjs.com/package/ky#:~:text=ky%20,a%20tiny%20package%20with))。いずれの場合も、**Google AI Studio**で発行したAPIキーをHTTPヘッダやクエリパラメータで指定し、Gemini APIのRESTエンドポイントへPOSTリクエストを行うことでキャプションを取得できます（※APIキーの保護のためサーバーサイドで呼び出すことが推奨されています ([@google/generative-ai - npm](https://www.npmjs.com/package/@google/generative-ai#:~:text=,fetch%20it%20remotely%20at%20runtime))）。

## 2. Cliffyを用いたCLIツール開発

**CliffyによるCLI構築:** CliffyはDeno向けのCLIフレームワークで、コマンドやオプションのパースを簡潔に実装できます ([deno-cliffyでCLIツールを作る：`denosay`の実装](https://zenn.dev/kawarimidoll/articles/5559a185156bf4#:~:text=%E3%81%93%E3%81%AE%E8%A8%98%E4%BA%8B%E3%81%A7%E3%81%AFDeno%E3%81%AE%E6%A8%99%E6%BA%96%E3%83%A9%E3%82%A4%E3%83%96%E3%83%A9%E3%83%AA%E3%81%AE%E3%81%BF%E3%82%92%E4%BD%BF%E3%81%A3%E3%81%A6%E3%81%84%E3%81%BE%E3%81%97%E3%81%9F%E3%81%8C%E3%80%81%E4%BB%8A%E5%9B%9E%E3%81%AFCLI%E3%83%95%E3%83%AC%E3%83%BC%E3%83%A0%E3%83%AF%E3%83%BC%E3%82%AF%E3%81%AEdeno))。まず、メインコマンドのインスタンスを生成し、名称・バージョン・説明文を設定します ([deno-cliffyでCLIツールを作る：`denosay`の実装](https://zenn.dev/kawarimidoll/articles/5559a185156bf4#:~:text=,version%20%60%E3%82%AA%E3%83%97%E3%82%B7%E3%83%A7%E3%83%B3%E3%81%8C%E8%87%AA%E5%8B%95%E3%81%A7%E8%BF%BD%E5%8A%A0%E3%81%95%E3%82%8C%E3%81%BE%E3%81%99))。例えば:

```ts
import { Command, EnumType } from "https://deno.land/x/cliffy@v0.x.x/command/mod.ts";

const program = new Command()
  .name("imark")
  .version("0.1.0")
  .description("Image captioning CLI using Gemini API");
```

**サブコマンドの実装:** Cliffyでは`.command()`メソッドでサブコマンドを定義できます ([cliffy.io](https://cliffy.io/docs@v0.25.4/command/sub-commands#:~:text=await%20new%20Command%28%29%20.command%28%20,s))。`imark`ツールには2つの機能「caption」と「index」が必要なため、それぞれサブコマンドとして実装します。例えば:

```ts
program
  .command("caption <image:path>", "指定した画像のキャプションを生成")
  .option("-l, --lang <lang:string>", "出力言語 (ja または en)", { default: "ja" })
  .option("-f, --format <format:string>", "出力フォーマット (markdown または json)", { default: "markdown" })
  .action(async ({ lang, format }, image) => {
    // captionコマンドの処理
    // 1. 画像ファイルを読み込みBase64化
    // 2. Gemini APIにリクエストしてキャプション取得
    // 3. 指定フォーマットで結果を出力
  });

program
  .command("index <dir:path>", "ディレクトリ内の画像を一括でキャプション生成")
  .option("-l, --lang <lang:string>", "出力言語 (ja または en)", { default: "ja" })
  .option("-f, --format <format:string>", "出力フォーマット (markdown または json)", { default: "markdown" })
  .action(async ({ lang, format }, dir) => {
    // indexコマンドの処理
    // 1. ディレクトリ内の画像ファイル一覧を取得
    // 2. 各画像についてキャプション生成
    // 3. 指定フォーマットで一覧を出力（必要に応じてファイル書き出し）
  });
```

上記のように、`.command()`でサブコマンド名と引数定義、説明を指定し、`.option()`でオプションを定義します ([deno-cliffyでCLIツールを作る：`denosay`の実装](https://zenn.dev/kawarimidoll/articles/5559a185156bf4#:~:text=,%E3%81%93%E3%81%AE%E7%B5%90%E6%9E%9C%E3%81%8C%E5%85%A8%E4%BD%93%E3%81%AE%E3%83%81%E3%82%A7%E3%83%BC%E3%83%B3%E3%81%8C%E8%BF%94%E3%81%99%E3%82%AA%E3%83%96%E3%82%B8%E3%82%A7%E3%82%AF%E3%83%88%E3%81%AB%E5%85%A5%E3%82%8A%E3%81%BE%E3%81%99))。Cliffyではオプションにデフォルト値やエイリアス（短縮形）を設定でき、必要に応じてEnumTypeで許容値を限定することも可能です ([cliffy.io](https://cliffy.io/docs@v0.25.4/command#:~:text=import%20,https%3A%2F%2Fdeno.land%2Fx%2Fcliffy%40v0.25.4%2Fcommand%2Fmod.ts))。例えば上記では`lang`オプションは`"ja"`か`"en"`が想定され、`format`オプションは`"markdown"`か`"json"`が想定されます。EnumTypeを使って実装する場合、以下のようになります:

```ts
const formatType = new EnumType(["markdown", "json"]);
program
  .type("format", formatType)
  .command("caption <image:path>", "...") 
  .option("-f, --format <format:format>", "出力フォーマット", { default: "markdown" })
  // ...（以下略）
```

各コマンドには`.action()`で処理関数を登録します ([cliffy.io](https://cliffy.io/docs@v0.25.4/command/sub-commands#:~:text=await%20new%20Command%28%29%20.command%28%20,s))。`.action()`のコールバック関数には、まずパースされたオプションのオブジェクト、その後にコマンド引数（上記コードでは`image`や`dir`）が渡されます ([cliffy.io](https://cliffy.io/docs@v0.25.4/command#:~:text=The%20,method))。最後に、`program.parse(Deno.args)`を呼び出してコマンドライン引数の解析を開始します ([deno-cliffyでCLIツールを作る：`denosay`の実装](https://zenn.dev/kawarimidoll/articles/5559a185156bf4#:~:text=,%E3%81%93%E3%81%AE%E7%B5%90%E6%9E%9C%E3%81%8C%E5%85%A8%E4%BD%93%E3%81%AE%E3%83%81%E3%82%A7%E3%83%BC%E3%83%B3%E3%81%8C%E8%BF%94%E3%81%99%E3%82%AA%E3%83%96%E3%82%B8%E3%82%A7%E3%82%AF%E3%83%88%E3%81%AB%E5%85%A5%E3%82%8A%E3%81%BE%E3%81%99))。

**`imark caption <画像>`コマンド設計:** 単一の画像ファイルパスを受け取り、その画像のキャプションを生成します。内部では後述するファイル処理機能で画像を読み込み、Gemini APIへリクエストを送ります。オプションで指定された言語`lang`に応じて、プロンプト文を日本語または英語で用意します（例: `lang="ja"`なら「この画像を説明してください。」、`lang="en"`なら"Describe this image."といった指示文）。Gemini APIから返されたキャプション結果を、`format`オプション（Markdown/JSON）に従って出力します。出力先は標準出力としつつ、必要に応じてファイル書き出しにも対応できるようにします。

**`imark index <ディレクトリ>`コマンド設計:** 指定ディレクトリ内の全画像に対しキャプションを生成します。実装としては、`Deno.readDir`等でディレクトリ内のファイル一覧を走査し ([Writing files](https://docs.deno.com/examples/writing_files/#:~:text=Many%20applications%20need%20to%20write,simple%20interface%20for%20writing%20files))、画像ファイル（JPEG/PNG等）を抽出して順次APIに送信します。生成された各キャプションを収集し、`format`オプションに応じてMarkdownまたはJSON形式でまとめて出力します。例えばMarkdown形式なら各画像のファイル名とキャプションのリスト、JSON形式なら各画像について`{ "file": <ファイル名>, "caption": <説明> }`の配列とする、といった形式が考えられます。結果が多数になる場合は、コンソール出力だけでなくファイル（例: `index.md`や`index.json`）に保存する機能も実装すると実用的です。Cliffy自体は出力内容のフォーマットには関与しないため、アプリケーションロジック側で文字列を組み立て、`console.log`や`Deno.writeTextFile`で出力します。

## 3. Denoでの画像ファイル処理

**画像ファイルの読み込み:** Denoでは標準APIでファイル読み込みが可能です。`await Deno.readFile(path)`を使うと、ファイル内容を`Uint8Array`（バイト列）として取得できます。バイナリデータを扱うため、**--allow-read**パーミッションが必要です。例えば:

```ts
const imageData = await Deno.readFile(imagePath);
```

これで`imageData`に画像ファイルのバイトデータが格納されます。

**Base64エンコード:** 取得したバイトデータをGemini APIに渡すため、Base64文字列にエンコードします。Deno標準ライブラリの`std/encoding/base64.ts`に`encode()`関数が用意されています ([Hex and base64 encoding](https://docs.deno.com/examples/hex_base64_encoding/#:~:text=import%20,jsr%3A%40std%2Fencoding%2Fhex))。これを利用して以下のように変換できます:

```ts
import { encode as encodeBase64 } from "https://deno.land/std@0.###/encoding/base64.ts";
const base64Image = encodeBase64(imageData);
```

上記の`base64Image`が画像データを表すBase64文字列です。これを先述の`inlineData.data`にセットします ([@google/generative-ai - npm](https://www.npmjs.com/package/@google/generative-ai#:~:text=const%20prompt%20%3D%20,%7D%2C))。なお、ブラウザ環境同様にDenoでも`btoa()`関数でBase64エンコード可能ですが、UTF-8以外のデータの場合は適切に扱えないため、標準ライブラリの使用が望ましいです。

**MIMEタイプの取得:** Gemini APIに画像を送る際はMIMEタイプ（Content-Type）を指定する必要があります ([@google/generative-ai - npm](https://www.npmjs.com/package/@google/generative-ai#:~:text=const%20prompt%20%3D%20,%7D%2C))。Deno標準では拡張子からMIMEタイプを取得するユーティリティはありませんが、拡張子を判別して手動で指定する簡易方法があります ([Gemini APIで画像解析を試す（TypeScriptサンプル付き）](https://zenn.dev/sorutonookage/articles/246099ae5da021#:~:text=%2F%2F%20%E3%83%95%E3%82%A1%E3%82%A4%E3%83%AB%E3%81%AE%E6%8B%A1%E5%BC%B5%E5%AD%90%E3%81%8B%E3%82%89MIME%E3%82%BF%E3%82%A4%E3%83%97%E3%82%92%E5%8F%96%E5%BE%97%E3%81%99%E3%82%8B%E9%96%A2%E6%95%B0%20function%20getMimeType,image%2Fpng))。例えば以下のように対応表を用いて判定します:

```ts
function getMimeType(filePath: string): string {
  const ext = filePath.toLowerCase().split(".").pop();
  switch(ext) {
    case "jpg":
    case "jpeg": return "image/jpeg";
    case "png":  return "image/png";
    case "gif":  return "image/gif";
    case "webp": return "image/webp";
    case "heic": return "image/heic";
    case "heif": return "image/heif";
    default:
      throw new Error(`サポートされていないファイル形式です: .${ext}`);
  }
}
```

Gemini APIがサポートする画像形式はPNG, JPEG, WEBP、およびHEIC/HEIFなどです ([〖Python〗Gemini APIに画像を読みこませてみる #画像処理 - Qiita](https://qiita.com/anapausis/items/9fe020b9fab608ae0b78#:~:text=,%EF%BC%88%E4%BB%8A%E5%9B%9E%E7%94%A8%E3%81%84%E3%82%8B%E3%81%AE%E3%81%AF%E3%81%93%E3%81%A1%E3%82%89%EF%BC%89%E3%81%AF%E3%80%81%E6%9C%80%E5%A4%A73%2C600%E5%80%8B%E3%81%AE%E7%94%BB%E5%83%8F%E3%83%95%E3%82%A1%E3%82%A4%E3%83%AB%E3%82%92%E3%82%B5%E3%83%9D%E3%83%BC%E3%83%88%E3%81%97%E3%81%A6%E3%81%8A%E3%82%8A%E3%80%81%E5%90%84%E7%94%BB%E5%83%8F%E3%81%AF258%E5%80%8B%E3%81%AE%E3%83%88%E3%83%BC%E3%82%AF%E3%83%B3%E3%81%AB%E7%9B%B8%E5%BD%93%E3%81%97%E3%81%BE%E3%81%99%E3%80%82%20%E7%94%BB%E5%83%8F%E3%83%87%E3%83%BC%E3%82%BF%E3%81%AF%E3%80%81%E4%B8%8B%E8%A8%98%E3%81%AE%E3%81%84%E3%81%9A%E3%82%8C%E3%81%8B%E3%81%A7%E3%81%AA%E3%81%91%E3%82%8C%E3%81%B0%E3%81%AA%E3%82%8A%E3%81%BE%E3%81%9B%E3%82%93%E3%80%82))（GIFも一般的には扱えます）。上記の関数で想定外の拡張子の場合はエラーとしています。実際に利用する際には、誤った拡張子でも正しいMIMEタイプを指定すれば動作しますが、ユーザが与える入力の範囲を制限する目的でチェックを入れています。

**ディレクトリ内ファイルの処理:** `imark index`では、指定ディレクトリ内の複数画像を扱います。Denoの`for await... of Deno.readDir(dir)`構文でディレクトリを走査し、各エントリについて上記と同様に読み込みとエンコードを行います。大量のファイルを順次処理する場合、一つずつ同期的にAPI呼び出しすると時間がかかるため、必要に応じてPromiseを配列に入れて`Promise.all`で並行処理するなど工夫します。ただし無料枠のAPIレート制限や、出力順序制御の必要があれば逐次実行でも構いません。

## 4. 出力フォーマットの実装

CLIツールの出力は**Markdown形式**と**JSON形式**に対応させます。ユーザーが`--format`オプションで選択できるようにし、それぞれの形式で出力内容を組み立てます。

**Markdown出力:** Markdownの場合、シンプルにキャプションテキストを出力するか、画像一覧の場合は視認性のためフォーマットを整えます。例えば`imark caption`なら生成されたキャプション文をそのまま表示するだけで充分でしょう。一方、`imark index`で複数画像の結果をまとめる場合、以下のような形式が考えられます:

- 各画像とキャプションの箇条書きリスト  
  例: `- **image1.jpg**: この画像には夕焼けの海岸が写っています。`  
  （ファイル名を太字にしてキャプションを記述）

- またはテーブル形式（列にファイル名とキャプション）  
  例: 

  | ファイル | キャプション内容 |
  |---------|----------------|
  | image1.jpg | この画像には夕焼けの海岸が写っています。 |
  | image2.png | 青空の下に広がる草原が見えます。 |

- あるいは実際の画像プレビュー付き（環境が許せば）  
  例: `![](path/to/image1.jpg) 画像1の説明文・・・`

Markdownはテキストベースのフォーマットですので、`console.log`で出力したり、ファイルに保存すればそのままMarkdownドキュメントとして利用できます。ファイル保存する場合、Denoの`writeTextFile`を使い、文字列をそのまま書き出します ([Writing files](https://docs.deno.com/examples/writing_files/#:~:text=You%20can%20also%20write%20a,instead%20of%20a%20byte%20array))。

**JSON出力:** JSON形式では、データ構造として画像パスとキャプションを含むオブジェクトの配列などが適切です。例えば単一画像なら:

```json
{ "file": "image1.jpg", "caption": "この画像には夕焼けの海岸が写っています。" }
```

複数画像ならリスト:

```json
[
  { "file": "image1.jpg", "caption": "この画像には夕焼けの海岸が写っています。" },
  { "file": "image2.png", "caption": "青空の下に広がる草原が見えます。" }
]
```

JavaScriptでオブジェクトや配列を組み立て、`JSON.stringify(data, null, 2)`を使って整形済みのJSON文字列に変換します（`null, 2`はインデント幅2で整形する指定です）。そして`console.log`で表示したり、`Deno.writeTextFile("captions.json", jsonString)`でファイルに保存します ([Writing files](https://docs.deno.com/examples/writing_files/#:~:text=You%20can%20also%20write%20a,instead%20of%20a%20byte%20array))。JSONは機械可読性に優れるため、他のツールとの連携用に提供すると有用です。

**言語別出力:** `--lang`オプションによる言語切替は、Gemini APIへの指示内容を変えるだけで対応できます。つまり、日本語キャプションを希望する場合は日本語でプロンプトを与えるか、生成結果を日本語にするようモデルに指示します。Geminiは多言語に対応しているため、プロンプト文を切り替えるだけでモデルは適切な言語で説明を生成します。実装上は、前述のように`lang`が"ja"なら日本語の質問文や指示文を使い、"en"なら英語の指示文を使います。また必要であれば「日本語で出力してください」「Explain in English.」のように明示的に出力言語をプロンプトに含めることで精度を高めることもできます。

**ファイルへの書き出し:** CLI利用者が結果をファイル保存したい場合に備え、出力をファイルにリダイレクトするか、オプションで出力先パスを指定できるようにすることも考えられます（例えば`-o output.md`など）。Denoでのファイル書き出しは先述の`Deno.writeTextFile`で容易に実装できます ([Writing files](https://docs.deno.com/examples/writing_files/#:~:text=You%20can%20also%20write%20a,instead%20of%20a%20byte%20array))。書き込みには**--allow-write**パーミッションが必要です ([Writing files](https://docs.deno.com/examples/writing_files/#:~:text=The%20%60,to%20write%20files))。なお、Cliffy自体はファイル入出力に関与しないため、オプションでファイルパスを受け取ってアプリ側で書き出す形になります。

---

以上の内容を踏まえて、**実装手順の概要**は以下のようになります:

1. Denoプロジェクトを作成し、Cliffyおよび必要なら標準ライブラリをインポートして環境を準備する。Gemini APIキーを環境変数等で設定する。
2. Cliffyの`Command`を使い、`imark`コマンド本体とサブコマンド`caption`および`index`を定義する（名称、引数、説明）。 ([deno-cliffyでCLIツールを作る：`denosay`の実装](https://zenn.dev/kawarimidoll/articles/5559a185156bf4#:~:text=,version%20%60%E3%82%AA%E3%83%97%E3%82%B7%E3%83%A7%E3%83%B3%E3%81%8C%E8%87%AA%E5%8B%95%E3%81%A7%E8%BF%BD%E5%8A%A0%E3%81%95%E3%82%8C%E3%81%BE%E3%81%99)) ([cliffy.io](https://cliffy.io/docs@v0.25.4/command/sub-commands#:~:text=await%20new%20Command%28%29%20.command%28%20,s))
3. 各サブコマンドに対して、`--lang`（言語）および`--format`（出力形式）オプションを定義する ([deno-cliffyでCLIツールを作る：`denosay`の実装](https://zenn.dev/kawarimidoll/articles/5559a185156bf4#:~:text=,%E3%81%93%E3%81%AE%E7%B5%90%E6%9E%9C%E3%81%8C%E5%85%A8%E4%BD%93%E3%81%AE%E3%83%81%E3%82%A7%E3%83%BC%E3%83%B3%E3%81%8C%E8%BF%94%E3%81%99%E3%82%AA%E3%83%96%E3%82%B8%E3%82%A7%E3%82%AF%E3%83%88%E3%81%AB%E5%85%A5%E3%82%8A%E3%81%BE%E3%81%99))。必要に応じてEnumTypeで値を制限する ([cliffy.io](https://cliffy.io/docs@v0.25.4/command#:~:text=import%20,https%3A%2F%2Fdeno.land%2Fx%2Fcliffy%40v0.25.4%2Fcommand%2Fmod.ts))。
4. `.action()`内で、与えられた引数（画像パス or ディレクトリパス）とオプションを受け取り、処理を実装する。`caption`では単一ファイルを処理し、`index`ではディレクトリ内の複数ファイルをループ処理する。
5. 画像処理手順として、Denoでファイルを読み込み ([Gemini APIで画像解析を試す（TypeScriptサンプル付き）](https://zenn.dev/sorutonookage/articles/246099ae5da021#:~:text=%2F%2F%20%E3%83%AD%E3%83%BC%E3%82%AB%E3%83%AB%E3%81%AE%E7%94%BB%E5%83%8F%E3%83%95%E3%82%A1%E3%82%A4%E3%83%AB%E3%82%92%E8%AA%AD%E3%81%BF%E8%BE%BC%E3%81%BF%E3%80%81Base64%E3%82%A8%E3%83%B3%E3%82%B3%E3%83%BC%E3%83%89%E3%81%99%E3%82%8B%E9%96%A2%E6%95%B0%20async%20function%20readImageFile,catch%20%28error%29))、Base64エンコード ([Hex and base64 encoding](https://docs.deno.com/examples/hex_base64_encoding/#:~:text=We%20can%20easily%20encode%20a,base64%20using%20the%20encodeBase64%20method))し、MIMEタイプを判定 ([Gemini APIで画像解析を試す（TypeScriptサンプル付き）](https://zenn.dev/sorutonookage/articles/246099ae5da021#:~:text=%2F%2F%20%E3%83%95%E3%82%A1%E3%82%A4%E3%83%AB%E3%81%AE%E6%8B%A1%E5%BC%B5%E5%AD%90%E3%81%8B%E3%82%89MIME%E3%82%BF%E3%82%A4%E3%83%97%E3%82%92%E5%8F%96%E5%BE%97%E3%81%99%E3%82%8B%E9%96%A2%E6%95%B0%20function%20getMimeType,image%2Fpng))してGemini APIに送信する。公式のTypeScript SDKを利用する場合は`GoogleGenerativeAI`クラスを用いてリクエストを送る ([@google/generative-ai - npm](https://www.npmjs.com/package/@google/generative-ai#:~:text=const%20prompt%20%3D%20,%7D%2C))。HTTP直接利用の場合は`fetch`で適切なJSONボディをPOSTする。
6. Gemini APIから取得したキャプション結果を、`--format`で指定された形式（Markdown/JSON）に整形する。`--lang`で指定された言語で出力されていることを確認する（想定通りの言語でない場合はプロンプト文を調整する）。
7. 整形した結果を出力する。標準出力への表示（`console.log`）か、必要に応じてファイルに保存（`Deno.writeTextFile`）する ([Writing files](https://docs.deno.com/examples/writing_files/#:~:text=You%20can%20also%20write%20a,instead%20of%20a%20byte%20array))。
8. `deno run --allow-read --allow-write --allow-net`等のパーミッション付きでスクリプトを実行し、CLIツールをテストする。問題なければ`deno install`でシステムにインストールして利用できます。

以上が、Deno＋Cliffy＋Gemini APIを用いた画像キャプション生成CLIツール`imark`の開発に関する調査結果および具体的な実装方針です。各ポイントで触れたように公式SDKの活用 ([@google/generative-ai - npm](https://www.npmjs.com/package/@google/generative-ai#:~:text=const%20,ai))やCliffyによる堅牢なコマンド定義 ([deno-cliffyでCLIツールを作る：`denosay`の実装](https://zenn.dev/kawarimidoll/articles/5559a185156bf4#:~:text=,%E3%81%93%E3%81%AE%E7%B5%90%E6%9E%9C%E3%81%8C%E5%85%A8%E4%BD%93%E3%81%AE%E3%83%81%E3%82%A7%E3%83%BC%E3%83%B3%E3%81%8C%E8%BF%94%E3%81%99%E3%82%AA%E3%83%96%E3%82%B8%E3%82%A7%E3%82%AF%E3%83%88%E3%81%AB%E5%85%A5%E3%82%8A%E3%81%BE%E3%81%99))によって、比較的少ないコード量で目的の機能を実現できる見込みです。あとは実装段階で適宜エラーハンドリング（APIエラーやファイル読み込みエラー時の処理）や、詳細なヘルプメッセージの整備などを行えば、実用的なCLIツールになるでしょう。参考文献や公式ドキュメントも適宜参照しつつ進めてください。 ([@google/generative-ai - npm](https://www.npmjs.com/package/@google/generative-ai#:~:text=Google%20AI%20SDK%20for%20JavaScript)) ([deno-cliffyでCLIツールを作る：`denosay`の実装](https://zenn.dev/kawarimidoll/articles/5559a185156bf4#:~:text=%E3%81%93%E3%81%AE%E8%A8%98%E4%BA%8B%E3%81%A7%E3%81%AFDeno%E3%81%AE%E6%A8%99%E6%BA%96%E3%83%A9%E3%82%A4%E3%83%96%E3%83%A9%E3%83%AA%E3%81%AE%E3%81%BF%E3%82%92%E4%BD%BF%E3%81%A3%E3%81%A6%E3%81%84%E3%81%BE%E3%81%97%E3%81%9F%E3%81%8C%E3%80%81%E4%BB%8A%E5%9B%9E%E3%81%AFCLI%E3%83%95%E3%83%AC%E3%83%BC%E3%83%A0%E3%83%AF%E3%83%BC%E3%82%AF%E3%81%AEdeno))




以下に、Denoにおける依存関係の管理で、`npm:`や`jsr:`スキームを使う場合の注意点と推奨事項をまとめます。

---

## 依存関係の管理における `npm:` と `jsr:` の利用

Denoは従来、URLを直接指定して外部モジュールをインポートする方法が主流でしたが、最近は**npm互換性**が強化され、`npm:`スキームでnpmパッケージを直接利用できるようになりました。また、`jsr:`（Deno Deploy向けのスキームなど、サードパーティの提供する仕組みの場合もありますが）は、リモートCDNを利用する場合に使われることがあります。

### 1. `npm:` スキームを使う場合

- **公式サポート**: Denoはバージョン1.28以降、npmパッケージを直接インポートできる仕組みを提供しています。これにより、Node.js向けに提供される公式SDK（今回の場合、`@google/generative-ai`など）もDeno環境で利用できるようになっています。
- **import例**:
  ```ts
  import { GoogleGenerativeAI } from "npm:@google/generative-ai";
  ```
- **注意点**:
  - **バージョン管理**: npmパッケージの場合、バージョン番号を明示するか、package.jsonで管理する方法も検討してください。例えば、`npm:@google/generative-ai@1.0.0`のように指定できます。
  - **互換性**: 一部のnpmパッケージはNode.js専用のAPIに依存している場合があるため、Denoで動作するかどうかの検証が必要です。Gemini APIの公式SDKはDeno対応としているため、安心して利用できる可能性が高いです。
  - **キャッシュ管理**: Denoは外部モジュールをキャッシュする仕組みがあるので、依存パッケージの更新が反映されるタイミングに注意してください。`deno cache --reload`などで最新状態を反映する必要があります。

### 2. `jsr:` スキームを使う場合

- **概要**: `jsr:`は、Deno Deployなど一部のDeno環境で採用されることのあるURLスキームです。基本的な使い方は、CDN経由でモジュールを読み込む方法と似ています。
- **利用方法**: 例えば、CDNでホストされているモジュールを利用する場合、`import { xxx } from "jsr:/some-cdn/path/to/module.ts";`のように指定できます。  
- **注意点**:
  - **信頼性**: jsr:スキームで提供されるモジュールは、CDN経由の配信となるため、提供元の信頼性や可用性に注意してください。
  - **キャッシュポリシー**: CDN側のキャッシュポリシーに依存するため、最新バージョンのモジュールがすぐに反映されない場合があります。
  - **バージョン固定**: URLにバージョン番号を含めるか、バージョン管理されたURLを使用するなど、将来的な互換性に注意してください。

---

## まとめ

- **npm:**  
  - 公式SDKや多くのパッケージがnpmパッケージとして提供されており、Denoは`npm:`スキームでのインポートを公式にサポートしている。
  - バージョン管理、キャッシュ更新、Node.js依存の有無に注意する。
  
- **jsr:**  
  - 一部のCDNやサードパーティが提供する場合に利用可能。
  - 信頼性、キャッシュポリシー、バージョン固定に注意する。

DenoでCLIツールやその他のアプリケーションを開発する際、依存関係は可能な限り公式または広く利用されているnpmパッケージを利用するのが望ましいです。これにより、将来的な保守性や互換性が確保され、開発効率も向上します。CliffyやDeno標準ライブラリと組み合わせることで、堅牢なCLIツールの開発が実現できます。

以上の点を踏まえ、今回の`imark`ツールでは、Gemini APIのTypeScript SDKは`npm:`スキームでインポートし、CLIの引数処理にはCliffyを利用する実装方針としてください。