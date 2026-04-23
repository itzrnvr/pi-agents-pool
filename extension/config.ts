import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface PiAgentsPoolConfig {
  /** Default model for all sub-agents (e.g. "anthropic/claude-haiku-4-5") */
  model?: string;
  /** Model for explorer agents. Falls back to `model` then parent session. */
  explorerModel?: string;
  /** Model for worker agents. Falls back to `model` then parent session. */
  workerModel?: string;
}

const CONFIG_FILENAME = "pi-agents-pool.json";

function getConfigPaths(): string[] {
  const home = homedir();
  return [
    // Project-local config
    join(process.cwd(), ".pi", CONFIG_FILENAME),
    // Global config
    join(home, ".pi", "agent", CONFIG_FILENAME),
  ];
}

function validateStringField(value: unknown, name: string, path: string): asserts value is string | undefined {
  if (value !== undefined && typeof value !== "string") {
    throw new Error(`Invalid config at ${path}: "${name}" must be a string`);
  }
}

export function loadConfig(): PiAgentsPoolConfig {
  const paths = getConfigPaths();

  for (const configPath of paths) {
    if (!existsSync(configPath)) continue;

    try {
      const content = readFileSync(configPath, "utf-8");
      const parsed = JSON.parse(content) as PiAgentsPoolConfig;

      validateStringField(parsed.model, "model", configPath);
      validateStringField(parsed.explorerModel, "explorerModel", configPath);
      validateStringField(parsed.workerModel, "workerModel", configPath);

      return parsed;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[pi-agents-pool] Failed to load config from ${configPath}: ${message}`);
    }
  }

  return {};
}
