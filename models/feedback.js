import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            required: true,
            index: true,
        },
        userEmail: { type: String, required: true },
        userName: { type: String, required: true },
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
        category: {
            type: String,
            enum: [
                "General",
                "Website",
                "Checkout",
                "Delivery",
                "Support",
                "Other",
            ],
            default: "General",
        },
        title: { type: String, default: "", trim: true },
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
        date: { type: Date, required: true, default: Date.now },
    },
    { timestamps: true }
);

// One feedback per user (site-wide, not per product)
feedbackSchema.index({ userId: 1 }, { unique: true });
feedbackSchema.index({ date: -1 });
feedbackSchema.index({ status: 1 });

const Feedback = mongoose.model("feedback", feedbackSchema);

export default Feedback;