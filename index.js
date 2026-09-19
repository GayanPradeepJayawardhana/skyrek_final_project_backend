import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import dns from "dns";

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

   app.use(
       cors({
           origin: (origin, callback) => {
               if (
                   !origin ||
                   origin === "http://localhost:5173" ||
                   /\.vercel\.app$/.test(new URL(origin).hostname)
               ) {
                   callback(null, true);
               } else {
                   callback(new Error("Not allowed by CORS"));
               }
           },
           credentials: true,
       })
   );
app.use(express.json());
app.use(authenticate);

app.use("/api/users", userRouter);
app.use("/api/products", productRouter);
app.use("/api/orders", orderRouter);
app.use("/api/contact", contactRouter);
app.use("/api/reviews", reviewRouter);
app.use("/api/feedback", feedbackRouter);
app.use("/api/wishlist", wishlistRouter);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server started successfully on port ${PORT}`);
});