-- AlterTable
ALTER TABLE `CronJob`
    ADD COLUMN `telegramTemplateId` VARCHAR(191) NULL,
    ADD COLUMN `telegramNote` VARCHAR(500) NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE `NotifyTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `body` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `NotifyTemplate_tenantId_idx` (`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `CronJob_telegramTemplateId_idx` ON `CronJob`(`telegramTemplateId`);

-- AddForeignKey
ALTER TABLE `NotifyTemplate` ADD CONSTRAINT `NotifyTemplate_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CronJob` ADD CONSTRAINT `CronJob_telegramTemplateId_fkey` FOREIGN KEY (`telegramTemplateId`) REFERENCES `NotifyTemplate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
