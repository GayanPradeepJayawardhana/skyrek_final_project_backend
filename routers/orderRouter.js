import express from "express";
import { createOrder, getAllOrders, updateOrderStatus } from "../controllers/orderController.js";

const orderRouter = express.Router()

orderRouter.post("/" , createOrder)
orderRouter.get("/:pageNumber/:pageSize" , getAllOrders)
orderRouter.put("/:orderId" , updateOrderStatus)
export default orderRouter