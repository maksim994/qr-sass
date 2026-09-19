import assert from "node:assert/strict";
import { test } from "node:test";
import { collectUploadIds, uploadsBelongToWorkspace } from "./tenant.ts";
import { workspaceFilePath } from "./workspace-file-path.ts";

function dbWith(ids: string[]) {
  return {
    uploadedFile: {
      findFirst: async ({ where }: { where: { id: string; workspaceId: string } }) =>
        ids.includes(where.id) && where.workspaceId === "ws1" ? { id: where.id } : null,
    },
  };
}

test("owned workspace fileId is accepted and a foreign file is rejected", async () => {
  const db = dbWith(["test123"]) as never;
  const payload = { fileUrl: workspaceFilePath("test123"), fileId: "test123" };
  assert.deepEqual(collectUploadIds(payload, { logoFileId: "test123" }), ["test123"]);
  assert.equal(await uploadsBelongToWorkspace(db, collectUploadIds(payload), "ws1"), true);
  assert.equal(await uploadsBelongToWorkspace(db, ["foreign"], "ws1"), false);
});
