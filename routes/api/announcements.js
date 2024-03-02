const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../../middleware/auth');
const instAuth = require('../../middleware/instAuth');
const Announcement = require('../../models/Announcement');
const Course = require('../../models/Course');
const User = require('../../models/user');
const Instructor = require('../../models/instructor');
const Profile = require('../../models/Profile');
const InstructorProfile = require('../../models/instructorProfile');
const customAuthMiddleware = require('../../middleware/customAuth');
const Enrollment = require('../../models/Enrollment');
const Notification = require ('../../models/Notification');

// @route    POST api/announcements/:courseId/post
// @desc     Create a new announcement
// @access   Private (User or Instructor)
router.post(
  '/:courseId/post',
  auth || instAuth ,
  [
    check('body', 'Body is required').notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const courseId = req.params.courseId;

    try {
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({ msg: 'Course not found' });
      }

     const check = await User.findById(req.user);
     let authorId, authorModel;
     console.log(check)
        if(check === null)
        {
          authorId = req.user;
          authorModel = 'Instructor';
         
        }
      else {
        authorId = req.user;
        authorModel = 'User';
        

      }

      // Fetch the user or instructor based on the authorId and authorModel
      let author;
      let profilePicture; // To store the profile picture URL
      if (authorModel === 'User') {
        author = await User.findById(authorId);
        const userProfile = await Profile.findOne({ user: authorId });
        profilePicture = userProfile.profilepicture;
      } else if (authorModel === 'Instructor') {
        author = await Instructor.findById(authorId);
        
        const instructorProfile = await InstructorProfile.findOne({ user: authorId });
        
        profilePicture = instructorProfile.profilepicture;
      }

      if (!author) {
        return res.status(404).json({ msg: 'Author not found' });
      }

      // Create a new announcement with the author's first name and profile picture
      const newAnnouncement = new Announcement({
        author: authorId,
        authorModel: authorModel,
        course: courseId,
        body: req.body.body,
        firstName: author.firstName,
        profilePicture: profilePicture, // Save the profile picture URL along with the announcement
      });

      // Save the announcement to the database
      const announcement = await newAnnouncement.save();

      const courseEnrollments = await Enrollment.find({ course: courseId });

      // Fetch course details
      if (courseEnrollments.length > 0) {
        const course = await Course.findById(courseId);

        // Create and save notifications for each enrolled user
        const notifications = courseEnrollments.map((enrollment) => {
          return new Notification({
            message: `New Announcement Posted in Course ${course.name} by ${course.instructorName}`,
            recipient: enrollment.student,
            contentId: announcement._id,
          }).save();
        });

        await Promise.all(notifications);
      }

      res.status(200).json({ message: 'Announcment Added successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).send('Server Error');
    }
  }
);
  
 // @route    POST api/announcements/:announcementId/comments
// @desc     Post a comment on an announcement
// @access   Private (User or Instructor)
router.post(
  '/:announcementId/comments',
  auth || instAuth,
  [
    check('body', 'Body is required').notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const announcementId = req.params.announcementId;

    try {
      const announcement = await Announcement.findById(announcementId);
      if (!announcement) {
        return res.status(404).json({ msg: 'Announcement not found' });
      }

      

      const check = await User.findById(req.user);
     let authorId, authorModel;
     console.log(check)
        if(check === null)
        {
          authorId = req.user;
          authorModel = 'Instructor';
         
        }
      else {
        authorId = req.user;
        authorModel = 'User';
      }


      // Fetch the user or instructor based on the authorId and authorModel
      let author;
      let profilePicture; // To store the profile picture URL
      if (authorModel === 'User') {
        
        author = await User.findById(authorId);
        
        const userProfile = await Profile.findOne({ user: authorId });
        
        profilePicture = userProfile.profilepicture;
      } else if (authorModel === 'Instructor') {
        author = await Instructor.findById(authorId);
        const instructorProfile = await InstructorProfile.findOne({ user: authorId });
        profilePicture = instructorProfile.profilepicture;
      }

      if (!author) {
        return res.status(404).json({ msg: 'Author not found' });
      }

      // Create a new comment with the author's first name and profile picture
      const newComment = {
        author: authorId,
        authorModel: authorModel,
        firstName: author.firstName,
        body: req.body.body,
        profilePicture: profilePicture, // Save the profile picture URL along with the comment
        
      };

      announcement.comments.push(newComment);

      // Save the updated announcement with the new comment to the database
      const updatedAnnouncement = await announcement.save();
     

      res.status(200).json({ message: 'Comment Added successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).send('Server Error');
    }
  }
);
  
// @route    GET api/announcements/course/:courseId
// @desc     Get announcements for a specific course
// @access   Private (User or Instructor)
router.get('/:courseId/all', auth||instAuth, async (req, res) => {
  try {
    const courseId = req.params.courseId;

    // Check if the user/instructor has access to the course
    // You can implement your own logic here to check if the user/instructor is enrolled in the course or has permission to view its announcements.

    // Get the announcements for the specific course
    const announcements = await Announcement.find({ course: courseId }).exec();
    const profileDataWithPicture = announcements.map((announcement) => {
      return {
        _id: announcement._id,
        author: announcement.author,
        authorModel: announcement.authorModel,
        course: announcement.course,
        profilePicture: announcement.profilePicture
          ? `${req.protocol}://${req.get('host')}/uploads/profilePictures/${announcement.profilePicture}`
          : null,
        body: announcement.body,
        firstName: announcement.firstName,
        date: announcement.date,
        comments: announcement.comments
          ? announcement.comments.map((comment) => ({
              _id: comment._id,
              author: comment.author,
              authorModel: comment.authorModel,
              firstName: comment.firstName,
              body: comment.body,
              date: comment.date,
              profilePicture: comment.profilePicture
                ? `${req.protocol}://${req.get('host')}/uploads/profilePictures/${comment.profilePicture}`
                : null,
            }))
          : [],
      };
    });

    res.json(profileDataWithPicture);

    // res.json(announcements);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});



// @route    DELETE api/announcements/:announcementId
// @desc     Delete an announcement by ID
// @access   Private (User or Instructor)
router.delete('/:announcementId', auth || instAuth, async (req, res) => {
    try {
      const announcementId = req.params.announcementId;
      const userId = req.user;
      const instructorId = req.instructor;
  
      // Find the announcement by ID
      const announcement = await Announcement.findById(announcementId);
  
      if (!announcement) {
        return res.status(404).json({ msg: 'Announcement not found' });
      }
  
      // Check if the authenticated user is the author of the announcement
      if (
        announcement.author.toString() !== userId
      ) {
        return res.status(401).json({ msg: 'Unauthorized' });
      }
  
      // Check if the authenticated user is the instructor associated with the course
    
  
      // Delete the announcement
      await Announcement.findByIdAndDelete(announcementId);
  
      res.json({ msg: 'Announcement deleted' });
    } catch (error) {
      console.error(error);
      res.status(500).send('Server Error');
    }
  });

// @route    GET api/announcements/:announcementId
// @desc     Get an announcement by its ID
// @access   Private (User or Instructor)
router.get('/:announcementId', auth||instAuth, async (req, res) => {
  try {
    const announcementId = req.params.announcementId;

    // Find the announcement by its ID
    const announcement = await Announcement.findById(announcementId).exec();

    if (!announcement) {
      return res.status(404).json({ msg: 'Announcement not found' });
    }

    // Check if the user/instructor has access to the announcement
    // You can implement your own logic here to check if the user/instructor has permission to view this specific announcement.

    res.json(announcement);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

  
// @route    DELETE api/announcements/:announcementId/comments/:commentId
// @desc     Delete a comment by ID from an announcement
// @access   Private (User or Instructor)
router.delete('/:announcementId/comments/:commentId', auth || instAuth, async (req, res) => {
    try {
      const announcementId = req.params.announcementId;
      const commentId = req.params.commentId;
      const userId = req.user;
      const instructorId = req.instructor;
  
      // Find the announcement by ID
      const announcement = await Announcement.findById(announcementId);
  
      if (!announcement) {
        return res.status(404).json({ msg: 'Announcement not found' });
      }
  
      // Find the comment by ID and its author
      const comment = announcement.comments.find(
        (comment) => comment._id.toString() === commentId && comment.author.toString() === userId
      );
  
      if (!comment) {
        return res.status(404).json({ msg: 'Comment not found or unauthorized' });
      }
  
      // Delete the comment
      announcement.comments = announcement.comments.filter(
        (comment) => comment._id.toString() !== commentId
      );
      await announcement.save();
  
      res.json({ msg: 'Comment deleted' });
    } catch (error) {
      console.error(error);
      res.status(500).send('Server Error');
    }
  });

  // @route    PUT api/announcements/:announcementId
// @desc     Update an announcement
// @access   Private (User or Instructor)
router.put('/:announcementId', auth || instAuth, async (req, res) => {
  try {
    const announcementId = req.params.announcementId;

    // Check if the user/instructor has access to update the announcement
    // You can implement your own logic here to check if the user/instructor is the author of the announcement or has permission to update it.

    const announcement = await Announcement.findById(announcementId);
    if (!announcement) {
      return res.status(404).json({ msg: 'Announcement not found' });
    }
    

    // Check if the user/instructor is the author of the announcement
    if (String(announcement.author) !== String(req.user)) {
      return res.status(401).json({ msg: 'Not authorized to update this announcement' });
    }

    // Update the announcement
    announcement.body = req.body.body; // Assuming you want to update the body

    // Save the updated announcement to the database
    const updatedAnnouncement = await announcement.save();

    res.json({ message: 'Announcement updated successfully', announcement: updatedAnnouncement });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

// @route    PUT api/announcements/:announcementId/comments/:commentId
// @desc     Add or update a comment on an announcement
// @access   Private (User or Instructor)
router.put(
  '/:announcementId/comments/:commentId',
  auth || instAuth,
  [
    check('body', 'Body is required').notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const announcementId = req.params.announcementId;
    const commentId = req.params.commentId;

    try {
      const announcement = await Announcement.findById(announcementId);
      if (!announcement) {
        return res.status(404).json({ msg: 'Announcement not found' });
      }

      // Check if the user/instructor has access to add/update a comment
      // You can implement your own logic here to check if the user/instructor is the author of the announcement or has permission to add/update comments.

      // Find the comment in the comments array
      const commentIndex = announcement.comments.findIndex(comment => String(comment._id) === commentId);

      if (commentIndex === -1) {
        return res.status(404).json({ msg: 'Comment not found' });
      }

      // Check if the user/instructor is the author of the comment
      if (String(announcement.comments[commentIndex].author) !== String(req.user)) {
        return res.status(401).json({ msg: 'Not authorized to add/update this comment' });
      }

      // Update the comment
      announcement.comments[commentIndex].body = req.body.body; // Assuming you want to update the body of the comment

      // Save the updated announcement with the updated comment to the database
      const updatedAnnouncement = await announcement.save();

      res.status(200).json({ message: 'Comment added/updated successfully', announcement: updatedAnnouncement });
    } catch (error) {
      console.error(error);
      res.status(500).send('Server Error');
    }
  }
);


// @route    POST api/announcements/:announcementId/comments/:commentId
// @desc     Add or update a comment on an announcement
// @access   Private (User or Instructor)
router.post(
  '/:announcementId/comments/:commentId',
  auth || instAuth,
  [
    check('body', 'Body is required').notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const announcementId = req.params.announcementId;
    const commentId = req.params.commentId;

    try {
      const announcement = await Announcement.findById(announcementId);
      if (!announcement) {
        return res.status(404).json({ msg: 'Announcement not found' });
      }

      // Check if the user/instructor has access to add/update a comment
      // You can implement your own logic here to check if the user/instructor is the author of the announcement or has permission to add/update comments.

      // Find the comment in the comments array
      const commentIndex = announcement.comments.findIndex(comment => String(comment._id) === commentId);

      if (commentIndex === -1) {
        return res.status(404).json({ msg: 'Comment not found' });
      }

      // Check if the user/instructor is the author of the comment
      if (String(announcement.comments[commentIndex].author) !== String(req.user)) {
        return res.status(401).json({ msg: 'Not authorized to add/update this comment' });
      }

      // Update the comment
      announcement.comments[commentIndex].body = req.body.body; // Assuming you want to update the body of the comment

      // Save the updated announcement with the updated comment to the database
      const updatedAnnouncement = await announcement.save();

      res.status(200).json({ message: 'Comment added/updated successfully', announcement: updatedAnnouncement });
    } catch (error) {
      console.error(error);
      res.status(500).send('Server Error');
    }
  }
);

  

module.exports = router;
