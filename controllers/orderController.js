import Order from "../models/order.js";
import Product from "../models/product.js";
import mongoose from "mongoose";

/* =========================================================
   CREATE ORDER (atomic stock decrement — prevents overselling)
   ========================================================= */
export async function createOrder(req, res) {
    if (req.user == null) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    if (req.user.isBlocked) {
        res.status(403).json({ message: "Your account is blocked" });
        return;
    }

    // Track what we've decremented so we can rollback manually
    const decrementedItems = [];

    try {
        if (!req.body.items || req.body.items.length === 0) {
            res.status(400).json({ message: "No items in order" });
            return;
        }

        const orderData = {
            orderId: "ORD000001",
            firstName: req.body.firstName || req.user.firstName,
            lastName: req.body.lastName || req.user.lastName,
            email: req.user.email,
            addressLine1: req.body.addressLine1,
            addressLine2: req.body.addressLine2,
            city: req.body.city,
            phone: req.body.phone,
            items: [],
            totalAmount: 0,
            status: "Pending",
        };

        // Generate next order ID
        const lastOrder = await Order.findOne().sort({ date: -1 });
        if (lastOrder != null) {
            const lastOrderNumber = parseInt(
                lastOrder.orderId.replace("ORD", "")
            );
            orderData.orderId =
                "ORD" + (lastOrderNumber + 1).toString().padStart(6, "0");
        }

        // STEP 1: Atomically decrement all stock first
        for (let i = 0; i < req.body.items.length; i++) {
            const { productId, quantity } = req.body.items[i];

            if (quantity < 1) {
                await rollbackStock(decrementedItems);
                res.status(400).json({
                    message: `Invalid quantity for product ${productId}`,
                });
                return;
            }

            // CRITICAL: atomic check + decrement in one operation
            const updatedProduct = await Product.findOneAndUpdate(
                {
                    productId: productId,
                    isAvailable: true,
                    stock: { $gte: quantity }, // prevents overselling
                },
                { $inc: { stock: -quantity } },
                { new: true }
            );

            if (!updatedProduct) {
                await rollbackStock(decrementedItems);

                const product = await Product.findOne({ productId });
                if (!product) {
                    res.status(400).json({
                        message: `Product ${productId} not found`,
                    });
                } else if (!product.isAvailable) {
                    res.status(400).json({
                        message: `Product ${productId} is not available`,
                    });
                } else {
                    res.status(400).json({
                        message: `Insufficient stock for ${product.name}. Only ${product.stock} available.`,
                    });
                }
                return;
            }

            decrementedItems.push({ productId, quantity });
            orderData.items.push({
                product: {
                    productId: updatedProduct.productId,
                    name: updatedProduct.name,
                    image: updatedProduct.images[0],
                    price: updatedProduct.price,
                    labelledPrice: updatedProduct.labelledPrice,
                },
                qty: quantity,
            });
            orderData.totalAmount += updatedProduct.price * quantity;
        }

        // STEP 2: Save order (stock already reserved)
        try {
            const newOrder = new Order(orderData);
            await newOrder.save();

            console.log("Order created with id " + newOrder.orderId);

            res.json({
                message: "Order created successfully",
                orderId: newOrder.orderId,
            });
        } catch (saveErr) {
            // Order save failed — rollback stock
            await rollbackStock(decrementedItems);
            throw saveErr;
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

async function rollbackStock(items) {
    for (const item of items) {
        await Product.updateOne(
            { productId: item.productId },
            { $inc: { stock: item.quantity } }
        );
    }
}

/* =========================================================
   GET ALL ORDERS (admin: all, user: own only)
   ========================================================= */
export async function getAllOrders(req, res) {
    if (req.user == null) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    try {
        const pageSizeInString = req.params.pageSize || "10";
        const pageNumberInString = req.params.pageNumber || "1";
        const pageSize = parseInt(pageSizeInString);
        const pageNumber = parseInt(pageNumberInString);

        if (req.user.isAdmin) {
            const orderCount = await Order.countDocuments();
            const totalPages = Math.ceil(orderCount / pageSize) || 1;
            const orders = await Order.find()
                .sort({ date: -1 })
                .skip((pageNumber - 1) * pageSize)
                .limit(pageSize);

            res.json({
                orders: orders,
                totalPages: totalPages,
                currentPage: pageNumber,
                totalOrders: orderCount,
            });
        } else {
            const orderCount = await Order.countDocuments({
                email: req.user.email,
            });
            const totalPages = Math.ceil(orderCount / pageSize) || 1;
            const orders = await Order.find({ email: req.user.email })
                .sort({ date: -1 })
                .skip((pageNumber - 1) * pageSize)
                .limit(pageSize);

            res.json({
                orders: orders,
                totalPages: totalPages,
                currentPage: pageNumber,
                totalOrders: orderCount,
            });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

/* =========================================================
   UPDATE ORDER STATUS (admin only)
   ========================================================= */
export async function updateOrderStatus(req, res) {
    if (req.user == null || req.user.isAdmin == false) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    try {
        const order = await Order.findOne({ orderId: req.params.orderId });

        if (order == null) {
            res.status(404).json({ message: "Order not found" });
            return;
        }

        const allowedStatuses = [
            "Pending",
            "Processing",
            "Shipped",
            "Delivered",
        ];

        if (!allowedStatuses.includes(req.body.status)) {
            res.status(400).json({
                message:
                    "Invalid status. Allowed values: " +
                    allowedStatuses.join(", "),
            });
            return;
        }

        await Order.updateOne(
            { orderId: req.params.orderId },
            { status: req.body.status }
        );

        res.json({ message: "Order status updated successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

/* =========================================================
   USER: CANCEL ORDER
   ========================================================= */
export async function cancelOrder(req, res) {
    if (req.user == null) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    try {
        const { orderId } = req.params;
        const { reason } = req.body;

        const order = await Order.findOne({ orderId });

        if (!order) {
            res.status(404).json({ message: "Order not found" });
            return;
        }

        // Users can only cancel their own orders
        if (order.email !== req.user.email) {
            res.status(403).json({ message: "Unauthorized" });
            return;
        }

        if (!reason || reason.trim().length < 5) {
            res.status(400).json({
                message: "Cancellation reason is required (min 5 characters)",
            });
            return;
        }

        // Direct cancel for Pending
        if (order.status === "Pending") {
            order.status = "Cancelled";
            order.cancellation = {
                requestedBy: "user",
                reason: reason.trim(),
                requestedAt: new Date(),
                resolvedAt: new Date(),
                resolvedBy: req.user.email,
            };

            await order.save();

            // Restore stock
            for (const item of order.items) {
                await Product.updateOne(
                    { productId: item.product.productId },
                    { $inc: { stock: item.qty } }
                );
            }

            res.json({
                message: "Order cancelled successfully",
                status: "Cancelled",
            });
            return;
        }

        // Request cancellation for Processing
        if (order.status === "Processing") {
            order.status = "Cancel Requested";
            order.cancellation = {
                requestedBy: "user",
                reason: reason.trim(),
                requestedAt: new Date(),
                resolvedAt: null,
                resolvedBy: null,
            };

            await order.save();

            res.json({
                message:
                    "Cancellation request submitted. An admin will review it shortly.",
                status: "Cancel Requested",
            });
            return;
        }

        if (order.status === "Cancel Requested") {
            res.status(400).json({
                message: "Cancellation already requested",
            });
            return;
        }

        res.status(400).json({
            message: `Cannot cancel order with status "${order.status}"`,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

/* =========================================================
   ADMIN: APPROVE / REJECT CANCELLATION
   ========================================================= */
export async function resolveCancellation(req, res) {
    if (req.user == null || req.user.isAdmin == false) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    try {
        const { orderId } = req.params;
        const { approve } = req.body; // true = cancel, false = reject

        const order = await Order.findOne({ orderId });

        if (!order) {
            res.status(404).json({ message: "Order not found" });
            return;
        }

        if (order.status !== "Cancel Requested") {
            res.status(400).json({
                message: "No pending cancellation request for this order",
            });
            return;
        }

        if (approve === true) {
            order.status = "Cancelled";
            order.cancellation.resolvedAt = new Date();
            order.cancellation.resolvedBy = req.user.email;

            await order.save();

            // Restore stock
            for (const item of order.items) {
                await Product.updateOne(
                    { productId: item.product.productId },
                    { $inc: { stock: item.qty } }
                );
            }

            res.json({
                message: "Cancellation approved",
                status: "Cancelled",
            });
        } else {
            // Reject — revert to Processing
            order.status = "Processing";
            order.cancellation.resolvedAt = new Date();
            order.cancellation.resolvedBy = req.user.email;

            await order.save();

            res.json({
                message: "Cancellation rejected",
                status: "Processing",
            });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

/* =========================================================
   ADMIN: CANCEL ORDER DIRECTLY
   ========================================================= */
export async function adminCancelOrder(req, res) {
    if (req.user == null || req.user.isAdmin == false) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    try {
        const { orderId } = req.params;
        const { reason } = req.body;

        const order = await Order.findOne({ orderId });

        if (!order) {
            res.status(404).json({ message: "Order not found" });
            return;
        }

        if (order.status === "Cancelled" || order.status === "Delivered") {
            res.status(400).json({
                message: `Cannot cancel order with status "${order.status}"`,
            });
            return;
        }

        order.status = "Cancelled";
        order.cancellation = {
            requestedBy: "admin",
            reason: reason || "Cancelled by admin",
            requestedAt: new Date(),
            resolvedAt: new Date(),
            resolvedBy: req.user.email,
        };

        await order.save();

        // Restore stock
        for (const item of order.items) {
            await Product.updateOne(
                { productId: item.product.productId },
                { $inc: { stock: item.qty } }
            );
        }

        res.json({ message: "Order cancelled by admin" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}