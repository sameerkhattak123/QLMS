const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const instAuth = require('../../middleware/instAuth');
const auth  = require('../../middleware/auth');
const checkObjectId = require('../../middleware/checkObjectId');

// Import models
const Assignment = require('../../models/Assignment');
const Course = require('../../models/Course');
const Submission = require('../../models/Submission');
const Enrollment = require('../../models/Enrollment');
const Notification = require ('../../models/Notification');

// Set storage engine
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    // Create a folder for each assignment based on title and course ID
    const folder = path.join('public', 'uploads', `${req.body.title.replace(/ /g, '_')}_${req.params.courseId}`);
    fs.mkdirSync(folder, { recursive: true });
    cb(null, folder);
  },
  filename: function(req, file, cb) {
    // Use the original file name
    cb(null, file.originalname);
  }
});

// Init upload
const upload = multer({
  storage: storage,
  limits: { fileSize: 10000000 },
  fileFilter: function(req, file, cb) {
    checkFileType(file, cb);
  }
}).single('file');

// Check file type
function checkFileType(file, cb) {
  // Allowed file extensions
  const filetypes = /ppt|pptx|doc|docx|pdf/;
  // Check file extension
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  // Check mime type
  const mimetype = filetypes.test(file.mimetype);
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(null,false);
    cb('Error: Invalid file type');
  }
}

// Instructor uploads an assignment
router.post('/:courseId/assignments', instAuth, async function (req, res) {
  upload(req, res, async function (err) {
    try {
      if (err) {
        return res.status(400).json({ error: err });
      }

      const courseId = req.params.courseId;
      const dueDate = new Date(req.body.dueDate);

      // Check if the due date is in the future
      if (dueDate <= new Date()) {
        return res.status(400).json({ error: 'Due date must be in the future' });
      }

      // Check if an assignment with the same title and course ID already exists
      const existingAssignment = await Assignment.findOne({ title: req.body.title, courseId: courseId });

      if (existingAssignment) {
        return res.status(400).json({ error: 'An assignment with the same title already exists for this course' });
      }

      // Create new assignment object
      const assignment = new Assignment({
        title: req.body.title,
        description: req.body.description,
        dueDate: req.body.dueDate,
        courseId: courseId,
        instructor: req.instructor,
        // Use the relative path to the uploaded file
        file: path.join(`${req.body.title.replace(/ /g, '_')}_${courseId}`, req.file.originalname)
      });

      // Save assignment to the database
      await assignment.save();

      // Get all users enrolled in the course
      const courseEnrollments = await Enrollment.find({ course: courseId });

      // Fetch course details
      if (courseEnrollments.length > 0) {
        const course = await Course.findById(courseId);

        // Create and save notifications for each enrolled user
        const notifications = courseEnrollments.map((enrollment) => {
          return new Notification({
            message: `New assignment uploaded ${assignment.title} for the course ${course.name} by ${course.instructorName}. Deadline: ${assignment.dueDate}`,
            recipient: enrollment.student,
            contentId: assignment._id,
          }).save();
        });

        await Promise.all(notifications);
      }
      res.status(200).json({ message: 'Assignment uploaded successfully' });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });
});


// Get assignments for a specific course
router.get('/:courseId/assignments', auth|| instAuth, async function(req, res) {
    try {
      const courseId = req.params.courseId;
  
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }
  
      const assignments = await Assignment.find({ courseId });
  
      if (assignments.length === 0) {
        return res.status(200).json({ message: 'No assignments uploaded yet' });
      }
  
      res.status(200).json(assignments);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

 // @route    GET api/assignments/:assignmentId/student
// @desc     Get a specific assignment by ID for a student and show submission status
// @access   Private (Student)
router.get('/:assignmentId/student', auth, async (req, res) => {
  try {
    const studentId = req.user;
    const assignmentId = req.params.assignmentId;

    // Find the specific assignment by ID
    const assignment = await Assignment.findById(assignmentId).populate('instructor', 'firstName lastName');

    if (!assignment) {
      return res.status(404).json({ msg: 'Assignment not found' });
    }

    // Find submissions for the specific assignment and student
    const submission = await Submission.findOne({ studentId, assignmentId });

    // Prepare the response with assignment details and submission status
    const assignmentWithStatus = {
      _id: assignment._id,
      title: assignment.title,
      description: assignment.description,
      dueDate: assignment.dueDate,
      instructor: `${assignment.instructor.firstName} ${assignment.instructor.lastName}`,
      file: assignment.file,
      status: submission ? 'Submitted' : 'Not Submitted',
    };

    res.json(assignmentWithStatus);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

  

// Download an assignment file
router.get('/:courseId/assignments/:assignmentId', auth || instAuth, async function (req, res) {
  try {
    const assignment = await Assignment.findOne({ _id: req.params.assignmentId, courseId: req.params.courseId });
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Get the absolute path to the file
    const filePath = path.join('public', 'uploads', assignment.file);

    // Check if file exists
    fs.access(filePath, fs.F_OK, function (err) {
      if (err) {
        res.status(404).json({ error: 'File not found' });
      } else {
        // Set the Content-Disposition header to specify the original filename
        const originalFilename = assignment.file.split('/').pop();
        res.set('Content-Disposition', `attachment; filename="${originalFilename}"`);

        // Stream the file to the response
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
      }
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// @route    DELETE api/assignments/:id
// @desc     Delete an assignment
// @access   Private (Instructor)
router.delete('/:id', instAuth, checkObjectId('id'), async (req, res) => {
  try {
    // Find the assignment by ID
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({ msg: 'Assignment not found' });
    }

    // Check if the user is the instructor who created the assignment
    if (String(assignment.instructor) !== String(req.instructor)) {
      return res.status(401).json({ msg: 'Not authorized to delete this assignment' });
    }

    // Add debugging statements
    console.log('Assignment:', assignment);
    console.log('Assignment File:', assignment.file);

    // Replace backslashes with forward slashes
    const filePathWithForwardSlashes = assignment.file.replace(/\\/g, '/');

    // Get the folder path containing the assignment file
    const folderPath = path.join('public', 'uploads', filePathWithForwardSlashes.split('/')[1]);

    // Check if the folder exists
    if (fs.existsSync(folderPath)) {
      // Remove the folder containing the assignment file
      fs.rmdirSync(folderPath, { recursive: true });
    }

    // Remove the assignment from the database
    await assignment.remove();

    res.json({ msg: 'Assignment deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});




module.exports = router;
