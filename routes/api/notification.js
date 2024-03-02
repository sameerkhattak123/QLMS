// routes/notification.route.js

const express = require('express');
const router = express.Router();
const instAuth = require('../../middleware/instAuth');
const Notification = require('../../models/Notification');
const auth = require('../../middleware/auth');

// GET route to retrieve notifications for the logged-in instructor
router.get('/', instAuth||auth, async (req, res) => {
  try {
    let loggedInInstructorId;
    if(req.instructor==null){
      loggedInInstructorId = req.user;
    }
    else{
      loggedInInstructorId = req.instructor;
    }

    // Retrieve notifications for the logged-in instructor
    const notifications = await Notification.find({ recipient: loggedInInstructorId }).sort({ isRead: 1, createdAt: -1 });

    res.json(notifications);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});



// PUT route to mark a notification as read
router.put('/:notificationId/mark-as-read', instAuth||auth, async (req, res) => {
    try {
      let loggedInInstructorId;
      if(req.instructor==null){
        loggedInInstructorId = req.user;
      }
      else{
        loggedInInstructorId = req.instructor;
      }
      const notificationId = req.params.notificationId;
  
      // Find the notification by its ID
      const notification = await Notification.findById(notificationId);
      if (!notification) {
        return res.status(404).json({ message: 'Notification not found' });
      }
  
      // Check if the notification is for the logged-in instructor
      if (!notification.recipient.equals(loggedInInstructorId)) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
  
      // Mark the notification as read
      notification.isRead = true;
      await notification.save();
  
      res.json({ message: 'Notification marked as read' });
    } catch (err) {
      console.error(err);
      res.status(500).send('Server Error');
    }
  });


  router.get('/unread-count', instAuth||auth, async (req, res) => {
    try {
      let loggedInInstructorId;
      if(req.instructor==null){
        loggedInInstructorId = req.user;
      }
      else{
        loggedInInstructorId = req.instructor;
      }
  
      // Find the count of unread notifications for the current instructor
      const unreadCount = await Notification.countDocuments({
        recipient: loggedInInstructorId,
        isRead: false,
      });
  
      res.json({ unreadCount });
    } catch (err) {
      console.error(err);
      res.status(500).send('Server Error');
    }
  });
  

module.exports = router;
