// models/notification.model.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const notificationSchema = new Schema({
  message: {
    type: String,
    required: true,
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    enum: ['Instructor','User'], // Assuming your instructor model is named 'Instructor'
    required: true,
  },
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
});

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
