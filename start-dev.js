const { execSync } = require("child_process");
const path = require("path");

process.chdir(path.join(__dirname));

const args = process.argv.slice(2);
const cmd = `npx next ${args.join(" ")}`;

const { spawn } = require("child_process");
const child = spawn("npx", ["next", ...args], {
  cwd: __dirname,
  stdio: "inherit",
  shell: true,
});

child.on("exit", (code) => process.exit(code));
