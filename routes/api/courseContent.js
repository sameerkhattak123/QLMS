const express = require('express');
const router = express.Router();
const instAuth = require('../../middleware/instAuth');
const auth = require('../../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const CourseContent = require('../../models/CourseContent');
const Course = require('../../models/Course');
const Instructor = require('../../models/instructor');
const Notification = require('../../models/Notification');
const Enrollment = require('../../models/Enrollment');


// Set up Multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      const courseId = req.params.courseId;
      const uploadPath = path.join('public','uploads', courseId);
      fs.mkdirSync(uploadPath, { recursive: true });
      cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
      const extname = path.extname(file.originalname);
      const fileName = file.originalname.replace(extname, '').toLowerCase().split(' ').join('-');
      cb(null, fileName + '-' + Date.now() + extname);
    },
  });
  

// File filter function
const fileFilter = (req, file, cb) => {
  // Allow only specific file types (PDF, Word, PPTX)
  const allowedFileTypes = ['.pdf', '.doc', '.docx', '.ppt', '.pptx','.mp4', '.avi', '.mov'];
  const extname = path.extname(file.originalname).toLowerCase();
  if (allowedFileTypes.includes(extname)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, Word, PPTX, MP4, AVI, and MOV files are allowed.'));
  }
};

// Set up Multer upload
const upload = multer({ storage: storage, fileFilter: fileFilter });

//Post Route/Api
// POST route to upload a file or create course content
//Uplaod Course Content in a Course
router.post('/upload/:courseId', instAuth, upload.single('file'), async (req, res) => {
  try {
    const { title, description } = req.body;
    const courseId = req.params.courseId;

    let filePath = '';
    if (req.file) {
      filePath = req.file.path;
    }

    // Create a new CourseContent instance
    const courseContent = new CourseContent({
      title,
      description,
      file: filePath,
      createdBy: req.instructor,
      sharedWith: [],
      course: courseId,
    });

    // Save the course content to the database
    await courseContent.save();
    const courseEnrollments = await Enrollment.find({ course: courseId });

      // Fetch course details
      if (courseEnrollments.length > 0) {
        const course = await Course.findById(courseId);

        // Create and save notifications for each enrolled user
        const notifications = courseEnrollments.map((enrollment) => {
          return new Notification({
            message: `New Content Uploaded in Course ${course.name} by ${course.instructorName}`,
            recipient: enrollment.student,
            contentId: courseContent._id,
          }).save();
        });

        await Promise.all(notifications);
      }

    res.status(200).json({ message: 'Course Content uploaded successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// GET route to retrieve all course content within a course by instructor and only only who created
router.get('/course/:courseId', instAuth, async (req, res) => {
  try {
      const courseId = req.params.courseId;
      const instructorId = req.instructor;

      // Find the course to check if the instructor created it
      const course = await Course.findById(courseId);
      // Find all course content for the specified course
      const courseContent = await CourseContent.find({ course: courseId });

      if (!courseContent.createdBy == instructorId) {
          return res.status(401).json({ message: 'Not authorized to access this course content.' });
      }

      res.json(courseContent);
  } catch (err) {
      console.error(err);
      res.status(500).send('Server Error');
  }
});

// GET route to retrieve a specific course content by its ID
router.get('/:contentId', auth, async (req, res) => {
  try {
    const contentId = req.params.contentId;

    // Find the course content by its ID
    const courseContent = await CourseContent.findById(contentId);

    if (!courseContent) {
      return res.status(404).json({ message: 'Course content not found' });
    }

    // Check if the user is enrolled in the course associated with the course content
    const courseId = courseContent.course;
    const isEnrolled = await Course.exists({ _id: courseId, students: req.user });

    if (!isEnrolled) {
      return res.status(401).json({ message: 'Not authorized to access this course content.' });
    }

    res.json(courseContent);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// GET route to retrieve a specific course content by its ID
router.get('/:contentId/instructor', instAuth, async (req, res) => {
  try {
    const contentId = req.params.contentId;

    // Find the course content by its ID
    const courseContent = await CourseContent.findById(contentId);

    if (!courseContent) {
      return res.status(404).json({ message: 'Course content not found' });
    }

    // Check if the instructor is the creator of the associated course
    const courseId = courseContent.course;
    const course = await Course.findById(courseId);

    // if (!course) {
    //   return res.status(404).json({ message: 'Course not found' });
    // }

    // if (!course.instructor.equals(req.instructor)) {
    //   return res.status(401).json({ message: 'Not authorized to access this course content.' });
    // }

    res.json(courseContent);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// GET route to retrieve all course content within a course by User and only only who is enrolled in course
router.get('/course/:courseId', auth, async (req, res) => {
  try {
      const courseId = req.params.courseId;
      const instructorId = req.instructor;

      // Find the course to check if the instructor created it
      const course = await Course.findById(courseId);
      // Find all course content for the specified course
      const courseContent = await CourseContent.find({ course: courseId });

      if (!courseContent.createdBy == instructorId) {
          return res.status(401).json({ message: 'Not authorized to access this course content.' });
      }

      

      res.json(courseContent);
  } catch (err) {
      console.error(err);
      res.status(500).send('Server Error');
  }
});
// GET route to retrieve all course content within a course by User and only those who are enrolled in the course
router.get('/course/:courseId/student', auth, async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const userId = req.user;

    // Find the course to check if the user is enrolled in it
    const course = await Course.findById(courseId);

    // Check if the user is enrolled in the course
    if (!course.students.includes(userId)) {
      return res.status(401).json({ message: 'Not authorized to access this course content.' });
    }

    // Find all course content for the specified course
    const courseContent = await CourseContent.find({ course: courseId });

    res.json(courseContent);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});


  // GET route to download course content file
  router.get('/download/:courseContentId', auth || instAuth,async (req, res) => {
    try {
      const courseContentId = req.params.courseContentId;
  
      // Find the course content by ID
      const courseContent = await CourseContent.findById(courseContentId);
  
      if (!courseContent) {
        return res.status(404).json({ message: 'Course content not found' });
      }
  
      // Generate the file download response
      const filePath = courseContent.file;
      res.download(filePath);
    } catch (err) {
      console.error(err);
      res.status(500).send('Server Error');
    }
  });


// POST route to share course content with multiple instructors
router.post('/share/:courseContentId/:instructorIds', instAuth, async (req, res) => {
  try {
    const courseContentId = req.params.courseContentId;
    const instructorIds = req.params.instructorIds.split(',');

    // Find the course content by its ID
    const courseContent = await CourseContent.findById(courseContentId).populate('createdBy').exec();
    if (!courseContent) {
      return res.status(404).json({ message: 'Course content not found' });
    }

    // Check if the current instructor is the creator of the course content
    if (!courseContent.createdBy.equals(req.instructor)) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Check if the instructor IDs to be shared with exist
    const instructors = await Instructor.find({ _id: { $in: instructorIds } });
    if (instructors.length !== instructorIds.length) {
      return res.status(404).json({ message: 'One or more instructors not found' });
    }

    // Save notifications asynchronously
    const notifications = instructorIds.map((instructorId) => {
      if (!courseContent.sharedWith.includes(instructorId)) {
        const notification = new Notification({
          message: `You have been shared course content: ${courseContent.title} by : ${courseContent.createdBy.firstName}`,
          recipient: instructorId,
          contentId: courseContentId,
        });
        return notification.save();
      }
    });

    await Promise.all(notifications);

    // Add the instructor IDs to the sharedWith array of the course content
    instructorIds.forEach((instructorId) => {
      if (!courseContent.sharedWith.includes(instructorId)) {
        courseContent.sharedWith.push(instructorId);
      }
    });

    await courseContent.save();

    res.status(200).json({ message: 'Course Content Shared successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});



// // POST route to share a course content with another instructor
// router.post('/share/:courseContentId/:instructorId', instAuth, async (req, res) => {
//   try {
//       const courseContentId = req.params.courseContentId;
//       const instructorId = req.params.instructorId;

//       // Find the course content by its ID
//       const courseContent = await CourseContent.findById(courseContentId);
//       if (!courseContent) {
//           return res.status(404).json({ message: 'Course content not found' });
//       }

//       // Check if the current instructor is the creator of the course content
//       if (!courseContent.createdBy==(req.instructor)) {
//           return res.status(401).json({ message: 'Unauthorized' });
//       }

//       // Check if the instructor to be shared with exists
//       const instructor = await Instructor.findById(instructorId);
//       if (!instructor) {
//           return res.status(404).json({ message: 'Instructor not found' });
//       }

//       // Add the instructor's ID to the sharedWith array of the course content
//       if (!courseContent.sharedWith.includes(instructorId)) {
//           courseContent.sharedWith.push(instructorId);
//           await courseContent.save();
//       }

//       res.status(200).json({ message: 'Course Content Shared successfully' });
//   } catch (err) {
//       console.error(err);
//       res.status(500).send('Server Error');
//   }
// });


// Route Handler
router.get('/shared/me', instAuth, async (req, res) => {
  try {
    const loggedInInstructorId = req.instructor;
    console.log('Logged User ID:', loggedInInstructorId);

    // Find all shared course content for the current instructor using the createdBy field
    const sharedCourseContent = await CourseContent
      .find({ sharedWith: loggedInInstructorId })
      .populate('createdBy', 'firstName'); // Add fields you want to select

    res.json(sharedCourseContent);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});



  

  
  // GET route to download shared course content file
  router.get('/download/:courseContentId', instAuth, async (req, res) => {
    try {
      const courseContentId = req.params.courseContentId;
  
      // Find the shared course content by ID
      const courseContent = await CourseContent.findById(courseContentId);
  
      if (!courseContent) {
        return res.status(404).json({ message: 'Course content not found' });
      }
  
      // Check if the course content is shared with the current instructor
      if (!courseContent.sharedWith.includes(req.instructor)) {
        return res.status(403).json({ message: 'You do not have permission to access this content' });
      }
  
      // Generate the file download response
      const filePath = courseContent.file;
      res.download(filePath);
    } catch (err) {
      console.error(err);
      res.status(500).send('Server Error');
    }
  });
  
  // DELETE route to delete a course content
router.delete('/:courseContentId', instAuth, async (req, res) => {
    try {
      const courseContentId = req.params.courseContentId;
  
      // Find the course content by ID
      const courseContent = await CourseContent.findById(courseContentId);
  
      if (!courseContent) {
        return res.status(404).json({ message: 'Course content not found' });
      }
  
      // Check if the user is the creator of the course content
      if (courseContent.createdBy.toString() !== req.instructor) {
        return res.status(401).json({ message: 'Not authorized to delete this course content' });
      }
  
      // Delete the file associated with the course content
      if (courseContent.file) {
        fs.unlinkSync(courseContent.file);
      }
  
      // Delete the course content from the database
      await courseContent.remove();
  
      res.json({ message: 'Course content deleted successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).send('Server Error');
    }
  });

module.exports = router;
