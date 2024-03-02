const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const QuizSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Instructor',
    required: true,
  },
  timeLimit: {
    type: Number,
    required: true,
  },
  passingScore: {
    type: Number,
    required: true,
  },
  totalMarks:{
    type:Number,
    required:true
  },
  questions: [
    {
      text: {
        type: String,
        required: true,
      },
      options: [
        {
          option: {
            type: String,
            required: true,
          },
        },
      ],
      correctOption: {
        type: Number,
        required: true,
      },
      marks: {
        type: Number,
        required: true,
      },

    },
  ],
  isAttempt: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model('Quiz', QuizSchema);

