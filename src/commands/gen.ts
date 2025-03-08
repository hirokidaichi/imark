import { Command, EnumType } from "@cliffy/command";
import { extname } from "@std/path/extname";
import { getApiKey } from "../utils/config.ts";
import { saveFileWithUniqueNameIfExists } from "../utils/file.ts";
import { GeminiClient } from "../utils/gemini.ts";
import { IMAGE_TYPE_PROMPTS, ImageType } from "../utils/image_type.ts";
import {
  ASPECT_RATIOS,
  AspectRatio,
  DEFAULT_OPTIONS,
  ImageFXClient,
  ImageFXOptions,
  SIZE_PRESETS,
  SizePreset,
} from "../utils/imagefx.ts";
import { LogDestination, Logger, LogLevel } from "../utils/logger.ts";

/**
 * 画像フォーマットの型定義
 * サポートされている画像フォーマットを制限します
 */
type ImageFormat = "jpg" | "jpeg" | "png" | "webp";

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

// CLIオプションの型定義
const formatType = new EnumType<ImageFormat>(["jpg", "jpeg", "png", "webp"]);
const sizeType = new EnumType(Object.keys(SIZE_PRESETS));
const aspectRatioType = new EnumType(Object.keys(ASPECT_RATIOS));
const typeType = new EnumType(Object.keys(IMAGE_TYPE_PROMPTS));
const validImageFormats = ["jpg", "jpeg", "png", "webp"];

/**
 * 画像生成コマンドクラス
 * imark genコマンドの実装を提供します
 */
export class GenCommand extends Command {
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
  private async initialize() {
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
    if (!validImageFormats.includes(ext)) {
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
   * コマンドの主要な処理を実行します
   * 1. 初期化
   * 2. コンテキストの読み込み
   * 3. プロンプトの生成
   * 4. 画像の生成
   * 5. 出力パスの解決
   * 6. 画像の保存
   * @param options コマンドオプション
   * @param theme 画像生成のテーマ
   */
  private async handleAction(options: GenOptions, theme: string) {
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
