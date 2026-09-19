import express from "express";
import {
    getPublicFeedback,
    getFeedbackSummary,
    getMyFeedback,
    upsertMyFeedback,
    deleteMyFeedback,
    getAllFeedback,
    adminReplyToFeedback,
    adminDeleteFeedback,
    adminUpdateFeedbackStatus,
} from "../controllers/feedbackController.js";

const feedbackRouter = express.Router();

/* ================= PUBLIC ================= */
feedbackRouter.get("/summary", getFeedbackSummary);
feedbackRouter.get("/public/:pageNumber/:pageSize", getPublicFeedback);

/* ================= USER (auth checked inside) ================= */
feedbackRouter.get("/mine", getMyFeedback);
feedbackRouter.post("/", upsertMyFeedback);
feedbackRouter.delete("/mine", deleteMyFeedback);

/* ================= ADMIN ================= */
feedbackRouter.get("/all/:pageNumber/:pageSize", getAllFeedback);
feedbackRouter.post("/:id/reply", adminReplyToFeedback);
feedbackRouter.put("/:id/status", adminUpdateFeedbackStatus);
feedbackRouter.delete("/:id", adminDeleteFeedback);

export default feedbackRouter;