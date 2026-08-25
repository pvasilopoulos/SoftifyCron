-- AlterTable
ALTER TABLE `Tenant`
    ADD COLUMN `smtpHost` VARCHAR(255) NULL,
    ADD COLUMN `smtpPort` INTEGER NOT NULL DEFAULT 587,
    ADD COLUMN `smtpSecure` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `smtpUser` VARCHAR(160) NULL,
    ADD COLUMN `smtpPassEnc` TEXT NULL,
    ADD COLUMN `smtpFrom` VARCHAR(190) NULL,
    ADD COLUMN `telegramBotTokenEnc` TEXT NULL,
    ADD COLUMN `telegramChatId` VARCHAR(80) NULL;

-- AlterTable
ALTER TABLE `CronJob`
    ADD COLUMN `notifyEmailOn` VARCHAR(120) NOT NULL DEFAULT 'failure,timeout,blocked,pause,recovery',
    ADD COLUMN `notifyTelegramOn` VARCHAR(120) NOT NULL DEFAULT '',
    ADD COLUMN `notifyWebhookOn` VARCHAR(120) NOT NULL DEFAULT 'failure,timeout,blocked,pause';
