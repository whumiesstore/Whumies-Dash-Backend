import { body, param } from "express-validator";

export const firmIdValidator = [
    param("firmId").isMongoId().withMessage("Invalid firm ID."),
];

export const createFirmValidator = [
    body("firmName")
        .trim()
        .isLength({ min: 2 })
        .withMessage("Firm name must be at least 2 characters long."),

    body("isPrimary")
        .optional()
        .isBoolean()
        .withMessage("Primary firm status must be true or false."),
];

export const updateFirmValidator = [
    param("firmId").isMongoId().withMessage("Invalid firm ID."),

    body("firmName")
        .optional()
        .trim()
        .isLength({ min: 2 })
        .withMessage("Firm name must be at least 2 characters long."),

    body("isPrimary")
        .optional()
        .isBoolean()
        .withMessage("Primary firm status must be true or false."),
];