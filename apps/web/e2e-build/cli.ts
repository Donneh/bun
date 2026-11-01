import { copyAppForE2e } from "./copy-app.ts";

const [copyDir] = process.argv.slice(2);
if (!copyDir) throw new Error("Usage: node e2e-build/cli.ts <directory>");

copyAppForE2e(".", copyDir);
