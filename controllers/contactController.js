import ContactMessage from "../models/contactMessage.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL,
        pass: process.env.APP_PASSWORD,
    },
});

/* ================= PUBLIC: CREATE MESSAGE ================= */
export async function createContactMessage(req, res) {
    try {
        const { name, email, subject, message } = req.body;

        if (!name || !email || !message) {
            res.status(400).json({
                message: "Name, email, and message are required",
            });
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            res.status(400).json({ message: "Invalid email address" });
            return;
        }

        const newMessage = new ContactMessage({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            subject: (subject || "").trim(),
            message: message.trim(),
        });

        await newMessage.save();

        res.status(201).json({
            message: "Message received. We'll get back to you soon.",
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

/* ================= ADMIN: GET ALL (paginated) ================= */
export async function getAllContactMessages(req, res) {
    if (req.user == null || req.user.isAdmin == false) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    try {
        const pageSize = parseInt(req.params.pageSize || "10");
        const pageNumber = parseInt(req.params.pageNumber || "1");
        const statusFilter = req.query.status; // optional: New | Read | Replied | Closed

        const filter = {};
        if (statusFilter && statusFilter !== "All") {
            filter.status = statusFilter;
        }

        const messageCount = await ContactMessage.countDocuments(filter);
        const totalPages = Math.ceil(messageCount / pageSize) || 1;

        const messages = await ContactMessage.find(filter)
            .sort({ date: -1 })
            .skip((pageNumber - 1) * pageSize)
            .limit(pageSize);

        res.json({
            messages,
            totalPages,
            currentPage: pageNumber,
            totalMessages: messageCount,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

/* ================= ADMIN: GET ONE ================= */
export async function getContactMessageById(req, res) {
    if (req.user == null || req.user.isAdmin == false) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    try {
        const message = await ContactMessage.findById(req.params.id);

        if (message == null) {
            res.status(404).json({ message: "Message not found" });
            return;
        }

        // Auto-mark as Read if it's still New
        if (message.status === "New") {
            message.status = "Read";
            await message.save();
        }

        res.json(message);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

/* ================= ADMIN: UPDATE STATUS ================= */
export async function updateContactMessageStatus(req, res) {
    if (req.user == null || req.user.isAdmin == false) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    try {
        const allowedStatuses = ["New", "Read", "Replied", "Closed"];

        if (!allowedStatuses.includes(req.body.status)) {
            res.status(400).json({
                message:
                    "Invalid status. Allowed: " + allowedStatuses.join(", "),
            });
            return;
        }

        const message = await ContactMessage.findById(req.params.id);

        if (message == null) {
            res.status(404).json({ message: "Message not found" });
            return;
        }

        message.status = req.body.status;
        await message.save();

        res.json({
            message: "Status updated successfully",
            status: message.status,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

/* ================= ADMIN: REPLY (saves + emails customer) ================= */
export async function replyToContactMessage(req, res) {
    if (req.user == null || req.user.isAdmin == false) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    try {
        const { subject, body } = req.body;

        if (!subject || !body) {
            res.status(400).json({
                message: "Subject and body are required",
            });
            return;
        }

        const message = await ContactMessage.findById(req.params.id);

        if (message == null) {
            res.status(404).json({ message: "Message not found" });
            return;
        }

        // 1. Save reply in DB
        message.replies.push({
            subject: subject.trim(),
            body: body.trim(),
            sentBy: req.user.email,
        });
        message.status = "Replied";
        await message.save();

        // 2. Send email to customer
        const mailOptions = {
            from: process.env.EMAIL,
            to: message.email,
            subject: subject,
            text: `${body}\n\n---\nOriginal message:\n${message.message}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                    <div style="background: #001a84; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                        <h2 style="margin: 0;">PCFORGE Support</h2>
                    </div>
                    <div style="padding: 24px; background: #f9fafb; border: 1px solid #e5e7eb; border-top: none;">
                        <p>Hello ${message.name},</p>
                        <div style="white-space: pre-wrap; line-height: 1.6;">${body}</div>
                        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
                        <p style="font-size: 13px; color: #6b7280; margin-bottom: 8px;">
                            <strong>Your original message:</strong>
                        </p>
                        <div style="font-size: 13px; color: #6b7280; background: white; padding: 12px; border-left: 3px solid #001a84; border-radius: 4px;">
                            ${message.message}
                        </div>
                    </div>
                    <div style="padding: 16px; background: #001a84; color: white; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px;">
                        © PCFORGE — Colombo, Sri Lanka
                    </div>
                </div>
            `,
        };

        try {
            await transporter.sendMail(mailOptions);
        } catch (mailErr) {
            console.error("Email send failed:", mailErr.message);
            // Don't fail the request — reply is saved in DB
            res.json({
                message:
                    "Reply saved but email delivery failed. Check server logs.",
                saved: true,
                emailed: false,
            });
            return;
        }

        res.json({
            message: "Reply sent successfully",
            saved: true,
            emailed: true,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

/* ================= ADMIN: DELETE ================= */
export async function deleteContactMessage(req, res) {
    if (req.user == null || req.user.isAdmin == false) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    try {
        const message = await ContactMessage.findById(req.params.id);

        if (message == null) {
            res.status(404).json({ message: "Message not found" });
            return;
        }

        await ContactMessage.deleteOne({ _id: req.params.id });

        res.json({ message: "Message deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

/* ================= ADMIN: UNREAD COUNT (for badge) ================= */
export async function getUnreadCount(req, res) {
    if (req.user == null || req.user.isAdmin == false) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    try {
        const count = await ContactMessage.countDocuments({ status: "New" });
        res.json({ unreadCount: count });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}