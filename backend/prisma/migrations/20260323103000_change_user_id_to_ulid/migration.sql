ALTER TABLE `tblUser`
    ADD COLUMN `nextId` CHAR(26) NULL;

SET @ulid_chars = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
SET @ulid_timestamp = FLOOR(UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000);

UPDATE `tblUser`
SET `nextId` = CONCAT(
    SUBSTRING(@ulid_chars, FLOOR(@ulid_timestamp / 35184372088832) % 32 + 1, 1),
    SUBSTRING(@ulid_chars, FLOOR(@ulid_timestamp / 1099511627776) % 32 + 1, 1),
    SUBSTRING(@ulid_chars, FLOOR(@ulid_timestamp / 34359738368) % 32 + 1, 1),
    SUBSTRING(@ulid_chars, FLOOR(@ulid_timestamp / 1073741824) % 32 + 1, 1),
    SUBSTRING(@ulid_chars, FLOOR(@ulid_timestamp / 33554432) % 32 + 1, 1),
    SUBSTRING(@ulid_chars, FLOOR(@ulid_timestamp / 1048576) % 32 + 1, 1),
    SUBSTRING(@ulid_chars, FLOOR(@ulid_timestamp / 32768) % 32 + 1, 1),
    SUBSTRING(@ulid_chars, FLOOR(@ulid_timestamp / 1024) % 32 + 1, 1),
    SUBSTRING(@ulid_chars, FLOOR(@ulid_timestamp / 32) % 32 + 1, 1),
    SUBSTRING(@ulid_chars, FLOOR(@ulid_timestamp / 1) % 32 + 1, 1),
    SUBSTRING(@ulid_chars, CONV(HEX(RANDOM_BYTES(1)), 16, 10) % 32 + 1, 1),
    SUBSTRING(@ulid_chars, CONV(HEX(RANDOM_BYTES(1)), 16, 10) % 32 + 1, 1),
    SUBSTRING(@ulid_chars, CONV(HEX(RANDOM_BYTES(1)), 16, 10) % 32 + 1, 1),
    SUBSTRING(@ulid_chars, CONV(HEX(RANDOM_BYTES(1)), 16, 10) % 32 + 1, 1),
    SUBSTRING(@ulid_chars, CONV(HEX(RANDOM_BYTES(1)), 16, 10) % 32 + 1, 1),
    SUBSTRING(@ulid_chars, CONV(HEX(RANDOM_BYTES(1)), 16, 10) % 32 + 1, 1),
    SUBSTRING(@ulid_chars, CONV(HEX(RANDOM_BYTES(1)), 16, 10) % 32 + 1, 1),
    SUBSTRING(@ulid_chars, CONV(HEX(RANDOM_BYTES(1)), 16, 10) % 32 + 1, 1),
    SUBSTRING(@ulid_chars, CONV(HEX(RANDOM_BYTES(1)), 16, 10) % 32 + 1, 1),
    SUBSTRING(@ulid_chars, CONV(HEX(RANDOM_BYTES(1)), 16, 10) % 32 + 1, 1),
    SUBSTRING(@ulid_chars, CONV(HEX(RANDOM_BYTES(1)), 16, 10) % 32 + 1, 1),
    SUBSTRING(@ulid_chars, CONV(HEX(RANDOM_BYTES(1)), 16, 10) % 32 + 1, 1),
    SUBSTRING(@ulid_chars, CONV(HEX(RANDOM_BYTES(1)), 16, 10) % 32 + 1, 1),
    SUBSTRING(@ulid_chars, CONV(HEX(RANDOM_BYTES(1)), 16, 10) % 32 + 1, 1),
    SUBSTRING(@ulid_chars, CONV(HEX(RANDOM_BYTES(1)), 16, 10) % 32 + 1, 1),
    SUBSTRING(@ulid_chars, CONV(HEX(RANDOM_BYTES(1)), 16, 10) % 32 + 1, 1)
)
WHERE `nextId` IS NULL;

ALTER TABLE `tblUser`
    MODIFY `nextId` CHAR(26) NOT NULL,
    ADD UNIQUE INDEX `tblUser_nextId_key`(`nextId`);

ALTER TABLE `tblUser`
    DROP PRIMARY KEY,
    DROP COLUMN `id`;

ALTER TABLE `tblUser`
    CHANGE COLUMN `nextId` `id` CHAR(26) NOT NULL;

ALTER TABLE `tblUser`
    DROP INDEX `tblUser_nextId_key`,
    ADD PRIMARY KEY (`id`);