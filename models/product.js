import mongoose, { model } from 'mongoose';

const productSchema = new mongoose.Schema(
    {
        productId : {
            type : String,
            unique : true,
            required : true
        },
        name : {
            type : String,
            required : true
        },
        altNames : {
            type : [String],
            default : [],
            required : true
        },
        description : {
            type : String,
            required : true
        },
        price : {
            type : Number,
            required : true
        },
        labelledPrice : {
            type : Number,
            required : true
        },
        images : {
            type : [String],
            default : ["/default-product-1.png", "/default-product-2.png"],
            required : true
        },
        isAvailable : {
            type : Boolean,
            required : true,
            default : true
        },
        category : {
            type : String,
            required : false
        },
        stock : {
            type : Number,
            required : true,
            default : 0
        },
        brand : {
            type : String,
            required : false
        },
        model : {
            type : String,
            required : false
        }
    }
)

const Product = mongoose.model("product" , productSchema)

export default Product