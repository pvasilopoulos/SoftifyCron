-- AlterTable
ALTER TABLE `Tenant`
    ADD COLUMN `defaultNotifyEmailOn` VARCHAR(120) NOT NULL DEFAULT 'failure,timeout,blocked,pause,recovery',
    ADD COLUMN `defaultNotifyTelegramOn` VARCHAR(120) NOT NULL DEFAULT 'failure,timeout,blocked,pause,recovery',
    ADD COLUMN `defaultNotifyWebhookOn` VARCHAR(120) NOT NULL DEFAULT 'failure,timeout,blocked,pause';
