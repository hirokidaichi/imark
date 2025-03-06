import { assert, assertEquals, assertExists, assertRejects, assertThrows } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
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
  describe("定数の検証", () => {
    it("サイズプリセットの検証", () => {
      // サイズプリセットの存在確認
      assertExists(SIZE_PRESETS.hd);
      assertExists(SIZE_PRESETS.fullhd);
      assertExists(SIZE_PRESETS["2k"]);
      assertExists(SIZE_PRESETS["4k"]);

      // 解像度の検証
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
      const prompt = "美しい富士山の風景";
      const imageData = await client.generateImage(prompt);
      assert(imageData instanceof Uint8Array);
      assert(imageData.length > 0);
    });

    it("カスタムサイズとアスペクト比での画像生成", async () => {
      const prompt = "美しい富士山の風景";
      const options: {
        size: SizePreset;
        aspectRatio: AspectRatio;
        format: "png" | "jpg" | "jpeg" | "webp";
        quality: number;
      } = {
        size: "4k",
        aspectRatio: "1:1",
        format: "png",
        quality: 95,
      };
      const imageData = await client.generateImage(prompt, options);
      assert(imageData instanceof Uint8Array);
      assert(imageData.length > 0);
    });

    it("エラーハンドリング - 不正なアスペクト比", async () => {
      const prompt = "美しい富士山の風景";
      const options = {
        size: "4k" as SizePreset,
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
      const prompt = "美しい富士山の風景";
      const options: {
        size: SizePreset;
        aspectRatio: AspectRatio;
        type: ImageType;
        format: "png" | "jpg" | "jpeg" | "webp";
        quality: number;
      } = {
        size: "fullhd",
        aspectRatio: "16:9",
        type: "watercolor",
        format: "png",
        quality: 90,
      };
      const imageData = await client.generateImage(prompt, options);
      assert(imageData instanceof Uint8Array);
      assert(imageData.length > 0);
    });
  });

  describe("画像の保存", () => {
    const client = new ImageFXClient("dummy-api-key");

    it("エラーハンドリング - 不正なパス", async () => {
      const imageData = new Uint8Array([1, 2, 3]);
      await assertRejects(
        async () => {
          await client.saveImage(imageData, "/invalid/path/image.png");
        },
        Error,
        "画像の保存に失敗しました",
      );
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
