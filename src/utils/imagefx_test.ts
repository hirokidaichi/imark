import { assertEquals, assertRejects } from "@std/assert";
import { afterEach, describe, it } from "@std/testing/bdd";
import { ImageFXClient } from "./imagefx.ts";

describe("ImageFXClient", () => {
  describe("generateImage", () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it("should generate an image successfully", async () => {
      const mockImageData = new Uint8Array([1, 2, 3]);
      const base64Data = btoa(String.fromCharCode(...mockImageData));
      const mockResponse = new Response(
        JSON.stringify({
          predictions: [
            {
              bytesBase64Encoded: base64Data,
            },
          ],
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      globalThis.fetch = () => Promise.resolve(mockResponse);

      const client = new ImageFXClient("test-api-key");
      const result = await client.generateImage("test prompt");

      assertEquals(result, mockImageData);
    });

    it("should throw an error when the API returns an error", async () => {
      const mockResponse = new Response(
        JSON.stringify({
          error: {
            code: 400,
            message: "API Error",
            status: "INVALID_ARGUMENT",
          },
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      globalThis.fetch = () => Promise.resolve(mockResponse);

      const client = new ImageFXClient("test-api-key");
      await assertRejects(
        () => client.generateImage("test prompt"),
        Error,
        '画像生成に失敗しました: {"error":{"code":400,"message":"API Error","status":"INVALID_ARGUMENT"}}',
      );
    });

    it("should send correct request parameters", async () => {
      const mockImageData = new Uint8Array([1, 2, 3]);
      const base64Data = btoa(String.fromCharCode(...mockImageData));
      const mockResponse = new Response(
        JSON.stringify({
          predictions: [
            {
              bytesBase64Encoded: base64Data,
            },
          ],
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      let requestBody: Record<string, unknown> = {};
      let requestHeaders: Record<string, string> = {};

      globalThis.fetch = (_, init) => {
        if (init?.body) {
          requestBody = JSON.parse(init.body as string);
        }
        requestHeaders = init?.headers as Record<string, string> || {};
        return Promise.resolve(mockResponse);
      };

      const client = new ImageFXClient("test-api-key");
      await client.generateImage("test prompt", {
        size: "fullhd",
        aspectRatio: "16:9",
        type: "realistic",
        format: "png",
        quality: 90,
      });

      assertEquals(requestBody, {
        instances: [
          {
            prompt: "test prompt",
          },
        ],
        parameters: {
          sampleCount: 1,
          aspectRatio: "16:9",
          outputMimeType: "image/png",
          safetySettings: {
            filterLevel: "BLOCK_ONLY_HIGH",
          },
          personMode: "ALLOW_ADULT",
        },
      });

      assertEquals(requestHeaders["Content-Type"], "application/json");
    });

    it("should handle network errors", async () => {
      globalThis.fetch = () => Promise.reject(new Error("Network Error"));

      const client = new ImageFXClient("test-api-key");
      await assertRejects(
        () => client.generateImage("test prompt"),
        Error,
        "Network Error",
      );
    });

    it("should handle API errors", async () => {
      const mockResponse = new Response(
        JSON.stringify({
          error: {
            code: 400,
            message: "API Error",
            status: "INVALID_ARGUMENT",
          },
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      globalThis.fetch = () => Promise.resolve(mockResponse);

      const client = new ImageFXClient("test-api-key");
      await assertRejects(
        () => client.generateImage("test prompt"),
        Error,
        '画像生成に失敗しました: {"error":{"code":400,"message":"API Error","status":"INVALID_ARGUMENT"}}',
      );
    });

    it("should handle invalid response format", async () => {
      globalThis.fetch = () =>
        Promise.resolve(
          new Response("Invalid Response", {
            status: 200,
            headers: {
              "Content-Type": "text/plain",
            },
          }),
        );

      const client = new ImageFXClient("test-api-key");
      await assertRejects(
        () => client.generateImage("test prompt"),
        Error,
        "Unexpected token 'I', \"Invalid Response\" is not valid JSON",
      );
    });
  });
});
