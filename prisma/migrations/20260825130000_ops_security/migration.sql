-- AlterTable
ALTER TABLE `Tenant` ADD COLUMN `notifyEmail` VARCHAR(160) NULL;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `totpEnabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `totpSecretEnc` TEXT NULL;

-- CreateTable
CREATE TABLE `PasswordReset` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PasswordReset_tokenHash_key`(`tokenHash`),
    INDEX `PasswordReset_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ApiToken` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `prefix` VARCHAR(191) NOT NULL,
    `lastUsedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ApiToken_tokenHash_key`(`tokenHash`),
    INDEX `ApiToken_tenantId_idx`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditEvent` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NULL,
    `actorId` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `target` VARCHAR(191) NULL,
    `meta` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditEvent_tenantId_createdAt_idx`(`tenantId`, `createdAt`),
    INDEX `AuditEvent_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WorkerHeartbeat` (
    `id` VARCHAR(191) NOT NULL,
    `tickedAt` DATETIME(3) NOT NULL,
    `hostname` VARCHAR(191) NULL,
    `jobsClaimed` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PasswordReset` ADD CONSTRAINT `PasswordReset_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ApiToken` ADD CONSTRAINT `ApiToken_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditEvent` ADD CONSTRAINT `AuditEvent_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditEvent` ADD CONSTRAINT `AuditEvent_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
