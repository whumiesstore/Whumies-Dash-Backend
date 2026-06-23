export const MARKETPLACES = {
    AMAZON: "amazon",
    FLIPKART: "flipkart",
};

export const REPORT_TYPES = {
    ORDERS: "orders",
    PAYMENTS: "payments",
    PAYMENT_FILE_1: "payment-file-1",
    PAYMENT_FILE_2: "payment-file-2",
    ADS: "ads",
};

export const ALLOWED_UPLOADS = {
    amazon: {
        orders: [".txt"],
        payments: [".csv"],
    },
    flipkart: {
        orders: [".xlsx", ".xls"],
        "payment-file-1": [".xlsx", ".xls"],
        "payment-file-2": [".xlsx", ".xls"],
        ads: [".csv"],
    },
};