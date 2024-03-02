
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AnnouncementSchema = new Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'authorModel',
    required: true,
  },
  authorModel: {
    type: String,
    enum: ['User', 'Instructor'],
    required: true,
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
  },
  body: {
    type: String,
    required: true,
  },
  firstName: { // Add the firstName field to the announcement schema
    type: String,
    required: true,
  },
  profilePicture: {
    type: String,
    required: true,
    // Assuming the profile picture will be stored as a URL
  },
  comments: [
    {
      author: {
        type: Schema.Types.ObjectId,
        refPath: 'authorModel',
        required: true,
      },
      authorModel: {
        type: String,
        enum: ['User', 'Instructor'],
        required: true,
      },
      firstName: { // Add the firstName field to the comment schema
        type: String,
        required: true,
      },
      
      body: {
        type: String,
        required: true,
      },
      profilePicture: {
        type: String,
        required: true
      
       },
      date: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  date: {
    type: Date,
    default: Date.now,
  },
});


module.exports = mongoose.model('Announcement', AnnouncementSchema);
