const express = require("express");
const router = express.Router();
const Commission = require("../../models/commissionModel");
const { isAdmin } = require("../../middlewares/roleSpecificMiddleware");
const auth = require("../../middlewares/auth");
const MainLevelModel = require("../../models/levelSchema");

router.put("/update-commission-rates", auth, isAdmin, async (req, res) => {
  try {
    const { level1, level2, level3, level4, level5 } = req.body;

    let commission = await Commission.findOne();
    if (commission) {
      const updatedCommission = await Commission.findByIdAndUpdate(
        commission._id,
        { $set: { level1, level2, level3, level4, level5 } },
        { new: true }
      );
      res.json({ msg: "Commission rates updated", data: updatedCommission });
    } else {
      commission = new Commission({ level1, level2, level3, level4, level5 });
      await commission.save();
      res.json({ msg: "Commission rates created", data: commission });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

router.put("/update-unlock-commission", auth, isAdmin, async (req, res) => {
  try {
    let { levels } = req.body;

    if (!levels || levels.length === 0) {
      levels = [
        { minAmount: 1000, bonusAmount: 100, awarded: "Bronze" },
        { minAmount: 5000, bonusAmount: 250, awarded: "Silver" },
        { minAmount: 10000, bonusAmount: 500, awarded: "Gold" },
        { minAmount: 20000, bonusAmount: 750, awarded: "Platinum" },
        { minAmount: 50000, bonusAmount: 1000, awarded: "Diamond" },
      ];
    }

    // Find the first document; assuming there's only one config document
    const mainConfig = await MainLevelModel.findOne();

    // Check if a document exists, if it does update it, otherwise create a new one
    if (mainConfig) {
      // Update the existing configuration with the new levels
      mainConfig.levels = levels;
      await mainConfig.save();
      res.json({ msg: "Commission levels updated", data: mainConfig });
    } else {
      // Create a new document with the specified levels
      const newMainConfig = new MainLevelModel({ levels });
      await newMainConfig.save();
      res.json({ msg: "Commission levels created", data: newMainConfig });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
