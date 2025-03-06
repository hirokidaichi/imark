import { Command, EnumType } from "@cliffy/command";
import { getApiKey } from "../utils/config.ts";
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
        if (!theme) {
          this.showHelp();
          return;
        }

        const apiKey = await getApiKey();
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

        const prompt = await geminiClient.generatePrompt(theme, context, {
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

        let outputPath = options.output;
        if (!outputPath) {
          const fileName = await geminiClient.generateFileName(theme, {
            maxLength: 40,
            includeRandomNumber: false,
          });
          outputPath = `${fileName}.${options.format}`;
        } else {
          try {
            const stat = await Deno.stat(outputPath);
            if (stat.isDirectory) {
              const fileName = await geminiClient.generateFileName(theme, {
                maxLength: 40,
                includeRandomNumber: false,
              });
              outputPath = `${outputPath}/${fileName}.${options.format}`;
            }
          } catch (error) {
            if (error instanceof Deno.errors.NotFound) {
              await Deno.mkdir(outputPath, { recursive: true });
              const fileName = await geminiClient.generateFileName(theme, {
                maxLength: 40,
                includeRandomNumber: false,
              });
              outputPath = `${outputPath}/${fileName}.${options.format}`;
            } else {
              throw error;
            }
          }
        }

        // ファイルが存在する場合、乱数を追加して再試行
        let finalOutputPath = outputPath;
        let counter = 1;
        while (true) {
          try {
            await Deno.stat(finalOutputPath);
            // ファイルが存在する場合、乱数を追加
            const baseName = finalOutputPath.slice(0, finalOutputPath.lastIndexOf("."));
            const ext = finalOutputPath.slice(finalOutputPath.lastIndexOf("."));
            const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
            finalOutputPath = `${baseName}-${randomNum}${ext}`;
            counter++;
          } catch (error) {
            if (error instanceof Deno.errors.NotFound) {
              // ファイルが存在しない場合、このパスを使用
              break;
            }
            throw error;
          }
        }

        await Deno.writeFile(finalOutputPath, imageData);
        console.log(`画像を保存しました: ${finalOutputPath}`);
      });
  }
}
