const jsonwebtoken = require('jsonwebtoken');
require('dotenv').config();
const User = require('../models/userModel');

const auth = async (req, res, next) => {
    try {
        const token = req.cookies.token; // Get token from cookies
        console.log(`Token: ${token}`);
        const decoded = jsonwebtoken.verify(token, process.env.JWT_SECRET);
        console.log(`Decoded: ${JSON.stringify(decoded)}`);
        const user = await User.findById(decoded.id);
        console.log(`User: ${JSON.stringify(user)}`);

        if (!user) {
            throw new Error();
        }

        req.token = token;
        req.user = user;
        next();
    }
    catch (e) {
        console.log(e);
        res.status(401).send({ error: 'Please authenticate.' });
    }
}

module.exports = auth;