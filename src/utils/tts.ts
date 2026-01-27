import { GoogleGenAI, Modality } from "@google/genai";
import lamejs from "@breezystack/lamejs";
import { Logger } from "./logger.js";

/**
 * TTSモデルの種類
 */
export type TTSModel = "flash" | "pro";

/**
 * 利用可能なTTSモデルの一覧
 */
export const TTS_MODELS: TTSModel[] = ["flash", "pro"];

/**
 * TTSモデルごとのモデルID
 */
export const TTS_MODEL_IDS: Record<TTSModel, string> = {
  flash: "gemini-2.5-flash-preview-tts",
  pro: "gemini-2.5-pro-preview-tts",
};

/**
 * 利用可能な音声
 */
export type TTSVoice = "Aoede" | "Charon" | "Fenrir" | "Kore" | "Puck";

/**
 * 利用可能な音声の一覧
 */
export const TTS_VOICES: TTSVoice[] = ["Aoede", "Charon", "Fenrir", "Kore", "Puck"];

/**
 * 出力フォーマット
 */
export type TTSFormat = "wav" | "mp3";

/**
 * 利用可能なフォーマットの一覧
 */
export const TTS_FORMATS: TTSFormat[] = ["wav", "mp3"];

/**
 * サポートされる言語コード
 */
export type TTSLanguage =
  | "ja" // 日本語
  | "en" // 英語
  | "zh" // 中国語
  | "ko" // 韓国語
  | "es" // スペイン語
  | "fr" // フランス語
  | "de" // ドイツ語
  | "it" // イタリア語
  | "pt" // ポルトガル語
  | "ru"; // ロシア語

/**
 * 利用可能な言語の一覧
 */
export const TTS_LANGUAGES: TTSLanguage[] = [
  "ja",
  "en",
  "zh",
  "ko",
  "es",
  "fr",
  "de",
  "it",
  "pt",
  "ru",
];

/**
 * TTS生成オプション
 */
export interface TTSOptions {
  model?: TTSModel;
  voice?: TTSVoice;
  language?: TTSLanguage;
  format?: TTSFormat;
  speed?: number; // 0.25 - 4.0
  character?: string; // キャラクター設定（例: "元気な5歳の女の子"）
  direction?: string; // 演技プラン（例: "興奮して叫んでいる"）
}

/**
 * デフォルトのTTSオプション（character, directionはオプショナルなので除外）
 */
export const DEFAULT_TTS_OPTIONS: Required<Omit<TTSOptions, "character" | "direction">> = {
  model: "pro",
  voice: "Kore",
  language: "ja",
  format: "mp3",
  speed: 1.0,
};

/**
 * TTS生成結果
 */
export interface TTSResult {
  audioData: Uint8Array;
  mimeType: string;
}

/**
 * PCMデータをWAVフォーマットに変換する
 * Gemini TTS APIはaudio/L16;codec=pcm;rate=24000形式で返すため、
 * WAVヘッダーを追加して再生可能なフォーマットにする
 */
function pcmToWav(pcmData: Uint8Array, sampleRate: number = 24000): Uint8Array {
  const numChannels = 1; // モノラル
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmData.length;
  const fileSize = 36 + dataSize;

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFFヘッダー
  writeString(view, 0, "RIFF");
  view.setUint32(4, fileSize, true);
  writeString(view, 8, "WAVE");

  // fmtチャンク
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // fmtチャンクサイズ
  view.setUint16(20, 1, true); // オーディオフォーマット (1 = PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // dataチャンク
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  // PCMデータをコピー
  const wavData = new Uint8Array(buffer);
  wavData.set(pcmData, 44);

  return wavData;
}

/**
 * PCMデータをMP3フォーマットに変換する (lamejs使用)
 */
function pcmToMp3(pcmData: Uint8Array, sampleRate: number = 24000): Uint8Array {
  // PCMデータをInt16Arrayに変換（リトルエンディアン）
  const samples = new Int16Array(pcmData.buffer, pcmData.byteOffset, pcmData.length / 2);

  // MP3エンコーダー初期化（モノラル、サンプルレート、128kbps）
  const mp3encoder = new lamejs.Mp3Encoder(1, sampleRate, 128);
  const mp3Chunks: Uint8Array[] = [];
  const sampleBlockSize = 1152;

  // チャンクごとにエンコード
  for (let i = 0; i < samples.length; i += sampleBlockSize) {
    const chunk = samples.subarray(i, i + sampleBlockSize);
    const encoded = mp3encoder.encodeBuffer(chunk);
    if (encoded.length > 0) {
      // Int8Array を Uint8Array に変換
      mp3Chunks.push(new Uint8Array(encoded.buffer, encoded.byteOffset, encoded.length));
    }
  }

  // 終端処理
  const finalData = mp3encoder.flush();
  if (finalData.length > 0) {
    mp3Chunks.push(new Uint8Array(finalData.buffer, finalData.byteOffset, finalData.length));
  }

  // 全バッファを結合
  const totalLength = mp3Chunks.reduce((acc, buf) => acc + buf.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const buf of mp3Chunks) {
    result.set(buf, offset);
    offset += buf.length;
  }

  return result;
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * Google Text-to-Speech クライアント (Gemini 2.5 Flash TTS)
 */
export class TTSClient {
  private ai: GoogleGenAI;
  private logger: Logger;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("GOOGLE_API_KEYが設定されていません");
    }
    this.ai = new GoogleGenAI({ apiKey });
    this.logger = Logger.getInstance({ name: "tts" });
  }

  /**
   * キャラクターと演技プランを含めたプロンプトを生成します
   * 演技指示を台本形式で埋め込み、モデルが自然に理解できるようにします
   */
  private buildPromptWithInstructions(
    text: string,
    character?: string,
    direction?: string
  ): string {
    if (!character && !direction) {
      return text;
    }

    // 台本形式で演技指示を埋め込む
    // 例: （興奮しながら叫ぶ元気な女の子として）「えいっ！」
    const parts: string[] = [];

    if (character && direction) {
      parts.push(`（${direction}${character}の声で）`);
    } else if (character) {
      parts.push(`（${character}の声で）`);
    } else if (direction) {
      parts.push(`（${direction}）`);
    }

    parts.push(text);

    return parts.join("");
  }

  /**
   * テキストから音声を生成します
   */
  async generateSpeech(text: string, options: TTSOptions = {}): Promise<TTSResult> {
    const {
      model = DEFAULT_TTS_OPTIONS.model,
      voice = DEFAULT_TTS_OPTIONS.voice,
      language = DEFAULT_TTS_OPTIONS.language,
      format = DEFAULT_TTS_OPTIONS.format,
      speed = DEFAULT_TTS_OPTIONS.speed,
      character,
      direction,
    } = options;

    // 速度の検証
    if (speed < 0.25 || speed > 4.0) {
      throw new Error("話速は0.25〜4.0の範囲で指定してください");
    }

    const modelId = TTS_MODEL_IDS[model];

    this.logger.debug("=== TTS Generation Debug Info ===");
    this.logger.debug(`Text: ${text.substring(0, 100)}...`);
    this.logger.debug(`Model: ${model} (${modelId})`);
    this.logger.debug(`Voice: ${voice}`);
    this.logger.debug(`Language: ${language}`);
    this.logger.debug(`Format: ${format}`);
    this.logger.debug(`Speed: ${speed}`);
    if (character) {
      this.logger.debug(`Character: ${character}`);
    }
    if (direction) {
      this.logger.debug(`Direction: ${direction}`);
    }
    this.logger.debug("=================================");

    // キャラクター・演技指示を含めたプロンプトを生成
    const promptText = this.buildPromptWithInstructions(text, character, direction);

    try {
      // 選択されたTTSモデルを使用
      const response = await this.ai.models.generateContent({
        model: modelId,
        contents: [
          {
            parts: [{ text: promptText }],
          },
        ],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voice,
              },
            },
          },
        },
      });

      // 音声データを取得
      const candidate = response.candidates?.[0];
      if (!candidate?.content?.parts) {
        throw new Error("音声データが見つかりません");
      }

      const audioPart = candidate.content.parts.find(
        (part): part is { inlineData: { data: string; mimeType: string } } =>
          "inlineData" in part && part.inlineData !== undefined
      );

      if (!audioPart?.inlineData?.data) {
        throw new Error("音声データが見つかりません");
      }

      // MIMEタイプからサンプルレートを抽出
      const mimeType = audioPart.inlineData.mimeType;
      this.logger.debug(`Response MIME type: ${mimeType}`);

      // rate=24000 をパース
      const rateMatch = mimeType.match(/rate=(\d+)/);
      const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;

      // Base64デコード
      const pcmData = Buffer.from(audioPart.inlineData.data, "base64");
      this.logger.debug(`PCM data size: ${pcmData.length} bytes`);

      // フォーマットに応じて変換
      let audioData: Uint8Array;
      let outputMimeType: string;

      if (format === "mp3") {
        audioData = pcmToMp3(new Uint8Array(pcmData), sampleRate);
        outputMimeType = "audio/mp3";
        this.logger.debug(`MP3 data size: ${audioData.length} bytes`);
      } else {
        audioData = pcmToWav(new Uint8Array(pcmData), sampleRate);
        outputMimeType = "audio/wav";
        this.logger.debug(`WAV data size: ${audioData.length} bytes`);
      }

      return {
        audioData,
        mimeType: outputMimeType,
      };
    } catch (error) {
      this.logger.error(`TTS生成エラー: ${error}`);
      throw new Error(`音声生成に失敗しました: ${error instanceof Error ? error.message : error}`);
    }
  }
}
