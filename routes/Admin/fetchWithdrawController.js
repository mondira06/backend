const Withdraw = require("../../models/withdrawModel");
const User = require("../../models/userModel");

exports.fetchWithdrawController = async (req, res) => {
  try {
    const user = req.user;
    console.log("Hello");
    if (user.accountType === "Admin") {
      const withdrawals = await Withdraw.find();
      res.status(200).json({
        success: true,
        withdrawals,
      });
    } else {
      const userWithdrawals = await Withdraw.find({
        _id: { $in: user.withdrawRecords },
      });
      res.status(200).json({
        success: true,
        userWithdrawals,
      });
    }
  } catch (error) {
    res.status(500).json({
      message: "Error fetching withdrawal data",
      error: error.message,
    });
  }
};
