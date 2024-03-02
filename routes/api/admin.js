const router = require("express").Router();
const  Admin  = require("../../models/Admin");
const Token = require("../../models/token");
require('dotenv').config();
const FRONTED_BASE_URL = process.env.FRONTED_BASE_URL
const crypto = require("crypto");
const sendEmail = require("../../utils/sendEmails");
const bcrypt = require("bcrypt");
const validate = require("../../middleware/validate");
const adminAuth = require("../../middleware/adminAuth")
const User = require("../../models/user");
const Instructor =  require("../../models/instructor");
const Course = require("../../models/Course");
const BlockedUser = require("../../models/BlockedUser");
const Joi = require('joi');
const passwordComplexity = require("joi-password-complexity");
const Contact = require("../../models/Contact");
const Forum = require("../../models/Forum");

const contactFormSchema = Joi.object({
  email: Joi.string().email().required(),
  description: Joi.string().required(),
});

// Route to delete a specific contact form submission
router.delete("/contact/:id",adminAuth, async (req, res) => {
  const { id } = req.params;

  try {
    // Assuming the Contact model has a field named _id
    const deletedSubmission = await Contact.findByIdAndDelete(id);

    if (!deletedSubmission) {
      return res.status(404).json({ message: "Contact form submission not found" });
    }

    res.status(200).json({ message: "Contact form submission deleted successfully" });
  } catch (error) {
    console.error("Error deleting contact form submission:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Route to get all contact form submissions
router.get("/contact", async (req, res) => {
  try {
    const submissions = await Contact.find();
    res.status(200).json(submissions);
  } catch (error) {
    console.error("Error getting contact form submissions:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Route to get the count of contact form submissions
router.get("/contact/count", async (req, res) => {
  try {
    const count = await Contact.countDocuments();
    res.status(200).json({ count });
  } catch (error) {
    console.error("Error getting contact form count:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Route to handle contact form submission
router.post("/contact" , async (req, res) => {
  try {

    const { error } = contactFormSchema.validate(req.body);

    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }
    // Extract data from the request
    const { email, description } = req.body;

    // Assuming there is only one admin
    const admin = await Admin.findOne();
    
    // Send email to the admin
    const url = `${email} ${description} `;
		await sendEmail(admin.email, "QLMS", url);

    
    // Save the contact form submission to the database
    const newSubmission = new Contact({ email, description });
    await newSubmission.save();

    res.status(200).json({ message: "Contact form submitted successfully" });
  } catch (error) {
    console.error("Error submitting contact form:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});



//Sign Up Route Create Account User Student
router.post("/", async (req, res) => {
	try {
		const { error } = validate(req.body);
		if (error)
			return res.status(400).send({ message: error.details[0].message });

		let admin = await Admin.findOne({ email: req.body.email });
		if (admin)
			return res
				.status(409)
				.send({ message: "Admin with given email already Exist!" });

		const salt = await bcrypt.genSalt(Number(process.env.SALT));
		const hashPassword = await bcrypt.hash(req.body.password, salt);

		admin = await new Admin({ ...req.body, password: hashPassword }).save();

		const token = await new Token({
      type: "admin",
			userId: admin._id,
			token: crypto.randomBytes(32).toString("hex"),
		}).save();
		const url = `${FRONTED_BASE_URL}admin/${admin.id}/verify/${token.token}`;
		await sendEmail(admin.email, "Verify Email", url);

		res
			.status(201)
			.send({ message: "An Email sent to your account please verify" });
	} catch (error) {
		console.log(error);
		res.status(500).send({ message: "Internal Server Error" });
	}
});


router.get("/:id/verify/:token", async (req, res) => {
	try {
	  const admin = await Admin.findOne({ _id: req.params.id });
	  if (!admin) return res.status(400).send({ message: "Invalid link" });
  
	  const token = await Token.findOne({
		type: "admin",
		userId: admin._id,
		token: req.params.token,
	  });
	  if (!token) return res.status(400).send({ message: "Invalid link" });
  
	  await Admin.updateOne({ _id: admin._id }, { verified: true });
	  await token.remove();
  
	  // Send an email to the instructor when their email is verified
	  const emailText = `Dear ${admin.firstName},\nYour email has been successfully verified. Thank you for registering with us!`;
	  await sendEmail(admin.email, "Email Verified", emailText);
  
	  res.status(200).send({ message: "Email verified successfully" });
	} catch (error) {
	  res.status(500).send({ message: "Internal Server Error" });
	}
  });

  // GET all verified users
router.get('/users', adminAuth, async (req, res) => {
    try {
        // console.log(req.userType)
    //   Check if the authenticated user is an admin
      if (req.userType !== 'admin') {
        return res.status(403).json({ message: 'Access forbidden. Only admins can perform this action.' });
      }
  
      // Fetch all verified users
      const verifiedUsers = await User.find({ verified: true });
  
      res.status(200).json(verifiedUsers);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server Error' });
    }
  });


  // GET all instructors
router.get('/instructors', adminAuth, async (req, res) => {
    try {
      // Check if the authenticated user is an admin
      if (req.userType !== 'admin') {
        return res.status(403).json({ message: 'Access forbidden. Only admins can perform this action.' });
      }
  
      // Fetch all verified instructors
      const instructors = await Instructor.find({ verified: true });
  
      res.status(200).json(instructors);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server Error' });
    }
  });

  router.get('/instructors/verified', adminAuth, async (req, res) => {
    try {
      // Retrieve all verified instructors and their blocked status
      const verifiedInstructorsData = await Instructor.find({ verified: true });
  
      // Retrieve the blocked status for verified instructors
      const blockedUsers = await BlockedUser.find({
        userId: { $in: verifiedInstructorsData.map((instructor) => instructor._id) },
      });
  
      // Create a map with userId as the key and blocked status as the value
      const blockedStatusMap = blockedUsers.reduce((map, user) => {
        if (user.userId) {
          map[user.userId.toString()] = user.blocked;
        }
        return map;
      }, {});
  
      // Add the blocked status to each verified instructor's data
      const verifiedInstructorsWithBlockedStatus = verifiedInstructorsData.map((instructor) => {
        const userIdString = instructor._id.toString();
  
        return {
          ...instructor.toObject(),
          blocked: blockedStatusMap[userIdString] || false,
        };
      });
  
      res.status(200).json(verifiedInstructorsWithBlockedStatus);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server Error' });
    }
  });
  


  // GET unverified instructors
// router.get('/instructors/unverified', adminAuth, async (req, res) => {
//     try {
//       // Check if the authenticated user is an admin
//       if (req.userType !== 'admin') {
//         return res.status(403).json({ message: 'Access forbidden. Only admins can perform this action.' });
//       }
  
//       // Fetch all unverified instructors
//       const unverifiedInstructors = await Instructor.find({ verified: false });
  
//       res.status(200).json(unverifiedInstructors);
//     } catch (error) {
//       console.error(error);
//       res.status(500).json({ message: 'Server Error' });
//     }
//   });

  router.get('/instructors/unverified', adminAuth, async (req, res) => {
    try {
      // Retrieve all unverified instructors and their blocked status
      const unverifiedInstructorsData = await Instructor.find({ verified: false });
  
      // Retrieve the blocked status for unverified instructors
      const blockedUsers = await BlockedUser.find({
        userId: { $in: unverifiedInstructorsData.map((instructor) => instructor._id) },
      });
  
      // Create a map with userId as the key and blocked status as the value
      const blockedStatusMap = blockedUsers.reduce((map, user) => {
        if (user.userId) {
          map[user.userId.toString()] = user.blocked;
        }
        return map;
      }, {});
  
      // Add the blocked status to each unverified instructor's data
      const unverifiedInstructorsWithBlockedStatus = unverifiedInstructorsData.map((instructor) => {
        const userIdString = instructor._id.toString();
  
        return {
          ...instructor.toObject(),
          blocked: blockedStatusMap[userIdString] || false,
        };
      });
  
      res.status(200).json(unverifiedInstructorsWithBlockedStatus);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server Error' });
    }
  });

  // PUT route to approve and verify an instructor
router.put('/instructors/approve/:instructorId', adminAuth, async (req, res) => {
    try {
      // Check if the authenticated user is an admin
      if (req.userType !== 'admin') {
        return res.status(403).json({ message: 'Access forbidden. Only admins can perform this action.' });
      }
  
      const instructorId = req.params.instructorId;
  
      // Find the instructor by ID
      const instructor = await Instructor.findById(instructorId);
  
      // Check if the instructor exists
      if (!instructor) {
        return res.status(404).json({ message: 'Instructor not found' });
      }
  
      // Approve and set verified to true
      instructor.verified = true;
  
      // Save the updated instructor
      await instructor.save();
    const emailText = `Dear ${instructor.firstName},\nYour email has been successfully verified. Thank you for registering with us!`;
	  await sendEmail(instructor.email, "Email Verified", emailText);
  
      res.status(200).json({ instructor, message: 'Instructor approved and verified successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server Error' });
    }
  });

  // DELETE route to delete a user by ID
router.delete('/users/:userId', adminAuth, async (req, res) => {
    try {
      // Check if the authenticated user is an admin
      if (req.userType !== 'admin') {
        return res.status(403).json({ message: 'Access forbidden. Only admins can perform this action.' });
      }
  
      const userId = req.params.userId;
  
      // Find the user by ID
      const user = await User.findById(userId);
  
      // Check if the user exists
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      // Remove the user from the database
      await user.remove();
  
      res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server Error' });
    }
  });
  
// DELETE route to delete an instructor by ID
router.delete('/instructors/:instructorId', adminAuth, async (req, res) => {
    try {
      // Check if the authenticated user is an admin
      if (req.userType !== 'admin') {
        return res.status(403).json({ message: 'Access forbidden. Only admins can perform this action.' });
      }
  
      const instructorId = req.params.instructorId;
  
      // Find the instructor by ID
      const instructor = await Instructor.findById(instructorId);
  
      // Check if the instructor exists
      if (!instructor) {
        return res.status(404).json({ message: 'Instructor not found' });
      }
  
      // Remove the instructor from the database
      await instructor.remove();
  
      res.status(200).json({ message: 'Instructor deleted successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server Error' });
    }
  });

  
// GET route to get all courses
router.get('/courses', adminAuth, async (req, res) => {
    try {
      // Check if the authenticated user is an admin
      if (req.userType !== 'admin') {
        return res.status(403).json({ message: 'Access forbidden. Only admins can perform this action.' });
      }
  
      // Fetch all courses
      const courses = await Course.find();
  
      res.status(200).json(courses);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server Error' });
    }
  });




// DELETE route to delete a course by ID
router.delete('/courses/:courseId', adminAuth, async (req, res) => {
    try {
      // Check if the authenticated user is an admin
      if (req.userType !== 'admin') {
        return res.status(403).json({ message: 'Access forbidden. Only admins can perform this action.' });
      }
  
      const courseId = req.params.courseId;
  
      // Find the course by ID
      const course = await Course.findById(courseId);
  
      // Check if the course exists
      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }
  
      // Remove the course from the database
      await course.remove();
  
      res.status(200).json({ message: 'Course deleted successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server Error' });
    }
  });


// Endpoint to get the blocked status of all users
// router.get('/users/block', adminAuth, async (req, res) => {
//   try {
//     // Retrieve the blocked status for all users
//     const allBlockedUsers = await BlockedUser.find();

//     // Create an array of objects with user ID and blocked status
//     const userStatusList = allBlockedUsers.map(user => ({
//       userId: user.userId.toString(),
//       blocked: user.blocked,
//     }));

//     res.status(200).json(userStatusList);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server Error' });
//   }
// });

// Endpoint to get the blocked status of all users
router.get('/users/block', adminAuth, async (req, res) => {
  try {
    // Retrieve all users and their blocked status
    const allUsersData = await User.find({verified:true});

    // Retrieve the blocked status for all users
    const blockedUsers = await BlockedUser.find();

    // Create a map with userId as the key and blocked status as the value
    const blockedStatusMap = blockedUsers.reduce((map, user) => {
      if (user.userId) {
        map[user.userId.toString()] = user.blocked;
      }
      return map;
    }, {});

    // Add the blocked status to each user's data
    const usersWithBlockedStatus = allUsersData.map(user => {
      const userIdString = user._id.toString(); // Use _id as the userId

      return {
        ...user.toObject(),
        blocked: blockedStatusMap[userIdString] || false,
      };
    });

    res.status(200).json(usersWithBlockedStatus);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});


  // Endpoint to get the blocked status of a specific user by ID
router.get('/users/block/:userId',adminAuth, async (req, res) => {
  try {
    const userId = req.params.userId;

    // Check if the user is blocked
    const blockedUser = await BlockedUser.findOne({ userId,});

    res.status(200).json({ blocked: !!blockedUser }); // Convert to boolean for clarity
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});


// Endpoint to get the blocked status of all users
router.get('/instructors/block', adminAuth, async (req, res) => {
  try {
    // Retrieve all users and their blocked status
    const allUsersData = await Instructor.find({ verified: true });

    // Retrieve the blocked status for all users
    const blockedUsers = await BlockedUser.find();

    // Create a map with userId as the key and blocked status as the value
    const blockedStatusMap = blockedUsers.reduce((map, user) => {
      if (user.userId) {
        map[user.userId.toString()] = user.blocked;
      }
      return map;
    }, {});

    // Add the blocked status to each user's data
    const usersWithBlockedStatus = allUsersData.map(user => {
      const userIdString = user._id.toString(); // Use _id as the userId

      return {
        ...user.toObject(),
        blocked: blockedStatusMap[userIdString] || false,
      };
    });

    res.status(200).json(usersWithBlockedStatus);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});


  // Endpoint to get the blocked status of a specific user by ID
router.get('/instructors/block/:userId',adminAuth, async (req, res) => {
  try {
    const userId = req.params.userId;

    // Check if the user is blocked
    const blockedUser = await BlockedUser.findOne({ userId,});

    res.status(200).json({ blocked: !!blockedUser }); // Convert to boolean for clarity
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

  // Block/Unblock User by ID
router.put('/users/block/:userId', adminAuth, async (req, res) => {
    try {
      const userId = req.params.userId;
  
      // Check if the user exists
      const user = await User.findById(userId);
  
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      // Check if the user is already blocked
      const blockedUser = await BlockedUser.findOne({ userId, userType: 'user' });
  
      // Toggle the blocked status
      if (blockedUser) {
        // User is blocked, unblock them
        await blockedUser.remove();
        res.status(200).json({ message: 'User unblocked successfully', blocked: false });
      } else {
        // User is not blocked, block them
        await new BlockedUser({ userId, userType: 'user', blocked: true }).save();
        res.status(200).json({ message: 'User blocked successfully', blocked: true });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server Error' });
    }
  });
  
  // Block/Unblock Instructor by ID
  router.put('/instructors/block/:instructorId', adminAuth, async (req, res) => {
    try {
      const instructorId = req.params.instructorId;
  
      // Check if the instructor exists
      const instructor = await Instructor.findById(instructorId);
  
      if (!instructor) {
        return res.status(404).json({ message: 'Instructor not found' });
      }
  
      // Check if the instructor is already blocked
      const blockedUser = await BlockedUser.findOne({ userId: instructorId, userType: 'instructor' });
  
      // Toggle the blocked status
      if (blockedUser) {
        // Instructor is blocked, unblock them
        await blockedUser.remove();
        res.status(200).json({ message: 'Instructor unblocked successfully', blocked: false });
      } else {
        // Instructor is not blocked, block them
        await new BlockedUser({ userId: instructorId, userType: 'instructor', blocked: true }).save();
        res.status(200).json({ message: 'Instructor blocked successfully', blocked: true });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server Error' });
    }
  });
  

  
  router.post("/pass", async (req, res) => {
    try {
        const emailSchema = Joi.object({
            email: Joi.string().email().required().label("Email"),
        });
        const { error } = emailSchema.validate(req.body);

        if (error)
            return res.status(400).send({ message: error.details[0].message });

            let admin = await Admin.findOne({ email: { $regex: new RegExp(req.body.email, 'i') } });
        if (!admin)
            return res
                .status(409)
                .send({ message: "Admin with given email does not exist!" });

        let token = await Token.findOne({ userId: admin._id });
        if (!token) {
            token = await new Token({
                type: "admin",
                userId: admin._id,
                token: crypto.randomBytes(32).toString("hex"),
            }).save();
        }

        const url = `${FRONTED_BASE_URL}/admin/password-reset/${admin._id}/${token.token}/`;
        await sendEmail(admin.email, "Password Reset", url);

        res
            .status(200)
            .send({ message: "Password reset link sent to your email account" });
    } catch (error) {
        console.error(error); // Log the error to the console
        res.status(500).send({ message: "Internal Server Error", error });
    }
});


// verify password reset link
router.get("/:id/:token", async (req, res) => {
	try {
	  const admin = await Admin.findOne({ _id: req.params.id });
	  if (!admin) return res.status(400).send({ success: false, message: "Invalid link" });
  
	  const token = await Token.findOne({
		type: "admin",
		userId: admin._id,
		token: req.params.token,
	  });
  
	  if (!token) return res.status(400).send({ success: false, message: "Invalid link" });
  
	  res.status(200).send({ success: true, message: "Valid Url" });
	} catch (error) {
	  res.status(500).send({ success: false, message: "Internal Server Error" });
	}
  });
  
  // set new password
  router.post("/:id/:token", async (req, res) => {
	try {
	  const passwordSchema = Joi.object({
		password: passwordComplexity().required().label("Password"),
	  });
	  const { error } = passwordSchema.validate(req.body);
	  if (error) return res.status(400).send({ success: false, message: error.details[0].message });
  
	  const admin = await Admin.findOne({ _id: req.params.id });
	  if (!admin) return res.status(400).send({ success: false, message: "Invalid link" });
  
	  const token = await Token.findOne({
		type: "admin",
		userId: admin._id,
		token: req.params.token,
	  });
	  if (!token) return res.status(400).send({ success: false, message: "Invalid link" });
  
	  if (!admin.verified) admin.verified = true;
  
	  const salt = await bcrypt.genSalt(10); // Set the desired salt value here
	  const hashPassword = await bcrypt.hash(req.body.password, salt);
  
	  admin.password = hashPassword;
	  await admin.save();
	  await token.remove();
  
	  res.status(200).send({ success: true, message: "Password reset successfully" });
	} catch (error) {
         console.log(error);
	  res.status(500).send({ success: false, message: "Internal Server Error" });
	}
  });
// Your existing route
router.post('/change-password', adminAuth, async (req, res) => {
	try {
	  const { currentPassword, newPassword } = req.body;
	  const admin = await Admin.findById(req.admin);
  
	  // Check if the provided current password matches the stored password
	  const isMatch = await bcrypt.compare(currentPassword, admin.password);
	  if (!isMatch) {
		return res.status(400).json({ errors: [{ msg: 'Invalid current password' }] });
	  }
  
	  // Validate the new password using Joi for complexity
	  const { error } = validateNewPassword({ newPassword });
	  if (error) {
		return res.status(400).json({ errors: [{ msg: error.details[0].message }] });
	  }
  
	  // Hash the new password
	  const salt = await bcrypt.genSalt(10);
	  admin.password = await bcrypt.hash(newPassword, salt);
  
	  // Save the updated user with the new password
	  await admin.save();
  
	  res.json({ message: 'Password changed successfully' });
	} catch (err) {
	  console.error(err.message);
	  res.status(500).send('Server Error');
	}
  });
  
  // Validation function for the new password
  const validateNewPassword = (data) => {
	const schema = Joi.object({
	  newPassword: passwordComplexity().required().label("New Password"),
	});
  
	return schema.validate(data);
  };


// @route    DELETE api/forums/:forumId
// @desc     Delete a forum post by ID (Admin only)
// @access   Private (Admin)
router.delete('/:forumId', adminAuth, async (req, res) => {
    try {
        const forumId = req.params.forumId;

        // Find and delete the forum post
        const forum = await Forum.findByIdAndDelete(forumId);

        if (!forum) {
            return res.status(404).json({ msg: 'Forum post not found' });
        }

        res.json({ msg: 'Forum post deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});

// @route    DELETE api/forums/comments/:commentId
// @desc     Delete a comment by ID (Admin only)
// @access   Private (Admin)
router.delete('/:forumId/comments/:commentId', adminAuth, async (req, res) => {
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

module.exports = router;