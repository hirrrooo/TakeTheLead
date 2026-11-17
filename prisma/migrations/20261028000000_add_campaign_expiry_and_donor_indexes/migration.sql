-- CreateIndex
CREATE INDEX "campaign_status_deadline_idx" ON "campaign"("status", "deadline");

-- CreateIndex
CREATE INDEX "donation_campaignId_status_completedAt_idx" ON "donation"("campaignId", "status", "completedAt");
