import express from "express";
import {
    getProductReviews,
    getMyReview,
    upsertMyReview,
    deleteMyReview,
    getAllReviews,
    adminReplyToReview,
    adminDeleteReview,
    adminUpdateReviewStatus,
} from "../controllers/reviewController.js";

const reviewRouter = express.Router();

/* ============ PUBLIC ============ */
// Get paginated reviews for a product
reviewRouter.get("/product/:productId/:pageNumber/:pageSize", getProductReviews);

/* ============ USER (auth required, checked inside controller) ============ */
// Get my review for a product
reviewRouter.get("/mine/:productId", getMyReview);

// Create or update my review (upsert)
reviewRouter.post("/product/:productId", upsertMyReview);

// Delete my review
reviewRouter.delete("/mine/:productId", deleteMyReview);

/* ============ ADMIN ============ */
// List all reviews
reviewRouter.get("/all/:pageNumber/:pageSize", getAllReviews);

// Reply to a review
reviewRouter.post("/:id/reply", adminReplyToReview);

// Update status (Published / Flagged)
reviewRouter.put("/:id/status", adminUpdateReviewStatus);

// Delete a review
reviewRouter.delete("/:id", adminDeleteReview);

export default reviewRouter;