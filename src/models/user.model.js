import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },

        password: {
            type: String,
            required: true,
            minlength: 8,
            select: false,
        },

        name: {
            type: String,
            trim: true,
            default: "",
        },

        businessName: {
            type: String,
            trim: true,
            default: "",
        },

        marketplaces: {
            amazon: {
                type: Boolean,
                default: false,
            },
            flipkart: {
                type: Boolean,
                default: false,
            },
        },

        isProfileComplete: {
            type: Boolean,
            default: false,
        },

        lastLoginAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    },
);

userSchema.pre("save", async function hashPassword() {
    if (!this.isModified("password")) {
        return;
    }

    this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toSafeObject = function toSafeObject() {
    return {
        id: this._id,
        email: this.email,
        name: this.name,
        businessName: this.businessName,
        marketplaces: this.marketplaces,
        isProfileComplete: this.isProfileComplete,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
    };
};

export const User = mongoose.model("User", userSchema);