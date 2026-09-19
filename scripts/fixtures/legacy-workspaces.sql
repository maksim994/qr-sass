INSERT INTO "User" (id,email,"passwordHash","isAdmin","updatedAt") VALUES ('fixture-admin','fixture@example.invalid','not-a-login',true,NOW());
INSERT INTO "Workspace" (id,name,slug,plan,"updatedAt") VALUES
('legacy-business','Legacy Business','legacy-business','BUSINESS',NOW()),
('legacy-pro','Legacy Pro','legacy-pro','PRO',NOW()),
('legacy-expired','Expired Pro','legacy-expired','PRO',NOW()),
('legacy-free','Legacy Free','legacy-free','FREE',NOW()),
('legacy-trial','Trial Pro','legacy-trial','PRO',NOW());
INSERT INTO "Subscription" (id,"workspaceId",plan,status,"currentPeriodEnd","updatedAt") VALUES
('sub-pro','legacy-pro','PRO','active','2099-09-29',NOW()),
('sub-expired','legacy-expired','PRO','active','2020-04-19',NOW()),
('sub-trial','legacy-trial','PRO','trial','2099-09-29',NOW());
INSERT INTO "PlanOverride" (id,"planId","priceRub","maxUsers") VALUES ('override-pro','PRO',199,5);
INSERT INTO "QrCode" (id,"workspaceId","createdById",kind,"contentType",name,"shortCode","encodedContent","currentTargetUrl",payload,"updatedAt")
SELECT 'qr-'||id,id,'fixture-admin','DYNAMIC','URL','Existing QR',id,'https://qr-s.ru//r/'||id,'https://example.invalid/old', '{"url":"https://example.invalid/old"}',NOW() FROM "Workspace";
