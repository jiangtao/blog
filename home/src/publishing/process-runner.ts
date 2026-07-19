import { spawn } from "node:child_process";

export type CommandRequest = {
  command: string;
  args: string[];
  cwd?: string;
  timeoutMs?: number;
};

export type CommandResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

export type CommandRunner = (request: CommandRequest) => Promise<CommandResult>;

const MAX_OUTPUT_BYTES = 1024 * 1024;

function appendOutput(current: string, chunk: Buffer | string) {
  if (Buffer.byteLength(current) >= MAX_OUTPUT_BYTES) return current;
  return `${current}${String(chunk)}`.slice(0, MAX_OUTPUT_BYTES);
}

export const runCommand: CommandRunner = request =>
  new Promise(resolve => {
    const child = spawn(request.command, request.args, {
      cwd: request.cwd,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
    }, request.timeoutMs ?? 120_000);

    child.stdout.on("data", chunk => {
      stdout = appendOutput(stdout, chunk);
    });
    child.stderr.on("data", chunk => {
      stderr = appendOutput(stderr, chunk);
    });
    child.on("error", error => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve({ exitCode: 127, stdout, stderr: error.message });
    });
    child.on("close", (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve({
        exitCode: code ?? (signal ? 124 : 1),
        stdout,
        stderr,
      });
    });
  });
