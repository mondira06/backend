const express = require("express");
const router = express.Router();
const User = require("../../models/userModel");
const Commission = require("../../models/commissionModel");
const auth = require("../../middlewares/auth");

router.get("/commission-stats", auth, async (req, res) => {
  try {
    const userId = req.user._id;

    // Fetch user's details and commission rates
    const [user, commissionRates] = await Promise.all([
      User.findById(userId),
      Commission.findOne(),
    ]);

    let totalCommissionTillNow = 0;

    const calculateSubordinateCommissions = async (subordinates) => {
      const commissions = await Promise.all(
        subordinates.map(async (subordinate) => {
          const commissionRate =
            commissionRates[`level${subordinate.level}`] || 0;
          return subordinate.depositAmount * commissionRate;
        })
      );
      return commissions.reduce((sum, commission) => sum + commission, 0);
    };

    // Calculate total commission from direct and team subordinates in parallel
    const [directCommission, teamCommission] = await Promise.all([
      calculateSubordinateCommissions(user.directSubordinates),
      calculateSubordinateCommissions(user.teamSubordinates),
    ]);

    totalCommissionTillNow = directCommission + teamCommission;

    console.log("-------------->", totalCommissionTillNow);

    // Fetch commission for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const commissionLast7Days = user.commissionRecords
      .filter((record) => record.date >= sevenDaysAgo)
      .reduce((total, record) => total + record.commission, 0);

    // Count total direct and team subordinates' registrations
    const countTotalRegistrations = (subordinates) => {
      return subordinates.reduce((total, subordinate) => {
        return total + subordinate.noOfRegister;
      }, 0);
    };

    const totalDirectSubordinates = countTotalRegistrations(
      user.directSubordinates
    );
    const totalTeamSubordinates = countTotalRegistrations(
      user.teamSubordinates
    );

    res.status(200).json({
      totalCommissionTillNow,
      commissionLast7Days,
      totalDirectSubordinates,
      totalTeamSubordinates: totalTeamSubordinates + totalDirectSubordinates,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server Error" });
  }
});

module.exports = router;
