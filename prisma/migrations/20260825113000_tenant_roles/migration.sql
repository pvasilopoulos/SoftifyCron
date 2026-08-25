-- CreateTable
CREATE TABLE `TenantRole` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(240) NOT NULL DEFAULT '',
    `permissions` VARCHAR(500) NOT NULL DEFAULT '',
    `system` BOOLEAN NOT NULL DEFAULT false,
    `locked` BOOLEAN NOT NULL DEFAULT false,
    `sortOrder` INTEGER NOT NULL DEFAULT 100,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TenantRole_tenantId_idx`(`tenantId`),
    UNIQUE INDEX `TenantRole_tenantId_key_key`(`tenantId`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `Membership` ADD COLUMN `roleId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Invite` ADD COLUMN `roleId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Membership_roleId_idx` ON `Membership`(`roleId`);

-- CreateIndex
CREATE INDEX `Invite_roleId_idx` ON `Invite`(`roleId`);

-- AddForeignKey
ALTER TABLE `TenantRole` ADD CONSTRAINT `TenantRole_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Membership` ADD CONSTRAINT `Membership_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `TenantRole`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invite` ADD CONSTRAINT `Invite_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `TenantRole`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
