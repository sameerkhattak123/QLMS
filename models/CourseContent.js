const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CourseContentSchema = new Schema({
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    file: {
      type: String,
      required : true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Instructor',
      required: true,
    },
    sharedWith: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Instructor',
      },
    ],
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
  });

  
module.exports = mongoose.model('CourseContent', CourseContentSchema);
  