-- AlterTable
ALTER TABLE `CronJob` MODIFY `type` ENUM('HTTP', 'HEARTBEAT', 'WEBHOOK', 'TCP', 'DNS', 'TLS', 'DOMAIN') NOT NULL DEFAULT 'HTTP';

-- AlterTable
ALTER TABLE `Tenant`
    ADD COLUMN `capJobs` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `capRunsMonth` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `statusLogoUrl` VARCHAR(2048) NULL,
    ADD COLUMN `statusCustomHost` VARCHAR(255) NULL,
    ADD COLUMN `loginAllowIps` TEXT NULL,
    ADD COLUMN `portalTokenHash` VARCHAR(191) NULL,
    ADD COLUMN `portalTokenPrefix` VARCHAR(16) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Tenant_statusCustomHost_key` ON `Tenant`(`statusCustomHost`);

-- CreateIndex
CREATE UNIQUE INDEX `Tenant_portalTokenHash_key` ON `Tenant`(`portalTokenHash`);

-- AlterTable
ALTER TABLE `User`
    ADD COLUMN `totpRecoveryEnc` TEXT NULL,
    ADD COLUMN `sessionEpoch` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `CronJob`
    ADD COLUMN `hookHmac` VARCHAR(16) NOT NULL DEFAULT '',
    ADD COLUMN `assigneeEmail` VARCHAR(190) NOT NULL DEFAULT '',
    ADD COLUMN `configLocked` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `authUrl` VARCHAR(2048) NOT NULL DEFAULT '',
    ADD COLUMN `authBody` TEXT NULL,
    ADD COLUMN `extraHosts` TEXT NULL,
    ADD COLUMN `assertFinalUrl` VARCHAR(2048) NOT NULL DEFAULT '',
    ADD COLUMN `assertJsonSchema` TEXT NULL,
    ADD COLUMN `goldenBody` LONGTEXT NULL,
    ADD COLUMN `flapScore` INTEGER NOT NULL DEFAULT 0;

UPDATE `CronJob` SET
    `authBody` = '',
    `extraHosts` = '',
    `assertJsonSchema` = '',
    `goldenBody` = ''
WHERE `authBody` IS NULL OR `extraHosts` IS NULL OR `assertJsonSchema` IS NULL OR `goldenBody` IS NULL;

ALTER TABLE `CronJob`
    MODIFY `authBody` TEXT NOT NULL,
    MODIFY `extraHosts` TEXT NOT NULL,
    MODIFY `assertJsonSchema` TEXT NOT NULL,
    MODIFY `goldenBody` LONGTEXT NOT NULL;

-- AlterTable
ALTER TABLE `JobRun`
    ADD COLUMN `dnsMs` INTEGER NULL,
    ADD COLUMN `connectMs` INTEGER NULL,
    ADD COLUMN `ttfbMs` INTEGER NULL,
    ADD COLUMN `finalUrl` VARCHAR(2048) NULL,
    ADD COLUMN `silent` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `Incident` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `jobId` VARCHAR(191) NOT NULL,
    `openedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `closedAt` DATETIME(3) NULL,
    `openedByRunId` VARCHAR(191) NOT NULL DEFAULT '',
    `closedByRunId` VARCHAR(191) NOT NULL DEFAULT '',
    `assigneeEmail` VARCHAR(190) NOT NULL DEFAULT '',
    `note` TEXT NOT NULL,

    INDEX `Incident_tenantId_closedAt_idx` (`tenantId`, `closedAt`),
    INDEX `Incident_jobId_closedAt_idx` (`jobId`, `closedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JobLibrary` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL DEFAULT '',
    `snapshot` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `JobLibrary_tenantId_idx` (`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Incident` ADD CONSTRAINT `Incident_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Incident` ADD CONSTRAINT `Incident_jobId_fkey` FOREIGN KEY (`jobId`) REFERENCES `CronJob`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JobLibrary` ADD CONSTRAINT `JobLibrary_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
