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
    Logger.setGlobalConfig({
      destination: LogDestination.FILE,
      minLevel: debug ? LogLevel.DEBUG : LogLevel.INFO,
    });
    Logger.setContext("mcp");

    try {
      const apiKey = await getApiKey();
      const geminiClient = new GeminiClient(apiKey);
      const imagefxClient = new ImageFXClient(apiKey);

      const server = new McpServer({
        name: "imark",
        version: "0.1.0",
        workingDirectory: Deno.cwd(),
      });

      server.tool(
        captionTool.name,
        captionTool.schema,
        (params) => captionTool.handler(params, { geminiClient }),
      );

      server.tool(
        generateTool.name,
        generateTool.schema,
        (params) => generateTool.handler(params, { geminiClient, imagefxClient }),
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
