import { Command } from "@cliffy/command";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getApiKey } from "../utils/config.ts";
import { GeminiClient } from "../utils/gemini.ts";
import { ImageFXClient } from "../utils/imagefx.ts";
import { LogDestination, Logger, LogLevel } from "../utils/logger.ts";
import { captionTool } from "./mcp/tool/caption.ts";
import { generateTool } from "./mcp/tool/generate.ts";

export const mcpCommand = new Command()
  .description("MCPサーバーを起動します")
  .option("--debug", "デバッグモードで実行します", {
    default: false,
  })
  .action(async ({ debug }) => {
    // グローバルなロガー設定を初期化
    Logger.setGlobalConfig({
      destination: LogDestination.FILE,
      minLevel: debug ? LogLevel.DEBUG : LogLevel.INFO,
    });

    // 現在のコンテキストを設定
    Logger.setContext("mcp");

    const workingDir = Deno.cwd();
    Logger.info("MCPサーバーを起動します", { workingDir, debug });

    const apiKey = await getApiKey();
    const geminiClient = new GeminiClient(apiKey);
    const imagefxClient = new ImageFXClient(apiKey);

    try {
      Logger.debug("MCPサーバーの初期化を開始します", { name: "imark", version: "0.1.0" });
      const server = new McpServer({
        name: "imark",
        version: "0.1.0",
      });
      Logger.debug("MCPサーバーの初期化が完了しました");

      // キャプションツールを登録
      server.tool(
        captionTool.name,
        captionTool.schema,
        (params) => captionTool.handler(params, { geminiClient }),
      );

      // 画像生成ツールを登録
      server.tool(
        generateTool.name,
        generateTool.schema,
        (params) => generateTool.handler(params, { geminiClient, imagefxClient }),
      );

      Logger.info("MCPサーバーの準備が完了しました");
      Logger.debug("StdioServerTransportを初期化します");
      const transport = new StdioServerTransport();
      if (debug) {
        console.error("[DEBUG] MCPサーバーの接続を開始します");
      }
      Logger.debug("MCPサーバーの接続を開始します", { transport: "stdio" });
      try {
        await server.connect(transport);
        if (debug) {
          console.error("[DEBUG] MCPサーバーの接続が完了しました");
        }
        Logger.debug("MCPサーバーの接続が完了しました");
      } catch (connectError) {
        if (debug) {
          console.error("[DEBUG] MCPサーバーの接続に失敗しました:", connectError);
        }
        Logger.error("MCPサーバーの接続に失敗しました", {
          error: connectError instanceof Error ? connectError.message : String(connectError),
          stack: connectError instanceof Error ? connectError.stack : undefined,
          transportType: transport.constructor.name,
        });
        throw connectError;
      }
    } catch (error) {
      Logger.error("MCPサーバーでエラーが発生しました", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  });
