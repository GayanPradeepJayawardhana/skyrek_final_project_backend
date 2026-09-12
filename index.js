import express from 'express'
import mongoose from 'mongoose'
import userRouter from './routers/userRouter.js'
import authenticate from './middlewares/authenticate.js'
import productRouter from './routers/productRouter.js'
import dotenv from "dotenv"
import cors from "cors"
import orderRouter from './routers/orderRouter.js'

dotenv.config()

const mongoDBURI = process.env.MONGO_URI

mongoose.connect(mongoDBURI).then(
    ()=>{
        console.log("Connected with MongoDB successfully")
    }
).catch(
    (error)=>{
        console.log("Error while connecting with MongoDB")
        console.log(error)
    }
)

const app = express()

app.use(cors())

app.use( express.json() )

app.use(authenticate)


app.use("/api/users" , userRouter)
app.use("/api/products" , productRouter)
app.use("/api/orders" , orderRouter)

app.listen(
    3000 ,
    ()=>{
        console.log('Server started successfully on port 3000')
    }
)
