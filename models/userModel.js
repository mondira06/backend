const mongoose = require("mongoose");

const subordinateSchema = new mongoose.Schema(
  {
    noOfRegister: { type: Number, default: 0 },
    depositNumber: { type: Number, default: 0 },
    depositAmount: { type: Number, default: 0 },
    firstDeposit: { type: Number, default: 0 },
    date: { type: Date, default: Date.now },
    level: { type: Number, default: 1 }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema({
  mobile: { type: Number, required: true, unique: true },
  password: { type: String, required: true },
  invitecode: { type: String, default: null },
  invitationCode: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  uid: { type: String, required: true, unique: true },
  referralLink: { type: String, default: null },
  walletAmount: { type: Number, default: 0 },
  accountType: {
    type: String,
    enum: ["Admin", "Normal", "Restricted"],
    default: "Normal"
  },
  lastBonusWithdrawal: { type: Date, default: null },
  totalCommission: { type: Number, default: 0 },
  avatar: { type: String, default: null },
  token: { type: String, default: null },
  directSubordinates: [subordinateSchema],
  teamSubordinates: [subordinateSchema],
  lastLoginTime: { type: Date, default: null },
  registrationDate: { type: Date, default: Date.now },
  referrer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  firstDepositMade: { type: Boolean, default: false },
  commissionRecords: [
    {
      level: Number,
      commission: Number,
      date: Date,
      uid: String,
      betAmount: { type: Number, default: 0 },
      depositAmount: Number
    }
  ],
  notification: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "notify"
    }
  ],
  withdrawRecords: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Withdraw",
      default: [
        {
          status: "NA",
          balance: 0,
          withdrawMethod: ""
        }
      ]
    }
  ],
  achievements: [String]
});

const User = mongoose.model("User", userSchema);

module.exports = User;
