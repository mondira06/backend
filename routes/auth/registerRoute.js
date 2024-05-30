const express = require("express");
const router = express.Router();
const User = require("../../models/userModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const auth = require("../../middlewares/auth");
require("dotenv").config();

function generateUsername() {
  const randomNumbers = Math.floor(Math.random() * 10000);
  const randomAlphabets = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `MEMBER${randomNumbers}${randomAlphabets}`;
}

function generateInviteCode() {
  return Math.floor(100000000000 + Math.random() * 900000000000);
}

function generateUID() {
  return Math.floor(100000 + Math.random() * 900000);
}

function generateReferralLink(req, invitationCode) {
  let baseUrl = req.protocol + "://" + req.get("host");
  return `${baseUrl}/register?invitecode=${invitationCode}`;
}

function generateProfilePicture(req) {
  const randomNumber = Math.floor(Math.random() * 6) + 1;
  let baseUrl = req.protocol + "://" + req.get("host");
  return `${baseUrl}/${randomNumber}.jpg`;
}

router.post("/register", async (req, res) => {
  try {
    const { mobile, password, invitecode, accountType = "Normal" } = req.body;

    if (!mobile || !password) {
      return res.status(400).json({ msg: "All fields are required" });
    }

    const existingUser = await User.findOne({ mobile });
    if (existingUser) {
      return res.status(400).json({ msg: "User already exists" });
    }

    let referrer = null;
    if (invitecode) {
      referrer = await User.findOne({ invitationCode: invitecode });
      if (!referrer) {
        return res.status(400).json({ msg: "Invalid invite code" });
      }
    }

    const encryptedPassword = await bcrypt.hash(password, 10);
    const invitationCode = generateInviteCode();
    const user = new User({
      mobile,
      password: encryptedPassword,
      invitecode,
      username: generateUsername(),
      invitationCode,
      uid: generateUID(),
      accountType,
      referralLink: generateReferralLink(req, invitationCode),
      avatar: generateProfilePicture(req),
      referrer: referrer ? referrer._id : null
    });

    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: 3600 });
    user.token = token;
    user.password = undefined;

    if (referrer) {
      let currentReferrer = referrer;
      let level = 1;
      const today = new Date();
      today.setHours(0, 0, 0, 0); // set time to 00:00:00

      while (currentReferrer && level <= 5) {
        const subordinateData = {
          date: today,
          noOfRegister: 1,
          depositNumber: 0,
          depositAmount: 0,
          firstDeposit: 0,
          level: level
        };

        if (level === 1) {
          const existingDirectSubordinate = currentReferrer.directSubordinates.find(
            (sub) => sub.date.getTime() === today.getTime()
          );

          if (existingDirectSubordinate) {
            existingDirectSubordinate.noOfRegister++;
          } else {
            currentReferrer.directSubordinates.push(subordinateData);
          }
        } else {
          const existingTeamSubordinate = currentReferrer.teamSubordinates.find(
            (sub) => sub.date.getTime() === today.getTime()
          );

          if (existingTeamSubordinate) {
            existingTeamSubordinate.noOfRegister++;
          } else {
            currentReferrer.teamSubordinates.push(subordinateData);
          }
        }

        await currentReferrer.save();
        currentReferrer = await User.findById(currentReferrer.referrer);
        level++;
      }
    }

    res.status(200).json({
      success: true,
      token,
      user
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server Error" });
  }
});

router.get("/dashboard", auth, (req, res) => {
  res.send("Welcome to dashboard");
});

module.exports = router;
