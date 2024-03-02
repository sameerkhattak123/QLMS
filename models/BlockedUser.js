// blockedUser.model.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const blockedUserSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  userType: {
    type: String,
    enum: ['user', 'instructor'],
    required: true,
  },
  blocked: {
    type: Boolean,
    default: false, // Set the default status, false for unblocked
  },
});

const BlockedUser = mongoose.model('BlockedUser', blockedUserSchema);

module.exports = BlockedUser;
