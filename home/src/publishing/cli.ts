import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import {
  prepareArticlePackage,
  PublishingError,
  type Attribution,
} from "./article-package";
import { createJuejinAdapter } from "./adapters/juejin";
import { createWechatAdapter } from "./adapters/wechat";
import { createZhihuAdapter } from "./adapters/zhihu";
import type { PublishingChannel } from "./contracts";
import {
  runChannelInspection,
  runChannelSync,
  type ChannelAdapter,
  type StateStore,
} from "./orchestrator";
import { recordVisibleDraft } from "./receipt-recorder";
import { createFileStateStore } from "./state-store";

type CliIo = {
  stdout: (value: string) => void;
  stderr: (value: string) => void;
};

type CliDependencies = {
  adapters?: ChannelAdapter[];
  stateStore?: StateStore;
};

const defaultIo: CliIo = {
  stdout: value => process.stdout.write(value),
  stderr: value => process.stderr.write(value),
};

const CHANNELS = new Set<PublishingChannel>(["wechat", "zhihu", "juejin"]);

function parseChannels(value: string | undefined) {
  if (!value) return undefined;
  const channels = value
    .split(",")
    .map(channel => channel.trim())
    .filter(Boolean);
  if (
    channels.length === 0 ||
    channels.some(channel => !CHANNELS.has(channel as PublishingChannel))
  ) {
    throw new PublishingError(
      "INVALID_CHANNELS",
      "Channels must be a comma-separated subset of wechat, zhihu, juejin"
    );
  }
  return [...new Set(channels)] as PublishingChannel[];
}

function defaultAdapters(): ChannelAdapter[] {
  return [createWechatAdapter(), createZhihuAdapter(), createJuejinAdapter()];
}

function requiredOption(value: string | undefined, name: string) {
  if (!value) {
    throw new PublishingError(
      "INVALID_ARGUMENTS",
      `Missing required option --${name}`
    );
  }
  return value;
}

export async function runPublishingCli(
  argv: string[],
  io: CliIo = defaultIo,
  dependencies: CliDependencies = {}
) {
  let action: string | undefined;
  let json = argv.includes("--json");

  try {
    const { values, positionals } = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        "blog-root": { type: "string" },
        "output-dir": { type: "string" },
        "site-url": { type: "string" },
        language: { type: "string" },
        attribution: { type: "string" },
        channels: { type: "string" },
        channel: { type: "string" },
        "receipt-status": { type: "string" },
        "remote-id": { type: "string" },
        "draft-url": { type: "string" },
        verified: { type: "boolean", default: false },
        "state-dir": { type: "string" },
        json: { type: "boolean", default: false },
      },
    });
    const [parsedAction, input] = positionals;
    action = parsedAction;
    json = values.json === true;

    if (
      !action ||
      !input ||
      !["inspect", "prepare", "sync", "record"].includes(action)
    ) {
      throw new PublishingError(
        "INVALID_ARGUMENTS",
        "Usage: publish:channels <inspect|prepare|sync|record> <article-path-or-slug>"
      );
    }

    const attribution = values.attribution ?? "blog";
    if (attribution !== "blog" && attribution !== "wechat") {
      throw new PublishingError(
        "INVALID_ATTRIBUTION",
        "Attribution must be blog or wechat"
      );
    }

    const outputDir = values["output-dir"]
      ? path.resolve(values["output-dir"])
      : await mkdtemp(path.join(tmpdir(), "blog-channel-sync-"));
    const result = await prepareArticlePackage(input, {
      blogRoot: path.resolve(values["blog-root"] ?? process.cwd()),
      outputDir,
      siteUrl: values["site-url"] ?? "https://blog.jerret.me/",
      siteLanguage: values.language ?? "zh-CN",
      attribution: attribution as Attribution,
    });
    const resultSummary = {
      sourcePath: result.sourcePath,
      preparedMarkdownPath: result.preparedMarkdownPath,
      article: result.article,
      assets: result.assets,
      contentHash: result.contentHash,
      manifestPath: result.manifestPath,
    };
    const stateStore =
      dependencies.stateStore ??
      createFileStateStore({ stateDir: values["state-dir"] });
    if (action === "inspect") {
      const inspection = await runChannelInspection(result, {
        channels: parseChannels(values.channels),
        adapters: dependencies.adapters ?? defaultAdapters(),
        stateStore,
      });
      const payload = {
        success: inspection.status !== "failed",
        action,
        status: inspection.status === "completed" ? "ready" : inspection.status,
        ...resultSummary,
        channelStatus: inspection.status,
        channels: inspection.receipts,
        warnings: inspection.warnings,
      };
      io.stdout(`${JSON.stringify(payload, null, json ? 2 : 0)}\n`);
      if (inspection.status === "failed") return 2;
      return inspection.status === "partial" ? 1 : 0;
    }

    if (action === "record") {
      const channel = requiredOption(values.channel, "channel");
      const status = requiredOption(values["receipt-status"], "receipt-status");
      if (channel !== "zhihu" && channel !== "juejin") {
        throw new PublishingError(
          "INVALID_CHANNEL",
          "Record channel must be zhihu or juejin"
        );
      }
      if (status !== "draft-created" && status !== "draft-updated") {
        throw new PublishingError(
          "INVALID_RECEIPT_STATUS",
          "Receipt status must be draft-created or draft-updated"
        );
      }
      const receipt = await recordVisibleDraft(
        result,
        {
          channel,
          status,
          remoteId: values["remote-id"],
          draftUrl: requiredOption(values["draft-url"], "draft-url"),
          verified: values.verified === true,
        },
        stateStore
      );
      io.stdout(
        `${JSON.stringify(
          { success: true, action, status: "recorded", receipt },
          null,
          json ? 2 : 0
        )}\n`
      );
      return 0;
    }

    if (action === "sync") {
      const notifications: string[] = [];
      const syncResult = await runChannelSync(result, {
        channels: parseChannels(values.channels),
        adapters: dependencies.adapters ?? defaultAdapters(),
        stateStore,
        notify: message => {
          notifications.push(message);
          if (!json) io.stdout(`${message}\n`);
        },
      });
      const payload = {
        success: syncResult.status !== "failed",
        action,
        ...syncResult,
        package: {
          preparedMarkdownPath: result.preparedMarkdownPath,
          manifestPath: result.manifestPath,
          article: result.article,
          assets: result.assets,
        },
        notifications,
      };
      io.stdout(`${JSON.stringify(payload, null, json ? 2 : 0)}\n`);
      if (syncResult.status === "failed") return 2;
      return syncResult.status === "partial" ? 1 : 0;
    }

    const payload = {
      success: true,
      action,
      status: "prepared",
      ...resultSummary,
    };
    io.stdout(`${JSON.stringify(payload, null, json ? 2 : 0)}\n`);
    return 0;
  } catch (error) {
    const failure =
      error instanceof PublishingError
        ? error
        : error instanceof Error &&
            "code" in error &&
            typeof error.code === "string" &&
            error.code.startsWith("ERR_PARSE_ARGS")
          ? new PublishingError("INVALID_ARGUMENTS", error.message)
          : new PublishingError(
              "UNEXPECTED_ERROR",
              error instanceof Error ? error.message : String(error)
            );
    const payload = {
      success: false,
      action: action ?? null,
      status: "failed",
      error: {
        code: failure.code,
        message: failure.message,
        retryable: failure.retryable,
      },
    };
    const serialized = `${JSON.stringify(payload, null, json ? 2 : 0)}\n`;
    if (json) io.stdout(serialized);
    else io.stderr(serialized);
    return 2;
  }
}
