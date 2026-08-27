-- CreateTable
CREATE TABLE `PortalClient` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(500) NOT NULL DEFAULT '',
    `logoUrl` VARCHAR(2048) NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `tokenPrefix` VARCHAR(16) NOT NULL,
    `sessionEpoch` INTEGER NOT NULL DEFAULT 0,
    `lastSeenAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PortalClient_tokenHash_key` (`tokenHash`),
    INDEX `PortalClient_tenantId_idx` (`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PortalClientGroup` (
    `clientId` VARCHAR(191) NOT NULL,
    `groupId` VARCHAR(191) NOT NULL,

    INDEX `PortalClientGroup_groupId_idx` (`groupId`),
    PRIMARY KEY (`clientId`, `groupId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PortalClient` ADD CONSTRAINT `PortalClient_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PortalClientGroup` ADD CONSTRAINT `PortalClientGroup_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `PortalClient`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PortalClientGroup` ADD CONSTRAINT `PortalClientGroup_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `JobGroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
