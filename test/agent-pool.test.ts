import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  getCurrentDepth,
  getMaxDepth,
  isFinalStatus,
  DEFAULT_MAX_DEPTH,
  DEFAULT_WAIT_TIMEOUT_MS,
  MIN_WAIT_TIMEOUT_MS,
  MAX_WAIT_TIMEOUT_MS,
} from "../extension/types.ts";
import { AgentPool } from "../extension/agent-pool.ts";

// ============================================================================
// types.ts unit tests
// ============================================================================

describe("types", () => {
  describe("isFinalStatus", () => {
    it("idle is final", () => {
      assert.equal(isFinalStatus("idle"), true);
    });
    it("closed is final", () => {
      assert.equal(isFinalStatus("closed"), true);
    });
    it("crashed is final", () => {
      assert.equal(isFinalStatus("crashed"), true);
    });
    it("starting is not final", () => {
      assert.equal(isFinalStatus("starting"), false);
    });
    it("streaming is not final", () => {
      assert.equal(isFinalStatus("streaming"), false);
    });
  });

  describe("getCurrentDepth", () => {
    const original = process.env.PI_SUBAGENT_DEPTH;

    beforeEach(() => {
      delete process.env.PI_SUBAGENT_DEPTH;
    });

    it("defaults to 0 when env not set", () => {
      delete process.env.PI_SUBAGENT_DEPTH;
      assert.equal(getCurrentDepth(), 0);
    });

    it("reads from env", () => {
      process.env.PI_SUBAGENT_DEPTH = "3";
      assert.equal(getCurrentDepth(), 3);
      // restore
      if (original !== undefined) process.env.PI_SUBAGENT_DEPTH = original;
      else delete process.env.PI_SUBAGENT_DEPTH;
    });
  });

  describe("getMaxDepth", () => {
    const original = process.env.PI_SUBAGENT_MAX_DEPTH;

    beforeEach(() => {
      delete process.env.PI_SUBAGENT_MAX_DEPTH;
    });

    it("defaults to DEFAULT_MAX_DEPTH when env not set", () => {
      delete process.env.PI_SUBAGENT_MAX_DEPTH;
      assert.equal(getMaxDepth(), DEFAULT_MAX_DEPTH);
    });

    it("reads from env", () => {
      process.env.PI_SUBAGENT_MAX_DEPTH = "5";
      assert.equal(getMaxDepth(), 5);
      // restore
      if (original !== undefined) process.env.PI_SUBAGENT_MAX_DEPTH = original;
      else delete process.env.PI_SUBAGENT_MAX_DEPTH;
    });
  });

  describe("constants", () => {
    it("DEFAULT_MAX_DEPTH is 2", () => {
      assert.equal(DEFAULT_MAX_DEPTH, 2);
    });
    it("DEFAULT_WAIT_TIMEOUT_MS is 30s", () => {
      assert.equal(DEFAULT_WAIT_TIMEOUT_MS, 30_000);
    });
    it("MIN_WAIT_TIMEOUT_MS is 10s", () => {
      assert.equal(MIN_WAIT_TIMEOUT_MS, 10_000);
    });
    it("MAX_WAIT_TIMEOUT_MS is 1h", () => {
      assert.equal(MAX_WAIT_TIMEOUT_MS, 3_600_000);
    });
  });
});

describe("AgentPool", () => {
  it("closeAgent removes crashed agents from the pool", async () => {
    const pool = new AgentPool();
    const internalPool = pool as unknown as {
      agents: Map<string, {
        id: string;
        process: { exitCode: number; kill: (signal?: string) => void; on: (event: string, cb: () => void) => void };
        status: "crashed";
        sessionFile: string;
        startTime: number;
        lastOutput: string | null;
        taskPreview: string;
        toolCount: number;
        tokenCount: number;
        pendingRequests: Map<string, { resolve: (data: unknown) => void; reject: (err: Error) => void }>;
        requestCounter: number;
        idleResolvers: Set<() => void>;
        error: string;
      }>;
      closedSessions: Map<string, string>;
    };

    const id = "deadbeef";
    internalPool.agents.set(id, {
      id,
      process: {
        exitCode: 1,
        kill: () => {},
        on: () => {},
      },
      status: "crashed",
      sessionFile: "/tmp/deadbeef.jsonl",
      startTime: Date.now(),
      lastOutput: null,
      taskPreview: "(crashed)",
      toolCount: 0,
      tokenCount: 0,
      pendingRequests: new Map(),
      requestCounter: 0,
      idleResolvers: new Set(),
      error: "boom",
    });

    const result = await pool.closeAgent(id);
    assert.equal(result.previous_status, "crashed");
    assert.equal(pool.getAgent(id), undefined);
    assert.equal(internalPool.closedSessions.get(id), "/tmp/deadbeef.jsonl");
  });

  it("waitForAgents rejects empty ids", async () => {
    const pool = new AgentPool();
    await assert.rejects(
      () => pool.waitForAgents({ ids: [] }),
      (err: Error) => {
        assert.ok(err.message.includes("non-empty"), `expected non-empty error, got: ${err.message}`);
        return true;
      },
    );
  });

  it("waitForAgents rejects non-positive timeout", async () => {
    const pool = new AgentPool();
    await assert.rejects(
      () => pool.waitForAgents({ ids: ["fake"], timeoutMs: 0 }),
      (err: Error) => {
        assert.ok(err.message.includes("greater than zero"), `expected timeout error, got: ${err.message}`);
        return true;
      },
    );
  });
});
