import fs from "fs";
import path from "path";

export interface WriteResult {
  updated: boolean;
  skipped: boolean;
}

export function writeIfChanged(
  filePath: string,
  original: string,
  updated: string
): WriteResult {
  // normalize line endings
  const oldText = normalize(original);
  const newText = normalize(updated);

  // no change
  if (oldText === newText) {
    return { updated: false, skipped: true };
  }

  // ensure directory exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, updated, "utf8");

  return { updated: true, skipped: false };
}

function normalize(text: string) {
  return text.replace(/\r\n/g, "\n").trim();
}