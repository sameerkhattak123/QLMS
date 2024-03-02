const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const instAuth = require('../../middleware/instAuth');
const auth = require('../../middleware/auth');
const checkObjectId = require('../../middleware/checkObjectId');
const instructorProfile = require('../../models/instructorProfile');

const Instructor = require('../../models/instructor');
const Course = require('../../models/Course');


// @route    Course api/Course
// @desc     Create a Course
// @access   Private
router.post(
    '/add',
    instAuth,
    check('name', 'Name is required').notEmpty(),
    check('description', 'Description is required').notEmpty(),
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
  
      try {
        const instructor = await Instructor.findById(req.instructor).select('-password');


  
        const newCourse = new Course({
          name: req.body.name,
          description: req.body.description,
          instructor: req.instructor,
          instructorName: instructor.firstName + ' ' + instructor.lastName,
          instructorEmail: instructor.email
        });
  
        const course = await newCourse.save();
        const instructorProfileData = await instructorProfile.findOne({ user: req.instructor });

        if (instructorProfileData) {
          course.instructorProfile = instructorProfileData._id;
          await course.save();
        }
  
        res.status(200).json({ message: 'Course Added successfully' });
      } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
      }
    }
  );

// @route    GET api/courses
// @desc     Get all courses
// @access   Private
router.get('/', auth, async (req, res) => {
  try {
    const courses = await Course.find()
      .populate({
        path: 'instructorProfile',
        model: 'instructorprofile',
        select: 'profilepicture', // Select the fields you need
      })
      .sort({ date: -1 });

    // Map over the courses array to add the full URL for profile picture
    const coursesWithUrls = courses.map(course => {
      // Check if instructorProfile exists and has a profile picture
      if (course.instructorProfile && course.instructorProfile.profilepicture) {
        // Add the full URL to the course object
        course.instructorProfile.profilepicture = `${req.protocol}://${req.get('host')}/uploads/profilePictures/${course.instructorProfile.profilepicture}`;
      }

      return course;
    });

    res.json(coursesWithUrls);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});




// @route    GET api/courses
// @desc     Get Instructor Own courses
// @access   Private

  router.get('/instructorcourses',  instAuth, async (req, res) => {
    try {
      const courses = await Course.find({instructor: req.instructor }).populate({
        path: 'instructorProfile',
        model: 'instructorprofile',
        select: 'profilepicture', // Select the fields you need
      })
      .sort({ date: -1 });

    // Map over the courses array to add the full URL for profile picture
    const coursesWithUrls = courses.map(course => {
      // Check if instructorProfile exists and has a profile picture
      if (course.instructorProfile && course.instructorProfile.profilepicture) {
        // Add the full URL to the course object
        course.instructorProfile.profilepicture = `${req.protocol}://${req.get('host')}/uploads/profilePictures/${course.instructorProfile.profilepicture}`;
      }

      return course;
    });

    res.json(coursesWithUrls);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });

// @route    GET api/courses/:id
// @desc     Get course by ID
// @access   Private
router.get('/:id', instAuth, checkObjectId('id'), async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate({
      path: 'instructorProfile',
      model: 'instructorprofile',
      select: 'profilepicture', // Select the fields you need
    });

    if (!course) {
      return res.status(404).json({ msg: 'Course not found' });
    }

    // Check if instructorProfile exists and has a profile picture
    if (course.instructorProfile && course.instructorProfile.profilepicture) {
      // Add the full URL to the course object
      course.instructorProfile.profilepicture = `${req.protocol}://${req.get('host')}/uploads/profilePictures/${course.instructorProfile.profilepicture}`;
    }

    res.json(course);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});


  

// @route    DELETE api/course/:id
// @desc     Delete a course
// @access   Private
router.delete('/:id', [instAuth, checkObjectId('id')], async (req, res) => {
    try {
      const course = await Course.findById(req.params.id);
  
      if (!course) {
        return res.status(404).json({ msg: 'Post not found' });
      }
  
      // Check user
      if (course.instructor.toString() !== req.instructor) {
        return res.status(401).json({ msg: 'User not authorized' });
      }
  
      await course.remove();
  
      res.json({ msg: 'course removed' });
    } catch (err) {
      console.error(err.message);
  
      res.status(500).send('Server Error');
    }
  });
  
  
module.exports = router;