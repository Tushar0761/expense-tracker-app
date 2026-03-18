-- DropForeignKey
ALTER TABLE `expense_category_mapping` DROP FOREIGN KEY `expense_category_mapping_categoryId_fkey`;

-- DropForeignKey
ALTER TABLE `expense_category_mapping` DROP FOREIGN KEY `expense_category_mapping_expenseId_fkey`;

-- AlterTable
ALTER TABLE `expenses_data_master` ADD COLUMN `categoryId` INTEGER NOT NULL;
-- DropTable
DROP TABLE `expense_category_mapping`;

-- CreateTable
CREATE TABLE `account_balance_adjustment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `accountId` INTEGER NOT NULL,
    `amount` DOUBLE NOT NULL,
    `reason` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `account_balance_adjustment_accountId_idx`(`accountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `expenses_data_master_categoryId_idx` ON `expenses_data_master`(`categoryId`);

-- AddForeignKey
ALTER TABLE `expenses_data_master` ADD CONSTRAINT `expenses_data_master_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `category_master`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `account_balance_adjustment` ADD CONSTRAINT `account_balance_adjustment_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `account_master`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

