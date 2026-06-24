import { body } from "express-validator";

export const updateProfileValidator = [
    body("name")
        .optional()
        .trim()
        .isLength({ min: 2 })
        .withMessage("Name must be at least 2 characters long."),

    body("businessName")
        .optional()
        .trim()
        .isLength({ min: 2 })
        .withMessage("Business name must be at least 2 characters long."),

    body("sellOnAmazon")
        .optional()
        .isBoolean()
        .withMessage("Amazon selling status must be true or false."),

    body("sellOnFlipkart")
        .optional()
        .isBoolean()
        .withMessage("Flipkart selling status must be true or false."),
];

export const changePasswordValidator = [
    body("currentPassword")
        .notEmpty()
        .withMessage("Current password is required."),

    body("newPassword")
        .isLength({ min: 8 })
        .withMessage("New password must be at least 8 characters long."),

    body("confirmNewPassword").custom((value, { req }) => {
        if (value !== req.body.newPassword) {
            throw new Error("New password and confirm password do not match.");
        }

        return true;
    }),
];