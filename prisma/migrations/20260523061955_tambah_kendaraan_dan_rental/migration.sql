/*
  Warnings:

  - The values [BICYCLE,BUS] on the enum `Vehicle_type` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `vehicle` MODIFY `type` ENUM('CAR', 'MOTORCYCLE') NOT NULL;
