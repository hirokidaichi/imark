/**
 * ファイル操作に関するユーティリティ関数
 */

import * as fs from "node:fs/promises";

/**
 * 指定されたパスにファイルが既に存在する場合、
 * ファイル名に乱数を追加して一意のファイルパスを生成します
 *
 * @param outputPath 元のファイルパス
 * @param maxRetries 最大試行回数（デフォルト: 3）
 * @returns 一意のファイルパス
 */
export async function generateUniqueFilePath(
  outputPath: string,
  maxRetries = 3
): Promise<string> {
  let finalOutputPath = outputPath;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      await fs.stat(finalOutputPath);
      // ファイルが存在する場合、乱数を追加
      const baseName = finalOutputPath.slice(0, finalOutputPath.lastIndexOf("."));
      const ext = finalOutputPath.slice(finalOutputPath.lastIndexOf("."));
      const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
      finalOutputPath = `${baseName}-${randomNum}${ext}`;
      retryCount++;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        // ファイルが存在しない場合、このパスを使用
        return finalOutputPath;
      }
      throw error;
    }
  }

  // 最大試行回数に達した場合はエラーを投げる
  throw new Error(
    `ファイル名の生成に失敗しました。${maxRetries}回試行しましたが、すべて既存のファイル名と衝突しています。`
  );
}

/**
 * 指定されたパスにバイナリデータを保存します
 * ファイルが既に存在する場合は、一意のファイル名を生成して保存します
 *
 * @param outputPath 保存先のパス
 * @param data 保存するデータ
 * @param maxRetries 最大試行回数（デフォルト: 3）
 * @returns 実際に保存されたファイルパス
 */
export async function saveFileWithUniqueNameIfExists(
  outputPath: string,
  data: Uint8Array,
  maxRetries = 3
): Promise<string> {
  const finalOutputPath = await generateUniqueFilePath(outputPath, maxRetries);
  await fs.writeFile(finalOutputPath, data);
  return finalOutputPath;
}
