import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
    {
        productId: {
            type: String,
            required: true,
            index: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            required: true,
            index: true,
        },
        userEmail: {
            type: String,
            required: true,
        },
        userName: {
            type: String,
            required: true,
        },
        userImage: {
            type: String,
            default: "/default-profile.png",
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },
        title: {
            type: String,
            default: "",
            trim: true,
        },
        comment: {
            type: String,
            required: true,
            trim: true,
            maxlength: 2000,
        },
        adminReply: {
            body: { type: String, default: "" },
            repliedAt: { type: Date },
            repliedBy: { type: String, default: "" },
        },
        status: {
            type: String,
            enum: ["Published", "Flagged"],
            default: "Published",
        },
        date: {
            type: Date,
            required: true,
            default: Date.now,
        },
    },
    { timestamps: true }
);

// One review per user per product
reviewSchema.index({ productId: 1, userId: 1 }, { unique: true });

const Review = mongoose.model("review", reviewSchema);

export default Review;