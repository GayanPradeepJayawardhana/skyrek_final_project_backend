import mongoose from "mongoose";

const wishlistSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            required: true,
            unique: true,
            index: true,
        },
        userEmail: {
            type: String,
            required: true,
        },
        products: [
            {
                productId: {
                    type: String,
                    required: true,
                },
                addedAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
    },
    { timestamps: true }
);

const Wishlist = mongoose.model("wishlist", wishlistSchema);

export default Wishlist;