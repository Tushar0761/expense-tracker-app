-- AlterTable
ALTER TABLE `category_master` ADD COLUMN `spendType` ENUM('FIXED', 'DISCRETIONARY') NOT NULL DEFAULT 'DISCRETIONARY';

-- AlterTable
ALTER TABLE `expenses_data_master` ADD COLUMN `spendType` ENUM('FIXED', 'DISCRETIONARY') NULL;
