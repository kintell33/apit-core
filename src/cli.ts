#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const EXAMPLES_DIR = path.resolve(__dirname, "../examples");
const TARGET_DIR = path.join(process.cwd(), "apit-test");

function copyDirectory(source: string, destination: string) {
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }

  fs.readdirSync(source).forEach((item) => {
    const srcPath = path.join(source, item);
    const destPath = path.join(destination, item);

    if (fs.statSync(srcPath).isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      if (!fs.existsSync(destPath)) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`✅ Copied: ${destPath}`);
      } else {
        console.log(`⚠️ File already exists, skipping: ${destPath}`);
      }
    }
  });
}

function runTests() {
  const testFilePath = path.join(TARGET_DIR, "tests", "flows.ts");

  if (!fs.existsSync(testFilePath)) {
    console.error(
      "❌ Error: No test flow found. Run `apitcli start` first and use the flow.ts to define your test flows."
    );
    process.exit(1);
  }

  console.log("\n🚀 Running API Tests...\n\n");
  try {
    execSync(`ts-node ${testFilePath}`, { stdio: "inherit" });
    console.log("\n");
  } catch (error: any) {
    console.error("❌ Error running tests:", error.message);
  }
}

const args = process.argv.slice(2);
if (args[0] === "start") {
  console.log("📂 Creating 'apit-test/' and copying example files...");
  copyDirectory(EXAMPLES_DIR, TARGET_DIR);
  console.log("🎉 Done! Example files have been copied to 'apit-test/'.");
} else if (args[0] === "run") {
  runTests();
} else {
  console.log("❌ Invalid command. Use: `apitcli start` or `apitcli run`");
}
