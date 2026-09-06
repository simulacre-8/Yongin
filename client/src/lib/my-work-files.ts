export const MY_WORK_MAX_FILE_BYTES = 10 * 1024 * 1024;

export const MY_WORK_ALLOWED_EXTENSIONS = [
  "hwp",
  "txt",
  "png",
  "jpg",
  "jpeg",
  "doc",
  "docx",
  "pdf",
] as const;

export const MY_WORK_FILE_ACCEPT = MY_WORK_ALLOWED_EXTENSIONS.map(
  extension => `.${extension}`
).join(",");

export const MY_WORK_FILE_GUIDE =
  "10MB 이하 · HWP, TXT, PNG, JPG/JPEG, DOC/DOCX, PDF";

function getFileExtension(fileName: string) {
  const normalized = fileName.normalize("NFKC").trim();
  const separator = normalized.lastIndexOf(".");
  if (separator <= 0 || separator === normalized.length - 1) return "";
  return normalized.slice(separator + 1).toLowerCase();
}

function safeAsciiSegment(value: string) {
  const sanitized = value
    .normalize("NFKC")
    .replace(/[^0-9A-Za-z_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!sanitized) throw new Error("첨부파일 저장 경로를 만들 수 없습니다.");
  return sanitized;
}

export function validateMyWorkFile(file: Pick<File, "name" | "size">) {
  if (file.size < 1 || file.size > MY_WORK_MAX_FILE_BYTES) {
    throw new Error("첨부파일은 1바이트 이상 10MB 이하만 등록할 수 있습니다.");
  }

  const extension = getFileExtension(file.name);
  if (
    !MY_WORK_ALLOWED_EXTENSIONS.includes(
      extension as (typeof MY_WORK_ALLOWED_EXTENSIONS)[number]
    )
  ) {
    throw new Error(
      "허용 파일형식은 HWP, TXT, PNG, JPG/JPEG, DOC/DOCX, PDF입니다."
    );
  }

  return extension;
}

export function buildMyWorkStoragePath(
  workItemId: string,
  file: Pick<File, "name" | "size">,
  objectId = crypto.randomUUID()
) {
  const extension = validateMyWorkFile(file);
  const safeWorkItemId = safeAsciiSegment(workItemId);
  const safeObjectId = safeAsciiSegment(objectId);
  return `demo/my-work/${safeWorkItemId}/${safeObjectId}.${extension}`;
}

export function isAsciiStoragePath(path: string) {
  return /^[\x20-\x7E]+$/.test(path);
}

export function formatMyWorkFileSelection(
  file: Pick<File, "name" | "size"> | undefined
) {
  if (!file) return "10MB 이하 파일을 선택하세요.";
  const kilobytes = Math.max(1, Math.ceil(file.size / 1024));
  return `${file.name} · ${kilobytes.toLocaleString()}KB`;
}
