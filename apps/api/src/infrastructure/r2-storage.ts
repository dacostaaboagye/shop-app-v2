import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { ApiEnv } from "../env.js";

export type R2StorageConfig = {
  accountId: string;
  accessKeyId: string;
  bucket: string;
  publicUrl: string;
  secretAccessKey: string;
};

export type PresignResult = {
  expiresAt: Date;
  key: string;
  publicUrl: string;
  uploadUrl: string;
};

export class R2StorageService {
  private readonly client: S3Client;

  constructor(private readonly config: R2StorageConfig) {
    this.client = new S3Client({
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      region: "auto",
      requestChecksumCalculation: "WHEN_REQUIRED",
    });
  }

  async presignUpload(input: {
    expiresInSeconds?: number;
    fileSizeBytes: number;
    key: string;
    mimeType: string;
  }): Promise<PresignResult> {
    const expiresIn = input.expiresInSeconds ?? 300;
    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      ContentLength: input.fileSizeBytes,
      ContentType: input.mimeType,
      Key: input.key,
    });
    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn });
    return {
      expiresAt: new Date(Date.now() + expiresIn * 1000),
      key: input.key,
      publicUrl: this.publicUrlForKey(input.key),
      uploadUrl,
    };
  }

  async objectExists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.config.bucket, Key: key }),
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Fetches the first `byteCount` bytes of an object plus the full
   * Content-Length, in a single request. Used at upload-confirm time to
   * sniff magic bytes and verify the actual stored size matches the
   * client's claim. Returns `null` if the object does not exist.
   */
  async readObjectHead(
    key: string,
    byteCount: number,
  ): Promise<{ bytes: Uint8Array; contentLength: number } | null> {
    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.config.bucket,
          Key: key,
          Range: `bytes=0-${byteCount - 1}`,
        }),
      );
      const body = response.Body;
      if (!body) {
        return { bytes: new Uint8Array(), contentLength: 0 };
      }
      const chunks: Uint8Array[] = [];
      for await (const chunk of body as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
      }
      const total = chunks.reduce((acc, c) => acc + c.length, 0);
      const bytes = new Uint8Array(total);
      let offset = 0;
      for (const c of chunks) {
        bytes.set(c, offset);
        offset += c.length;
      }
      // ContentRange looks like `bytes 0-15/12345` — the suffix after the
      // slash is the full object size. Fall back to ContentLength of the
      // partial response if the header isn't there for any reason.
      const fullSize = parseTotalFromContentRange(response.ContentRange);
      return {
        bytes,
        contentLength: fullSize ?? response.ContentLength ?? bytes.length,
      };
    } catch {
      return null;
    }
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.config.bucket, Key: key }),
    );
  }

  publicUrlForKey(key: string): string {
    return `${this.config.publicUrl}/${key}`;
  }
}

function parseTotalFromContentRange(
  contentRange: string | undefined,
): number | null {
  if (!contentRange) return null;
  const match = contentRange.match(/\/(\d+)$/);
  if (!match) return null;
  const total = Number(match[1]);
  return Number.isFinite(total) ? total : null;
}

export function createR2StorageService(env: ApiEnv): R2StorageService | null {
  if (
    !env.r2AccountId ||
    !env.r2AccessKeyId ||
    !env.r2SecretAccessKey ||
    !env.r2Bucket ||
    !env.r2PublicUrl
  ) {
    return null;
  }
  return new R2StorageService({
    accountId: env.r2AccountId,
    accessKeyId: env.r2AccessKeyId,
    bucket: env.r2Bucket,
    publicUrl: env.r2PublicUrl,
    secretAccessKey: env.r2SecretAccessKey,
  });
}
