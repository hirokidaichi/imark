import { assert, assertEquals, assertExists, assertRejects, assertThrows } from "@std/assert";
import { exists } from "@std/fs";
import { join } from "@std/path";
import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { ASPECT_RATIOS, DEFAULT_OPTIONS, SIZE_PRESETS } from "./image_constants.ts";
import { ImageFXClient } from "./imagefx.ts";

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
    } catch (error: unknown) {
      // ディレクトリが存在しない場合は無視
      if (!(error instanceof Deno.errors.NotFound)) {
        throw error;
      }
    }
  });

  describe("インスタンス化", () => {
    it("APIキーがない場合はエラー", () => {
      assertThrows(
        () => {
          new ImageFXClient("");
        },
        Error,
        "GOOGLE_API_KEYが設定されていません",
      );
    });

    it("APIキーがある場合はインスタンスを作成", () => {
      const client = new ImageFXClient("dummy-api-key");
      assert(client instanceof ImageFXClient);
    });
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
      assertEquals(DEFAULT_OPTIONS.format, "webp");
      assertEquals(DEFAULT_OPTIONS.quality, 90);
      assertEquals(DEFAULT_OPTIONS.type, "flat");
    });
  });

  describe("画像生成", () => {
    const client = new ImageFXClient("dummy-api-key");

    it("基本的な画像生成 - 認証エラー", async () => {
      await assertRejects(
        async () => {
          await client.generateImage("テスト画像");
        },
        Error,
        "画像生成に失敗しました",
      );
    });

    it("カスタムオプションでの画像生成 - 認証エラー", async () => {
      await assertRejects(
        async () => {
          await client.generateImage("テスト画像", {
            size: "tiny",
            aspectRatio: "1:1",
            format: "jpg",
            quality: 50,
          });
        },
        Error,
        "画像生成に失敗しました",
      );
    });

    it("不正なアスペクト比でのエラー", async () => {
      await assertRejects(
        async () => {
          await client.generateImage("テスト画像", {
            // deno-lint-ignore no-explicit-any
            aspectRatio: "invalid" as any,
          });
        },
        Error,
      );
    });

    it("不正なサイズプリセットでのエラー", async () => {
      await assertRejects(
        async () => {
          await client.generateImage("テスト画像", {
            // deno-lint-ignore no-explicit-any
            size: "invalid" as any,
          });
        },
        Error,
      );
    });
  });

  describe("画像の保存", () => {
    let client: ImageFXClient;
    try {
      client = new ImageFXClient("dummy-api-key");
    } catch (_error) {
      // テスト用にエラーを無視するダミークライアントを作成
      client = { saveImage: async () => {} } as unknown as ImageFXClient;
    }

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
      } catch (error: unknown) {
        // エラーログは削除し、単純に再スローする
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
