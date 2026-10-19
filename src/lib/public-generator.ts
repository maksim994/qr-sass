import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getEntitlements } from "@/lib/entitlements";
import { selectWorkspace } from "@/lib/workspace-select";
import { getDisabledQrTypes } from "@/lib/disabled-qr-types";
import { STATIC_QR_TYPES } from "@/lib/static-qr";
import { qrTypes } from "@/lib/qr-types";

export async function publicGeneratorOptions() {
  const [session, disabled]=await Promise.all([getSession(),getDisabledQrTypes()]);
  const enabledTypes=qrTypes.filter(type=>!disabled.includes(type.type)).map(type=>type.type);
  const enabledStaticTypes=STATIC_QR_TYPES.filter(type=>enabledTypes.includes(type));
  let trialUsed=false, dynamicRemaining:number|null|undefined;
  if(session){
    const memberships=await getDb().membership.findMany({where:{userId:session.sub},include:{workspace:true}});
    const workspace=await selectWorkspace(memberships);
    if(workspace){
      trialUsed=!!workspace.trialUsedAt;
      const access=await getEntitlements(workspace.id);
      const count=await getDb().qrCode.count({where:{workspaceId:workspace.id,isArchived:false,OR:[{kind:"DYNAMIC"},{shortCode:{not:null}}]}});
      dynamicRemaining=access.plan.limits.maxDynamicQr==null?null:Math.max(0,access.plan.limits.maxDynamicQr-count);
    }
  }
  return {session,signedIn:!!session,enabledTypes,enabledStaticTypes,trialUsed,dynamicRemaining};
}
