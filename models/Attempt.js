const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AttemptSchema = new Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  userEmail:{
    type: String,
    required:true,
  },
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true,
  },
  answers: [
    {
      question: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question',
        required: true,
      },
      selectedOption: {
        type: Number,
        required: false,
      },
    },
  ],
  score: {
    type: Number,
    required: true,
  },
  isPassed: {
    type: Boolean,
    required: true,
  },
});

module.exports = mongoose.model('Attempt', AttemptSchema);
