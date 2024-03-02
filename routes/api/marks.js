const express = require('express');
const router = express.Router();
const instAuth = require('../../middleware/instAuth');
const Course = require('../../models/Course'); // Import the Course model
const Marks = require('../../models/Marks');
const auth = require('../../middleware/auth');
const User = require('../../models/user');

const Assignment = require('../../models/Assignment');
const Quiz = require('../../models/Quiz');


// Route to get titles of assignments and quizzes for a specific course
router.get('/titles/:courseId', async (req, res) => {
  const { courseId } = req.params;

  try {
    // Fetch assignment titles for the specific course
    const assignmentTitles = await Assignment.find({ courseId }, 'title');

    // Fetch quiz titles for the specific course
    const quizTitles = await Quiz.find({ course: courseId }, 'title');

    // Check if marks exist for each title in Marks collection, and filter them out
    const filteredAssignmentTitles = await filterTitles(assignmentTitles, courseId, 'Assignment');
    const filteredQuizTitles = await filterTitles(quizTitles, courseId, 'Quiz');

    res.json({ assignmentTitles: filteredAssignmentTitles, quizTitles: filteredQuizTitles });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

async function filterTitles(titles, courseId, marksType) {
  const filteredTitles = [];

  for (const titleObj of titles) {
    const title = titleObj.title;

    // Check if marks exist for the title in Marks collection
    const marksExist = await Marks.exists({ course: courseId, title, marksType });

    // If marks do not exist, add the title to the filteredTitles array
    if (!marksExist) {
      filteredTitles.push(title);
    }
  }

  return filteredTitles;
}


// DELETE marks by ID
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Find the marks by ID and remove it
    const deletedMarks = await Marks.findByIdAndRemove(id);

    if (!deletedMarks) {
      return res.status(404).json({ error: 'Marks not found' });
    }

    res.json({ message: 'Marks deleted successfully', deletedMarks });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// POST route to upload or create students' marks for a specific course
// POST route to upload or create students' marks for a specific course
router.post('/upload/:courseId', instAuth, async (req, res) => {
  try {
    const courseId = req.params.courseId;

    // Check if the instructor is the creator of the course
    const course = await Course.findById(courseId);

    if (!course || !course.instructor.equals(req.instructor)) {
      return res.status(401).json({ message: 'Unauthorized: Invalid course or instructor' });
    }

    const { title, totalMarks, students, marksType } = req.body;

    // Validate marksType against allowed values
    if (!['Assignment', 'Quiz'].includes(marksType)) {
      return res.status(400).json({ message: 'Invalid marksType. Allowed values: Assignment, Quiz' });
    }
   
    console.log('Received Request Data:', req.body);
   

    // Ensure obtained marks are not greater than total marks
    for (const student of students) {
      if (student.obtainedMarks > totalMarks) {
        return res.status(400).json({ message: 'Obtained marks cannot be greater than total marks' });
      }
    }
    
    // Check if a marks document with the same title already exists for the course
    const existingMarks = await Marks.findOne({ course: courseId, title });

    if (!existingMarks) {
      // Create a new Marks instance if no existing marks found
      const marks = new Marks({
        course: courseId,
        title,
        totalMarks,
        students,
        marksType,
      });

      // Save the new marks to the database
      await marks.save();

      return res.status(201).json({ message: 'Marks uploaded successfully' });
    }

    // If a marks document with the same title exists
    return res.status(409).json({ message: 'Marks with the same title already exist for this course' });

  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});


router.put('/edit/:marksId', instAuth, async (req, res) => {
  try {
    const marksId = req.params.marksId;

    // Check if the instructor is the creator of the marks
    const marks = await Marks.findById(marksId);
    if (!marks) {
      return res.status(404).json({ message: 'Marks not found' });
    }

    // Fetch the associated course
    const course = await Course.findById(marks.course);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if the instructor is the creator of the course
    if (!course.instructor.equals(req.instructor)) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { totalMarks, students, marksType } = req.body;

   

    // Update existing students in marks
    students.forEach((student) => {
      const existingStudent = marks.students.find((s) => s.student.equals(student.student));

      if (existingStudent) {
        existingStudent.obtainedMarks = student.obtainedMarks;
        existingStudent.comments = student.comments;
      }
    });

    // Update other properties if needed
    marks.totalMarks = totalMarks;
    marks.marksType = marksType;

    // Save the updated marks to the database
    await marks.save();

    res.status(200).json({ message: 'Marks updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});



  // GET route to retrieve marks by ID
router.get('/:marksId', instAuth, async (req, res) => {
  try {
    const marksId = req.params.marksId;

    // Find marks by their ID and populate the student field to get the user's firstName
    const marks = await Marks.findById(marksId)
      .populate({
        path: 'students.student',
        model: 'User', // Specify the model to use for population (User model)
        select: 'firstName', // Select the 'firstName' field of the user
      })
      .exec();

    if (!marks) {
      return res.status(404).json({ message: 'Marks not found' });
    }

    res.json(marks);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

  
// GET route to retrieve all marks of a specific course
router.get('/course/:courseId', instAuth, async (req, res) => {
  try {
      const courseId = req.params.courseId;
      const instructorId = req.instructor;

      // Check if the instructor is the creator of the course
      const course = await Course.findById(courseId);

      if (!course || !course.instructor.equals(instructorId)) {
          return res.status(401).json({ message: 'Unauthorized' });
      }

      // Find all marks for the specified course and populate the 'student' field with 'firstName'
      const marks = await Marks.find({ course: courseId }).populate('students.student', 'firstName');

      if (!marks) {
          return res.status(404).json({ message: 'Marks not found for the specified course' });
      }

      res.json(marks);
  } catch (err) {
      console.error(err);
      res.status(500).send('Server Error');
  }
});
  
  
  // GET route to retrieve enrolled users' information for a specific course
router.get('/enrolled/:courseId', instAuth, async (req, res) => {
    try {
      const courseId = req.params.courseId;
  
      // Check if the instructor is the creator of the course
      const course = await Course.findById(courseId);
      if (!course || !course.instructor.equals(req.instructor)) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
  
      // Fetch enrolled users' information (user IDs, first names, last names, and emails)
      const enrolledUsersInfo = await User.find({ _id: { $in: course.students } }, 'firstName lastName email');
  
      res.json(enrolledUsersInfo);
    } catch (err) {
      console.error(err);
      res.status(500).send('Server Error');
    }
  });

// @route    GET api/marks/:courseId
// @desc     Get all marks for a specific course and logged-in user, separated by marksType
// @access   Private
router.get('/user/:courseId', auth, async (req, res) => {
  try {
    const userId = req.user;
    const courseId = req.params.courseId;

    // Find all "Quiz" marks for the specific course and user
    const quizMarks = await Marks.find({
      course: courseId,
      'students.student': userId,
      marksType: 'Quiz', // Use 'Quiz' with a capital letter
    });

    // Find all "Assignment" marks for the specific course and user
    const assignmentMarks = await Marks.find({
      course: courseId,
      'students.student': userId,
      marksType: 'Assignment', // Use 'Assignment' with a capital letter
    });

    const marksData = {
      quiz: [],
      assignment: [],
    };

    // Extract relevant information from "Quiz" marks
    marksData.quiz = quizMarks.map((mark) => ({
      marksType: mark.marksType, // Include marksType
      title: mark.title,
      totalMarks: mark.totalMarks,
      uploadDate: mark.uploadDate,
      obtainedMarks: mark.students.find((student) => student.student.toString() === userId)
        .obtainedMarks,
      comments: mark.students.find((student) => student.student.toString() === userId).comments,
    }));

    // Extract relevant information from "Assignment" marks
    marksData.assignment = assignmentMarks.map((mark) => ({
      marksType: mark.marksType, // Include marksType
      title: mark.title,
      totalMarks: mark.totalMarks,
      uploadDate: mark.uploadDate,
      obtainedMarks: mark.students.find((student) => student.student.toString() === userId)
        .obtainedMarks,
      comments: mark.students.find((student) => student.student.toString() === userId).comments,
    }));

    res.json(marksData);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
