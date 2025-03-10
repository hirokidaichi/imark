import { Command, McpServer, StdioServerTransport } from "../deps.ts";
import { SupportedLanguage } from "../lang.ts";
import { getApiKey } from "../utils/config.ts";
import { GeminiClient } from "../utils/gemini.ts";
import { AspectRatio, ImageFXClient, ImageType, SizePreset } from "../utils/imagefx.ts";
import { LogDestination, Logger, LogLevel } from "../utils/logger.ts";
import { captionTool } from "./mcp/tool/caption.ts";
import { generateTool } from "./mcp/tool/generate.ts";

export const mcpCommand = new Command()
  .description("MCPサーバーを起動します")
  .option("--debug", "デバッグモードで実行します", {
    default: false,
  })
  .action(async ({ debug }) => {
    Logger.setGlobalConfig({
      destination: LogDestination.FILE,
      minLevel: debug ? LogLevel.DEBUG : LogLevel.INFO,
    });
    Logger.setContext("mcp");

    try {
      const apiKey = await getApiKey();
      // クライアントのインスタンスを作成
      const geminiClient = new GeminiClient(apiKey);
      const imagefxClient = new ImageFXClient(apiKey);

      const server = new McpServer({
        name: "imark",
        version: "0.1.0",
        workingDirectory: Deno.cwd(),
      });

      // captionツールを登録
      server.tool(
        captionTool.name,
        captionTool.schema,
        async (params: Record<string, unknown>) => {
          // paramsを適切な型に変換
          const typedParams = {
            rootdir: params.rootdir as string,
            image: params.image as string,
            lang: params.lang as SupportedLanguage | undefined,
          };
          return await captionTool.handler(typedParams, { geminiClient });
        },
      );

      // generateツールを登録
      server.tool(
        generateTool.name,
        generateTool.schema,
        async (params: Record<string, unknown>) => {
          // paramsを適切な型に変換
          const typedParams = {
            rootdir: params.rootdir as string,
            theme: params.theme as string,
            type: params.type as ImageType | undefined,
            size: params.size as SizePreset | undefined,
            aspectRatio: params.aspectRatio as AspectRatio | undefined,
            outputDir: params.outputDir as string | undefined,
          };
          return await generateTool.handler(typedParams, { geminiClient, imagefxClient });
        },
      );

      Logger.info("MCPサーバーを起動します");
      await server.connect(new StdioServerTransport());
    } catch (error) {
      Logger.error("MCPサーバーでエラーが発生しました", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  });

if (import.meta.main) {
  await mcpCommand.parse();
}
