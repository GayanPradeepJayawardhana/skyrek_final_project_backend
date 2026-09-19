import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";

import authenticate from "./middlewares/authenticate.js";
import userRouter from "./routers/userRouter.js";
import productRouter from "./routers/productRouter.js";
import orderRouter from "./routers/orderRouter.js";
import contactRouter from "./routers/contactRouter.js";
import reviewRouter from "./routers/reviewRouter.js";
import feedbackRouter from "./routers/feedbackRouter.js";
import wishlistRouter from "./routers/wishlistRouter.js";

dotenv.config();

const mongoDBURI = process.env.MONGO_URI;

mongoose
    .connect(mongoDBURI)
    .then(() => console.log("Connected with MongoDB successfully"))
    .catch((error) => {
        console.log("Error while connecting with MongoDB");
        console.log(error);
    });

const app = express();

// ✅ Allow these origins
const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://skyrek-final-project-frontend.vercel.app",
];

// ✅ Bulletproof CORS (works even for preflight with Origin: null)
app.use(
    cors({
        origin: function (origin, callback) {
            // Allow requests with no origin (mobile apps, curl, Postman, SSR)
            if (!origin) return callback(null, true);

            // Allow exact matches
            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            // Allow any *.vercel.app preview deployment
            try {
                const hostname = new URL(origin).hostname;
                if (hostname.endsWith(".vercel.app")) {
                    return callback(null, true);
                }
            } catch (e) {
                // Invalid origin — just block it
            }

            return callback(new Error("Not allowed by CORS"));
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: [
            "Content-Type",
            "Authorization",
            "X-Requested-With",
            "Accept",
            "Origin",
        ],
    })
);

// ✅ Explicitly handle preflight for ALL routes (Express 5 needs this)
app.options(/.*/, cors());

app.use(express.json());
app.use(authenticate);

app.use("/api/users", userRouter);
app.use("/api/products", productRouter);
app.use("/api/orders", orderRouter);
app.use("/api/contact", contactRouter);
app.use("/api/reviews", reviewRouter);
app.use("/api/feedback", feedbackRouter);
app.use("/api/wishlist", wishlistRouter);

// ✅ Health check — open this in the browser to verify the server is up
app.get("/", (req, res) => {
    res.json({
        status: "ok",
        message: "PCFORGE backend is running",
        time: new Date().toISOString(),
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server started successfully on port ${PORT}`);
});