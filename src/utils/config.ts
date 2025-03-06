import { join } from "@std/path";

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
  const home = Deno.env.get("HOME");
  if (!home) {
    throw new Error("HOME環境変数が設定されていません");
  }
  return join(home, ".imark", "config.json");
}

export async function loadConfig(): Promise<Config | null> {
  try {
    const configPath = getConfigPath();
    const configText = await Deno.readTextFile(configPath);
    return JSON.parse(configText) as Config;
  } catch {
    return null;
  }
}

export async function saveConfig(config: Config): Promise<void> {
  const configPath = getConfigPath();
  const configDir = configPath.substring(0, configPath.lastIndexOf("/"));

  try {
    await Deno.mkdir(configDir, { recursive: true });
  } catch (error) {
    if (error instanceof Deno.errors.AlreadyExists) {
      // ディレクトリが既に存在する場合は無視
    } else {
      throw error;
    }
  }

  await Deno.writeTextFile(configPath, JSON.stringify(config, null, 2));
}

export async function getApiKey(): Promise<string> {
  // 環境変数を優先
  const envApiKey = Deno.env.get("GOOGLE_API_KEY");
  if (envApiKey) {
    return envApiKey;
  }

  // 設定ファイルを確認
  const config = await loadConfig();
  if (config?.googleApiKey) {
    return config.googleApiKey;
  }

  throw new Error(
    "GOOGLE_API_KEYが設定されていません。`imark configure`コマンドで設定してください。",
  );
}

export async function loadMcpConfig(dir: string): Promise<McpConfig | null> {
  try {
    const configPath = join(dir, ".cursor", "mcp.json");
    const configText = await Deno.readTextFile(configPath);
    return JSON.parse(configText) as McpConfig;
  } catch {
    return null;
  }
}

export async function saveMcpConfig(dir: string, config: McpConfig): Promise<void> {
  const configPath = join(dir, ".cursor", "mcp.json");
  const configDir = join(dir, ".cursor");

  try {
    await Deno.mkdir(configDir, { recursive: true });
  } catch (error) {
    if (error instanceof Deno.errors.AlreadyExists) {
      // ディレクトリが既に存在する場合は無視
    } else {
      throw error;
    }
  }

  await Deno.writeTextFile(configPath, JSON.stringify(config, null, 2));
}
