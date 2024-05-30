const express = require("express");
const router = express.Router();
const User = require("../../models/userModel");
const { isAdmin } = require("../../middlewares/roleSpecificMiddleware");
const auth = require("../../middlewares/auth");
const Deposit = require("../../models/depositHistoryModel");
const Commission = require("../../models/commissionModel");
const MainLevelModel = require("../../models/levelSchema");
const {addTransactionDetails} = require('../../controllers/TransactionHistoryControllers')

router.post("/wallet", auth, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount) {
      return res.status(400).json({ msg: "Amount is required" });
    }
    const userId = req.user._id;

    // Fetch commission levels configuration
    const mainLevelConfig = await MainLevelModel.findOne();
    if (!mainLevelConfig || !mainLevelConfig.levels || mainLevelConfig.levels.length === 0) {
      return res.status(500).json({ msg: "Commission levels configuration not found" });
    }
    const { levels } = mainLevelConfig;

    // Calculate total deposit
    const depositDetails = await Deposit.find({ userId: userId });
    const totalPrevDepositAmount = depositDetails.reduce((total, depositEntry) => total + depositEntry.depositAmount, 0);
    const totalDeposit = totalPrevDepositAmount + amount;

    // Update user wallet and achievements based on levels
    const updatedUser = await User.findByIdAndUpdate(userId, { $inc: { walletAmount: amount } }, { new: true });

    // Check and update first deposit
    let isFirstDeposit = false;
    if (!updatedUser.firstDepositMade) {
      updatedUser.firstDepositMade = true;
      isFirstDeposit = true;
      await updatedUser.save();
    }

    // Create deposit history
    const depositHistory = new Deposit({
      userId: userId,
      depositAmount: amount,
      depositDate: new Date(),
      depositStatus: "completed",
      depositId: "some-unique-id",
      depositMethod: "some-method",
    });
    await depositHistory.save();

    // Distribute commission up the chain
    if (updatedUser.referrer) {
      const commissionRates = await Commission.findOne();
      const commissionRatesArray = [
        commissionRates.level1,
        commissionRates.level2,
        commissionRates.level3,
        commissionRates.level4,
        commissionRates.level5,
      ];

      let currentReferrer = await User.findById(updatedUser.referrer);
      for (let i = 0; i < 5; i++) {
        if (!currentReferrer) {
          break;
        }

        // Update subordinate data
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Helper function to update or create an entry in the subordinates array
        const updateOrCreateSubordinateEntry = (subordinatesArray, subordinateData) => {
          const index = subordinatesArray.findIndex(sub => sub.date.getTime() === today.getTime());

          if (index !== -1) {
            subordinatesArray[index].depositNumber++;
            subordinatesArray[index].depositAmount += amount;
            if (isFirstDeposit) {
              subordinatesArray[index].firstDeposit++;
            }
          } else {
            subordinatesArray.push({
              userId: userId,
              noOfRegister: 0,
              depositNumber: 1,
              depositAmount: amount,
              firstDeposit: isFirstDeposit ? 1 : 0,
              date: today,
              level: subordinateData.level,
            });
          }
        };

        // Update direct or team subordinates based on the level
        if (i === 0) {
          updateOrCreateSubordinateEntry(currentReferrer.directSubordinates, { level: i + 1 });
        } else {
          updateOrCreateSubordinateEntry(currentReferrer.teamSubordinates, { level: i + 1 });
        }

        // Calculate and add commission
        let commission = amount * commissionRatesArray[i];
        if (isFirstDeposit) {
          currentReferrer.walletAmount += commission;
        }

        // Update commission records
        let existingRecord = currentReferrer.commissionRecords.find(record =>
          record.date.getTime() === today.getTime() && record.uid === updatedUser.uid
        );

        if (existingRecord) {
          existingRecord.depositAmount += amount;
          existingRecord.commission += commission;
        } else {
          currentReferrer.commissionRecords.push({
            level: i + 1,
            commission: commission,
            date: today,
            uid: updatedUser.uid,
            depositAmount: amount,
          });
        }
        await currentReferrer.save();
        addTransactionDetails(userId,amount,"Interest", new Date())
        currentReferrer = await User.findById(currentReferrer.referrer);
      }
    }

    res.status(200).json({ msg: "Wallet updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server Error" });
  }
});


router.get("/deposit/history", auth, isAdmin, async (req, res) => {
  try {
    const depositHistory = await Deposit.find();
    res.status(200).json(depositHistory);
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Server Error" });
  }
});

router.get("/pending-recharge", auth, isAdmin, async (req, res) => {
  try {
    const allDeposit = await Deposit.find();
    if (!allDeposit) {
      console.log("No user found in the DB");
    }
    let pendingRechargeArray = allDeposit.filter(
      (deposit) => deposit.depositStatus !== "completed"
    );
    if (pendingRechargeArray.length === 0) {
      return res.status(200).json({
        pendingAmount: 0,
        success: true,
        message: "No transaction is in pending state",
      });
    }
    let totalPendingAmount = pendingRechargeArray.reduce(
      (total, deposit) => total + deposit.depositAmount,
      0
    );
    res.status(200).json({
      pendingAmount: totalPendingAmount,
      success: true,
      message: "Data fetched successfully",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Server Error" });
  }
});

router.get("/success-recharge", auth, isAdmin, async (req, res) => {
  try {
    const allDeposit = await Deposit.find();
    if (!allDeposit) {
      console.log("No user found in the DB");
    }
    let successRechargeArray = allDeposit.filter(
      (deposit) => deposit.depositStatus === "completed"
    );
    if (successRechargeArray.length === 0) {
      return res.status(200).json({
        successRechargeAmount: 0,
        success: true,
        message: "No success recharge done yet",
      });
    }
    let totalSuccessAmount = successRechargeArray.reduce(
      (total, deposit) => total + deposit.depositAmount,
      0
    );
    res.status(200).json({
      successAmount: totalSuccessAmount,
      success: true,
      message: "Data fetched successfully",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Server Error" });
  }
});

router.post("/attendance", auth, async (req, res) => {
  try {
    const totalDeposit = await Deposit.aggregate([
      { $match: { userId: req.user._id } },
      { $group: { _id: null, total: { $sum: "$depositAmount" } } },
    ]);

    if (!totalDeposit[0] || totalDeposit[0].total < 10000) {
      return res.status(400).json({
        msg: "You have not deposited enough to withdraw the daily bonus",
      });
    }

    if (
      req.user.lastBonusWithdrawal &&
      new Date().setHours(0, 0, 0, 0) ===
        new Date(req.user.lastBonusWithdrawal).setHours(0, 0, 0, 0)
    ) {
      return res
        .status(400)
        .json({ msg: "You have already withdrawn the daily bonus" });
    }
    req.user.walletAmount += 100;
    req.user.lastBonusWithdrawal = Date.now();
    await req.user.save();
    res.json({ msg: "Daily bonus withdrawn, 100 added to wallet" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

router.get("/previous-day-stats", auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    
    // Calculate the start of the previous day
    const startOfPreviousDay = new Date(now);
    startOfPreviousDay.setDate(now.getDate() - 1);
    startOfPreviousDay.setHours(0, 0, 0, 0);

    // Calculate the end of the previous day
    const endOfPreviousDay = new Date(now);
    endOfPreviousDay.setDate(now.getDate() - 1);
    endOfPreviousDay.setHours(23, 59, 59, 999);

    // Fetch user data to get subordinates' information
    const user = await User.findById(userId)
      .populate("directSubordinates.userId", "username")
      .populate("teamSubordinates.userId", "username");

    // Fetch commission rates
    const commissionRates = await Commission.findOne();

    // Fetch and filter deposit records for the previous day only
    const twentyFourHourDeposits = await Deposit.find({
      userId: {
        $in: [userId, ...user.directSubordinates.map((sub) => sub.userId)],
      },
      depositDate: { $gte: startOfPreviousDay, $lte: endOfPreviousDay }, // Only deposits within the previous day
    });

    // Calculate total profit (commission earned)
    let totalProfit = 0;

    // Check if there are any direct subordinates
    if (user.directSubordinates.length === 0) {
      console.log("No direct subordinates found.");
    } else {
      // Calculate commission for direct subordinates
      for (const deposit of twentyFourHourDeposits) {
        if (userId.equals(deposit.userId)) {
          continue; // Skip the user's own deposit
        }
        const sub = user.directSubordinates.find((sub) =>
          sub.userId.equals(deposit.userId)
        );
        if (sub) {
          const commissionRate = commissionRates[`level${sub.level}`] || 0;
          totalProfit += deposit.depositAmount * commissionRate;
        }
      }
    }

    // Check if there are any team subordinates
    if (user.teamSubordinates.length === 0) {
      console.log("No team subordinates found.");
    } else {
      // Calculate commission for team subordinates
      for (const teamSubordinate of user.teamSubordinates) {
        const subUserId = teamSubordinate.userId;

        // Filter deposits made by the current team subordinate
        const subUserDeposits = twentyFourHourDeposits.filter((deposit) =>
          deposit.userId.equals(subUserId)
        );

        // Calculate commission for each deposit made by the team subordinate
        for (const deposit of subUserDeposits) {
          const commissionRate =
            commissionRates[`level${teamSubordinate.level}`] || 0;
          totalProfit += deposit.depositAmount * commissionRate;
        }
      }
    }

    // Fetch and map data for direct subordinates
    const directSubordinatesData = await Promise.all(
      user.directSubordinates.map(async (sub) => {
        const subUserId = sub.userId._id;
        const subUserDeposits = await Deposit.find({
          userId: subUserId,
          depositDate: { $gte: startOfPreviousDay, $lte: endOfPreviousDay }, // Only deposits within the previous day
        });
        const subUserTotalProfit = subUserDeposits.reduce(
          (total, deposit) => total + deposit.depositAmount,
          0
        );
        const commissionRate = commissionRates[`level${sub.level}`] || 0;
        const subUserCommission = subUserTotalProfit * commissionRate;
        return {
          username: sub.userId.username,
          depositAmount: subUserTotalProfit,
          commission: subUserCommission,
        };
      })
    );

    // Fetch and map data for team subordinates
    const teamSubordinatesData = await Promise.all(
      user.teamSubordinates.map(async (sub) => {
        const subUserId = sub.userId._id;
        const subUserDeposits = await Deposit.find({
          userId: subUserId,
          depositDate: { $gte: startOfPreviousDay, $lte: endOfPreviousDay }, // Only deposits within the previous day
        });
        const subUserTotalProfit = subUserDeposits.reduce(
          (total, deposit) => total + deposit.depositAmount,
          0
        );
        const commissionRate = commissionRates[`level${sub.level}`] || 0;
        const subUserCommission = subUserTotalProfit * commissionRate;
        return {
          username: sub.userId.username,
          depositAmount: subUserTotalProfit,
          commission: subUserCommission,
          level: sub.level,
        };
      })
    );

    res.status(200).json({
      totalProfit,
      directSubordinates: directSubordinatesData,
      teamSubordinates: teamSubordinatesData,
      timeFrame: {
        start: startOfPreviousDay.toISOString(),
        end: endOfPreviousDay.toISOString(),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server Error" });
  }
});



module.exports = router;
