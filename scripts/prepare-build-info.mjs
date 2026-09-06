import fs from "node:fs";
import path from "node:path";

const url = process.env.VITE_SUPABASE_URL?.trim();
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
const missing = [
  !url && "VITE_SUPABASE_URL",
  !publishableKey && "VITE_SUPABASE_PUBLISHABLE_KEY",
].filter(Boolean);

if (missing.length > 0) {
  console.error(
    `[build-env] Missing required Netlify build variables: ${missing.join(", ")}`
  );
  process.exit(1);
}

let projectRef = "invalid-url";
try {
  projectRef = new URL(url).hostname.split(".")[0] || "unknown";
} catch {
  console.error("[build-env] VITE_SUPABASE_URL is not a valid URL.");
  process.exit(1);
}

if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey)) {
  console.error(
    "[build-env] VITE_SUPABASE_PUBLISHABLE_KEY is not a publishable key."
  );
  process.exit(1);
}

const buildInfo = {
  builtAt: new Date().toISOString(),
  commitSha:
    process.env.COMMIT_REF ||
    process.env.GITHUB_SHA ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    "local",
  deployContext: process.env.CONTEXT || process.env.NODE_ENV || "local",
  supabaseConfigured: true,
  supabaseProjectRef: projectRef,
};

const output = path.resolve("client/public/build-info.json");
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(buildInfo, null, 2)}\n`, "utf8");
console.log(
  `[build-env] Supabase project ${projectRef} configured; build-info.json generated.`
);
