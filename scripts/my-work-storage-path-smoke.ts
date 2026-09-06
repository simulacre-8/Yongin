import { createClient } from "@supabase/supabase-js";
import {
  buildMyWorkStoragePath,
  isAsciiStoragePath,
} from "../client/src/lib/my-work-files";

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const bucket = "evidence-private";

if (!url || !key || !key.startsWith("sb_publishable_")) {
  throw new Error("A Supabase URL and publishable key are required");
}

const supabase = createClient(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

const originalName = "인하대_과학영재센터_과제b_3A이민후_20260214.pdf";
const marker = `MY_WORK_KOREAN_NAME_${crypto.randomUUID()}`;
const bytes = new TextEncoder().encode(marker);
const workItemId = `storage-path-smoke-${crypto.randomUUID()}`;
const storagePath = buildMyWorkStoragePath(
  workItemId,
  { name: originalName, size: bytes.byteLength },
  crypto.randomUUID()
);

if (!isAsciiStoragePath(storagePath) || storagePath.includes("이민후")) {
  throw new Error(`Storage path must be ASCII-only: ${storagePath}`);
}

let uploaded = false;
try {
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, bytes, {
      contentType: "application/pdf",
      upsert: false,
    });
  if (uploadError) throw new Error(`upload failed: ${uploadError.message}`);
  uploaded = true;

  const { data, error: downloadError } = await supabase.storage
    .from(bucket)
    .download(storagePath);
  if (downloadError || !data) {
    throw new Error(downloadError?.message || "download failed");
  }
  if ((await data.text()) !== marker) {
    throw new Error("downloaded marker mismatch");
  }

  console.log(
    JSON.stringify(
      {
        originalName,
        storagePath,
        asciiOnly: true,
        uploadDownload: true,
      },
      null,
      2
    )
  );
  console.log("MY_WORK_STORAGE_PATH_SMOKE_PASSED");
} finally {
  if (uploaded) {
    const { error } = await supabase.storage.from(bucket).remove([storagePath]);
    if (error) throw new Error(`cleanup failed: ${error.message}`);
  }
}
