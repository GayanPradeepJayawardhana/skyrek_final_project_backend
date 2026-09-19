import Feedback from "../models/feedback.js";
import User from "../models/user.js";

/* =========================================================
   PUBLIC: GET FEEDBACK LIST (paginated)
   ========================================================= */
export async function getPublicFeedback(req, res) {
    try {
        const pageSize = parseInt(req.params.pageSize || "10");
        const pageNumber = parseInt(req.params.pageNumber || "1");

        const filter = { status: "Published" };

        const totalFeedback = await Feedback.countDocuments(filter);
        const totalPages = Math.ceil(totalFeedback / pageSize) || 1;

        const feedback = await Feedback.find(filter)
            .sort({ date: -1 })
            .skip((pageNumber - 1) * pageSize)
            .limit(pageSize);

        // Aggregate avg + breakdown
        const stats = await Feedback.aggregate([
            { $match: { status: "Published" } },
            {
                $group: {
                    _id: null,
                    avgRating: { $avg: "$rating" },
                    count: { $sum: 1 },
                },
            },
        ]);

        const avgRating = stats[0]?.avgRating || 0;
        const reviewCount = stats[0]?.count || 0;

        const breakdownAgg = await Feedback.aggregate([
            { $match: { status: "Published" } },
            { $group: { _id: "$rating", count: { $sum: 1 } } },
        ]);
        const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        breakdownAgg.forEach((b) => {
            breakdown[b._id] = b.count;
        });

        res.json({
            feedback,
            totalFeedback,
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
   PUBLIC/USER: SUMMARY (avg + count, tiny payload)
   ========================================================= */
export async function getFeedbackSummary(req, res) {
    try {
        const stats = await Feedback.aggregate([
            { $match: { status: "Published" } },
            {
                $group: {
                    _id: null,
                    avgRating: { $avg: "$rating" },
                    count: { $sum: 1 },
                },
            },
        ]);

        res.json({
            avgRating: stats[0]?.avgRating || 0,
            reviewCount: stats[0]?.count || 0,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

/* =========================================================
   USER: GET MY FEEDBACK
   ========================================================= */
export async function getMyFeedback(req, res) {
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

        const feedback = await Feedback.findOne({ userId: user._id });
        res.json({ feedback });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

/* =========================================================
   USER: CREATE OR UPDATE MY FEEDBACK
   ========================================================= */
export async function upsertMyFeedback(req, res) {
    if (req.user == null) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    try {
        const { rating, category, title, comment } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            res.status(400).json({ message: "Rating must be 1-5" });
            return;
        }
        if (!comment || comment.trim().length < 5) {
            res.status(400).json({
                message: "Please write at least 5 characters",
            });
            return;
        }

        const allowedCategories = [
            "General",
            "Website",
            "Checkout",
            "Delivery",
            "Support",
            "Other",
        ];
        const finalCategory = allowedCategories.includes(category)
            ? category
            : "General";

        const user = await User.findOne({ email: req.user.email });
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        const existing = await Feedback.findOne({ userId: user._id });

        let saved;
        if (existing) {
            existing.rating = rating;
            existing.category = finalCategory;
            existing.title = (title || "").trim();
            existing.comment = comment.trim();
            existing.date = new Date();
            saved = await existing.save();
        } else {
            saved = await Feedback.create({
                userId: user._id,
                userEmail: user.email,
                userName: `${user.firstName} ${user.lastName}`.trim(),
                userImage: user.image || "/default-profile.png",
                rating,
                category: finalCategory,
                title: (title || "").trim(),
                comment: comment.trim(),
                date: new Date(),
            });
        }

        res.json({
            message: existing
                ? "Feedback updated successfully"
                : "Thanks for your feedback!",
            feedback: saved,
        });
    } catch (err) {
        if (err.code === 11000) {
            res.status(409).json({
                message: "You have already submitted feedback",
            });
            return;
        }
        res.status(500).json({ message: err.message });
    }
}

/* =========================================================
   USER: DELETE MY FEEDBACK
   ========================================================= */
export async function deleteMyFeedback(req, res) {
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

        const deleted = await Feedback.findOneAndDelete({
            userId: user._id,
        });
        if (!deleted) {
            res.status(404).json({ message: "Feedback not found" });
            return;
        }

        res.json({ message: "Feedback deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

/* =========================================================
   ADMIN: GET ALL FEEDBACK
   ========================================================= */
export async function getAllFeedback(req, res) {
    if (req.user == null || req.user.isAdmin == false) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    try {
        const pageSize = parseInt(req.params.pageSize || "10");
        const pageNumber = parseInt(req.params.pageNumber || "1");
        const { status, category, minRating } = req.query;

        const filter = {};
        if (status && status !== "All") filter.status = status;
        if (category && category !== "All") filter.category = category;
        if (minRating) filter.rating = { $gte: Number(minRating) };

        const totalFeedback = await Feedback.countDocuments(filter);
        const totalPages = Math.ceil(totalFeedback / pageSize) || 1;

        const feedback = await Feedback.find(filter)
            .sort({ date: -1 })
            .skip((pageNumber - 1) * pageSize)
            .limit(pageSize);

        res.json({
            feedback,
            totalFeedback,
            totalPages,
            currentPage: pageNumber,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

/* =========================================================
   ADMIN: REPLY
   ========================================================= */
export async function adminReplyToFeedback(req, res) {
    if (req.user == null || req.user.isAdmin == false) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    try {
        const { id } = req.params;
        const { body } = req.body;

        if (!body || body.trim().length < 2) {
            res.status(400).json({ message: "Reply is required" });
            return;
        }

        const feedback = await Feedback.findById(id);
        if (!feedback) {
            res.status(404).json({ message: "Feedback not found" });
            return;
        }

        feedback.adminReply = {
            body: body.trim(),
            repliedAt: new Date(),
            repliedBy: req.user.email,
        };
        await feedback.save();

        res.json({ message: "Reply saved", feedback });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

/* =========================================================
   ADMIN: DELETE
   ========================================================= */
export async function adminDeleteFeedback(req, res) {
    if (req.user == null || req.user.isAdmin == false) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    try {
        const { id } = req.params;
        const feedback = await Feedback.findByIdAndDelete(id);
        if (!feedback) {
            res.status(404).json({ message: "Feedback not found" });
            return;
        }
        res.json({ message: "Feedback deleted" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

/* =========================================================
   ADMIN: TOGGLE STATUS
   ========================================================= */
export async function adminUpdateFeedbackStatus(req, res) {
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

        const feedback = await Feedback.findById(id);
        if (!feedback) {
            res.status(404).json({ message: "Feedback not found" });
            return;
        }

        feedback.status = req.body.status;
        await feedback.save();

        res.json({ message: "Status updated", feedback });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}