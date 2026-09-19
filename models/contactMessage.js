import mongoose from "mongoose";

const replySchema = new mongoose.Schema(
    {
        subject: {
            type: String,
            required: true,
        },
        body: {
            type: String,
            required: true,
        },
        sentAt: {
            type: Date,
            required: true,
            default: Date.now,
        },
        sentBy: {
            type: String,
            required: true, // admin email
        },
    },
    { _id: true }
);

const contactMessageSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },
        subject: {
            type: String,
            required: false,
            default: "",
            trim: true,
        },
        message: {
            type: String,
            required: true,
            trim: true,
        },
        status: {
            type: String,
            required: true,
            default: "New",
            enum: ["New", "Read", "Replied", "Closed"],
        },
        replies: {
            type: [replySchema],
            default: [],
        },
        date: {
            type: Date,
            required: true,
            default: Date.now,
        },
    },
    { timestamps: true }
);

// Index for faster sorting/filtering
contactMessageSchema.index({ date: -1 });
contactMessageSchema.index({ status: 1 });

const ContactMessage = mongoose.model("contactMessage", contactMessageSchema);

export default ContactMessage;