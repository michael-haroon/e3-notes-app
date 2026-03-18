import { Client as MinioClient } from "minio";
import { v4 as uuidv4 } from "uuid";

let _client: MinioClient | null = null;

function getClient(): MinioClient {
  if (_client) return _client;
  _client = new MinioClient({
    endPoint: process.env.STORAGE_ENDPOINT ?? "localhost",
    port: parseInt(process.env.STORAGE_PORT ?? "9000"),
    useSSL: process.env.STORAGE_USE_SSL === "true",
    accessKey: process.env.STORAGE_ACCESS_KEY ?? "minioadmin",
    secretKey: process.env.STORAGE_SECRET_KEY ?? "minioadmin",
  });
  return _client;
}

const BUCKET = process.env.STORAGE_BUCKET ?? "notes-files";

export async function ensureBucket(): Promise<void> {
  const client = getClient();
  const exists = await client.bucketExists(BUCKET);
  if (!exists) {
    await client.makeBucket(BUCKET, "us-east-1");
    // Block all public access — files are only accessible via app proxy
    const policy = JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Deny",
          Principal: "*",
          Action: "s3:GetObject",
          Resource: `arn:aws:s3:::${BUCKET}/*`,
        },
      ],
    });
    await client.setBucketPolicy(BUCKET, policy);
  }
}

export async function uploadFile(
  buffer: Buffer,
  mimeType: string,
  originalName: string
): Promise<string> {
  const client = getClient();
  await ensureBucket();
  const ext = originalName.split(".").pop() ?? "bin";
  const key = `${uuidv4()}.${ext}`;
  await client.putObject(BUCKET, key, buffer, buffer.length, {
    "Content-Type": mimeType,
  });
  return key;
}

export async function getFileStream(key: string): Promise<NodeJS.ReadableStream> {
  const client = getClient();
  return client.getObject(BUCKET, key);
}

export async function deleteFile(key: string): Promise<void> {
  const client = getClient();
  await client.removeObject(BUCKET, key);
}
