import { getApiUser, unauthorized } from "@/lib/api-auth";
import { apiSuccess } from "@/lib/api-response";
import { getDb } from "@/lib/db";
/** Attribute to the owner's consenting visit, never to the person scanning the code. */
export async function POST() {
  const actor = await getApiUser();
  if (!actor || actor.kind !== "session") return unauthorized();
  const db = getDb();
  const events: { type: string }[] = [];
  for (const membership of actor.memberships) {
    const found = await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id = ${membership.workspaceId} FOR UPDATE`;
      const opens = await tx.funnelEvent.findMany({where:{workspaceId:membership.workspaceId,name:"first_external_open",isTest:false,createdAt:{gte:new Date("2026-10-18T00:00:00Z")},qrCodeId:{not:null}},take:100,select:{qrCodeId:true},orderBy:{createdAt:"asc"}});
      const result: {type:string}[] = [];
      for (const event of opens) {
        const sent = await tx.funnelEvent.findFirst({where:{workspaceId:membership.workspaceId,qrCodeId:event.qrCodeId,name:"metrika.first_external_open.delivered"},select:{id:true}});
        if(sent)continue;
        const qr=await tx.qrCode.findFirst({where:{id:event.qrCodeId!,workspaceId:membership.workspaceId,isArchived:false},select:{contentType:true}});
        if(!qr)continue;
        await tx.funnelEvent.create({data:{workspaceId:membership.workspaceId,qrCodeId:event.qrCodeId,name:"metrika.first_external_open.delivered"}});
        result.push({type:qr.contentType});
      }
      return result;
    });
    events.push(...found);
  }
  return apiSuccess({events});
}
