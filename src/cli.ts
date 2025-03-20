#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";

const EXAMPLES_DIR = path.resolve(__dirname, "../examples");

const TARGET_DIR = process.cwd();

function copyExamples() {
  if (!fs.existsSync(EXAMPLES_DIR)) {
    console.error("❌ Error: The 'examples' directory does not exist.");
    process.exit(1);
  }

  console.log("📂 Copying example files...");

  fs.readdirSync(EXAMPLES_DIR).forEach((file) => {
    const srcPath = path.join(EXAMPLES_DIR, file);
    const destPath = path.join(TARGET_DIR, file);

    if (fs.existsSync(destPath)) {
      console.log(`⚠️ File '${file}' already exists, skipping...`);
    } else {
      fs.copyFileSync(srcPath, destPath);
      console.log(`✅ Copied '${file}'`);
    }
  });

  console.log("🎉 Done! Example files have been copied.");
}

const args = process.argv.slice(2);
if (args[0] === "start") {
  copyExamples();
} else {
  console.log("❌ Invalid command. Use: `apitcli start`");
}
