-- CreateTable
CREATE TABLE `budget_setting` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `discretionaryBudget` DOUBLE NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4;
