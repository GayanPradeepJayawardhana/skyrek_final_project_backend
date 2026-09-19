import express from "express";
import {
    createContactMessage,
    getAllContactMessages,
    getContactMessageById,
    updateContactMessageStatus,
    replyToContactMessage,
    deleteContactMessage,
    getUnreadCount,
} from "../controllers/contactController.js";

const contactRouter = express.Router();

// Public — anyone can submit
contactRouter.post("/", createContactMessage);

// Admin — unread badge
contactRouter.get("/unread-count", getUnreadCount);

// Admin — list (with optional ?status=New|Read|Replied|Closed)
contactRouter.get("/:pageNumber/:pageSize", getAllContactMessages);

// Admin — single message (also auto-marks as Read)
contactRouter.get("/one/:id", getContactMessageById);

// Admin — update status
contactRouter.put("/:id/status", updateContactMessageStatus);

// Admin — reply (saves in DB + emails customer)
contactRouter.post("/:id/reply", replyToContactMessage);

// Admin — delete
contactRouter.delete("/:id", deleteContactMessage);

export default contactRouter;