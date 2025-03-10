import { Command, EnumType } from "../deps.ts";

// NumberTypeの簡易実装
class NumberType {
  // deno-lint-ignore no-explicit-any
  parse(type: any): number {
    const value = String(type);
    const parsedValue = Number(value);
    if (isNaN(parsedValue)) {
      throw new Error(`Value "${value}" is not a number.`);
    }
    return parsedValue;
  }
}
import { extname } from "../deps.ts";
import { getApiKey } from "../utils/config.ts";
import { saveFileWithUniqueNameIfExists } from "../utils/file.ts";
import { GeminiClient } from "../utils/gemini.ts";
import {
  ASPECT_RATIOS,
  AspectRatio,
  DEFAULT_OPTIONS,
  IMAGE_TYPE_PROMPTS,
  ImageFormat,
  ImageFXOptions,
  ImageType,
  SIZE_PRESETS,
  SizePreset,
  VALID_IMAGE_FORMATS,
} from "../utils/image_constants.ts";
import { ImageFXClient } from "../utils/imagefx.ts";
import { LogDestination, Logger, LogLevel } from "../utils/logger.ts";

/**
 * 画像生成コマンドのオプション
 * CLIから受け取るオプションの型を定義します
 */
interface GenOptions extends Omit<ImageFXOptions, "size" | "aspectRatio" | "type" | "format"> {
  context?: string; // コンテキストファイルのパス
  output?: string; // 出力パス
  size: string; // 画像サイズ
  aspectRatio: string; // アスペクト比
  type: string; // 画像タイプ
  format: ImageFormat; // 画像フォーマット
  debug?: boolean; // デバッグモード
}

/**
 * 出力パス情報
 * 出力ファイルのパスとフォーマットを保持します
 */
interface OutputPathInfo {
  path: string;
  format: ImageFormat;
}

// 画像タイプの説明を定義
const _IMAGE_TYPE_DESCRIPTIONS: Record<ImageType, string> = {
  realistic: "写実的な写真のような表現",
  illustration: "イラストレーション風の表現",
  flat: "フラットデザイン風の表現",
  anime: "アニメ風の表現",
  watercolor: "水彩画風の表現",
  "oil-painting": "油絵風の表現",
  "pixel-art": "ピクセルアート風の表現",
  sketch: "スケッチ風の表現",
  "3d-render": "3Dレンダリング風の表現",
  corporate: "企業向けの洗練された表現",
  minimal: "ミニマルな表現",
  "pop-art": "ポップアート風の表現",
};

// CLIオプションの型定義
const formatType = new EnumType<ImageFormat>(VALID_IMAGE_FORMATS);
const sizeType = new EnumType(Object.keys(SIZE_PRESETS));
const aspectRatioType = new EnumType(Object.keys(ASPECT_RATIOS));
const typeType = new EnumType(Object.keys(IMAGE_TYPE_PROMPTS));
const qualityType = new NumberType();

/**
 * 画像生成コマンドクラス
 * imark genコマンドの実装を提供します
 */
class GenCommand extends Command<{
  context?: string;
  output?: string;
  size: string;
  aspectRatio: string;
  type: ImageType;
  format: ImageFormat;
  quality: number;
  debug: boolean;
}> {
  private logger!: Logger;
  private geminiClient!: GeminiClient;
  private imagefxClient!: ImageFXClient;

  constructor() {
    super();
    this.initializeCommand();
  }

  /**
   * 必要なクライアントの初期化を行います
   * - ロガーの設定
   * - Gemini APIクライアントの初期化
   * - ImageFX APIクライアントの初期化
   */
  public async initialize() {
    const apiKey = await getApiKey();
    this.logger = Logger.getInstance({
      name: "gen",
      config: {
        destination: LogDestination.BOTH,
        minLevel: LogLevel.INFO,
      },
    });
    this.geminiClient = new GeminiClient(apiKey);
    this.imagefxClient = new ImageFXClient(apiKey);
  }

  /**
   * CLIコマンドの設定を初期化します
   * - コマンドの説明
   * - オプションの定義
   * - 使用例の追加
   */
  private initializeCommand() {
    this
      .description("画像を生成します")
      .arguments("<theme:string>")
      .option("-c, --context <file:string>", "コンテキストファイルのパス")
      .option("-o, --output <path:string>", "出力パス（ファイルまたはディレクトリ）")
      .option(
        "-s, --size <size:size>",
        `画像サイズプリセット (${Object.keys(SIZE_PRESETS).join(" | ")})`,
        { default: DEFAULT_OPTIONS.size },
      )
      .option(
        "-a, --aspect-ratio <ratio:aspectRatio>",
        `アスペクト比 (${Object.keys(ASPECT_RATIOS).join(" | ")})`,
        { default: DEFAULT_OPTIONS.aspectRatio },
      )
      .option(
        "-t, --type <type:type>",
        `画像タイプ (${Object.keys(IMAGE_TYPE_PROMPTS).join(" | ")})`,
        { default: DEFAULT_OPTIONS.type },
      )
      .option(
        "-f, --format <format:format>",
        "画像のフォーマット (png | jpg | jpeg | webp)",
        { default: DEFAULT_OPTIONS.format as ImageFormat },
      )
      .option(
        "-q, --quality <number:number>",
        "画像の品質 (1-100)",
        { default: DEFAULT_OPTIONS.quality },
      )
      .option(
        "-d, --debug",
        "デバッグモード（生成されたプロンプトを表示）",
        { default: false },
      )
      .example(
        "基本的な使い方",
        "imark gen '水星にすむ生物' --type realistic",
      )
      .example(
        "アニメ風の富士山",
        "imark gen '富士山の風景' --type anime --aspect-ratio 16:9",
      )
      .example(
        "水彩画風の企業ロゴ",
        "imark gen '企業ロゴ' --type watercolor --size fullhd",
      )
      .example(
        "デバッグモード",
        "imark gen '猫の写真' --type realistic --debug",
      )
      .type("format", formatType)
      .type("size", sizeType)
      .type("aspectRatio", aspectRatioType)
      .type("type", typeType)
      .type("quality", qualityType)
      .action(async (options, theme: string) => {
        // オプションの型を適切に変換
        const genOptions: GenOptions = {
          context: typeof options.context === "string" ? options.context : undefined,
          output: typeof options.output === "string" ? options.output : undefined,
          size: String(options.size || DEFAULT_OPTIONS.size),
          aspectRatio: String(options.aspectRatio || DEFAULT_OPTIONS.aspectRatio),
          type: String(options.type || DEFAULT_OPTIONS.type),
          format: (options.format || DEFAULT_OPTIONS.format) as ImageFormat,
          quality: typeof options.quality === "number" ? options.quality : DEFAULT_OPTIONS.quality,
          debug: Boolean(options.debug),
        };
        await this.handleAction(genOptions, theme);
      });
  }

  /**
   * コンテキストファイルを読み込みます
   * @param contextPath コンテキストファイルのパス
   * @returns コンテキストの内容
   */
  private async loadContext(contextPath?: string): Promise<string> {
    if (!contextPath) return "";
    try {
      return await Deno.readTextFile(contextPath);
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`コンテキストファイルの読み込みに失敗しました: ${error.message}`);
      }
      throw new Error(`コンテキストファイルの読み込みに失敗しました: ${String(error)}`);
    }
  }

  /**
   * 画像フォーマットの妥当性を検証します
   * @param ext 拡張子
   * @param specifiedFormat 指定されたフォーマット
   */
  private validateImageFormat(ext: string, specifiedFormat?: ImageFormat) {
    if (!VALID_IMAGE_FORMATS.includes(ext as ImageFormat)) {
      throw new Error(`サポートされていない画像フォーマットです: ${ext}`);
    }
    if (specifiedFormat && ext !== specifiedFormat) {
      throw new Error(
        `出力ファイルの拡張子(${ext})と指定されたフォーマット(${specifiedFormat})が一致しません`,
      );
    }
  }

  /**
   * テーマから一意なファイル名を生成します
   * @param theme 画像生成のテーマ
   * @returns 生成されたファイル名
   */
  private async generateFileName(theme: string): Promise<string> {
    return await this.geminiClient.generateFileName(theme, {
      maxLength: 40,
      includeRandomNumber: false,
    });
  }

  /**
   * 出力パスを解決します
   * - 出力パスが指定されていない場合は、テーマから生成
   * - ディレクトリの場合は、その中にファイルを生成
   * - 既存のファイルの場合は、拡張子をチェック
   * @param outputPath 出力パス
   * @param defaultFormat デフォルトのフォーマット
   * @param theme 画像生成のテーマ
   */
  private async resolveOutputPath(
    outputPath: string | undefined,
    defaultFormat: ImageFormat,
    theme: string,
  ): Promise<OutputPathInfo> {
    let format = defaultFormat;

    if (!outputPath) {
      const fileName = await this.generateFileName(theme);
      return { path: `${fileName}.${format}`, format };
    }

    try {
      const stat = await Deno.stat(outputPath);
      if (stat.isDirectory) {
        const fileName = await this.generateFileName(theme);
        return { path: `${outputPath}/${fileName}.${format}`, format };
      }
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) {
        throw error;
      }
    }

    const ext = extname(outputPath).toLowerCase().slice(1);
    if (ext) {
      this.validateImageFormat(ext, defaultFormat);
      format = ext as ImageFormat;
    } else {
      outputPath = `${outputPath}.${format}`;
    }

    return { path: outputPath, format };
  }

  /**
   * コマンドのアクション処理を実行します
   * @param options コマンドオプション
   * @param theme 画像生成のテーマ
   */
  public async handleAction(options: GenOptions, theme: string) {
    if (!theme) {
      this.showHelp();
      return;
    }

    await this.initialize();

    const context = await this.loadContext(options.context);
    const prompt = await this.geminiClient.generatePrompt(theme, context, {
      type: options.type as ImageType,
    });

    if (options.debug) {
      await this.logger.debug("生成されたプロンプト", {
        prompt,
        type: options.type,
        theme,
      });
    }

    const imageData = await this.imagefxClient.generateImage(prompt, {
      size: options.size as SizePreset,
      aspectRatio: options.aspectRatio as AspectRatio,
      type: options.type as ImageType,
      format: options.format as ImageFormat,
      quality: options.quality,
    });

    const { path: outputPath, format } = await this.resolveOutputPath(
      options.output,
      options.format,
      theme,
    );

    const finalOutputPath = await saveFileWithUniqueNameIfExists(outputPath, imageData);

    await this.logger.info("画像を生成しました", {
      path: finalOutputPath,
      format,
      type: options.type,
      size: options.size,
      aspectRatio: options.aspectRatio,
    });
  }
}

// GenCommandクラスのエクスポートを削除し、代わりにgenCommandインスタンスをエクスポート
export const genCommand = new Command()
  .description("画像を生成します")
  .arguments("<theme:string>")
  .option("-c, --context <file:string>", "コンテキストファイルのパス")
  .option("-o, --output <path:string>", "出力パス（ファイルまたはディレクトリ）")
  .option(
    "-s, --size <size:size>",
    `画像サイズプリセット (${Object.keys(SIZE_PRESETS).join(" | ")})`,
    { default: DEFAULT_OPTIONS.size },
  )
  .option(
    "-a, --aspect-ratio <ratio:aspectRatio>",
    `アスペクト比 (${Object.keys(ASPECT_RATIOS).join(" | ")})`,
    { default: DEFAULT_OPTIONS.aspectRatio },
  )
  .option(
    "-t, --type <type:type>",
    `画像タイプ (${Object.keys(IMAGE_TYPE_PROMPTS).join(" | ")})`,
    { default: DEFAULT_OPTIONS.type },
  )
  .option(
    "-f, --format <format:format>",
    "画像のフォーマット (png | jpg | jpeg | webp)",
    { default: DEFAULT_OPTIONS.format as ImageFormat },
  )
  .option(
    "-q, --quality <number:number>",
    "画像の品質 (1-100)",
    { default: DEFAULT_OPTIONS.quality },
  )
  .option(
    "-d, --debug",
    "デバッグモード（生成されたプロンプトを表示）",
    { default: false },
  )
  .example(
    "基本的な使い方",
    "imark gen '水星にすむ生物' --type realistic",
  )
  .example(
    "アニメ風の富士山",
    "imark gen '富士山の風景' --type anime --aspect-ratio 16:9",
  )
  .example(
    "水彩画風の企業ロゴ",
    "imark gen '企業ロゴ' --type watercolor --size fullhd",
  )
  .example(
    "デバッグモード",
    "imark gen '猫の写真' --type realistic --debug",
  )
  .type("format", formatType)
  .type("size", sizeType)
  .type("aspectRatio", aspectRatioType)
  .type("type", typeType)
  .type("quality", qualityType)
  .action(async (options, theme: string) => {
    // オプションの型を適切に変換
    const genOptions: GenOptions = {
      context: typeof options.context === "string" ? options.context : undefined,
      output: typeof options.output === "string" ? options.output : undefined,
      size: String(options.size || DEFAULT_OPTIONS.size),
      aspectRatio: String(options.aspectRatio || DEFAULT_OPTIONS.aspectRatio),
      type: String(options.type || DEFAULT_OPTIONS.type),
      format: (options.format || DEFAULT_OPTIONS.format) as ImageFormat,
      quality: typeof options.quality === "number" ? options.quality : DEFAULT_OPTIONS.quality,
      debug: Boolean(options.debug),
    };

    // GenCommandクラスのインスタンスを作成して処理を委譲
    const genCommand = new GenCommand();
    await genCommand.initialize();
    await genCommand.handleAction(genOptions, theme);
  });
