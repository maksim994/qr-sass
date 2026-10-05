CREATE TABLE "LegalAcceptance" (
 "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL,
 "version" TEXT NOT NULL, "source" TEXT NOT NULL,
 "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "termsAccepted" BOOLEAN NOT NULL, "dataConsent" BOOLEAN NOT NULL,
 "documents" JSONB NOT NULL,
 CONSTRAINT "LegalAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "LegalAcceptance_userId_acceptedAt_idx" ON "LegalAcceptance"("userId", "acceptedAt");
CREATE TABLE "OAuthLegalIntent" (
 "stateHash" TEXT NOT NULL PRIMARY KEY, "version" TEXT NOT NULL,
 "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "expiresAt" TIMESTAMP(3) NOT NULL, "documents" JSONB NOT NULL
);
CREATE INDEX "OAuthLegalIntent_expiresAt_idx" ON "OAuthLegalIntent"("expiresAt");
