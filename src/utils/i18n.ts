/**
 * 国際化（i18n）ユーティリティ
 *
 * 環境変数からユーザーの言語を検出し、適切なメッセージを返す
 */

export type Locale = "ja" | "en";

/**
 * 環境変数からロケールを検出
 */
export function detectLocale(): Locale {
  const lang = process.env.LANG || process.env.LC_ALL || process.env.LC_MESSAGES || "";
  // ja_JP.UTF-8, ja_JP, ja などを検出
  if (lang.toLowerCase().startsWith("ja")) {
    return "ja";
  }
  return "en";
}

/**
 * メッセージ定義
 */
const messages = {
  // メインコマンド
  banner: {
    ja: `
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ergon - AI Media Generation CLI                             ║
║                                                               ║
║   🖼️  Imagen 4       高品質な画像生成                          ║
║   🎬  Veo 3.1        音声付き動画生成                          ║
║   🎙️  Gemini TTS     自然な音声ナレーション                    ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`,
    en: `
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ergon - AI Media Generation CLI                             ║
║                                                               ║
║   🖼️  Imagen 4       High-quality image generation            ║
║   🎬  Veo 3.1        Video generation with audio              ║
║   🎙️  Gemini TTS     Natural voice narration                  ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`,
  },

  mainDescription: {
    ja: "AI画像・動画・音声生成ツール - Imagen 4, Veo 3.1, Gemini TTS",
    en: "AI image, video, and audio generation tool - Imagen 4, Veo 3.1, Gemini TTS",
  },

  examples: {
    ja: `
使用例:
  $ ergon image gen "夕日の海辺" -t realistic     # リアルな画像を生成
  $ ergon image gen "可愛い猫" -t anime -a 1:1    # アニメ風の正方形画像
  $ ergon image edit photo.png "背景を青空に"    # 画像を編集
  $ ergon image explain screenshot.png           # 画像の内容を説明

  $ ergon video gen "波打ち際を歩く人" --fast    # 高速で動画生成
  $ ergon video gen "踊るキャラクター" -i character.png  # 画像から動画

  $ ergon narration gen "こんにちは" -v Kore     # 音声ナレーション生成
  $ ergon narration gen "Hello" -l en --speed 0.8  # 英語でゆっくり

クイックスタート:
  1. APIキーを設定: ergon configure
  2. 画像を生成:    ergon image gen "テーマ"
  3. 動画を生成:    ergon video gen "テーマ"
`,
    en: `
Examples:
  $ ergon image gen "sunset beach" -t realistic   # Generate realistic image
  $ ergon image gen "cute cat" -t anime -a 1:1    # Anime style, square
  $ ergon image edit photo.png "change background to blue sky"
  $ ergon image explain screenshot.png            # Describe image content

  $ ergon video gen "person walking on beach" --fast  # Fast video generation
  $ ergon video gen "dancing character" -i character.png  # Image to video

  $ ergon narration gen "Hello" -v Kore           # Voice narration
  $ ergon narration gen "Hello" -l en --speed 0.8 # English, slower

Quick Start:
  1. Set API key:      ergon configure
  2. Generate image:   ergon image gen "theme"
  3. Generate video:   ergon video gen "theme"
`,
  },

  specifySubcommand: {
    ja: "サブコマンドを指定してください。",
    en: "Please specify a subcommand.",
  },

  mediaGeneration: {
    ja: "メディア生成:",
    en: "Media Generation:",
  },

  utilities: {
    ja: "ユーティリティ:",
    en: "Utilities:",
  },

  // サブコマンド説明
  imageDescription: {
    ja: "画像生成・編集・説明 (Imagen 4 / Nano Banana)",
    en: "Image generation, editing, and explanation (Imagen 4 / Nano Banana)",
  },

  videoDescription: {
    ja: "動画生成 (Veo 3.1) - 音声付き動画を生成",
    en: "Video generation (Veo 3.1) - Generate videos with audio",
  },

  narrationDescription: {
    ja: "音声ナレーション生成 (Gemini TTS)",
    en: "Voice narration generation (Gemini TTS)",
  },

  presetDescription: {
    ja: "画像生成プリセットの管理",
    en: "Manage image generation presets",
  },

  configureDescription: {
    ja: "APIキー等の設定",
    en: "Configure API keys and settings",
  },

  logDescription: {
    ja: "生成ログの表示",
    en: "Display generation logs",
  },

  // image サブコマンド
  imageHelp: {
    ja: `
例:
  $ ergon image gen "夕日の海辺"              # デフォルト設定で生成
  $ ergon image gen "猫" -t anime -a 1:1     # アニメ風、正方形
  $ ergon image gen "風景" -t realistic -f jpg  # リアル、JPG形式
  $ ergon image edit photo.png "背景を変更"  # 画像を編集
  $ ergon image explain screenshot.png       # 画像の内容を説明

スタイル (-t):
  realistic, illustration, flat, anime, watercolor,
  oil-painting, pixel-art, sketch, 3d-render,
  corporate, minimal, pop-art
`,
    en: `
Examples:
  $ ergon image gen "sunset beach"           # Generate with defaults
  $ ergon image gen "cat" -t anime -a 1:1    # Anime style, square
  $ ergon image gen "landscape" -t realistic -f jpg  # Realistic, JPG
  $ ergon image edit photo.png "change background"   # Edit image
  $ ergon image explain screenshot.png       # Explain image content

Styles (-t):
  realistic, illustration, flat, anime, watercolor,
  oil-painting, pixel-art, sketch, 3d-render,
  corporate, minimal, pop-art
`,
  },

  // video サブコマンド
  videoHelp: {
    ja: `
例:
  $ ergon video gen "波打ち際を歩く人"        # テキストから動画生成
  $ ergon video gen "踊る猫" --fast          # 高速モード (veo-3.1-flash)
  $ ergon video gen "動く風景" -i photo.png  # 画像から動画生成
  $ ergon video gen "シーン" --duration 8    # 8秒の動画

オプション:
  --fast         高速生成 (veo-3.1-flash)
  -i, --image    入力画像から動画生成
  --duration     動画の長さ (5-8秒)
  --aspect-ratio アスペクト比 (16:9, 9:16)
`,
    en: `
Examples:
  $ ergon video gen "person walking on beach"  # Text to video
  $ ergon video gen "dancing cat" --fast       # Fast mode (veo-3.1-flash)
  $ ergon video gen "moving landscape" -i photo.png  # Image to video
  $ ergon video gen "scene" --duration 8       # 8-second video

Options:
  --fast         Fast generation (veo-3.1-flash)
  -i, --image    Generate video from input image
  --duration     Video length (5-8 seconds)
  --aspect-ratio Aspect ratio (16:9, 9:16)
`,
  },

  // narration サブコマンド
  narrationHelp: {
    ja: `
例:
  $ ergon narration gen "こんにちは"          # デフォルト設定で生成
  $ ergon narration gen "Hello" -l en        # 英語で生成
  $ ergon narration gen "文章" -v Puck       # 声を変更
  $ ergon narration gen "文章" --speed 0.8   # ゆっくり話す
  $ ergon narration gen "文章" -c "落ち着いた声で"  # キャラクター設定

ボイス (-v):
  Aoede, Charon, Fenrir, Kore (デフォルト), Puck

言語 (-l):
  ja (日本語), en (英語), zh (中国語), ko (韓国語),
  es, fr, de, it, pt, ru
`,
    en: `
Examples:
  $ ergon narration gen "Hello"              # Generate with defaults
  $ ergon narration gen "Hello" -l en        # Generate in English
  $ ergon narration gen "text" -v Puck       # Change voice
  $ ergon narration gen "text" --speed 0.8   # Speak slower
  $ ergon narration gen "text" -c "calm voice"  # Character setting

Voices (-v):
  Aoede, Charon, Fenrir, Kore (default), Puck

Languages (-l):
  ja (Japanese), en (English), zh (Chinese), ko (Korean),
  es, fr, de, it, pt, ru
`,
  },

  // サブコマンド説明
  imageGenCmd: {
    ja: "画像を生成します (Imagen 4)",
    en: "Generate images (Imagen 4)",
  },

  imageEditCmd: {
    ja: "画像を編集します (Nano Banana)",
    en: "Edit images (Nano Banana)",
  },

  imageExplainCmd: {
    ja: "画像の内容を説明",
    en: "Explain image content",
  },

  videoGenCmd: {
    ja: "動画を生成します (Veo 3.1)",
    en: "Generate videos (Veo 3.1)",
  },

  narrationGenCmd: {
    ja: "音声ナレーションを生成します (TTS)",
    en: "Generate voice narration (TTS)",
  },
} as const;

type MessageKey = keyof typeof messages;

let currentLocale: Locale | null = null;

/**
 * 現在のロケールを取得（キャッシュ付き）
 */
export function getLocale(): Locale {
  if (currentLocale === null) {
    currentLocale = detectLocale();
  }
  return currentLocale;
}

/**
 * ロケールを設定（テスト用）
 */
export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

/**
 * メッセージを取得
 */
export function t(key: MessageKey): string {
  const locale = getLocale();
  return messages[key][locale];
}

/**
 * すべてのメッセージキーをエクスポート
 */
export const messageKeys = Object.keys(messages) as MessageKey[];
