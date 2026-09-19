import Wishlist from "../models/wishlist.js";
import Product from "../models/product.js";
import User from "../models/user.js";

/* ================= GET MY WISHLIST ================= */
export async function getMyWishlist(req, res) {
    if (req.user == null) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    try {
        const user = await User.findOne({ email: req.user.email });
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        const wishlist = await Wishlist.findOne({ userId: user._id });

        if (!wishlist) {
            res.json({ products: [], productIds: [] });
            return;
        }

        // Enrich with full product details
        const productIds = wishlist.products.map((p) => p.productId);
        const products = await Product.find({
            productId: { $in: productIds },
        });

        res.json({
            productIds,
            products,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

/* ================= TOGGLE PRODUCT IN WISHLIST ================= */
export async function toggleWishlistItem(req, res) {
    if (req.user == null) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    try {
        const { productId } = req.params;

        const product = await Product.findOne({ productId });
        if (!product) {
            res.status(404).json({ message: "Product not found" });
            return;
        }

        const user = await User.findOne({ email: req.user.email });
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        let wishlist = await Wishlist.findOne({ userId: user._id });

        if (!wishlist) {
            wishlist = await Wishlist.create({
                userId: user._id,
                userEmail: user.email,
                products: [{ productId }],
            });

            res.json({
                message: "Added to wishlist",
                isWishlisted: true,
            });
            return;
        }

        const existingIdx = wishlist.products.findIndex(
            (p) => p.productId === productId
        );

        if (existingIdx > -1) {
            wishlist.products.splice(existingIdx, 1);
            await wishlist.save();
            res.json({
                message: "Removed from wishlist",
                isWishlisted: false,
            });
        } else {
            wishlist.products.push({ productId });
            await wishlist.save();
            res.json({
                message: "Added to wishlist",
                isWishlisted: true,
            });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

/* ================= REMOVE FROM WISHLIST ================= */
export async function removeFromWishlist(req, res) {
    if (req.user == null) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    try {
        const { productId } = req.params;

        const user = await User.findOne({ email: req.user.email });
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        const wishlist = await Wishlist.findOne({ userId: user._id });
        if (!wishlist) {
            res.status(404).json({ message: "Wishlist not found" });
            return;
        }

        wishlist.products = wishlist.products.filter(
            (p) => p.productId !== productId
        );
        await wishlist.save();

        res.json({ message: "Removed from wishlist" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

/* ================= CHECK IF PRODUCT IS WISHLISTED ================= */
export async function checkWishlistStatus(req, res) {
    if (req.user == null) {
        res.json({ isWishlisted: false });
        return;
    }

    try {
        const { productId } = req.params;

        const user = await User.findOne({ email: req.user.email });
        if (!user) {
            res.json({ isWishlisted: false });
            return;
        }

        const wishlist = await Wishlist.findOne({ userId: user._id });
        const isWishlisted =
            wishlist?.products.some((p) => p.productId === productId) || false;

        res.json({ isWishlisted });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}