import { Command } from "@cliffy/command";
import { colors } from "jsr:@cliffy/ansi@^1.0.0-rc.7/colors";
import { Table } from "jsr:@cliffy/table@^1.0.0-rc.7";
import { LogDestination, LogEntry, Logger, LogLevel } from "../utils/logger.ts";

export const logCommand = new Command()
  .description("ログを表示します")
  .option("-n, --lines <lines:number>", "表示する行数", { default: 20 })
  .option("-l, --level <level:string>", "表示するログレベル (debug, info, warn, error)", {
    default: "info",
  })
  .option("--mcp", "MCPサーバーのログのみを表示", { default: false })
  .action(async ({ lines, level, mcp }) => {
    const logLevel = parseLogLevel(level);
    const logger = Logger.getInstance({
      name: mcp ? "mcp" : "imark",
      destination: LogDestination.CONSOLE,
    });

    try {
      const entries = await logger.getLogEntries(logLevel, lines);

      if (entries.length === 0) {
        console.log("ログが見つかりませんでした");
        return;
      }

      displayLogs(entries);
    } catch (error) {
      console.error(
        `ログの取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  });

function parseLogLevel(level: string): LogLevel {
  switch (level.toLowerCase()) {
    case "debug":
      return LogLevel.DEBUG;
    case "info":
      return LogLevel.INFO;
    case "warn":
      return LogLevel.WARN;
    case "error":
      return LogLevel.ERROR;
    default:
      return LogLevel.INFO;
  }
}

function displayLogs(entries: LogEntry[]): void {
  const table = new Table()
    .header(["時刻", "レベル", "メッセージ"])
    .border(true);

  for (const entry of entries) {
    const timestamp = entry.timestamp.replace("T", " ").replace(/\.\d+Z$/, "");

    let levelColor;
    switch (entry.level) {
      case LogLevel.DEBUG:
        levelColor = colors.gray;
        break;
      case LogLevel.INFO:
        levelColor = colors.blue;
        break;
      case LogLevel.WARN:
        levelColor = colors.yellow;
        break;
      case LogLevel.ERROR:
        levelColor = colors.red;
        break;
      default:
        levelColor = colors.white;
    }

    table.push([
      timestamp,
      levelColor(entry.level),
      entry.message + (entry.data ? ` ${JSON.stringify(entry.data)}` : ""),
    ]);
  }

  table.render();
}
