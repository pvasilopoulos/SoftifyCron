-- AlterTable
ALTER TABLE `Tenant`
    MODIFY `notifyEmail` TEXT NULL,
    MODIFY `telegramChatId` TEXT NULL,
    ADD COLUMN `slackWebhookEnc` TEXT NULL,
    ADD COLUMN `webhookSignEnc` TEXT NULL,
    ADD COLUMN `defaultNotifySlackOn` VARCHAR(120) NOT NULL DEFAULT 'failure,timeout,blocked,pause,recovery',
    ADD COLUMN `quietHoursStart` VARCHAR(5) NOT NULL DEFAULT '',
    ADD COLUMN `quietHoursEnd` VARCHAR(5) NOT NULL DEFAULT '',
    ADD COLUMN `quietHoursAllow` VARCHAR(120) NOT NULL DEFAULT 'failure,timeout,blocked,pause,missed',
    ADD COLUMN `notifyCooldownSec` INTEGER NOT NULL DEFAULT 300;

-- AlterTable
ALTER TABLE `CronJob`
    ADD COLUMN `notifySlackOn` VARCHAR(120) NOT NULL DEFAULT '',
    ADD COLUMN `lastHeartbeatAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `NotifyDelivery` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `jobId` VARCHAR(191) NOT NULL,
    `runId` VARCHAR(191) NULL,
    `channel` VARCHAR(20) NOT NULL,
    `event` VARCHAR(80) NOT NULL,
    `status` VARCHAR(20) NOT NULL,
    `detail` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `NotifyDelivery_tenantId_createdAt_idx`(`tenantId`, `createdAt`),
    INDEX `NotifyDelivery_jobId_createdAt_idx`(`jobId`, `createdAt`),
    INDEX `NotifyDelivery_jobId_channel_createdAt_idx`(`jobId`, `channel`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `NotifyDelivery` ADD CONSTRAINT `NotifyDelivery_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NotifyDelivery` ADD CONSTRAINT `NotifyDelivery_jobId_fkey` FOREIGN KEY (`jobId`) REFERENCES `CronJob`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
