import { chromium } from "@playwright/test";
import { parseArguments, USAGE, type VerifyOptions } from "./arguments.ts";
import { checkSite, formatReport, problems } from "./verify-live.ts";

function optionsFrom(args: readonly string[]): VerifyOptions {
  try {
    return parseArguments(args);
  } catch (error) {
    console.error(`${error instanceof Error ? error.message : String(error)}\n\n${USAGE}`);
    process.exit(2);
  }
}

const args = process.argv.slice(2);
if (args.includes("--help")) {
  console.log(USAGE);
  process.exit(0);
}
const options = optionsFrom(args);
console.log(`Checking ${options.baseUrl}, screenshots in ${options.outDir}`);

const browser = await chromium.launch();
try {
  const reports = await checkSite(browser, options, (report) => console.log(formatReport(report)));
  const failed = reports.filter((report) => problems(report).length > 0).length;
  console.log(failed === 0 ? `All ${reports.length} pages passed` : `${failed} of ${reports.length} pages failed`);
  process.exitCode = failed === 0 ? 0 : 1;
} finally {
  await browser.close();
}
