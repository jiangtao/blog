#!/usr/bin/env node

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const homeDir = path.resolve(__dirname, "..");
const baseline = JSON.parse(
  fs.readFileSync(path.join(homeDir, "quality-baseline.json"), "utf8")
);

function stable(value) {
  return JSON.stringify(value, null, 2);
}

function fail(label, expected, actual) {
  console.error(`${label} 与已审阅基线不一致。`);
  console.error(`Expected:\n${stable(expected)}`);
  console.error(`Actual:\n${stable(actual)}`);
  process.exit(1);
}

function localBinary(name) {
  return path.join(homeDir, "node_modules", ".bin", name);
}

function firstLine(message = "") {
  return message.split(/\r?\n/, 1)[0];
}

function normalizeMessage(message) {
  return firstLine(message)
    .replaceAll(homeDir, "<root>")
    .replace(/File not found: tried [^']+/, "File not found: tried <path>")
    .replaceAll(path.sep, "/");
}

function compareFormatter() {
  const result = spawnSync(localBinary("prettier"), ["--list-different", "."], {
    cwd: homeDir,
    encoding: "utf8",
  });

  if (![0, 1].includes(result.status)) {
    console.error(result.stderr || result.stdout);
    process.exit(result.status || 1);
  }

  const actual = result.stdout
    .split(/\r?\n/)
    .map(file => file.trim())
    .filter(Boolean)
    .sort();
  const expected = [...baseline.formatter.expectedDifferingFiles].sort();

  if (stable(actual) !== stable(expected)) {
    fail("Formatter failure set", expected, actual);
  }

  console.log(`baseline-failure: formatter 仍有 ${actual.length} 个已知未格式化文件，失败集未漂移。`);
}

function normalizeTestReport(report) {
  const failedAssertions = report.testResults
    .flatMap(suite => suite.assertionResults || [])
    .filter(assertion => assertion.status === "failed")
    .map(assertion => ({
      fullName: assertion.fullName,
      message: normalizeMessage(assertion.failureMessages?.[0]),
    }))
    .sort((left, right) => left.fullName.localeCompare(right.fullName));

  const failedSuitesWithoutAssertions = report.testResults
    .filter(
      suite =>
        suite.status === "failed" && (suite.assertionResults || []).length === 0
    )
    .map(suite => ({
      file: path.relative(homeDir, suite.name).split(path.sep).join("/"),
      message: normalizeMessage(suite.message),
    }))
    .sort((left, right) => left.file.localeCompare(right.file));

  return {
    counts: {
      totalSuites: report.numTotalTestSuites,
      passedSuites: report.numPassedTestSuites,
      failedSuites: report.numFailedTestSuites,
      totalTests: report.numTotalTests,
      passedTests: report.numPassedTests,
      failedTests: report.numFailedTests,
    },
    failedAssertions,
    failedSuitesWithoutAssertions,
  };
}

function compareTests() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "blog-vitest-baseline-"));
  const reportPath = path.join(tempDir, "report.json");

  try {
    const result = spawnSync(
      localBinary("vitest"),
      ["run", "--reporter=json", `--outputFile=${reportPath}`],
      { cwd: homeDir, encoding: "utf8" }
    );

    if (![0, 1].includes(result.status) || !fs.existsSync(reportPath)) {
      console.error(result.stderr || result.stdout);
      process.exit(result.status || 1);
    }

    const actual = normalizeTestReport(
      JSON.parse(fs.readFileSync(reportPath, "utf8"))
    );
    const expected = baseline.tests;

    if (stable(actual) !== stable(expected)) {
      fail("Test failure set", expected, actual);
    }

    console.log(
      `baseline-failure: tests 仍有 ${actual.counts.failedSuites} 个已知失败套件、${actual.counts.failedTests} 个失败断言，失败集未漂移。`
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

const target = process.argv[2];

if (target === "format") {
  compareFormatter();
} else if (target === "test") {
  compareTests();
} else {
  console.error("Usage: node bin/check-quality-baseline.cjs <format|test>");
  process.exit(2);
}
