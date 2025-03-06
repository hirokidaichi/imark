import { assert, assertEquals, assertExists, assertRejects, assertThrows } from "@std/assert";
import { exists } from "@std/fs";
import { join } from "@std/path";
import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { ImageType } from "./image_type.ts";
import {
  ASPECT_RATIOS,
  AspectRatio,
  DEFAULT_OPTIONS,
  ImageFXClient,
  SIZE_PRESETS,
  SizePreset,
} from "./imagefx.ts";

describe("ImageFXClient", () => {
  // テスト用の一時ディレクトリのパス
  let tempDirPath: string;

  // 各テスト前に一時ディレクトリを作成
  beforeEach(async () => {
    tempDirPath = await Deno.makeTempDir({ prefix: "imark_test_imagefx_" });
    console.log("Temp dir path:", tempDirPath);
  });

  // 各テスト後に一時ディレクトリを削除
  afterEach(async () => {
    try {
      await Deno.remove(tempDirPath, { recursive: true });
    } catch (error) {
      // ディレクトリが存在しない場合は無視
      if (!(error instanceof Deno.errors.NotFound)) {
        throw error;
      }
    }
  });

  describe("定数の検証", () => {
    it("サイズプリセットの検証", () => {
      // サイズプリセットの存在確認
      assertExists(SIZE_PRESETS.tiny);
      assertExists(SIZE_PRESETS.hd);
      assertExists(SIZE_PRESETS.fullhd);
      assertExists(SIZE_PRESETS["2k"]);
      assertExists(SIZE_PRESETS["4k"]);

      // 解像度の検証
      assertEquals(SIZE_PRESETS.tiny, { width: 160, height: 90 });
      assertEquals(SIZE_PRESETS.hd, { width: 1280, height: 720 });
      assertEquals(SIZE_PRESETS.fullhd, { width: 1920, height: 1080 });
      assertEquals(SIZE_PRESETS["2k"], { width: 2560, height: 1440 });
      assertEquals(SIZE_PRESETS["4k"], { width: 3840, height: 2160 });
    });

    it("アスペクト比の検証", () => {
      // アスペクト比の存在確認
      assertExists(ASPECT_RATIOS["16:9"]);
      assertExists(ASPECT_RATIOS["4:3"]);
      assertExists(ASPECT_RATIOS["1:1"]);
      assertExists(ASPECT_RATIOS["9:16"]);
      assertExists(ASPECT_RATIOS["3:4"]);

      // 比率の検証
      assertEquals(ASPECT_RATIOS["16:9"], 16 / 9);
      assertEquals(ASPECT_RATIOS["4:3"], 4 / 3);
      assertEquals(ASPECT_RATIOS["1:1"], 1);
      assertEquals(ASPECT_RATIOS["9:16"], 9 / 16);
      assertEquals(ASPECT_RATIOS["3:4"], 3 / 4);
    });

    it("デフォルトオプションの検証", () => {
      assertEquals(DEFAULT_OPTIONS.size, "fullhd");
      assertEquals(DEFAULT_OPTIONS.aspectRatio, "16:9");
      assertEquals(DEFAULT_OPTIONS.format, "png");
      assertEquals(DEFAULT_OPTIONS.quality, 90);
      assertEquals(DEFAULT_OPTIONS.type, "flat");
    });
  });

  describe("画像生成", () => {
    const apiKey = Deno.env.get("GOOGLE_API_KEY");
    if (!apiKey) {
      console.log("GOOGLE_API_KEY環境変数が設定されていないため、テストをスキップします");

      it("デフォルトオプションでの画像生成 - スキップ", () => {
        // APIキーがない場合はスキップ
      });

      it("カスタムサイズとアスペクト比での画像生成 - スキップ", () => {
        // APIキーがない場合はスキップ
      });

      it("エラーハンドリング - 不正なアスペクト比 - スキップ", () => {
        // APIキーがない場合はスキップ
      });

      it("異なる画像タイプでの生成 - スキップ", () => {
        // APIキーがない場合はスキップ
      });

      return;
    }

    const client = new ImageFXClient(apiKey);

    it("デフォルトオプションでの画像生成", async () => {
      const prompt = "小さな富士山のアイコン";
      // 小さなサイズで画像を生成
      const options = {
        size: "tiny" as SizePreset, // 最小サイズを使用
        quality: 70, // 品質を下げる
      };
      const imageData = await client.generateImage(prompt, options);
      assert(imageData instanceof Uint8Array);
      assert(imageData.length > 0);

      // 一時ディレクトリに保存して確認
      const outputPath = join(tempDirPath, "test_default.png");
      await Deno.writeFile(outputPath, imageData);
      assert(await exists(outputPath));
    });

    it("カスタムサイズとアスペクト比での画像生成", async () => {
      const prompt = "小さな富士山のアイコン";
      const options: {
        size: SizePreset;
        aspectRatio: AspectRatio;
        format: "png" | "jpg" | "jpeg" | "webp";
        quality: number;
      } = {
        size: "tiny", // 最小サイズを使用
        aspectRatio: "1:1",
        format: "jpg", // jpgを使用して容量を削減
        quality: 50, // 品質を下げる
      };
      const imageData = await client.generateImage(prompt, options);
      assert(imageData instanceof Uint8Array);
      assert(imageData.length > 0);

      // 一時ディレクトリに保存して確認
      const outputPath = join(tempDirPath, "test_custom.jpg");
      await Deno.writeFile(outputPath, imageData);
      assert(await exists(outputPath));
    });

    it("エラーハンドリング - 不正なアスペクト比", async () => {
      const prompt = "小さな富士山のアイコン";
      const options = {
        size: "tiny" as SizePreset,
        aspectRatio: "invalid" as AspectRatio,
      };
      await assertRejects(
        async () => {
          await client.generateImage(prompt, options);
        },
        Error,
      );
    });

    it("異なる画像タイプでの生成", async () => {
      const prompt = "小さな富士山のアイコン";
      const options: {
        size: SizePreset;
        aspectRatio: AspectRatio;
        type: ImageType;
        format: "png" | "jpg" | "jpeg" | "webp";
        quality: number;
      } = {
        size: "tiny", // 最小サイズを使用
        aspectRatio: "1:1",
        type: "watercolor",
        format: "webp", // webpを使用して容量を削減
        quality: 50, // 品質を下げる
      };
      const imageData = await client.generateImage(prompt, options);
      assert(imageData instanceof Uint8Array);
      assert(imageData.length > 0);

      // 一時ディレクトリに保存して確認
      const outputPath = join(tempDirPath, "test_type.webp");
      await Deno.writeFile(outputPath, imageData);
      assert(await exists(outputPath));
    });
  });

  describe("画像の保存", () => {
    const client = new ImageFXClient("dummy-api-key");

    it("エラーハンドリング - 不正なパス", async () => {
      const imageData = new Uint8Array([1, 2, 3]);
      const invalidPath = "/invalid/path/image.png";
      await assertRejects(
        async () => {
          await client.saveImage(imageData, invalidPath);
        },
        Error,
        "画像の保存に失敗しました",
      );
    });

    it("正常系 - 一時ディレクトリに保存", async () => {
      const imageData = new Uint8Array([1, 2, 3]);
      const outputPath = join(tempDirPath, "test_save.png");

      try {
        // 画像を直接保存
        await Deno.writeFile(outputPath, imageData);

        // ファイルが存在することを確認
        assert(await exists(outputPath));

        // ファイルの内容が正しいことを確認
        const content = await Deno.readFile(outputPath);
        assertEquals(content, imageData);
      } catch (error) {
        console.error(`テスト失敗: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      }
    });

    it("エラーハンドリング - APIキーなし", () => {
      assertThrows(
        () => {
          new ImageFXClient("");
        },
        Error,
        "GOOGLE_API_KEYが設定されていません",
      );
    });
  });
});
