import { format } from "../deps.ts";
import { ensureDir } from "../deps.ts";
import { join } from "../deps.ts";

export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

export enum LogDestination {
  FILE = "FILE",
  CONSOLE = "CONSOLE",
  BOTH = "BOTH",
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: unknown;
}

export interface LoggerConfig {
  destination: LogDestination;
  minLevel: LogLevel;
}

export interface LoggerOptions {
  name: string;
  config?: Partial<LoggerConfig>;
}

export class Logger {
  private static instances: Map<string, Logger> = new Map();
  private static defaultConfig: LoggerConfig = {
    destination: LogDestination.CONSOLE,
    minLevel: LogLevel.INFO,
  };
  private static globalConfig: LoggerConfig = { ...Logger.defaultConfig };
  private static currentContext = "default";

  private logDir: string;
  private currentLogFile: string;
  private encoder = new TextEncoder();

  private constructor(private name: string) {
    const home = Deno.env.get("HOME");
    if (!home) {
      throw new Error("HOME環境変数が設定されていません");
    }
    this.logDir = join(home, ".imark", "logs");
    this.currentLogFile = this.generateLogFileName();
  }

  /**
   * グローバルなロガーの設定を行います
   * この設定は新しく作成されるすべてのロガーインスタンスに適用されます
   */
  public static setGlobalConfig(config: Partial<LoggerConfig>): void {
    Logger.globalConfig = {
      ...Logger.globalConfig,
      ...config,
    };
  }

  /**
   * 現在のコンテキスト名を設定します
   * これは静的メソッドでログを記録する際のデフォルトのロガー名として使用されます
   */
  public static setContext(name: string): void {
    Logger.currentContext = name;
  }

  /**
   * ロガーのインスタンスを取得します
   * 同じ名前のロガーは同じインスタンスを返します
   */
  public static getInstance(options: LoggerOptions): Logger {
    const { name } = options;
    if (!Logger.instances.has(name)) {
      Logger.instances.set(name, new Logger(name));
    }
    return Logger.instances.get(name)!;
  }

  private generateLogFileName(): string {
    const date = new Date();
    const formattedDate = format(date, "yyyy-MM-dd");
    return join(this.logDir, `${this.name}-${formattedDate}.log`);
  }

  private async ensureLogDirectory(): Promise<void> {
    await ensureDir(this.logDir);
  }

  private formatLogEntry(level: LogLevel, message: string, data?: unknown): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    const levelPriority: Record<LogLevel, number> = {
      [LogLevel.DEBUG]: 0,
      [LogLevel.INFO]: 1,
      [LogLevel.WARN]: 2,
      [LogLevel.ERROR]: 3,
    };

    return levelPriority[level] >= levelPriority[Logger.globalConfig.minLevel];
  }

  private async writeLog(entry: LogEntry): Promise<void> {
    if (!this.shouldLog(entry.level)) {
      return;
    }

    const logToConsole = Logger.globalConfig.destination === LogDestination.CONSOLE ||
      Logger.globalConfig.destination === LogDestination.BOTH;

    const logToFile = Logger.globalConfig.destination === LogDestination.FILE ||
      Logger.globalConfig.destination === LogDestination.BOTH;

    if (logToConsole) {
      this.writeToConsole(entry);
    }

    if (logToFile) {
      await this.writeToFile(entry);
    }
  }

  private writeToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.replace("T", " ").replace(/\.\d+Z$/, "");
    const prefix = `[${timestamp}] [${this.name}] [${entry.level}]`;

    let logFn: (message: string, ...args: unknown[]) => void;

    switch (entry.level) {
      case LogLevel.DEBUG:
        logFn = console.debug;
        break;
      case LogLevel.INFO:
        logFn = console.info;
        break;
      case LogLevel.WARN:
        logFn = console.warn;
        break;
      case LogLevel.ERROR:
        logFn = console.error;
        break;
      default:
        logFn = console.log;
    }

    const dataStr = entry.data ? ` ${JSON.stringify(entry.data)}` : "";
    logFn(`${prefix} ${entry.message}${dataStr}`);
  }

  private async writeToFile(entry: LogEntry): Promise<void> {
    await this.ensureLogDirectory();

    const logLine = JSON.stringify(entry) + "\n";

    try {
      await Deno.writeFile(
        this.currentLogFile,
        this.encoder.encode(logLine),
        { append: true, create: true },
      );
    } catch (error: unknown) {
      // ログ書き込みに失敗した場合は標準エラー出力に出力
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`ログの書き込みに失敗しました: ${errorMessage}`);
    }
  }

  // インスタンスメソッド
  debug(message: string, data?: unknown): Promise<void> {
    return this.writeLog(this.formatLogEntry(LogLevel.DEBUG, message, data));
  }

  info(message: string, data?: unknown): Promise<void> {
    return this.writeLog(this.formatLogEntry(LogLevel.INFO, message, data));
  }

  warn(message: string, data?: unknown): Promise<void> {
    return this.writeLog(this.formatLogEntry(LogLevel.WARN, message, data));
  }

  error(message: string, data?: unknown): Promise<void> {
    return this.writeLog(this.formatLogEntry(LogLevel.ERROR, message, data));
  }

  // 静的メソッド
  static debug(message: string, data?: unknown): Promise<void> {
    return Logger.getInstance({ name: Logger.currentContext }).debug(message, data);
  }

  static info(message: string, data?: unknown): Promise<void> {
    return Logger.getInstance({ name: Logger.currentContext }).info(message, data);
  }

  static warn(message: string, data?: unknown): Promise<void> {
    return Logger.getInstance({ name: Logger.currentContext }).warn(message, data);
  }

  static error(message: string, data?: unknown): Promise<void> {
    return Logger.getInstance({ name: Logger.currentContext }).error(message, data);
  }

  /**
   * 最新のログファイルのパスを取得します
   */
  getLatestLogFilePath(): string {
    return this.currentLogFile;
  }

  /**
   * 指定されたログレベル以上のログエントリを取得します
   */
  async getLogEntries(minLevel: LogLevel = LogLevel.INFO, maxEntries = 100): Promise<LogEntry[]> {
    try {
      await this.ensureLogDirectory();

      const logContent = await Deno.readTextFile(this.currentLogFile);
      const lines = logContent.trim().split("\n");

      const entries: LogEntry[] = [];
      const levelPriority: Record<LogLevel, number> = {
        [LogLevel.DEBUG]: 0,
        [LogLevel.INFO]: 1,
        [LogLevel.WARN]: 2,
        [LogLevel.ERROR]: 3,
      };

      const minLevelPriority = levelPriority[minLevel];

      for (let i = lines.length - 1; i >= 0 && entries.length < maxEntries; i--) {
        try {
          const entry = JSON.parse(lines[i]) as LogEntry;
          if (levelPriority[entry.level] >= minLevelPriority) {
            entries.unshift(entry);
          }
        } catch {
          // 不正なJSONはスキップ
          continue;
        }
      }

      return entries;
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        return [];
      }
      throw error;
    }
  }
}
