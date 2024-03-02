const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ForumSchema = new Schema({
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
  body: {
    type: String,
    required: true,
  },
  firstName: {
    type: String,
    required: true,
  },
  profilePicture: {
    type: String,
    required: true,
  },
  likes: [
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
    },
  ],
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
      firstName: {
        type: String,
        required: true,
      },
      body: {
        type: String,
        required: true,
      },
      profilePicture: {
        type: String,
        required: true,
      },
      likes: [
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
        },
      ],
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

module.exports = mongoose.model('Forum', ForumSchema);
