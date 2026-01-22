import * as fs from "node:fs/promises";
import * as path from "node:path";
import { getConfigDir } from "./config.js";
import type { AspectRatioConfig, ImageEngineConfig, ImageFormatConfig } from "./config.js";

/**
 * 画像生成プリセット
 */
export interface ImagePreset {
  aspectRatio?: AspectRatioConfig;
  type?: string;
  engine?: ImageEngineConfig;
  format?: ImageFormatConfig;
  size?: string;
  quality?: number;
}

/**
 * プリセット一覧
 */
export interface Presets {
  [name: string]: ImagePreset;
}

/**
 * ビルトインプリセット
 */
export const BUILTIN_PRESETS: Presets = {
  "builtin:square": {
    aspectRatio: "1:1",
  },
  "builtin:landscape": {
    aspectRatio: "16:9",
  },
  "builtin:portrait": {
    aspectRatio: "9:16",
  },
  "builtin:social": {
    aspectRatio: "1:1",
    format: "webp",
    size: "small",
  },
  "builtin:presentation": {
    aspectRatio: "16:9",
    format: "png",
    size: "large",
  },
};

/**
 * プリセットファイルのパスを取得
 */
export function getPresetsPath(): string {
  return path.join(getConfigDir(), "presets.json");
}

/**
 * プリセット一覧を読み込み
 */
export async function loadPresets(): Promise<Presets> {
  try {
    const presetsPath = getPresetsPath();
    const presetsText = await fs.readFile(presetsPath, "utf-8");
    return JSON.parse(presetsText) as Presets;
  } catch {
    return {};
  }
}

/**
 * プリセット一覧を保存
 */
export async function savePresets(presets: Presets): Promise<void> {
  const presetsPath = getPresetsPath();
  const presetsDir = path.dirname(presetsPath);

  await fs.mkdir(presetsDir, { recursive: true });
  await fs.writeFile(presetsPath, JSON.stringify(presets, null, 2));
}

/**
 * プリセットを取得（ビルトイン + ユーザー定義）
 */
export async function getPreset(name: string): Promise<ImagePreset | null> {
  // ビルトインプリセットをチェック
  if (name.startsWith("builtin:") && BUILTIN_PRESETS[name]) {
    return BUILTIN_PRESETS[name];
  }

  // ユーザー定義プリセットをチェック
  const presets = await loadPresets();
  return presets[name] || null;
}

/**
 * プリセットを保存
 */
export async function savePreset(name: string, preset: ImagePreset): Promise<void> {
  if (name.startsWith("builtin:")) {
    throw new Error("ビルトインプリセットは上書きできません");
  }

  const presets = await loadPresets();
  presets[name] = preset;
  await savePresets(presets);
}

/**
 * プリセットを削除
 */
export async function deletePreset(name: string): Promise<boolean> {
  if (name.startsWith("builtin:")) {
    throw new Error("ビルトインプリセットは削除できません");
  }

  const presets = await loadPresets();
  if (!presets[name]) {
    return false;
  }

  delete presets[name];
  await savePresets(presets);
  return true;
}

/**
 * 全プリセット一覧を取得（ビルトイン + ユーザー定義）
 */
export async function listAllPresets(): Promise<{ name: string; preset: ImagePreset; builtin: boolean }[]> {
  const result: { name: string; preset: ImagePreset; builtin: boolean }[] = [];

  // ビルトインプリセット
  for (const [name, preset] of Object.entries(BUILTIN_PRESETS)) {
    result.push({ name, preset, builtin: true });
  }

  // ユーザー定義プリセット
  const presets = await loadPresets();
  for (const [name, preset] of Object.entries(presets)) {
    result.push({ name, preset, builtin: false });
  }

  return result;
}
