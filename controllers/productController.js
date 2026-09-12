import Product from "../models/product.js"

export async function createProduct(req,res){

    if(req.user == null){

        res.status(401).json({message : "Unauthorized"})
        return

    }

    if(!req.user.isAdmin){
        res.status(403).json({message : "Only admins can create products"})
        return
    }

    try{

        const existingProduct = await Product.findOne( {productId : req.body.productId} )

        if(existingProduct != null){
            res.status(400).json({message : "Product with this productId already exists"})
            return
        }

        const product = new Product(req.body)

        await product.save()

        res.json({message : "Product created successfully"})

    }catch(err){
        res.status(500).json({message : err.message})
    }
    
}

export async function getAllProducts(req,res){

    console.log("Products are fetching.....")

    try{

        if(req.user!=null && req.user.isAdmin){
            const products = await Product.find()
            res.json(products)
        }else{
            const products = await Product.find( {isAvailable : true} )
            res.json(products)
        }
        

    }catch(err){
        res.status(500).json({message : err.message})
    }

}

export async function deleteProduct(req,res){

    if(req.user!=null && req.user.isAdmin){

        try{

            const product = await Product.findOne( {productId : req.params.productId} )
            if(product == null){
                res.status(404).json({message : "Product not found"})
                return
            }

            await Product.deleteOne( {productId : req.params.productId} )

            res.json({message : "Product deleted successfully"})

        }catch(err){
            res.status(500).json({message : err.message})
        }

    }else{
        res.status(403).json({message : "Only admins can delete products"})
        return
    }

}

export async function updateProduct(req,res){

    if(req.user!=null && req.user.isAdmin){

        try{

            if(req.body.productId != null){
                res.status(400).json({message : "productId cannot be updated"})
                return
            }

            await Product.updateOne( {productId : req.params.productId} , req.body )

            res.json({message : "Product updated successfully"})

        }catch(err){
            res.status(500).json({message : err.message})
        }
    }else{
        res.status(403).json({message : "Only admins can update products"})
        return
    }
}

export async function getProductById(req,res){

    try{

        const product = await Product.findOne( {productId : req.params.productId} )

        if(product == null){
            res.status(404).json({message : "Product not found"})
            return
        }

        if(product.isAvailable){

            res.json(product)

        }else{

            if(req.user!=null && req.user.isAdmin){

                res.json(product)
                
            }else{
                res.status(403).json({message : "Only admins can view unavailable products"})
                return
            }
        }

    }catch(err){
        res.status(500).json({message : err.message})
    }

}

export async function searchProducts(req,res){

    try{

        const query = req.params.query

        const products = await Product.find(
            {
                $or :[
                    {name : {$regex : query , $options : "i"}},
                    {description : {$regex : query , $options : "i"}},
                    {altNames : {$elemMatch : {$regex : query , $options : "i"}}}
                ],
                isAvailable : true    
            }
        )

        res.json(products)

    }catch(err){
        res.status(500).json({message : err.message})
    }

}