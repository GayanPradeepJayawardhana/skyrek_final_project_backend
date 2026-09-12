import express from 'express';
import { createUser, getAllUsers, getUser, googleLogin, loginUser, sendOTP, switchRole, updatePassword, updateProfile, updateUserState, verifyOTP } from '../controllers/userController.js';

const userRouter = express.Router()

userRouter.post("/",createUser)
userRouter.post("/login",loginUser)
userRouter.get("/me", getUser)

userRouter.put("/",updateProfile)
userRouter.post("/password",updatePassword)
userRouter.post("/google-login",googleLogin)
userRouter.post("/otp",sendOTP)
userRouter.post("/verify-otp",verifyOTP)
userRouter.get("/all/:pageNumber/:pageSize",getAllUsers)

userRouter.put("/state/:email",updateUserState)
userRouter.put("/role/:email",switchRole)

export default userRouter