-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "expiresAt" DATETIME NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" DATETIME,
    "refreshTokenExpiresAt" DATETIME,
    "scope" TEXT,
    "password" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "identifier" TEXT NOT NULL,
    "idempotencyKey" TEXT
);

-- CreateTable
CREATE TABLE "pet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "species" TEXT NOT NULL,
    "breed" TEXT,
    "dateOfBirth" DATETIME,
    "sex" TEXT,
    "photoUrl" TEXT,
    "bio" TEXT,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerId" TEXT NOT NULL,
    CONSTRAINT "pet_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "body" TEXT NOT NULL,
    "coverImageUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "visibility" TEXT NOT NULL DEFAULT 'PUBLIC',
    "goalAmountCents" INTEGER,
    "deadline" DATETIME,
    "raisedCents" INTEGER NOT NULL DEFAULT 0,
    "billAmountCents" INTEGER,
    "allowGuestDonations" BOOLEAN NOT NULL DEFAULT true,
    "isOwnerAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "ownerDisplayName" TEXT,
    "vetHospitalId" TEXT,
    "ownerId" TEXT NOT NULL,
    "publishedAt" DATETIME,
    "closedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "campaign_vetHospitalId_fkey" FOREIGN KEY ("vetHospitalId") REFERENCES "vet_hospital" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "campaign_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "campaign_pet" (
    "campaignId" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'PRIMARY',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("campaignId", "petId"),
    CONSTRAINT "campaign_pet_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "campaign_pet_petId_fkey" FOREIGN KEY ("petId") REFERENCES "pet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "campaign_member" (
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MANAGER',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "invitedById" TEXT,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("campaignId", "userId"),
    CONSTRAINT "campaign_member_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "campaign_member_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "campaign_member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "campaign_image" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "widthPx" INTEGER,
    "heightPx" INTEGER,
    "campaignId" TEXT NOT NULL,
    CONSTRAINT "campaign_image_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "donation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "donorUserId" TEXT,
    "donorName" TEXT,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "feeCents" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL DEFAULT 'MANUAL',
    "providerRef" TEXT,
    "message" TEXT,
    "receiptNumber" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "refundedAt" DATETIME,
    "campaignId" TEXT NOT NULL,
    CONSTRAINT "donation_donorUserId_fkey" FOREIGN KEY ("donorUserId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "donation_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "vet_hospital" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "addressLine" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "is24Hour" BOOLEAN NOT NULL DEFAULT false,
    "isEmergency" BOOLEAN NOT NULL DEFAULT false,
    "isLowCost" BOOLEAN NOT NULL DEFAULT false,
    "priceTier" TEXT NOT NULL DEFAULT 'MODERATE',
    "emergencyHours" TEXT,
    "speciesServed" TEXT,
    "notes" TEXT,
    "services" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" DATETIME,
    "lastCheckedAt" DATETIME,
    "latitude" REAL,
    "longitude" REAL,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "vet_hospital_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "vet_record" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hospitalId" TEXT,
    "hospitalName" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'INVOICE',
    "title" TEXT NOT NULL,
    "amountCents" INTEGER,
    "invoiceNumber" TEXT,
    "documentUrl" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedById" TEXT,
    "uploadedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME,
    "campaignId" TEXT NOT NULL,
    CONSTRAINT "vet_record_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "vet_hospital" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "vet_record_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "vet_record_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "vet_record_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "funding_source" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'NATIONAL',
    "species" TEXT NOT NULL,
    "conditions" TEXT NOT NULL,
    "eligibility" TEXT NOT NULL,
    "howToApply" TEXT NOT NULL,
    "maxAwardCents" INTEGER,
    "maxAwardNote" TEXT,
    "recurring" BOOLEAN NOT NULL DEFAULT false,
    "incomeRestricted" BOOLEAN NOT NULL DEFAULT false,
    "vetMustApply" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" DATETIME,
    "lastCheckedAt" DATETIME,
    "verifyNote" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "retiredAt" DATETIME,
    CONSTRAINT "funding_source_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "promise_to_pay" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "billAmountCents" INTEGER NOT NULL,
    "ttlCoversCents" INTEGER,
    "ownerMaxObligationCents" INTEGER NOT NULL,
    "ttlCoversText" TEXT NOT NULL,
    "ownerObligationText" TEXT NOT NULL,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "acceptedAt" DATETIME,
    "acceptedBy" TEXT,
    "termsVersion" TEXT NOT NULL DEFAULT '2026-10',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "promise_to_pay_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "promise_to_pay_acceptedBy_fkey" FOREIGN KEY ("acceptedBy") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "campaign_review" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "decision" TEXT NOT NULL,
    "reason" TEXT,
    "reviewerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "campaignId" TEXT NOT NULL,
    CONSTRAINT "campaign_review_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "campaign_review_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "isModerator" BOOLEAN NOT NULL DEFAULT false,
    "isSystem" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_users" ("createdAt", "email", "id", "name", "updatedAt") SELECT "createdAt", "email", "id", "name", "updatedAt" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "pet_ownerId_idx" ON "pet"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_slug_key" ON "campaign"("slug");

-- CreateIndex
CREATE INDEX "campaign_status_visibility_createdAt_idx" ON "campaign"("status", "visibility", "createdAt");

-- CreateIndex
CREATE INDEX "campaign_ownerId_idx" ON "campaign"("ownerId");

-- CreateIndex
CREATE INDEX "campaign_vetHospitalId_idx" ON "campaign"("vetHospitalId");

-- CreateIndex
CREATE INDEX "campaign_pet_petId_idx" ON "campaign_pet"("petId");

-- CreateIndex
CREATE INDEX "campaign_member_userId_status_idx" ON "campaign_member"("userId", "status");

-- CreateIndex
CREATE INDEX "campaign_image_campaignId_sortOrder_idx" ON "campaign_image"("campaignId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "donation_providerRef_key" ON "donation"("providerRef");

-- CreateIndex
CREATE UNIQUE INDEX "donation_receiptNumber_key" ON "donation"("receiptNumber");

-- CreateIndex
CREATE INDEX "donation_campaignId_status_idx" ON "donation"("campaignId", "status");

-- CreateIndex
CREATE INDEX "donation_donorUserId_idx" ON "donation"("donorUserId");

-- CreateIndex
CREATE INDEX "donation_status_createdAt_idx" ON "donation"("status", "createdAt");

-- CreateIndex
CREATE INDEX "vet_hospital_postalCode_idx" ON "vet_hospital"("postalCode");

-- CreateIndex
CREATE INDEX "vet_hospital_city_state_idx" ON "vet_hospital"("city", "state");

-- CreateIndex
CREATE INDEX "vet_hospital_name_idx" ON "vet_hospital"("name");

-- CreateIndex
CREATE INDEX "vet_record_campaignId_idx" ON "vet_record"("campaignId");

-- CreateIndex
CREATE INDEX "vet_record_hospitalId_idx" ON "vet_record"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "funding_source_url_key" ON "funding_source"("url");

-- CreateIndex
CREATE INDEX "funding_source_category_scope_idx" ON "funding_source"("category", "scope");

-- CreateIndex
CREATE INDEX "funding_source_isVerified_idx" ON "funding_source"("isVerified");

-- CreateIndex
CREATE UNIQUE INDEX "promise_to_pay_campaignId_key" ON "promise_to_pay"("campaignId");

-- CreateIndex
CREATE INDEX "promise_to_pay_accepted_idx" ON "promise_to_pay"("accepted");

-- CreateIndex
CREATE INDEX "campaign_review_campaignId_createdAt_idx" ON "campaign_review"("campaignId", "createdAt");

-- CreateIndex
CREATE INDEX "campaign_review_createdAt_idx" ON "campaign_review"("createdAt");
