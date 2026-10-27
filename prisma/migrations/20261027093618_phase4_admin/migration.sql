-- AlterTable
ALTER TABLE "StockNotification" ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'ar';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "failedLogins" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lockedUntil" TIMESTAMP(3);
