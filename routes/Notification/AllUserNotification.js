const express = require('express')
const router = express.Router()
const notification = require('../../models/notificatonschema')
const auth = require('../../middlewares/auth')
const {isAdmin} = require('../../middlewares/roleSpecificMiddleware')
const User = require('../../models/userModel')


////// Create message for all users //////////////////
router.post('/createNotification', auth, isAdmin, async (req, res) => {
    try {
        const { title, message } = req.body;


        if (!title || !message) {
            return res.status(400).json({
                success: false,
                message: "Please provide both title and message"
            });
        }
        
        const newNotification = new notification({
            title,
            message,
            date: new Date()
        });

        await newNotification.save();

        const updateResult = await User.updateMany({}, { $addToSet: { notification: newNotification } });

        res.status(200).json({
            success: true,
            message: "Notification sent successfully"
        });

    } catch (error) {
       
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
});



////// get notification from Admin //////

router.get('/notifications', auth, async (req, res) => {
    try {
        // Assuming 'req.user' contains the authenticated user's data
        // and 'notifications' is a field in user schema referencing Notification documents

        const userWithNotifications = await User.findById(req.user)  // Use the User's ID to find the document
            .populate('notification')  // Replace 'notifications' with the correct path if needed
            .exec();

        if (!userWithNotifications || userWithNotifications.notification.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No notifications available"
            });
        }

        res.status(200).json({
            success: true,
            notifications: userWithNotifications.notification
        });

    } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});


module.exports = router

