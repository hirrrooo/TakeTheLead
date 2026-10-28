-- AlterTable
ALTER TABLE "donation" ADD COLUMN "isMessagePrivate" BOOLEAN NOT NULL DEFAULT false;

-- Messages written before this column existed were only ever shown to the
-- campaign owner. Keep them private so nothing becomes public retroactively.
UPDATE "donation" SET "isMessagePrivate" = true WHERE "message" IS NOT NULL;
