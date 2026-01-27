import chalk from "chalk";
import { Command } from "commander";
import { LogDestination, type LogEntry, Logger, LogLevel } from "../utils/logger.js";

interface LogOptions {
  lines: string;
  level: string;
  mcp: boolean;
}

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
  for (const entry of entries) {
    const timestamp = entry.timestamp.replace("T", " ").replace(/\.\d+Z$/, "");

    let levelColor: (text: string) => string;
    switch (entry.level) {
      case LogLevel.DEBUG:
        levelColor = chalk.gray;
        break;
      case LogLevel.INFO:
        levelColor = chalk.blue;
        break;
      case LogLevel.WARN:
        levelColor = chalk.yellow;
        break;
      case LogLevel.ERROR:
        levelColor = chalk.red;
        break;
      default:
        levelColor = chalk.white;
    }

    const levelText = levelColor(entry.level);
    const dataText = entry.data ? ` ${JSON.stringify(entry.data)}` : "";

    console.log(`[${timestamp}] ${levelText} ${entry.message}${dataText}`);
  }
}

export function logCommand(): Command {
  return new Command("log")
    .description("ログを表示します")
    .option("-n, --lines <lines>", "表示する行数", "20")
    .option("-l, --level <level>", "表示するログレベル (debug, info, warn, error)", "info")
    .option("--mcp", "MCPサーバーのログのみを表示", true)
    .action(async (options: LogOptions) => {
      const lines = parseInt(options.lines, 10) || 20;
      const logLevel = parseLogLevel(options.level);
      const logger = Logger.getInstance({
        name: options.mcp ? "mcp" : "ergon",
        config: {
          destination: LogDestination.CONSOLE,
        },
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
          `ログの取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
}
