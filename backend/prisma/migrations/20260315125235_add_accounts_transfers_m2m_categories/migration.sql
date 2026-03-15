-- CreateTable
CREATE TABLE `asset_master` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `quantity` DOUBLE NOT NULL,
    `price` DOUBLE NOT NULL,
    `value` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `category_master` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `parentId` INTEGER NULL,

    INDEX `Category_parentId_fkey`(`parentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `account_master` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('CASH', 'BANK', 'CREDIT') NOT NULL,
    `balance` DOUBLE NOT NULL DEFAULT 0,
    `creditLimit` DOUBLE NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transfer_data_master` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATETIME(3) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `fromAccountId` INTEGER NOT NULL,
    `toAccountId` INTEGER NOT NULL,
    `remarks` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `transfer_data_master_fromAccountId_idx`(`fromAccountId`),
    INDEX `transfer_data_master_toAccountId_idx`(`toAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `emi_payment_data` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `loanId` INTEGER NOT NULL,
    `paymentDate` DATETIME(3) NOT NULL,
    `principalAmount` DOUBLE NOT NULL,
    `interestAmount` DOUBLE NOT NULL,
    `totalAmount` DOUBLE NOT NULL,
    `paymentMethod` ENUM('cash', 'bank_transfer', 'upi', 'cheque', 'other') NOT NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `futurePaymentId` INTEGER NULL,

    UNIQUE INDEX `futurePaymentId`(`futurePaymentId`),
    INDEX `EmiPayment_loanId_fkey`(`loanId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `expenses_data_master` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATETIME(3) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `remarks` VARCHAR(191) NULL,
    `accountId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `emiPaymentId` INTEGER NULL,

    INDEX `expenses_data_master_accountId_idx`(`accountId`),
    INDEX `fk_expense_emiPayment`(`emiPaymentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `expense_category_mapping` (
    `expenseId` INTEGER NOT NULL,
    `categoryId` INTEGER NOT NULL,

    INDEX `expense_category_mapping_expenseId_idx`(`expenseId`),
    INDEX `expense_category_mapping_categoryId_idx`(`categoryId`),
    PRIMARY KEY (`expenseId`, `categoryId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `future_payment_data_master` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `loanId` INTEGER NOT NULL,
    `plannedDate` DATETIME(3) NOT NULL,
    `principalAmount` DOUBLE NOT NULL,
    `interestAmount` DOUBLE NOT NULL,
    `totalAmount` DOUBLE NOT NULL,
    `status` ENUM('pending', 'completed', 'cancelled') NOT NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `emiPaymentId` INTEGER NULL,

    INDEX `FuturePayment_loanId_fkey`(`loanId`),
    INDEX `fk_futurePayment_emiPayment`(`emiPaymentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `loans_master` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `borrowerId` INTEGER NULL,
    `dueDate` DATETIME(3) NULL,
    `status` ENUM('active', 'closed', 'defaulted') NOT NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `initialAmount` DOUBLE NOT NULL,
    `interestRate` DOUBLE NOT NULL,
    `loanDate` DATE NOT NULL,
    `totalAmount` DOUBLE NOT NULL,

    INDEX `fk_loans_borrower`(`borrowerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `borrower_master` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `borrowerName` VARCHAR(191) NOT NULL,
    `borrowerContact` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `category_master` ADD CONSTRAINT `Category_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `category_master`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transfer_data_master` ADD CONSTRAINT `transfer_data_master_fromAccountId_fkey` FOREIGN KEY (`fromAccountId`) REFERENCES `account_master`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transfer_data_master` ADD CONSTRAINT `transfer_data_master_toAccountId_fkey` FOREIGN KEY (`toAccountId`) REFERENCES `account_master`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emi_payment_data` ADD CONSTRAINT `EmiPayment_loanId_fkey` FOREIGN KEY (`loanId`) REFERENCES `loans_master`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emi_payment_data` ADD CONSTRAINT `fk_emiPayment_futurePayment` FOREIGN KEY (`futurePaymentId`) REFERENCES `future_payment_data_master`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expenses_data_master` ADD CONSTRAINT `expenses_data_master_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `account_master`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expenses_data_master` ADD CONSTRAINT `fk_expense_emiPayment` FOREIGN KEY (`emiPaymentId`) REFERENCES `emi_payment_data`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expense_category_mapping` ADD CONSTRAINT `expense_category_mapping_expenseId_fkey` FOREIGN KEY (`expenseId`) REFERENCES `expenses_data_master`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expense_category_mapping` ADD CONSTRAINT `expense_category_mapping_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `category_master`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `future_payment_data_master` ADD CONSTRAINT `FuturePayment_loanId_fkey` FOREIGN KEY (`loanId`) REFERENCES `loans_master`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `future_payment_data_master` ADD CONSTRAINT `fk_futurePayment_emiPayment` FOREIGN KEY (`emiPaymentId`) REFERENCES `emi_payment_data`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loans_master` ADD CONSTRAINT `fk_loans_borrower` FOREIGN KEY (`borrowerId`) REFERENCES `borrower_master`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
