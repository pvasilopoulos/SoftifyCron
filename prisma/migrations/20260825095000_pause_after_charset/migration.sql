-- AlterTable
ALTER TABLE `CronJob` ADD COLUMN `pauseAfter` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `JobRun` ADD COLUMN `responseCharset` VARCHAR(40) NULL;
