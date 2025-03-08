/**
 * 画像関連の定数と型定義
 */

/**
 * 画像フォーマットの型定義
 */
export type ImageFormat = "jpg" | "jpeg" | "png" | "webp";

/**
 * 画像タイプの型定義
 */
export type ImageType =
  | "realistic" // リアルな写真風
  | "illustration" // イラスト風
  | "flat" // フラットデザインのイラスト（白背景、単色）
  | "anime" // アニメ風
  | "watercolor" // 水彩画風
  | "oil-painting" // 油絵風
  | "pixel-art" // ピクセルアート風
  | "sketch" // スケッチ風
  | "3d-render" // 3DCG風
  | "corporate" // ビジネス/企業向け
  | "minimal" // ミニマル/シンプル
  | "pop-art"; // ポップアート風

/**
 * アスペクト比の型定義
 */
export type AspectRatio = "16:9" | "4:3" | "1:1" | "9:16" | "3:4";

/**
 * サイズプリセットの型定義
 */
export type SizePreset = "tiny" | "hd" | "fullhd" | "2k" | "4k";

/**
 * 安全性フィルターレベルの型定義
 */
export type SafetyFilterLevel =
  | "BLOCK_LOW_AND_ABOVE"
  | "BLOCK_MEDIUM_AND_ABOVE"
  | "BLOCK_ONLY_HIGH";

/**
 * 人物生成の設定の型定義
 */
export type PersonGeneration = "DONT_ALLOW" | "ALLOW_ADULT";

/**
 * 画像生成オプションのインターフェース
 */
export interface ImageFXOptions {
  size?: SizePreset;
  aspectRatio?: AspectRatio;
  format?: ImageFormat;
  quality?: number;
  type?: ImageType;
  numberOfImages?: number;
  safetyFilterLevel?: SafetyFilterLevel;
  personGeneration?: PersonGeneration;
}

/**
 * サイズプリセットの定義
 */
export const SIZE_PRESETS: Record<SizePreset, { width: number; height: number }> = {
  tiny: { width: 160, height: 90 },
  hd: { width: 1280, height: 720 },
  fullhd: { width: 1920, height: 1080 },
  "2k": { width: 2560, height: 1440 },
  "4k": { width: 3840, height: 2160 },
} as const;

/**
 * アスペクト比の定義
 */
export const ASPECT_RATIOS: Record<AspectRatio, number> = {
  "16:9": 16 / 9,
  "4:3": 4 / 3,
  "1:1": 1,
  "9:16": 9 / 16,
  "3:4": 3 / 4,
} as const;

/**
 * 画像タイプごとのプロンプト定義
 */
export const IMAGE_TYPE_PROMPTS: Record<ImageType, string> = {
  "realistic": "Create a hyper-realistic photograph with exceptional detail and clarity.",
  "illustration":
    "Create a hand-drawn illustration with warm, inviting atmosphere and artistic charm.",
  "flat":
    "Create a simple, minimal but a little pop illustration with a white background. Use soft pastel colors with gentle saturation, incorporating light blue, mint green and soft pink as accent colors. The style should feature rounded lines and delicate details, creating a friendly and approachable look that's both modern and charming. The illustration should be easily recognizable while maintaining a sweet, cheerful simplicity.",
  "anime":
    "Create an image in Japanese anime style with vibrant colors and distinctive eye designs.",
  "watercolor":
    "Create a watercolor painting with soft, flowing colors and artistic blending effects.",
  "oil-painting": "Create an oil painting with rich textures, deep colors, and impasto effects.",
  "pixel-art": "Create a pixel art image with retro gaming aesthetics and digital precision.",
  "sketch": "Create a pencil or pen sketch with dynamic line variations and artistic expression.",
  "3d-render": "Create a 3D rendered image with realistic lighting, materials, and depth.",
  "corporate":
    "Create a professional business image with clean, modern aesthetics and corporate appeal.",
  "minimal":
    "Create a minimal design with clean lines, essential elements, and refined simplicity.",
  "pop-art": "Create a pop art image with bold colors, dot patterns, and contemporary style.",
} as const;

/**
 * デフォルトのオプション設定
 */
export const DEFAULT_OPTIONS: ImageFXOptions = {
  size: "fullhd",
  aspectRatio: "16:9",
  format: "webp",
  quality: 90,
  type: "flat",
  numberOfImages: 1,
  safetyFilterLevel: "BLOCK_ONLY_HIGH",
  personGeneration: "ALLOW_ADULT",
} as const;

/**
 * 有効な画像フォーマットの配列
 */
export const VALID_IMAGE_FORMATS: readonly ImageFormat[] = ["jpg", "jpeg", "png", "webp"] as const;
