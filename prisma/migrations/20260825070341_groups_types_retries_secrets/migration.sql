-- AlterTable
ALTER TABLE `CronJob` ADD COLUMN `consecutiveFailures` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `groupId` VARCHAR(191) NULL,
    ADD COLUMN `lastStatus` ENUM('PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'TIMEOUT', 'BLOCKED') NULL,
    ADD COLUMN `notifyUrl` VARCHAR(2048) NULL,
    ADD COLUMN `retryDelaySec` INTEGER NOT NULL DEFAULT 60,
    ADD COLUMN `retryMax` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `tags` VARCHAR(500) NOT NULL DEFAULT '',
    ADD COLUMN `type` ENUM('HTTP', 'HEARTBEAT', 'WEBHOOK') NOT NULL DEFAULT 'HTTP';

-- AlterTable
ALTER TABLE `JobRun` MODIFY `trigger` ENUM('SCHEDULE', 'MANUAL', 'RETRY') NOT NULL DEFAULT 'SCHEDULE';

-- CreateTable
CREATE TABLE `JobGroup` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `color` VARCHAR(191) NOT NULL DEFAULT '#7dffce',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `JobGroup_tenantId_idx`(`tenantId`),
    UNIQUE INDEX `JobGroup_tenantId_slug_key`(`tenantId`, `slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Secret` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `valueEnc` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Secret_tenantId_idx`(`tenantId`),
    UNIQUE INDEX `Secret_tenantId_key_key`(`tenantId`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Invite` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `role` ENUM('OWNER', 'ADMIN', 'MEMBER') NOT NULL DEFAULT 'MEMBER',
    `tokenHash` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `acceptedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Invite_tokenHash_key`(`tokenHash`),
    INDEX `Invite_tenantId_email_idx`(`tenantId`, `email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `CronJob_tenantId_groupId_idx` ON `CronJob`(`tenantId`, `groupId`);

-- CreateIndex
CREATE INDEX `CronJob_tenantId_type_idx` ON `CronJob`(`tenantId`, `type`);

-- CreateIndex
CREATE INDEX `JobRun_tenantId_status_idx` ON `JobRun`(`tenantId`, `status`);

-- AddForeignKey
ALTER TABLE `JobGroup` ADD CONSTRAINT `JobGroup_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CronJob` ADD CONSTRAINT `CronJob_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `JobGroup`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Secret` ADD CONSTRAINT `Secret_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invite` ADD CONSTRAINT `Invite_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
