import User from "../models/user.js"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import dotenv from "dotenv"
import axios from "axios"
import OTP from "../models/otp.js"
import nodemailer from "nodemailer"
dotenv.config()

const transporter = nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL,
        pass: process.env.APP_PASSWORD
    }
})

export async function createUser(req,res){

    try{

        const user = await User.findOne( {email : req.body.email} )

        if(user != null){
            res.json({message : "User already exists"})
            return
        }

        const passwordHash = bcrypt.hashSync(req.body.password, 10)

        const newUser = new User({
            email : req.body.email,
            firstName : req.body.firstName,
            lastName : req.body.lastName,
            password : passwordHash
        })

        await newUser.save()

        res.json({message : "User created successfully"})


    }catch(err){
        res.json({message : err.message})
    }

}

export async function loginUser(req,res){
    try{

        const email = req.body.email
        const password = req.body.password

        if(email == null || password == null){
            //res.json({message : "Email and password are required"})
            //with status code
            res.status(400).json({message : "Email and password are required"})
            return
        }

        const user = await User.findOne( {email : email} )

        if(user == null){

            //res.json({message : "User not found"})

            res.status(404).json({message : "User not found"})
            return
        }

        const isPasswordValid = bcrypt.compareSync(password , user.password)

        if(isPasswordValid){

            const token = jwt.sign(
                {
                    email : user.email,
                    firstName : user.firstName,
                    lastName : user.lastName,
                    isAdmin : user.isAdmin,
                    isBlocked : user.isBlocked,
                    isEmailVerified : user.isEmailVerified,
                    image : user.image,
                },
                process.env.JWT_SECRET_KEY,
                {
                    expiresIn : "24h"
                }
                
            )

            res.json({message : "Login successful", token : token , isAdmin : user.isAdmin})

        }else{

            //res.json({message : "Invalid password"})

            res.status(401).json({message : "Invalid password"})

        }


    }catch(err){
        res.json({message : err.message})
    }
}

export async function getUser(req,res){

    if(req.user == null){
        res.status(401).json({message : "Unauthorized"})
        return
    }

    try{

        const email = req.user.email

        const user = await User.findOne( {email : email} )

        if(user == null){
            res.status(404).json({message : "User not found"})
            return
        }

        if(user.isBlocked){
            res.status(403).json({message : "User is blocked"})
            return
        }

        res.json({email : user.email , firstName : user.firstName , lastName : user.lastName , isAdmin : user.isAdmin , isBlocked : user.isBlocked , isEmailVerified : user.isEmailVerified , image : user.image})


    }catch(err){
        res.json({message : err.message})
    }
    
}

export async function updatePassword(req,res){

    if(req.user == null){
        res.status(401).json({message : "Unauthorized"})
        return
    }

    const password = req.body.password

    const passwordHash = bcrypt.hashSync(password, 10)

    try{

        const email = req.user.email

        await User.updateOne( {email : email} , {password : passwordHash} )

        res.json({message : "Password updated successfully"})

    }catch(err){
        res.json({message : err.message})
    }

}

export async function updateProfile(req,res){

    if(req.user == null){
        res.status(401).json({message : "Unauthorized"})
        return
    }

    try{

        const email = req.user.email

        await User.updateOne( {email : email} , {firstName : req.body.firstName , lastName : req.body.lastName , image : req.body.image} )

        res.json({message : "Profile updated successfully"})

    }catch(err){
        res.json({message : err.message})
    }
}

export async function googleLogin(req,res){

    const accessToken = req.body.accessToken

    // console.log(accessToken)
    try{
        const response = await axios.get("https://www.googleapis.com/oauth2/v3/userinfo" , {
            headers : {
                Authorization : `Bearer ${accessToken}`
            }
        })

        // console.log(response.data)

        const user = await User.findOne( {email : response.data.email} )

        if(user == null){

            const randomPassword = Math.random().toString(36).slice(-8)

            const passwordHash = bcrypt.hashSync(randomPassword, 10)

            const newUser = new User({
                email : response.data.email,
                firstName : response.data.given_name,
                lastName : response.data.family_name,
                password : passwordHash,
                isEmailVerified : true,
                image : response.data.picture
            })

            await newUser.save()

            const token = jwt.sign(
                {
                    email : newUser.email,
                    firstName : newUser.firstName,
                    lastName : newUser.lastName,
                    isAdmin : newUser.isAdmin,
                    isBlocked : newUser.isBlocked,
                    isEmailVerified : newUser.isEmailVerified,
                    image : newUser.image,
                },
                process.env.JWT_SECRET_KEY,
                {
                    expiresIn : "24h"
                }
            )

            res.json({message : "Login successful", token : token , isAdmin : newUser.isAdmin})

        }else{

            const token = jwt.sign(
                {
                    email : user.email,
                    firstName : user.firstName,
                    lastName : user.lastName,
                    isAdmin : user.isAdmin,
                    isBlocked : user.isBlocked,
                    isEmailVerified : user.isEmailVerified,
                    image : user.image,
                },
                process.env.JWT_SECRET_KEY,
                {
                    expiresIn : "24h"
                }
            )

            res.json({message : "Login successful", token : token , isAdmin : user.isAdmin})

        }

    }catch(err){
        console.log(err.message)
    }
}

export async function sendOTP(req,res){
    try{
        
        const email = req.body.email

        const user = await User.findOne( {email : email} )

        if(user == null){
            res.status(404).json({message : "User not found"})
            return
        }

        if(user.isBlocked){
            res.status(403).json({message : "User is blocked"})
            return
        }

        await OTP.deleteOne( {email : email} )

        // otp between 100000 and 999999
        const otpNumber = Math.floor(100000 + Math.random() * 900000)

        //save otp in the database

        const otpHash = bcrypt.hashSync(otpNumber.toString(), 10)

        const newOTP = new OTP({
            email : email,
            otp : otpHash
        })

        await newOTP.save()

        //send otp to the user email
        const message = {
            from : process.env.EMAIL,
            to : email,
            subject : "OTP for password reset",
            text : `Your OTP for password reset is ${otpNumber}. It is valid for 10 minutes.`
        }

        await transporter.sendMail(message)

        res.json({message : "OTP sent successfully"})


    }catch(err){
        res.status(500).json({message : err.message})
    }
}

export async function verifyOTP(req,res){

    try{

        const email = req.body.email
        const otp = req.body.otp
        const password = req.body.password

        const otpRecord = await OTP.findOne( {email : email} )

        if(otpRecord == null){
            res.status(404).json({message : "OTP not found"})
            return
        }

        //check if otp time passed 10 minutes

        const currentTime = new Date()
        const otpTime = new Date(otpRecord.time)

        const timeDiff = (currentTime - otpTime) / (1000 * 60) // time difference in minutes

        if(timeDiff > 10){
            res.status(400).json({message : "OTP has expired"})
            return
        }

        const isOTPValid = bcrypt.compareSync(otp , otpRecord.otp)

        if(!isOTPValid){
            res.status(400).json({message : "Invalid OTP"})
            return
        }

        const passwordHash = bcrypt.hashSync(password, 10)

        await User.updateOne( {email : email} , {password : passwordHash} )

        await OTP.deleteOne( {email : email} )

        res.json({message : "Password updated successfully"})

    }catch(err){
        res.status(500).json({message : err.message})
    }

}

export async function getAllUsers(req,res){

    if(req.user == null || req.user.isAdmin == false){
        res.status(401).json({message : "Unauthorized"})
        return
    }

    try{

            const pageSizeInString = req.params.pageSize||"10"

            const pageNumberInString = req.params.pageNumber||"1"

            const pageSize = parseInt(pageSizeInString) //10

            const pageNumber = parseInt(pageNumberInString) //1

            const userCount = await User.countDocuments()

            const totalPages = Math.ceil(userCount / pageSize)

            const users = await User.find().skip((pageNumber-1)*pageSize).limit(pageSize)

            res.json({
                users : users,
                totalPages : totalPages,
                totalUsers : userCount
            })
        
    }catch(err){
        res.status(500).json({message : err.message})
    }
}

export async function switchRole(req,res){

    if(req.user == null || req.user.isAdmin == false){
        res.status(401).json({message : "Unauthorized"})
        return
    }

    try{

        const email = req.params.email

        const user = await User.findOne( {email : email} )

        if(user == null){
            res.status(404).json({message : "User not found"})
            return
        }

        if(user.email == req.user.email){
            res.status(400).json({message : "You cannot change your own role"})
            return
        }

        await User.updateOne( {email : email} , {isAdmin : !user.isAdmin} )

        res.json({message : "User role updated successfully"})

    }catch(err){
        res.status(500).json({message : err.message})
    }

}

export async function updateUserState(req,res){

    if(req.user == null || req.user.isAdmin == false){
        res.status(401).json({message : "Unauthorized"})
        return
    }

    try{

        const email = req.params.email

        const user = await User.findOne( {email : email} )

        if(user == null){
            res.status(404).json({message : "User not found"})
            return
        }

        if(user.email == req.user.email){
            res.status(400).json({message : "You cannot change your own block state"})
            return
        }

        await User.updateOne( {email : email} , {isBlocked : !user.isBlocked} )

        res.json({message : "User state updated successfully"})

    }catch(err){
        res.status(500).json({message : err.message})
    }

}