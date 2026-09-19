import express from "express";
import {
    getMyWishlist,
    toggleWishlistItem,
    removeFromWishlist,
    checkWishlistStatus,
} from "../controllers/wishlistController.js";

const wishlistRouter = express.Router();

wishlistRouter.get("/", getMyWishlist);
wishlistRouter.post("/toggle/:productId", toggleWishlistItem);
wishlistRouter.delete("/:productId", removeFromWishlist);
wishlistRouter.get("/check/:productId", checkWishlistStatus);

export default wishlistRouter;