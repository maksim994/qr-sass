import assert from "node:assert/strict";
import { test } from "node:test";
import { workspaceFilePath, isWorkspaceFilePath, workspaceFileIdFromPath } from "./workspace-file-path.ts";

test("private uploads are addressed by an authenticated workspace path", () => {
  assert.equal(workspaceFilePath("file_1"), "/api/upload/file_1/file");
  assert.equal(isWorkspaceFilePath("/api/upload/file_1/file"), true);
  assert.equal(workspaceFileIdFromPath("/api/upload/file_1/file"), "file_1");
  assert.equal(isWorkspaceFilePath("https://s3.example/qr/file.png"), false);
  assert.equal(isWorkspaceFilePath("/api/qr/qr1/asset"), false);
  assert.throws(() => workspaceFilePath("../etc/passwd"));
});
