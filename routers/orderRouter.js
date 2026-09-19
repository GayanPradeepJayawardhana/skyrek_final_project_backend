import express from "express";
import {
    createOrder,
    getAllOrders,
    updateOrderStatus,
    cancelOrder,
    resolveCancellation,
    adminCancelOrder,
} from "../controllers/orderController.js";

const orderRouter = express.Router();

orderRouter.post("/", createOrder);
orderRouter.get("/:pageNumber/:pageSize", getAllOrders);
orderRouter.put("/:orderId", updateOrderStatus);

// Cancellation endpoints
orderRouter.put("/:orderId/cancel", cancelOrder); // User
orderRouter.put("/:orderId/resolve-cancellation", resolveCancellation); // Admin
orderRouter.put("/:orderId/admin-cancel", adminCancelOrder); // Admin direct

export default orderRouter;