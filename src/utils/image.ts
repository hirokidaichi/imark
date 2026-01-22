import * as fs from "node:fs/promises";

export interface ImageData {
  data: string;
  mimeType: string;
}

export async function readImageFile(filePath: string): Promise<ImageData> {
  try {
    const imageBuffer = await fs.readFile(filePath);
    const base64Data = imageBuffer.toString("base64");
    const mimeType = getMimeType(filePath);

    return {
      data: base64Data,
      mimeType,
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`画像ファイルの読み込みに失敗しました: ${error.message}`);
    }
    throw new Error("画像ファイルの読み込みに失敗しました");
  }
}

export function getMimeType(filePath: string): string {
  const ext = filePath.toLowerCase().split(".").pop();
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "heic":
      return "image/heic";
    case "heif":
      return "image/heif";
    default:
      throw new Error(`サポートされていないファイル形式です: .${ext}`);
  }
}
