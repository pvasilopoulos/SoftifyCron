-- AlterTable
ALTER TABLE `Tenant`
    ADD COLUMN `oncallEnabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `oncallRoster` VARCHAR(2000) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `CronJob`
    ADD COLUMN `gridWatches` JSON NULL,
    ADD COLUMN `onceAt` DATETIME(3) NULL,
    ADD COLUMN `sloFailPerDay` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `JobRun` MODIFY `trigger` ENUM('SCHEDULE', 'MANUAL', 'RETRY', 'ONCE') NOT NULL DEFAULT 'SCHEDULE';

-- CreateIndex
CREATE INDEX `CronJob_onceAt_idx` ON `CronJob`(`onceAt`);

-- CreateTable
CREATE TABLE `StatusSubscriber` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `email` VARCHAR(190) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `confirmedAt` DATETIME(3) NULL,
    `lastAlertDate` VARCHAR(10) NOT NULL DEFAULT '',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `StatusSubscriber_token_key`(`token`),
    INDEX `StatusSubscriber_tenantId_idx`(`tenantId`),
    UNIQUE INDEX `StatusSubscriber_tenantId_email_key`(`tenantId`, `email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JobRevision` (
    `id` VARCHAR(191) NOT NULL,
    `jobId` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `actor` VARCHAR(190) NOT NULL,
    `snapshot` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `JobRevision_jobId_createdAt_idx`(`jobId`, `createdAt`),
    INDEX `JobRevision_tenantId_createdAt_idx`(`tenantId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `StatusSubscriber` ADD CONSTRAINT `StatusSubscriber_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JobRevision` ADD CONSTRAINT `JobRevision_jobId_fkey` FOREIGN KEY (`jobId`) REFERENCES `CronJob`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
