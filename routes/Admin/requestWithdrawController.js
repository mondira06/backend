const Withdraw = require("../../models/withdrawModel");
const User = require("../../models/userModel");

const requestWithdraw = async (req, res) => {
  let savedRequest;
  try {
    const userId = req.user._id;
    const userDetail = await User.find({ _id: userId });
    const balance = req.body.balance;
    if (userDetail[0].walletAmount < balance) {
      res.status(400).json({
        success: false,
        message: "You have insufficient balance to withdrawl",
      });
    } else if (balance <= 300) {
      res.status(400).json({
        success: false,
        message: "Minimum withdraw amount is 300",
      });
    } else {
      const withdrawRequest = new Withdraw({
        balance: balance,
        withdrawMethod: req.body.withdrawMethod,
        status: "Pending",
        userId: userId,
      });

      savedRequest = await withdrawRequest.save();
      await User.findByIdAndUpdate(
        userId,
        { $push: { withdrawRecords: savedRequest._id } },
        { new: true }
      );

      await User.updateMany(
        { accountType: "Admin" },
        { $push: { withdrawRecords: savedRequest._id } }
      );

      res.status(201).json({
        message: "Withdrawal request sent to admin for review.",
        withdrawRequest: savedRequest,
      });
    }
  } catch (error) {
    // If creating the withdrawal request fails, also try to delete the created request
    if (savedRequest && savedRequest._id) {
      await Withdraw.findByIdAndDelete(savedRequest._id);
    }

    res.status(500).json({
      message: "Error creating withdrawal request",
      error: error.message,
    });
  }
};

module.exports = { requestWithdraw };
