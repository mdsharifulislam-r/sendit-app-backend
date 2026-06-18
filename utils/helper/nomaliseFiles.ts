import { Express } from 'express';

function buildRelativePath(file: any): string {
  if (!file) return "";
  const normalized = file.path?.replace(/\\/g, '/');
  const afterUploads = normalized?.split('uploads')[1] ?? '';
  return afterUploads?.startsWith('/') ? afterUploads : `/${afterUploads}`;
}


export function handleMultipleFile(files: any): Record<string, string | string[]> | null {
  if (!files || typeof files !== 'object') return null;

  const result: Record<string, string | string[]> = {};

  for (const [key, value] of Object.entries(files)) {
    if (Array.isArray(value)) {
      if (value.length === 1) {
        result[key] = buildRelativePath(value[0]);
      } else {
        result[key] = value.map(item => buildRelativePath(item));
      }
    } else {
      result[key] = buildRelativePath(value);
    }
  }

  return result;
}

/**
 * Returns the public-facing relative URL(s) for uploaded files.
 */
export function getPublicUrl(
  file: any,
): string | string[] | null | Record<string, string | string[]> {
  if (!file) return null;
  if (Array.isArray(file)) {
    if (Object.keys(file[0]).length == 1) return buildRelativePath(file[0])
    return file.map(f => buildRelativePath(f));
  }
  if (Object.keys(file).length > 1) return handleMultipleFile(file)
  return buildRelativePath(file);
}
