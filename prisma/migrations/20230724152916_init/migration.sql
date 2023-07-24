/*
  Warnings:

  - You are about to alter the column `end` on the `Interval` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.
  - You are about to alter the column `start` on the `Interval` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.
  - You are about to alter the column `start` on the `Running` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Interval" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "start" BIGINT NOT NULL,
    "end" BIGINT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Interval_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Interval" ("end", "id", "start", "title", "userId") SELECT "end", "id", "start", "title", "userId" FROM "Interval";
DROP TABLE "Interval";
ALTER TABLE "new_Interval" RENAME TO "Interval";
CREATE TABLE "new_Running" (
    "title" TEXT NOT NULL,
    "start" BIGINT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Running_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Running" ("start", "title", "userId") SELECT "start", "title", "userId" FROM "Running";
DROP TABLE "Running";
ALTER TABLE "new_Running" RENAME TO "Running";
CREATE UNIQUE INDEX "Running_userId_key" ON "Running"("userId");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
