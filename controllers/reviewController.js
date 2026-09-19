import Review from "../models/review.js";
import Product from "../models/product.js";
import User from "../models/user.js";

/* =========================================================
   HELPERS
   ========================================================= */

// Recompute avgRating + reviewCount on the product
async function recalcProductRating(productId) {
    const stats = await Review.aggregate([
        { $match: { productId, status: "Published" } },
        {
            $group: {
                _id: "$productId",
                avgRating: { $avg: "$rating" },
                reviewCount: { $sum: 1 },
            },
        },
    ]);

    const avgRating = stats[0]?.avgRating || 0;
    const reviewCount = stats[0]?.reviewCount || 0;

    await Product.updateOne(
        { productId },
        {
            $set: {
                avgRating: Math.round(avgRating * 10) / 10,
                reviewCount,
            },
        }
    );

    return { avgRating, reviewCount };
}

/* =========================================================
   PUBLIC / USER: GET REVIEWS FOR A PRODUCT
   ========================================================= */
export async function getProductReviews(req, res) {
    try {
        const { productId } = req.params;
        const pageSize = parseInt(req.params.pageSize || "10");
        const pageNumber = parseInt(req.params.pageNumber || "1");

        const filter = { productId, status: "Published" };

        const totalReviews = await Review.countDocuments(filter);
        const totalPages = Math.ceil(totalReviews / pageSize) || 1;

        const reviews = await Review.find(filter)
            .sort({ date: -1 })
            .skip((pageNumber - 1) * pageSize)
            .limit(pageSize);

        // Rating breakdown (5★ → 1★)
        const breakdownAgg = await Review.aggregate([
            { $match: { productId, status: "Published" } },
            { $group: { _id: "$rating", count: { $sum: 1 } } },
        ]);

        const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        breakdownAgg.forEach((b) => {
            breakdown[b._id] = b.count;
        });

        // Fetch fresh avg from product
        const product = await Product.findOne({ productId });
        const avgRating = product?.avgRating || 0;
        const reviewCount = product?.reviewCount || totalReviews;

        res.json({
            reviews,
            totalReviews,
            totalPages,
            currentPage: pageNumber,
            avgRating,
            reviewCount,
            breakdown,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

/* =========================================================
   USER: GET MY REVIEW FOR A PRODUCT
   ========================================================= */
export async function getMyReview(req, res) {
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

        const review = await Review.findOne({
            productId,
            userId: user._id,
        });

        res.json({ review });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

/* =========================================================
   USER: CREATE OR UPDATE MY REVIEW
   ========================================================= */
export async function upsertMyReview(req, res) {
    if (req.user == null) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    try {
        const { productId } = req.params;
        const { rating, title, comment } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            res.status(400).json({ message: "Rating must be 1-5" });
            return;
        }
        if (!comment || comment.trim().length < 3) {
            res.status(400).json({
                message: "Comment must be at least 3 characters",
            });
            return;
        }

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

        const existing = await Review.findOne({
            productId,
            userId: user._id,
        });

        let savedReview;

        if (existing) {
            existing.rating = rating;
            existing.title = (title || "").trim();
            existing.comment = comment.trim();
            existing.date = new Date();
            // Clear admin reply on edit? Keep it — admin can update.
            savedReview = await existing.save();
        } else {
            savedReview = await Review.create({
                productId,
                userId: user._id,
                userEmail: user.email,
                userName: `${user.firstName} ${user.lastName}`.trim(),
                userImage: user.image || "/default-profile.png",
                rating,
                title: (title || "").trim(),
                comment: comment.trim(),
                status: "Published",
                date: new Date(),
            });
        }

        const stats = await recalcProductRating(productId);

        res.json({
            message: existing
                ? "Review updated successfully"
                : "Review submitted successfully",
            review: savedReview,
            avgRating: stats.avgRating,
            reviewCount: stats.reviewCount,
        });
    } catch (err) {
        if (err.code === 11000) {
            res.status(409).json({
                message: "You have already reviewed this product",
            });
            return;
        }
        res.status(500).json({ message: err.message });
    }
}

/* =========================================================
   USER: DELETE MY REVIEW
   ========================================================= */
export async function deleteMyReview(req, res) {
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

        const deleted = await Review.findOneAndDelete({
            productId,
            userId: user._id,
        });

        if (!deleted) {
            res.status(404).json({ message: "Review not found" });
            return;
        }

        await recalcProductRating(productId);

        res.json({ message: "Review deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

/* =========================================================
   ADMIN: GET ALL REVIEWS (paginated, filterable)
   ========================================================= */
export async function getAllReviews(req, res) {
    if (req.user == null || req.user.isAdmin == false) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    try {
        const pageSize = parseInt(req.params.pageSize || "10");
        const pageNumber = parseInt(req.params.pageNumber || "1");
        const { productId, status, minRating } = req.query;

        const filter = {};
        if (productId) filter.productId = productId;
        if (status && status !== "All") filter.status = status;
        if (minRating) filter.rating = { $gte: Number(minRating) };

        const totalReviews = await Review.countDocuments(filter);
        const totalPages = Math.ceil(totalReviews / pageSize) || 1;

        const reviews = await Review.find(filter)
            .sort({ date: -1 })
            .skip((pageNumber - 1) * pageSize)
            .limit(pageSize);

        // Enrich with product name
        const productIds = [...new Set(reviews.map((r) => r.productId))];
        const products = await Product.find({
            productId: { $in: productIds },
        }).select("productId name images");

        const productMap = {};
        products.forEach((p) => {
            productMap[p.productId] = {
                name: p.name,
                image: p.images?.[0] || "/default-product-1.png",
            };
        });

        const enriched = reviews.map((r) => ({
            ...r.toObject(),
            productName: productMap[r.productId]?.name || r.productId,
            productImage:
                productMap[r.productId]?.image ||
                "/default-product-1.png",
        }));

        res.json({
            reviews: enriched,
            totalReviews,
            totalPages,
            currentPage: pageNumber,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

/* =========================================================
   ADMIN: REPLY TO A REVIEW
   ========================================================= */
export async function adminReplyToReview(req, res) {
    if (req.user == null || req.user.isAdmin == false) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    try {
        const { id } = req.params;
        const { body } = req.body;

        if (!body || body.trim().length < 2) {
            res.status(400).json({ message: "Reply body is required" });
            return;
        }

        const review = await Review.findById(id);
        if (!review) {
            res.status(404).json({ message: "Review not found" });
            return;
        }

        review.adminReply = {
            body: body.trim(),
            repliedAt: new Date(),
            repliedBy: req.user.email,
        };

        await review.save();

        res.json({
            message: "Reply saved successfully",
            review,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

/* =========================================================
   ADMIN: DELETE A REVIEW
   ========================================================= */
export async function adminDeleteReview(req, res) {
    if (req.user == null || req.user.isAdmin == false) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    try {
        const { id } = req.params;
        const review = await Review.findByIdAndDelete(id);
        if (!review) {
            res.status(404).json({ message: "Review not found" });
            return;
        }

        await recalcProductRating(review.productId);

        res.json({ message: "Review deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

/* =========================================================
   ADMIN: TOGGLE STATUS (Published / Flagged)
   ========================================================= */
export async function adminUpdateReviewStatus(req, res) {
    if (req.user == null || req.user.isAdmin == false) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    try {
        const { id } = req.params;
        const allowed = ["Published", "Flagged"];

        if (!allowed.includes(req.body.status)) {
            res.status(400).json({
                message: "Invalid status. Allowed: " + allowed.join(", "),
            });
            return;
        }

        const review = await Review.findById(id);
        if (!review) {
            res.status(404).json({ message: "Review not found" });
            return;
        }

        review.status = req.body.status;
        await review.save();

        await recalcProductRating(review.productId);

        res.json({ message: "Review status updated", review });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}