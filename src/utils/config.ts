import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";

export interface Config {
  googleApiKey: string;
}

export interface McpConfig {
  mcpServers: {
    [key: string]: {
      type: string;
      command: string;
      args: string[];
      disabled?: boolean;
      workingDirectory?: string;
    };
  };
}

export function getConfigPath(): string {
  const home = os.homedir();
  if (!home) {
    throw new Error("HOME環境変数が設定されていません");
  }
  return path.join(home, ".imark", "config.json");
}

export async function loadConfig(): Promise<Config | null> {
  try {
    const configPath = getConfigPath();
    const configText = await fs.readFile(configPath, "utf-8");
    return JSON.parse(configText) as Config;
  } catch {
    return null;
  }
}

export async function saveConfig(config: Config): Promise<void> {
  const configPath = getConfigPath();
  const configDir = path.dirname(configPath);

  await fs.mkdir(configDir, { recursive: true });
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
}

export async function getApiKey(): Promise<string> {
  // 環境変数を優先
  const envApiKey = process.env.GOOGLE_API_KEY;
  if (envApiKey) {
    return envApiKey;
  }

  // 設定ファイルを確認
  const config = await loadConfig();
  if (config?.googleApiKey) {
    return config.googleApiKey;
  }

  throw new Error(
    "GOOGLE_API_KEYが設定されていません。`imark configure`コマンドで設定してください。"
  );
}

export async function loadMcpConfig(dir: string): Promise<McpConfig | null> {
  try {
    const configPath = path.join(dir, ".cursor", "mcp.json");
    const configText = await fs.readFile(configPath, "utf-8");
    return JSON.parse(configText) as McpConfig;
  } catch {
    return null;
  }
}

export async function saveMcpConfig(dir: string, config: McpConfig): Promise<void> {
  const configPath = path.join(dir, ".cursor", "mcp.json");
  const configDir = path.join(dir, ".cursor");

  await fs.mkdir(configDir, { recursive: true });
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
}
