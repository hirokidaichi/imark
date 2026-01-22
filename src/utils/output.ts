/**
 * JSON出力のための共通ユーティリティ
 */

export interface JsonSuccessOutput<T> {
  success: true;
  command: string;
  result: T;
}

export interface JsonErrorOutput {
  success: false;
  command: string;
  error: {
    message: string;
    code?: string;
  };
}

export type JsonOutput<T> = JsonSuccessOutput<T> | JsonErrorOutput;

/**
 * 成功時のJSON出力を生成
 */
export function createSuccessOutput<T>(command: string, result: T): JsonSuccessOutput<T> {
  return {
    success: true,
    command,
    result,
  };
}

/**
 * エラー時のJSON出力を生成
 */
export function createErrorOutput(command: string, message: string, code?: string): JsonErrorOutput {
  return {
    success: false,
    command,
    error: {
      message,
      ...(code ? { code } : {}),
    },
  };
}

/**
 * JSON出力を標準出力に出力
 */
export function printJson<T>(output: JsonOutput<T>): void {
  console.log(JSON.stringify(output, null, 2));
}
