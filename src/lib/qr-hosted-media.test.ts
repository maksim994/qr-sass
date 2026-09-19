import assert from "node:assert/strict";
import { test } from "node:test";
import { hostedLandingPayload } from "./qr-hosted-media.ts";
import { isDisplayableMediaUrl } from "./url.ts";
import { evaluateQrPublicAccess } from "./qr-public-access.ts";
import { savedQrIdForDownload } from "./qr-download-gate.ts";

const qr = { id: "qr1", workspaceId: "ws1" };

function dbWith(files: Array<{ id: string; url: string }>) {
  return {
    uploadedFile: {
      findFirst: async ({ where }: { where: { OR: Array<Record<string, string>> } }) => {
        return (
          files.find((file) =>
            where.OR.some((clause) => ("id" in clause && clause.id === file.id) || ("url" in clause && clause.url === file.url)),
          ) ?? null
        );
      },
    },
  };
}

test("upload landing rewrites own files to asset path and keeps YouTube", async () => {
  const own = await hostedLandingPayload(
    qr,
    { fileUrl: "https://s3.example/private.pdf", fileId: "file1" },
    dbWith([{ id: "file1", url: "https://s3.example/private.pdf" }]),
  );
  assert.equal(own.fileUrl, "/api/qr/qr1/asset");
  assert.equal(isDisplayableMediaUrl(String(own.fileUrl)), true);

  const granted = await hostedLandingPayload(
    qr,
    { fileUrl: "https://s3.example/private.pdf", fileId: "file1" },
    dbWith([{ id: "file1", url: "https://s3.example/private.pdf" }]),
    "view-token",
  );
  assert.equal(granted.fileUrl, "/api/qr/qr1/asset?v=view-token");
  assert.equal(isDisplayableMediaUrl(String(granted.fileUrl)), true);

  const youtube = "https://www.youtube.com/watch?v=dQw4w9wgGcQ";
  const external = await hostedLandingPayload(qr, { videoUrl: youtube }, dbWith([]));
  assert.equal(external.videoUrl, youtube);
  assert.equal(isDisplayableMediaUrl(youtube), true);

  const workspace = await hostedLandingPayload(
    qr,
    { fileUrl: "/api/upload/file1/file", fileId: "file1" },
    dbWith([{ id: "file1", url: "/api/upload/file1/file" }]),
  );
  assert.equal(workspace.fileUrl, "/api/qr/qr1/asset");
});

test("upload landing download chain keeps public access and dirty download gates", async () => {
  const access = await evaluateQrPublicAccess({
    qr: {
      id: "qr1",
      shortCode: "abc",
      isArchived: false,
      expireAt: null,
      maxScans: 1,
      passwordHash: null,
    },
    scanCount: 1,
  });
  assert.equal(access.ok, false);
  assert.equal(access.reason, "limit");
  assert.equal(savedQrIdForDownload("qr1", true), undefined);
  assert.equal(savedQrIdForDownload("qr1", false), "qr1");
});
