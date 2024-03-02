const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../../middleware/auth');
const instAuth = require('../../middleware/instAuth');
const Forum = require('../../models/Forum'); // Import the Forum model
const  User  = require('../../models/user');
const  Instructor  = require('../../models/instructor');
const Profile = require('../../models/Profile');
const InstructorProfile = require('../../models/instructorProfile');
const customAuthMiddleware = require('../../middleware/customAuth');
const adminAuth = require('../../middleware/adminAuth')

// @route    POST api/forums/post
// @desc     Create a new forum post
// @access   Private (User or Instructor)
router.post(
  '/',
  auth || instAuth,
  [
    check('body', 'Body is required').notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const check = await User.findById(req.user);
      let authorId, authorModel;

      if (check === null) {
        authorId = req.user;
        authorModel = 'Instructor';
      } else {
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

      // Create a new forum post with the author's first name and profile picture
      const newForumPost = new Forum({
        author: authorId,
        authorModel: authorModel,
        body: req.body.body,
        firstName: author.firstName,
        profilePicture: profilePicture, // Save the profile picture URL along with the forum post
      });

      // Save the forum post to the database
      const forumPost = await newForumPost.save();

      res.json(forumPost);
    } catch (error) {
      console.error(error);
      res.status(500).send('Server Error');
    }
  }
);


  // @route    POST api/forums/:forumId/comments
  // @desc     Post a comment on a forum post
  // @access   Private (User or Instructor)
  router.post(
      '/:forumId/comments',
      auth || instAuth,
      [
        check('body', 'Body is required').notEmpty(),
      ],
      async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }
    
        const forumId = req.params.forumId;
    
        try {
          const forum = await Forum.findById(forumId);
          if (!forum) {
            return res.status(404).json({ msg: 'Forum post not found' });
          }
    
          const check = await User.findById(req.user);
          let authorId, authorModel;
    
          if (check === null) {
            authorId = req.user;
            authorModel = 'Instructor';
          } else {
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
            date: new Date(), // Set the current date for the comment
          };
    
          forum.comments.unshift(newComment);
    
          // Save the updated forum post with the new comment to the database
          const updatedForum = await forum.save();
          
          res.json(updatedForum.comments);
        
        } catch (error) {
          console.error(error);
          res.status(500).send('Server Error');
        }
      }
    );

/// @route    GET api/forums
// @desc     Get all forum posts and comments
// @access   Private (User or Instructor)
router.get('/', auth || instAuth || adminAuth, async (req, res) => {
    try {
      // Get all forum posts and comments
      const forums = await Forum.find();
  
      const profileDataWithPicture = forums.map((forum) => {
        return {
          _id: forum._id,
          author: forum.author,
          authorModel: forum.authorModel,
          body: forum.body,
          profilePicture: forum.profilePicture
            ? `${req.protocol}://${req.get('host')}/uploads/profilePictures/${forum.profilePicture}`
            : null,
          firstName: forum.firstName,
          date: forum.date,
          likes: forum.likes ? forum.likes.map((like) => like.author) : [], // Array of users who liked the forum post
          comments: forum.comments
            ? forum.comments.map((comment) => ({
                _id: comment._id,
                author: comment.author,
                authorModel: comment.authorModel,
                firstName: comment.firstName,
                body: comment.body,
                date: comment.date,
                profilePicture: comment.profilePicture
                  ? `${req.protocol}://${req.get('host')}/uploads/profilePictures/${comment.profilePicture}`
                  : null,
                likes: comment.likes ? comment.likes.map((like) => like.author) : [], // Array of users who liked the comment
              }))
            : [],
        };
      });
  
      res.json(profileDataWithPicture);
    } catch (error) {
      console.error(error);
      res.status(500).send('Server Error');
    }
  });

// @route    GET api/forums/:forumId
// @desc     Get a specific forum post by ID
// @access   Private (User or Instructor)
router.get('/:forumId', auth || instAuth || adminAuth, async (req, res) => {
    try {
      const forumId = req.params.forumId;
  
      // Get the specific forum post by ID
      const forum = await Forum.findById(forumId);
  
      if (!forum) {
        return res.status(404).json({ msg: 'Forum post not found' });
      }
  
      const profileDataWithPicture = {
        _id: forum._id,
        author: forum.author,
        authorModel: forum.authorModel,
        body: forum.body,
        profilePicture: forum.profilePicture
          ? `${req.protocol}://${req.get('host')}/uploads/profilePictures/${forum.profilePicture}`
          : null,
        firstName: forum.firstName,
        date: forum.date,
        likes: forum.likes ? forum.likes.map((like) => like.author) : [], // Array of users who liked the forum post
        comments: forum.comments
          ? forum.comments.map((comment) => ({
              _id: comment._id,
              author: comment.author,
              authorModel: comment.authorModel,
              firstName: comment.firstName,
              body: comment.body,
              date: comment.date,
              profilePicture: comment.profilePicture
                ? `${req.protocol}://${req.get('host')}/uploads/profilePictures/${comment.profilePicture}`
                : null,
              likes: comment.likes ? comment.likes.map((like) => like.author) : [], // Array of users who liked the comment
            }))
          : [],
      };
  
      res.json(profileDataWithPicture);
    } catch (error) {
      console.error(error);
      res.status(500).send('Server Error');
    }
  });

// @route    PUT api/forums/like/:forumId
// @desc     Like a forum post
// @access   Private (User or Instructor)
router.put('/like/:forumId', auth || instAuth, async (req, res) => {
    try {
      const check = await User.findById(req.user);
      let authorId, authorModel;
  
      if (check === null) {
        authorId = req.user;
        authorModel = 'Instructor';
      } else {
        authorId = req.user;
        authorModel = 'User';
      }
  
      const forumId = req.params.forumId;
  
      // Find the forum post by ID
      const forum = await Forum.findById(forumId);
  
      if (!forum) {
        return res.status(404).json({ msg: 'Forum post not found' });
      }
  
      // Check if the user or instructor has already liked the forum post
      const isLiked = forum.likes.some((like) => like.author.equals(authorId) && like.authorModel === authorModel);
      if (isLiked) {
        return res.status(400).json({ msg: 'Forum post is already liked by the user or instructor' });
      }
  
      // Add the user's or instructor's like to the forum post
      forum.likes.push({ author: authorId, authorModel });
  
      // Save the updated forum post
      await forum.save();
  
      return res.json(forum.likes);
    } catch (error) {
      console.error(error);
      res.status(500).send('Server Error');
    }
  });
  
// @route    PUT api/forums/unlike/:forumId
// @desc     Unlike a forum post
// @access   Private (User or Instructor)
router.put('/unlike/:forumId', auth || instAuth, async (req, res) => {
    try {
      const check = await User.findById(req.user);
      let authorId, authorModel;
  
      if (check === null) {
        authorId = req.user;
        authorModel = 'Instructor';
      } else {
        authorId = req.user;
        authorModel = 'User';
      }
  
      const forumId = req.params.forumId;
  
      // Find the forum post by ID
      const forum = await Forum.findById(forumId);
  
      if (!forum) {
        return res.status(404).json({ msg: 'Forum post not found' });
      }
  
      // Check if the user or instructor has already liked the forum post
      const likeIndex = forum.likes.findIndex(
        (like) => like.author.equals(authorId) && like.authorModel === authorModel
      );
      if (likeIndex === -1) {
        return res.status(400).json({ msg: 'Forum post has not been liked by the user or instructor' });
      }
  
      // Remove the user's or instructor's like from the forum post
      forum.likes.splice(likeIndex, 1);
  
      // Save the updated forum post
      await forum.save();
  
      return res.json(forum.likes);
    } catch (error) {
      console.error(error);
      res.status(500).send('Server Error');
    }
  });
  
  // @route    DELETE api/forums/:forumId
// @desc     Delete a forum post by ID
// @access   Private (User or Instructor)
router.delete('/:forumId', auth || instAuth , async (req, res) => {
    try {
      const forumId = req.params.forumId;
  
      // Find the forum post by ID
      const forum = await Forum.findById(forumId);
  
      if (!forum) {
        return res.status(404).json({ msg: 'Forum post not found' });
      }
  
      // Check if the user or instructor is the author of the forum post
      const check = await User.findById(req.user);
      let authorId, authorModel;
  
      if (check === null) {
        authorId = req.user;
        authorModel = 'Instructor';
      } else {
        authorId = req.user;
        authorModel = 'User';
      }
  
      if (!forum.author.equals(authorId) || forum.authorModel !== authorModel) {
        return res.status(401).json({ msg: 'Unauthorized' });
      }
  
      // Delete the forum post
      await forum.remove();
  
      res.json({ msg: 'Forum post deleted successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).send('Server Error');
    }
  });
  
  // @route    DELETE api/forums/:forumId/comments/:commentId
// @desc     Delete a comment within a forum post by ID
// @access   Private (User or Instructor)
router.delete('/:forumId/comments/:commentId', auth || instAuth , async (req, res) => {
    try {
      const forumId = req.params.forumId;
      const commentId = req.params.commentId;
  
      // Find the forum post by ID
      const forum = await Forum.findById(forumId);
  
      if (!forum) {
        return res.status(404).json({ msg: 'Forum post not found' });
      }
  
      // Find the comment by ID
      const comment = forum.comments.find((c) => c._id.equals(commentId));
  
      if (!comment) {
        return res.status(404).json({ msg: 'Comment not found' });
      }
  
      // Check if the user or instructor is the author of the comment
      const check = await User.findById(req.user);
      let authorId, authorModel;
  
      if (check === null) {
        authorId = req.user;
        authorModel = 'Instructor';
      } else {
        authorId = req.user;
        authorModel = 'User';
      }
  
      if (!comment.author.equals(authorId) || comment.authorModel !== authorModel) {
        return res.status(401).json({ msg: 'Unauthorized' });
      }
  
      // Remove the comment from the forum post
      forum.comments = forum.comments.filter((c) => !c._id.equals(commentId));
  
      // Save the updated forum post
      await forum.save();
  
      res.json({ msg: 'Comment deleted successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).send('Server Error');
    }
  });

// @route    PUT api/forums/:forumId/comments/:commentId/like
// @desc     Like a comment within a forum post by ID
// @access   Private (User or Instructor)
router.put('/:forumId/comments/:commentId/like', auth || instAuth, async (req, res) => {
  try {
      const forumId = req.params.forumId;
      const commentId = req.params.commentId;

      // Find the forum post by ID
      const forum = await Forum.findById(forumId);

      if (!forum) {
          return res.status(404).json({ msg: 'Forum post not found' });
      }

      // Find the comment by ID
      const comment = forum.comments.find((c) => c._id.equals(commentId));

      if (!comment) {
          return res.status(404).json({ msg: 'Comment not found' });
      }

      // Check if the user or instructor has already liked the comment
      const check = await User.findById(req.user);
      let authorId, authorModel;

      if (check === null) {
          authorId = req.user;
          authorModel = 'Instructor';
      } else {
          authorId = req.user;
          authorModel = 'User';
      }

      const isLiked = comment.likes.some((like) => like.author.equals(authorId) && like.authorModel === authorModel);
      if (isLiked) {
          return res.status(400).json({ msg: 'Comment is already liked by the user or instructor' });
      }

      // Add the user's or instructor's like to the comment
      comment.likes.unshift({ author: authorId, authorModel });

      // Save the updated forum post
      await forum.save();

      // Send the updated likes count in the response
      // const updatedLikes = comment.likes.length;
      return res.json(comment);
  } catch (error) {
      console.error(error);
      res.status(500).send('Server Error');
  }
});

  
  // @route    PUT api/forums/:forumId/comments/:commentId/unlike
// @desc     Unlike a comment within a forum post by ID
// @access   Private (User or Instructor)
router.put('/:forumId/comments/:commentId/unlike', auth || instAuth, async (req, res) => {
    try {
      const forumId = req.params.forumId;
      const commentId = req.params.commentId;
  
      // Find the forum post by ID
      const forum = await Forum.findById(forumId);
  
      if (!forum) {
        return res.status(404).json({ msg: 'Forum post not found' });
      }
  
      // Find the comment by ID
      const comment = forum.comments.find((c) => c._id.equals(commentId));
  
      if (!comment) {
        return res.status(404).json({ msg: 'Comment not found' });
      }
  
      // Check if the user or instructor has liked the comment
      const check = await User.findById(req.user);
      let authorId, authorModel;
  
      if (check === null) {
        authorId = req.user;
        authorModel = 'Instructor';
      } else {
        authorId = req.user;
        authorModel = 'User';
      }
  
      const isLiked = comment.likes.some((like) => like.author.equals(authorId) && like.authorModel === authorModel);
      if (!isLiked) {
        return res.status(400).json({ msg: 'Comment is not liked by the user or instructor' });
      }
  
      // Remove the user's or instructor's like from the comment
      const likeIndex = comment.likes.findIndex((like) => like.author.equals(authorId) && like.authorModel === authorModel);
      
      // Remove the like using splice
      comment.likes.splice(likeIndex, 1);
  
      // Save the updated forum post
      await forum.save();
  
      return res.json(comment);
    } catch (error) {
      console.error(error);
      res.status(500).send('Server Error');
    }
  });

  // @route    PUT api/forums/:forumId
// @desc     Update a forum post by ID
// @access   Private (User or Instructor)
router.put('/:forumId', auth, async (req, res) => {
  try {
   
    const forumId = req.params.forumId;

    let forum = await Forum.findById(forumId);
    if (!forum) {
      return res.status(404).json({ msg: 'Forum post not found' });
    }

    // Check if the user or instructor is the author of the forum post
    if (String(forum.author) !== String(req.user)) {
      return res.status(401).json({ msg: 'Not authorized to update this announcement' });
    }
    if (!req.body.body) {
      console.log('NO body')
      return res.status(400).json({ msg: 'Request body is missing required field: body' });
    }
    forum.body = req.body.body;
   const updatedforum = await forum.save();

   res.json({ message: 'Post updated successfully', forum: updatedforum });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

// @route    PUT api/forums/:forumId/comments/:commentId
// @desc     Update a comment within a forum post by ID
// @access   Private (User or Instructor)
router.put('/:forumId/comments/:commentId', auth, async (req, res) => {
  try {
    
    const { forumId, commentId } = req.params;

    let forum = await Forum.findById(forumId);
    if (!forum) {
      return res.status(404).json({ msg: 'Forum post not found' });
    }

    const comment = forum.comments.find((c) => c._id.equals(commentId));

    const commentIndex = forum.comments.findIndex(comment => String(comment._id) === commentId);

    if (!comment) {
      return res.status(404).json({ msg: 'Comment not found' });
    }

    // Check if the user or instructor is the author of the comment
    if (String(forum.comments[commentIndex].author) !== String(req.user)) {
      return res.status(401).json({ msg: 'Not authorized to add/update this comment' });
    }

    forum.comments[commentIndex].body = req.body.body; // Assuming you want to update the body of the comment

      // Save the updated announcement with the updated comment to the database
      const updatedAnnouncement = await forum.save();

      res.status(200).json({ message: 'Comment updated successfully', forum: updatedAnnouncement });

  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});
  
  
module.exports = router;
