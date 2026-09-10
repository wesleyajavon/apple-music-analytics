-- Duet share on/off: migrate aggregates → full (aggregates enum value kept for compatibility)
UPDATE "Friendship" SET "shareScope" = 'full' WHERE "shareScope" = 'aggregates';
UPDATE "DuetShareSettings" SET "defaultShareScope" = 'full' WHERE "defaultShareScope" = 'aggregates';

-- Change default for new settings rows
ALTER TABLE "DuetShareSettings" ALTER COLUMN "defaultShareScope" SET DEFAULT 'full';
