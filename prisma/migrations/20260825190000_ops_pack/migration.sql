-- AlterTable
ALTER TABLE `Tenant`
    ADD COLUMN `runRetentionDays` INTEGER NOT NULL DEFAULT 30,
    ADD COLUMN `bodyKeepLast` INTEGER NOT NULL DEFAULT 20,
    ADD COLUMN `maxConcurrent` INTEGER NOT NULL DEFAULT 4,
    ADD COLUMN `catchUpMissed` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `skipGreekHolidays` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `escalateEmail` TEXT NULL,
    ADD COLUMN `escalateAfter` INTEGER NOT NULL DEFAULT 3,
    ADD COLUMN `statusPageEnabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `statusPageSlug` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `CronJob`
    ADD COLUMN `snoozeUntil` DATETIME(3) NULL,
    ADD COLUMN `followUpJobId` VARCHAR(191) NULL,
    ADD COLUMN `dependsOnJobId` VARCHAR(191) NULL,
    ADD COLUMN `assertStatus` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `assertJsonPath` VARCHAR(240) NOT NULL DEFAULT '',
    ADD COLUMN `assertEquals` VARCHAR(500) NOT NULL DEFAULT '',
    ADD COLUMN `assertContains` VARCHAR(500) NOT NULL DEFAULT '',
    ADD COLUMN `slowAfterMs` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `skipHolidays` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `skipWeekends` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `activeHoursStart` VARCHAR(5) NOT NULL DEFAULT '',
    ADD COLUMN `activeHoursEnd` VARCHAR(5) NOT NULL DEFAULT '';

-- CreateIndex
CREATE UNIQUE INDEX `Tenant_statusPageSlug_key` ON `Tenant`(`statusPageSlug`);
