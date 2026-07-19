import { createHash, randomUUID } from "node:crypto";
import {
  chmod,
  copyFile,
  mkdir,
  readFile,
  rename,
  writeFile,
} from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import type { ChannelState, PublishingChannel } from "./contracts";
import type {
  PublishingState,
  StateLoadResult,
  StateStore,
} from "./orchestrator";

type FileStateStoreOptions = {
  stateDir?: string;
};

const CHANNELS: PublishingChannel[] = ["wechat", "zhihu", "juejin"];

export function defaultPublishingStateDir() {
  const stateRoot = process.env.XDG_STATE_HOME
    ? path.resolve(process.env.XDG_STATE_HOME)
    : path.join(homedir(), ".local", "state");
  return path.join(stateRoot, "sync-blog-channels");
}

export function statePathForSource(stateDir: string, sourcePath: string) {
  const key = createHash("sha256").update(sourcePath).digest("hex");
  return path.join(path.resolve(stateDir), `${key}.json`);
}

function emptyState(sourcePath: string): PublishingState {
  return { schemaVersion: 1, sourcePath, channels: {} };
}

function isChannelState(value: unknown): value is ChannelState {
  if (!value || typeof value !== "object") return false;
  const state = value as Record<string, unknown>;
  return (
    typeof state.contentHash === "string" &&
    /^[a-f0-9]{64}$/.test(state.contentHash) &&
    (state.remoteId === undefined || typeof state.remoteId === "string") &&
    (state.draftUrl === undefined || typeof state.draftUrl === "string") &&
    typeof state.verified === "boolean" &&
    typeof state.updatedAt === "string"
  );
}

function parseState(value: string, sourcePath: string): PublishingState {
  const parsed = JSON.parse(value) as Record<string, unknown>;
  if (
    parsed.schemaVersion !== 1 ||
    parsed.sourcePath !== sourcePath ||
    !parsed.channels ||
    typeof parsed.channels !== "object"
  ) {
    throw new Error("invalid state schema");
  }

  const rawChannels = parsed.channels as Record<string, unknown>;
  const channels: PublishingState["channels"] = {};
  for (const channel of CHANNELS) {
    const state = rawChannels[channel];
    if (state === undefined) continue;
    if (!isChannelState(state)) throw new Error("invalid channel state");
    channels[channel] = state;
  }
  return { schemaVersion: 1, sourcePath, channels };
}

export function createFileStateStore(
  options: FileStateStoreOptions = {}
): StateStore {
  const stateDir = path.resolve(
    options.stateDir ?? defaultPublishingStateDir()
  );

  async function ensureStateDirectory() {
    await mkdir(stateDir, { recursive: true, mode: 0o700 });
    await chmod(stateDir, 0o700);
  }

  async function load(sourcePath: string): Promise<StateLoadResult> {
    await ensureStateDirectory();
    const statePath = statePathForSource(stateDir, sourcePath);
    try {
      const contents = await readFile(statePath, "utf8");
      await chmod(statePath, 0o600);
      return { state: parseState(contents, sourcePath), warnings: [] };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return { state: emptyState(sourcePath), warnings: [] };
      }

      const backupPath = `${statePath}.corrupt-${Date.now()}-${randomUUID()}`;
      await copyFile(statePath, backupPath);
      await chmod(statePath, 0o600);
      await chmod(backupPath, 0o600);
      return {
        state: emptyState(sourcePath),
        warnings: [
          `状态文件损坏，已从空状态安全恢复；原文件保留在 ${backupPath}。`,
        ],
      };
    }
  }

  async function save(state: PublishingState) {
    await ensureStateDirectory();
    const statePath = statePathForSource(stateDir, state.sourcePath);
    const temporaryPath = `${statePath}.next-${randomUUID()}`;
    await writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, {
      mode: 0o600,
    });
    await rename(temporaryPath, statePath);
    await chmod(statePath, 0o600);
  }

  return { load, save };
}
