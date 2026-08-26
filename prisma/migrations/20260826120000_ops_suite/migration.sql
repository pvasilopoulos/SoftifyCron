-- AlterTable
ALTER TABLE `CronJob` MODIFY `type` ENUM('HTTP', 'HEARTBEAT', 'WEBHOOK', 'TCP', 'DNS', 'TLS') NOT NULL DEFAULT 'HTTP';

-- AlterTable
ALTER TABLE `CronJob`
    ADD COLUMN `notifyDiscordOn` VARCHAR(120) NOT NULL DEFAULT '',
    ADD COLUMN `notifySmsOn` VARCHAR(120) NOT NULL DEFAULT '',
    ADD COLUMN `hookTokenHash` VARCHAR(191) NULL,
    ADD COLUMN `hookTokenPrefix` VARCHAR(16) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `CronJob_hookTokenHash_key` ON `CronJob`(`hookTokenHash`);

-- AlterTable
ALTER TABLE `Tenant`
    ADD COLUMN `discordWebhookEnc` TEXT NULL,
    ADD COLUMN `defaultNotifyDiscordOn` VARCHAR(120) NOT NULL DEFAULT 'failure,timeout,blocked,pause,recovery',
    ADD COLUMN `smsUrl` VARCHAR(2048) NULL,
    ADD COLUMN `smsUser` VARCHAR(160) NULL,
    ADD COLUMN `smsPassEnc` TEXT NULL,
    ADD COLUMN `smsFrom` VARCHAR(40) NULL,
    ADD COLUMN `smsTo` TEXT NULL,
    ADD COLUMN `defaultNotifySmsOn` VARCHAR(120) NOT NULL DEFAULT 'failure,timeout,blocked,pause,missed,escalate,slo';

-- CreateTable
CREATE TABLE `PushSubscription` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `endpoint` TEXT NOT NULL,
    `endpointHash` VARCHAR(64) NOT NULL,
    `p256dh` VARCHAR(255) NOT NULL,
    `auth` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PushSubscription_tenantId_idx` (`tenantId`),
    UNIQUE INDEX `PushSubscription_userId_endpointHash_key` (`userId`, `endpointHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AppMeta` (
    `id` VARCHAR(191) NOT NULL,
    `vapidPublic` TEXT NOT NULL,
    `vapidPrivateEnc` TEXT NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PushSubscription` ADD CONSTRAINT `PushSubscription_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PushSubscription` ADD CONSTRAINT `PushSubscription_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
