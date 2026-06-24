import { body } from "express-validator";

export const registerValidator = [
    body("email")
        .trim()
        .isEmail()
        .withMessage("Please enter a valid email address.")
        .normalizeEmail(),

    body("password")
        .isLength({ min: 8 })
        .withMessage("Password must be at least 8 characters long."),

    body("confirmPassword").custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error("Password and confirm password do not match.");
        }

        return true;
    }),
];

export const loginValidator = [
    body("email")
        .trim()
        .isEmail()
        .withMessage("Please enter a valid email address.")
        .normalizeEmail(),

    body("password").notEmpty().withMessage("Password is required."),
];

export const completeProfileValidator = [
    body("name")
        .trim()
        .isLength({ min: 2 })
        .withMessage("Name must be at least 2 characters long."),

    body("businessName")
        .trim()
        .isLength({ min: 2 })
        .withMessage("Business name must be at least 2 characters long."),

    body("sellOnAmazon")
        .isBoolean()
        .withMessage("Please specify whether you sell on Amazon."),

    body("sellOnFlipkart")
        .isBoolean()
        .withMessage("Please specify whether you sell on Flipkart."),
];