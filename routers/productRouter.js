import express from "express"
import { createProduct, deleteProduct, getAllProducts, getProductById, searchProducts, updateProduct } from "../controllers/productController.js"

const productRouter = express.Router()


productRouter.post("/" , createProduct)
productRouter.get("/" , getAllProducts)
productRouter.get("/search/:query",searchProducts)
productRouter.get("/:productId" , getProductById)
productRouter.delete("/:productId" , deleteProduct)
productRouter.put("/:productId" , updateProduct)
export default productRouter