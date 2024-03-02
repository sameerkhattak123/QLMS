const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../../middleware/auth');
const instAuth = require('../../middleware/instAuth');

const checkObjectId = require('../../middleware/checkObjectId');
const Enrollment =require('../../models/Enrollment');
const Instructor = require('../../models/instructor');
const Course = require('../../models/Course');
const User = require('../../models/user');
const Profile = require('../../models/Profile');

// @route    Post api/Enrollment
// @desc     Enroll in Course
// @access   Private
// POST route to enroll in a course
router.post('/course/:id/enroll',auth, async (req, res) => {
  const courseId = req.params.id;
  const studentId = req.user;
  try {
    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).send('Course not found');
    }

    // Check if student exists
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(400).send('Invalid student ID');
    }

    // Check if student is already enrolled in the course
    const enrollment = await Enrollment.findOne({ course: courseId, student: studentId });
    if (enrollment) {
      return res.status(400).send('Student is already enrolled in the course');
    }

    // Create enrollment
    const newEnrollment = new Enrollment({
      course: courseId,
      student: studentId,
    });
    await newEnrollment.save();

    // Add enrollment to course's enrolledStudents array
    course.students.push(studentId);
    await course.save();

    res.status(201).send('Enrolled successfully');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// @route    DELETE api/courses/:courseId/students/me
// @desc     Leave a course
// @access   Private (Student)

router.delete('/:courseId/students/me', auth, async (req, res) => {
    try {
      const courseId = req.params.courseId;
      const studentId = req.user;
  
      // Check if the student is enrolled in the course
      const enrollment = await Enrollment.findOne({
        course: courseId,
        student: studentId
      });
      if (!enrollment) {
        return res.status(404).send('Enrollment not found');
      }
  
      // Remove the student from the course
      await Course.findByIdAndUpdate(courseId, {
        $pull: { students: studentId }
      });
  
      // Delete the enrollment
      await Enrollment.findByIdAndDelete(enrollment._id);
  
      res.send('You have left the course');
    } catch (error) {
      console.error(error);
      res.status(500).send('Server error');
    }
  });

// @route    GET api/course/:courseId/students
// @desc     Get enrolled students' details for a course
// @access   Private (Instructor)
// @route    GET api/course/:courseId/students
// @desc     Get enrolled students' details for a course
// @access   Private (Instructor)
router.get('/:courseId/students', instAuth, async (req, res) => {
  try {
    const courseId = req.params.courseId;

    // Find the course
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).send('Course not found');
    }

    // Check if the authenticated instructor owns the course
    if (course.instructor.toString() !== req.instructor) {
      return res.status(401).send('Unauthorized');
    }

    // Find the enrolled students' IDs for the course
    const studentIds = course.students;

    // Fetch the first found profile for each user from the Profile model
    const firstFoundProfiles = await Profile.aggregate([
      { $match: { user: { $in: studentIds } } },
      { $sort: { date: 1 } }, // Sort profiles by date in ascending order
      {
        $group: {
          _id: '$user',
          firstFoundProfile: { $first: '$$ROOT' } // Select the first found profile for each user
        }
      },
      {
        $project: {
          _id: 0,
          user: '$firstFoundProfile.user',
          userName: '$firstFoundProfile.userName',
          email: '$firstFoundProfile.email',
          profilepicture: {
            $cond: {
              if: { $ne: ['$firstFoundProfile.profilepicture', null] },
              then: {
                $concat: [
                  `${req.protocol}://${req.get('host')}/uploads/profilePictures/`,
                  '$firstFoundProfile.profilepicture'
                ]
              },
              else: null
            }
          },
          profileId: '$firstFoundProfile._id' // Add profile._id to the projection
        }
      }
    ]);

    res.json(firstFoundProfiles);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});



  
// @route    GET api/enrollment courses
// @desc     Get courses in which student is enrolled
// @access   Private

router.get('/courses/enrolled', auth, async (req, res) => {
  try {
    const courses = await Course.find({ students: req.user });
    res.json(courses);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route    GET api/courses/:id
// @desc     Get course by ID
// @access   Private
router.get('/:id', auth, checkObjectId('id'), async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ msg: 'Post not found' });
    }

    res.json(course);
  } catch (err) {
    console.error(err.message);

    res.status(500).send('Server Error');
  }
});

// @route    DELETE api/courses/:courseId/students/:studentId
// @desc     Remove a student from a course
// @access   Private (Instructor)

router.delete('/:courseId/student/:studentId', instAuth, async (req, res) => {
    try {
      const courseId = req.params.courseId;
      const studentId = req.params.studentId;
  
      // Check if the instructor owns the course
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).send('Course not found');
      }
      if (course.instructor.toString() !== req.instructor) {
        return res.status(401).send('Unauthorized');
      }
  
      // Check if the student is enrolled in the course
      const enrollment = await Enrollment.findOne({
        course: courseId,
        student: studentId
      });
      if (!enrollment) {
        return res.status(404).send('Enrollment not found');
      }
  
      // Remove the student from the course
      await Course.findByIdAndUpdate(courseId, {
        $pull: { students: studentId }
      });
  
      // Delete the enrollment
      await Enrollment.findByIdAndDelete(enrollment._id);
  
      res.send('Student removed from course');
    } catch (error) {
      console.error(error);
      res.status(500).send('Server error');
    }
  });
  


module.exports = router;
