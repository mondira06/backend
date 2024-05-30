const express = require("express");
const User = require("../../models/userModel");
const TRXAddressModel = require("../../models/TRXAddressSchema");
const auth = require("../../middlewares/auth");
const { isAdmin } = require("../../middlewares/roleSpecificMiddleware");
const router = express.Router();

///////////////////// For Create the Address POST/////

router.post("/CreateAddress", auth, isAdmin, async (req, res) => {
  try {
    const { TRXAddress } = req.body;

    console.log("--->", TRXAddress);
    if (!TRXAddress) {
      return res.status(400).send("TRXAddress is required");
    }
    const newTRXAddress = new TRXAddressModel({
      TRXAddress,
      user: req.user._id,
    });

    await newTRXAddress.save();

    res.status(200).json({
      success: true,
      message: "Saved the address",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error" + error.message,
    });
  }
});

router.put("/updateaddress", auth, isAdmin, async (req, res) => {
  try {
    const { TRXAddress: newTRXAddress } = req.body;
    if (!newTRXAddress) {
      return res.status(400).send("TRXAddress is required");
    }
    const updatedTrxAddress = await TRXAddressModel.findOneAndUpdate(
      { user: req.user._id },
      { $set: { TRXAddress: newTRXAddress } },
      { new: true, runValidators: true }
    );
    if (!updatedTrxAddress) {
      return res.status(404).send("Address not found");
    }
    res.status(200).json({
      success: true,
      message: "Address updated",
      updatedTrxAddress
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});
///////// GET Address//////////
router.get("/getAddresses", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).send("User not found");
    }
    let addresses;

    if (user.role === "admin") {
      addresses = await TRXAddressModel.find();
    } else {
      addresses = await TRXAddressModel.find();
    }
    console.log("......>", addresses);

    if (!addresses.length) {
      return res.status(404).json({
        success: false,
        message: "No addresses found",
      });
    }

    res.status(200).json({
      success: true,
      addresses,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error: " + error.message,
    });
  }
});

module.exports = router;
