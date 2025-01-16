/*
  Warnings:

  - A unique constraint covering the columns `[shop_url]` on the table `ApiData` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ApiData_shop_url_key" ON "ApiData"("shop_url");
