import { Command, EnumType } from "@cliffy/command";
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

type ImageFormat = "jpg" | "jpeg" | "png" | "webp";

interface GenOptions extends Omit<ImageFXOptions, "size" | "aspectRatio" | "type" | "format"> {
  context?: string;
  output?: string;
  size: string;
  aspectRatio: string;
  type: string;
  format: ImageFormat;
  debug?: boolean;
}

const formatType = new EnumType<ImageFormat>(["jpg", "jpeg", "png", "webp"]);
const sizeType = new EnumType(Object.keys(SIZE_PRESETS));
const aspectRatioType = new EnumType(Object.keys(ASPECT_RATIOS));
const typeType = new EnumType(Object.keys(IMAGE_TYPE_PROMPTS));

export class GenCommand extends Command {
  constructor() {
    super();

    this
      .description("画像を生成します")
      .arguments("[theme:string]")
      .option("-c, --context <file:string>", "コンテキストファイルのパス")
      .option("-o, --output <file:string>", "出力ファイルのパス")
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
      .action(async (options, theme?: string) => {
        const apiKey = Deno.env.get("GOOGLE_API_KEY");
        if (!apiKey) {
          throw new Error("GOOGLE_API_KEY環境変数が設定されていません");
        }

        const geminiClient = new GeminiClient(apiKey);
        const imagefxClient = new ImageFXClient(apiKey);

        let context = "";
        if (options.context) {
          try {
            context = await Deno.readTextFile(options.context);
          } catch (error) {
            if (error instanceof Error) {
              throw new Error(`コンテキストファイルの読み込みに失敗しました: ${error.message}`);
            }
            throw error;
          }
        }

        const prompt = theme
          ? await geminiClient.generatePrompt(theme, context, { type: options.type as ImageType })
          : await geminiClient.generatePrompt("画像を生成してください", context, {
            type: options.type as ImageType,
          });

        if (options.debug) {
          console.log("\n=== 生成されたプロンプト ===\n");
          console.log(prompt);
          console.log("\n========================\n");
        }

        const imageData = await imagefxClient.generateImage(prompt, {
          size: options.size as SizePreset,
          aspectRatio: options.aspectRatio as AspectRatio,
          type: options.type as ImageType,
          format: options.format as ImageFormat,
          quality: options.quality,
        });

        const outputPath = options.output || `output_${Date.now()}.${options.format}`;
        await Deno.writeFile(outputPath, imageData);
        console.log(`画像を保存しました: ${outputPath}`);
      });
  }
}
