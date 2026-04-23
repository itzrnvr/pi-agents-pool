import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface PiAgentsPoolConfig {
  /** Model to use for all sub-agents (e.g. "anthropic/claude-haiku-4-5") */
  model?: string;
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

export function loadConfig(): PiAgentsPoolConfig {
  const paths = getConfigPaths();

  for (const configPath of paths) {
    if (!existsSync(configPath)) continue;

    try {
      const content = readFileSync(configPath, "utf-8");
      const parsed = JSON.parse(content) as PiAgentsPoolConfig;

      // Validate: model must be a string if present
      if (parsed.model !== undefined && typeof parsed.model !== "string") {
        throw new Error(`Invalid config at ${configPath}: "model" must be a string`);
      }

      return parsed;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[pi-agents-pool] Failed to load config from ${configPath}: ${message}`);
    }
  }

  return {};
}
