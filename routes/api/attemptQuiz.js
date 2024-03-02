const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const instAuth = require('../../middleware/instAuth');
const Quiz = require('../../models/Quiz');
const Attempt = require('../../models/Attempt');
const Course = require('../../models/Course');
const User = require('../../models/user');

// @route    POST api/quizzes/attempt/:quizId
// @desc     Attempt a quiz
// @access   Private
router.post('/attempt/:quizId', auth, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.quizId);

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    const courseId = quiz.course;
    const isEnrolled = await Course.exists({ _id: courseId, students: req.user });

    if (!isEnrolled) {
      return res.status  (401).json({ msg: 'Not enrolled in the course' });
    }

    const user = await User.findById(req.user); // Assuming you have a User model
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { answers } = req.body || { answers: [] }; // Make answers optional

    let score = 0;
    answers.forEach((answer) => {
      const question = quiz.questions.find((q) => q._id.toString() === answer.question);
      if (question && question.correctOption === answer.selectedOption) {
        score += question.marks;
      }
    });

    const attempt = new Attempt({
      user: req.user,
      userEmail: user.email, // Store the user's email
      quiz: req.params.quizId,
      answers,
      score,
      isPassed: score >= quiz.passingScore,
    });

    await attempt.save();
    quiz.isAttempt = true;
    await quiz.save();

    res.status(200).json({ message: 'Quiz Attempted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});



// @route    GET api/quizzes/attempts/:quizId
// @desc     Get quiz attempt results by quiz ID
// @access   Private
router.get('/attempts/:quizId', auth, async (req, res) => {
  try {
    const quizId = req.params.quizId;
    const user = req.user;

    // Find all attempts by the user on the specified quiz
    const attempts = await Attempt.find({ user, quiz: quizId }).populate({
      path: 'quiz',
      select: 'totalMarks',  // Only include the 'totalMarks' field
    });
      

    if (!attempts || attempts.length === 0) {
      return res.status(404).json({ message: 'No attempts found for the specified quiz.' });
    }
    // const totalMarksFromQuizzes = attempts.map((attempt) => attempt.quiz.totalMarks);

    const results = attempts.map((attempt) => ({
      totalMarks: attempt.quiz.totalMarks,
      attempt,
    }));
    // Return the attempt results
    res.status(200).json( 
      results,);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/instructor/:quizId/attempts', instAuth, async (req, res) => {
  try {
    const quizId = req.params.quizId;

    // Find all attempts for the specified quiz, populate user and select user's email, firstName, and score
    const attempts = await Attempt.find({ quiz: quizId })
      .populate('user', 'email firstName') // Adjust the fields based on your User model
      .select('user score isPassed');

    if (!attempts || attempts.length === 0) {
      return res.status(404).json({ message: 'No attempts found for the specified quiz.' });
    }

    // Create a Map to store the highest score attempt for each user
    const userHighestScores = new Map();

    // Iterate through attempts to find the highest score for each user
    attempts.forEach((attempt) => {
      const userEmail = attempt.user.email;

      // If the user is not in the Map or the current attempt has a higher score, update the Map
      if (!userHighestScores.has(userEmail) || attempt.score > userHighestScores.get(userEmail).score) {
        userHighestScores.set(userEmail, attempt);
      }
    });

    // Convert Map values to an array and send the response
    const highestScoresArray = Array.from(userHighestScores.values());
    res.json({ userHighestScores: highestScoresArray });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});




module.exports = router;
