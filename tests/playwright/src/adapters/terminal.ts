export type TerminalStartOptions = {
  sessionName: string;
  adalArgs?: string[];
  env?: Record<string, string>;
};

export interface TerminalAdapter {
  start(options: TerminalStartOptions): Promise<void>;
  stop(): Promise<void>;
  sendText(text: string): Promise<void>;
  sendKey(key: string): Promise<void>;
  captureText(): Promise<string>;
  waitForText(pattern: RegExp | string, timeoutMs: number): Promise<boolean>;
  isAlive(): Promise<boolean>;
}
