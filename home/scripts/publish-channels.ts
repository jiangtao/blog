import { runPublishingCli } from "../src/publishing/cli";

process.exitCode = await runPublishingCli(process.argv.slice(2));
