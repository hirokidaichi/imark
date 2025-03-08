import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/server/types.js";

interface AddParams {
  a: number;
  b: number;
}

const server = new McpServer({
  name: "test-server",
  version: "0.1.0",
  workingDirectory: Deno.cwd(),
});

// シンプルな足し算を行うツールを追加
server.tool(
  "add",
  "2つの数値を足し算します",
  async (extra: RequestHandlerExtra & { params: AddParams }) => {
    const { a, b } = extra.params;
    return {
      content: [
        {
          type: "text",
          text: `結果: ${a + b}`,
        },
      ],
    };
  },
);

//console.log("MCPサーバーを起動します...");
await server.connect(new StdioServerTransport());
