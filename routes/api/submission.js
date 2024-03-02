const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const checkObjectId = require('../../middleware/checkObjectId');
const auth = require('../../middleware/auth');
const instAuth = require('../../middleware/instAuth');
const User = require('../../models/user');

// Import models
const Assignment = require('../../models/Assignment');
const Course = require('../../models/Course');
const Submission = require('../../models/Submission');


// Set storage engine for submissions
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Use the folder of the specific assignment
    const folder = path.join('public', 'uploads', `${req.assignment.title.replace(/ /g, '_')}_${req.params.courseId}`);
    console.log('Folder Path:', folder);
    cb(null, folder);
  },
  filename: function (req, file, cb) {
    // Use the original file name
    cb(null, file.originalname);
  }
});

// Init upload for submissions
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
// Submit an assignment solution
// Submit an assignment solution
router.post('/:courseId/assignments/:assignmentId/submit', auth, getAssignment, checkDuplicateSubmission, async (req, res) => {
  // Use the `req.assignment` variable to get the assignment object
  const assignment = req.assignment;
  const courseId = req.params.courseId;

  // Fetch the user's first name, last name, and email from the User model
  try {
    const user = await User.findById(req.user);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const studentName = `${user.firstName} ${user.lastName}`;
    const email = user.email;

    // Upload the file using Multer middleware
    upload(req, res, async (err) => {
      if (err) {
        console.error('Multer Upload Error:', err);

        return res.status(400).json({ error: err.message });
      }
      if (!req.file) {
        return res.status(400).json({ message: 'No file attached' });
      }

      // Check if file name is valid
      if (!req.assignment.title || !req.file.originalname) {
        return res.status(400).json({ message: 'Invalid file name' });
      }

      // Create a new submission object
      const submission = new Submission({
        studentId: req.user,
        studentName: studentName, // Concatenate first name and last name
        email: email, // User's email
        assignmentId: req.params.assignmentId,
        // Use the relative path to the submitted file
        file: path.join(`${req.assignment.title.replace(/ /g, '_')}_${req.params.courseId}`, req.file.originalname),
        submittedAt: Date.now(),
      });
      console.log(req.body);

      // Save the submission to the database
      try {
        await submission.save();

        res.status(200).json({ message: 'Assignment submitted successfully' });
      } catch (err) {
        return res.status(400).json({ error: err.message });
      }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server Error' });
  }
});
  
  function getAssignment(req, res, next) {
    Assignment.findOne({ _id: req.params.assignmentId, courseId: req.params.courseId }, function (err, assignment) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      if (!assignment) {
        return res.status(404).json({ message: 'Assignment not found' });
      }
      req.assignment = assignment;
      next();
    });
  }
  
  function checkDuplicateSubmission(req, res, next) {
    Submission.findOne({ studentId: req.user, assignmentId: req.params.assignmentId }, function (err, submission) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      if (submission) {
        return res.status(400).json({ message: 'You have already submitted this assignment' });
      }
      next();
    });
  }

  //Get Submitted Solution of Specific Assignment
  router.get('/:courseId/assignments/:assignmentId/submissions', instAuth, getAssignment, function (req, res) {
    const assignmentId = req.params.assignmentId;
  
    // Find all submissions for the given assignmentId
    Submission.find({ assignmentId: assignmentId })
       
      .exec(function (err, submissions) {
        if (err) {
          return res.status(500).json({ error: 'Server Error' });
        }
        if (!submissions || submissions.length === 0) {
          return res.status(404).json({ message: 'Submissions not found for this assignment' });
        }
  
        res.status(200).json({ submissions: submissions });
      });
  });
  // Download a submission file
router.get('/download/:submissionId', auth || instAuth, async (req, res) => {
  try {
    // Find the submission by submissionId
    const submission = await Submission.findById(req.params.submissionId);
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Check if the authenticated instructor is allowed to access this submission
    

    // Construct the file path
    const filePath = path.join('public', 'uploads', submission.file);

    // Check if the file exists
    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        return res.status(404).json({ message: 'File not found' });
      }

      // Download the file
      res.download(filePath, (err) => {
        if (err) {
          return res.status(500).json({ message: 'Error downloading file' });
        }
      });
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server Error' });
  }
});
  

  
  module.exports = router;
