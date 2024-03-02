const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const instAuth = require('../../middleware/instAuth');
const auth = require('../../middleware/auth');
const Quiz = require('../../models/Quiz');
const Course = require('../../models/Course');
const Enrollment = require('../../models/Enrollment');
const Notification = require ('../../models/Notification');

// @route    POST api/quizzes/:courseId
// @desc     Create a new quiz for a specific course
// @access   Private (Instructor)
router.post(
  '/:courseId/',
  instAuth,
  [
    check('title', 'Title is required').notEmpty(),
    check('timeLimit', 'Time limit is required').isNumeric(),
    check('passingScore', 'Passing score is required').isNumeric(),
    check('questions', 'Questions must be provided').isArray({ min: 1 }),
    check('questions.*.text', 'Question text is required').notEmpty(),
    check('questions.*.options', 'Question options must be provided').isArray({ min: 2 }),
    check('questions.*.correctOption', 'Correct option index is required').isNumeric(),
    check('questions.*.marks', 'Question marks must be provided').isNumeric(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { title, timeLimit, passingScore, questions } = req.body;
      const courseId = req.params.courseId;
      const instructor = req.instructor;

      const course = await Course.findOne({ _id: courseId, instructor: req.instructor });
      if (!course) {
        return res.status(401).json({ msg: 'Not authorized to create quiz for this course' });
      }

      const enrollments = await Enrollment.find({ courseId: courseId });

      // Calculate total marks by summing up question marks
      const totalMarks = questions.reduce((acc, question) => acc + question.marks, 0);

      const quiz = new Quiz({
        title,
        course: courseId,
        instructor,
        timeLimit,
        passingScore,
        questions,
        totalMarks, // Include the calculated total marks in the quiz object
      });
      console.log(quiz.questions);

      await quiz.save();
      const courseEnrollments = await Enrollment.find({ course: courseId });

      // Fetch course details
      if(courseEnrollments.length>0){
      const course = await Course.findById(courseId);
      // Create and save notifications for each enrolled user (assuming you have a courseEnrollments array)
      const notifications = courseEnrollments.map((enrollment) => {
        return new Notification({
          message: `New Quiz uploaded ${quiz.title} for the course ${course.name} by ${course.instructorName}`,
          recipient: enrollment.student,
          contentId: quiz._id,
        }).save();
      });

      await Promise.all(notifications);
      
    }
      res.status(200).json({ message: 'Quiz uploaded successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).send('Server Error');
    }
  }
);

// @route    PUT api/quizzes/:quizId
// @desc     Update an existing quiz
// @access   Private (Instructor)
router.put('/:quizId', instAuth, async (req, res) => {
  try {
    // Check if the provided quiz ID is valid
    const quizId = req.params.quizId;
    if (!quizId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ msg: 'Invalid quiz ID' });
    }

    // Check if the instructor owns the quiz
    const quiz = await Quiz.findOne({ _id: quizId, instructor: req.instructor });
    if (!quiz) {
      return res.status(401).json({ msg: 'Not authorized to update this quiz' });
    }

    // Extract data from the request body
    const { title, timeLimit, passingScore, questions } = req.body;

    // Update the quiz fields
    quiz.title = title;
    quiz.timeLimit = timeLimit;
    quiz.passingScore = passingScore;
    quiz.questions = questions;

    // Save the updated quiz to the database
    await quiz.save();

    res.status(200).json({ message: 'Quiz updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// @route    GET api/quizzes/course/:courseId
// @desc     Get basic information of all quizzes of a specific course
// @access   Private
router.get('/course/:courseId', auth||instAuth, async (req, res) => {
  try {
    const quizzes = await Quiz.find({ course: req.params.courseId });
    const user = req.user;
    const isEnrolled = await Course.find({ course: req.params.courseId, students: req.user });
    if (!isEnrolled) {
      return res.status(401).json({ msg: 'Not enrolled in this course' });
    }
    // Return only basic information about quizzes
    const basicQuizzes = quizzes.map(quiz => ({
      _id: quiz._id,
      title: quiz.title,
    }));

    res.json(basicQuizzes);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});




// @route    GET api/quizzes/:quizId
// @desc     Get quiz by ID
// @access   Private
router.get('/:quizId', auth, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.quizId)
    
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }
    
    const courseId = quiz.course;
    const user = req.user; 

    const isEnrolled = await Course.exists({ _id: courseId, students: req.user });
    if (!isEnrolled) {
      return res.status(401).json({ msg: 'Not enrolled in the course' });
    }
    // Return the quiz details
    res.json(quiz);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// @route    GET api/quizzes/:quizId
// @desc     Get quiz by ID
// @access   Private
router.get('/instructor/:quizId', instAuth, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.quizId)
    
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }
    
   
    // Return the quiz details
    res.json(quiz);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});
// @route    DELETE api/quizzes/:quizId
// @desc     Delete a quiz by ID (Instructor's own quiz)
// @access   Private (Instructor)
router.delete('/:quizId', instAuth, async (req, res) => {
  try {
    const quizId = req.params.quizId;
    const instructorId = req.instructor;

    // Find the quiz by ID and check if the instructor is the creator
    const quiz = await Quiz.findOne({ _id: quizId, instructor: instructorId });

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found or not authorized' });
    }

    // Delete the quiz
    await quiz.remove();

    res.json({ message: 'Quiz deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});




module.exports = router;
