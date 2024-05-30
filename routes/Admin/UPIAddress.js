const express = require('express')
const router = express.Router()
const UPIAddress = require('../../models/UPI_IDSchema')
const auth = require('../../middlewares/auth')
const {isAdmin} = require('../../middlewares/roleSpecificMiddleware')



//// Creating The UPI id /////////////
 router.post('/AddID', auth,isAdmin,async(req,res)=>{
    try {
        const {Upi} = req.body
         if (!Upi){
           return res.status(404).json({
                message:"Please Enter The UPI ID"
            })
         }
         const UpiID = new UPIAddress({
            Upi,
            user: req.user._id,
         })
         await UpiID.save()
        res.status(200).json({
            success:true,
            message:"UPI ID Added Successfully"
        })
        
    } catch (error) {
        res.status(500).json({
            success:false,
            message:"server error"
        })
    }
 })
 /////////// update Upi ID /////////////
router.put('/UpdateUPI/:id', auth,isAdmin,async(req,res)=>{
    try {
        const { id } = req.params;
        const {Upi} = req.body

        if(!Upi){
            return res.status(404).json({
                message:"Provide the ID"
            })

        }
        const newUPIAddress = await UPIAddress.findByIdAndUpdate(
            id,
            {Upi},
            {new:true}
          );
          console.log('.....>',newUPIAddress)
          if (!newUPIAddress) {
            console.log(`No document found with ID: ${id} for user: ${req.user._id}`);
            return res.status(404).json({
              success: false,
              message: "Address not found"
            });
          }

          res.status(200).json({
            success:true,
            message:"UPI id updated",
            newUPIAddress
          })
          
    } catch (error) {
        res.status(500).json({
            success:false,
            message:"Server error"
          }) 
    }
})
//// get the data //

router.get('/Getid',auth,async(req,res)=>{
    try {
        const UPIaddress = await UPIAddress.find();
        if (!UPIaddress) {
            res.status(400).json({
                success: false,
                message:"Did not found any id"
            })
        }
       
        res.status(200).json({
            success: true,
            message:"here is the ID", UPIaddress
        })
    } catch (error) {
        res.status(500).json({
            success:false,
            message:"Server error"
        })
    }
})

 module.exports = router