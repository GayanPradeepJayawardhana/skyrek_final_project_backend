import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
    {
        orderId : {
            type : String,
            unique : true,
            required : true
        },
        email : {
            type : String,
            required : true
        },
        firstName : {
            type : String,
            required : true
        },
        lastName : {
            type : String,
            required : true
        },
        addressLine1 : {
            type : String,
            required : true
        },
        addressLine2 : {
            type : String,
            required : false
        },
        city : {
            type : String,
            required : true
        },
        phone : {
            type : String,
            required : true
        },
        status : {
            type : String,
            required : true,
            default : "Pending"
        },
        date : {
            type : Date,
            required : true,
            default : Date.now
        },
        items : [
            {
                product : {
                    productId : {
                        type : String,
                        required : true
                    },
                    name : {
                        type : String,
                        required : true
                    },
                    image : {
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
                    }
                },
                qty : {
                    type : Number,
                    required : true,
                    default : 1
                }
            }
        ],
        totalAmount : {
            type : Number,
            required : true
        }
    }
)

const Order = mongoose.model("order" , orderSchema)

export default Order

//  {
//         product : {
//             productId : "123456",
//             name : "Apple iPhone 14 Pro Max",
//             image : "https://m.media-amazon.com/images/I/61jLiKJb9LL._AC_UY218_.jpg",
//             price : 109900,
//             labelledPrice : 129900
//         },
//         qty : 1
//     },