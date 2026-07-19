import {
  chmod,
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { PublishingState } from "../orchestrator";
import { createFileStateStore, statePathForSource } from "../state-store";

describe("file state store", () => {
  it("round-trips state outside the article source", async () => {
    const workspace = await mkdtemp(path.join(tmpdir(), "blog-state-test-"));
    const stateDir = path.join(workspace, "state");
    const sourcePath = "/blog/home/src/data/blog/sample.md";
    await mkdir(stateDir, { recursive: true, mode: 0o755 });
    const store = createFileStateStore({ stateDir });
    const state: PublishingState = {
      schemaVersion: 1,
      sourcePath,
      channels: {
        juejin: {
          contentHash: "a".repeat(64),
          remoteId: "draft-1",
          draftUrl: "https://juejin.cn/editor/drafts/draft-1",
          verified: true,
          updatedAt: "2026-07-19T00:00:00.000Z",
        },
      },
    };

    await store.save(state);
    await chmod(statePathForSource(stateDir, sourcePath), 0o644);
    const loaded = await store.load(sourcePath);

    expect(loaded).toEqual({ state, warnings: [] });
    expect(statePathForSource(stateDir, sourcePath)).not.toContain("sample.md");
    expect((await stat(stateDir)).mode & 0o777).toBe(0o700);
    expect(
      (await stat(statePathForSource(stateDir, sourcePath))).mode & 0o777
    ).toBe(0o600);
  });

  it("backs up corrupted state and safely recovers from an empty state", async () => {
    const workspace = await mkdtemp(path.join(tmpdir(), "blog-state-test-"));
    const stateDir = path.join(workspace, "state");
    const sourcePath = "/blog/home/src/data/blog/sample.md";
    const statePath = statePathForSource(stateDir, sourcePath);
    await mkdir(stateDir, { recursive: true, mode: 0o755 });
    await writeFile(statePath, "not-json");
    await chmod(statePath, 0o644);

    const loaded = await createFileStateStore({ stateDir }).load(sourcePath);

    expect(loaded.state).toEqual({
      schemaVersion: 1,
      sourcePath,
      channels: {},
    });
    expect(loaded.warnings[0]).toContain("状态文件损坏");
    expect(await readFile(statePath, "utf8")).toBe("not-json");
    expect(loaded.warnings[0]).toMatch(/\.corrupt-/);
    const backupName = (await readdir(stateDir)).find(name =>
      name.includes(".corrupt-")
    );
    expect(backupName).toBeDefined();
    expect((await stat(stateDir)).mode & 0o777).toBe(0o700);
    expect((await stat(path.join(stateDir, backupName!))).mode & 0o777).toBe(
      0o600
    );
  });
});
