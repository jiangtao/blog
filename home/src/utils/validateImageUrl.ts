import fs from "node:fs/promises";
import path from "node:path";

export interface ValidationResult {
  valid: boolean;
  error?: string;
  statusCode?: number;
}

/**
 * Validates if an image URL is accessible
 * - Absolute URLs: Check via HEAD request (skip in build/test)
 * - Relative URLs: Check if file exists in dist/ or public/
 */
export async function validateImageUrl(
  imageUrl: string,
  options: { skipRemote?: boolean; basePath?: string } = {}
): Promise<ValidationResult> {
  const { skipRemote = true, basePath = process.cwd() } = options;

  // Check if it's an absolute URL
  try {
    const url = new URL(imageUrl);

    // For remote URLs, skip validation in build/test by default
    if (skipRemote && url.protocol.startsWith("http")) {
      return { valid: true, error: "Skipped remote validation" };
    }

    // For remote URLs when not skipped, try HEAD request
    if (url.protocol.startsWith("http")) {
      try {
        const response = await fetch(url.toString(), { method: "HEAD" });
        return {
          valid: response.ok,
          error: response.ok ? undefined : `HTTP ${response.status}`,
          statusCode: response.status,
        };
      } catch (error) {
        return {
          valid: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }
  } catch {
    // Not a valid URL, treat as local path
  }

  // For relative/local paths, check file system
  const relativePath = imageUrl.replace(/^\//, "");
  const distPath = path.join(basePath, "dist", relativePath);
  const publicPath = path.join(basePath, "public", relativePath);

  try {
    await fs.access(distPath);
    return { valid: true };
  } catch {
    try {
      await fs.access(publicPath);
      return { valid: true };
    } catch {
      return {
        valid: false,
        error: `File not found: tried ${distPath} and ${publicPath}`,
      };
    }
  }
}
