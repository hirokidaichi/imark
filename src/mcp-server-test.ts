import { McpServer, StdioServerTransport } from "./deps.ts";

// MCPサーバーのインスタンスを作成
const server = new McpServer({
  name: "test-server",
  version: "0.1.0",
  workingDirectory: Deno.cwd(),
});

// シンプルな足し算を行うツールを追加
// 注: このファイルはテスト用であり、実際のMCP SDKのAPIに合わせて適宜修正が必要です
server.tool(
  "add",
  "2つの数値を足し算します",
  (_extra) => {
    return {
      content: [
        {
          type: "text",
          text: "足し算の結果です",
        },
      ],
    };
  },
);

// MCPサーバーを起動
await server.connect(new StdioServerTransport());
