const express = require('express');
const axios = require('axios');
const config = require('config');
const router = express.Router();
const auth = require('../../middleware/auth');
const insauth = require('../../middleware/instAuth');
const { check, validationResult } = require('express-validator');
// bring in normalize to give us a proper url, regardless of what user entered
const normalize = require('normalize-url');
const checkObjectId = require('../../middleware/checkObjectId');
const multer = require('multer');
const fs = require("fs");
const moment  = require('moment');

const Profile = require('../../models/Profile');
const User = require('../../models/user');
// const Post = require('../../models/Post');

const profilePicturesDir = "public/uploads/profilePictures"; // Change the destination folder to "public/uploads/profilePictures"
if (!fs.existsSync(profilePicturesDir)) {
  fs.mkdirSync(profilePicturesDir, { recursive: true });
}

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, profilePicturesDir); // Specify the destination folder where profile pictures will be stored
  },
  filename: (req, file, cb) => {
    const ext = file.mimetype.split("/")[1]; // Get the file extension from the mimetype
    const uniqueFileName = `${req.user}-${Date.now()}.${ext}`;
    cb(null, uniqueFileName); // Set the filename as "profile-{user_id}.{ext}"
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png","image/jpg"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG and PNG files are allowed."));
  }
};

const upload = multer({ storage, fileFilter ,
  limits: {
    fileSize: 10 * 1024 * 1024, 
  },  
});


// @route    GET api/profile/me
// @desc     Get current user's profile
// @access   Private
router.get('/me', auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({
      user: req.user
    }).populate('user', ['name', 'profilepicture']);

    if (!profile) {
      return res.status(400).json({ msg: 'There is no profile for this user' });
    }

    const profileDataWithPicture = {
      _id: profile._id,
      user: {
        _id: profile.user._id,
        name: profile.firstName,
        profilepicture: profile.profilepicture
          ? `${req.protocol}://${req.get('host')}/uploads/profilePictures/${profile.profilepicture}`
          : null,
      },
       contact: profile.contact,
       address: profile.address,
       country: profile.country,
       bio: profile.bio,
       userName:profile.userName,
       email:profile.email,
       education: profile.education,
       date: profile.date,
    };

    res.json(profileDataWithPicture);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    POST api/profile
// @desc     Create or update user profile
// @access   Private
router.post(
  '/',
  auth,
  upload.single('profilepicture'), // Middleware to handle file upload
  [
    check('country', 'Country is required').notEmpty(),
    // Add validation checks for other fields
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Get the profile fields from the request body
    const { 
      country, bio, address, 
      contact, website, skills, youtube, twitter, instagram,
      linkedin, facebook, ...rest
    } = req.body;

    // Build the profile object
    const profileFields = {
      user: req.user,
      country,
      bio,
      address,
      contact,
      ...rest
    };

    // Get user's email and username from the User model
    try {
      const user = await User.findById(req.user);
      if (user) {
        profileFields.email = user.email;
        profileFields.userName = user.firstName;
      }
    } catch (err) {
      console.error(err.message);
      return res.status(500).send('Server Error');
    }

    // Build socialFields object
    const socialFields = { youtube, twitter, instagram, linkedin, facebook };

    for (const [key, value] of Object.entries(socialFields)) {
      if (value && value.length > 0)
        socialFields[key] = normalize(value, { forceHttps: true });
    }

    profileFields.social = socialFields;

    // Set the profile picture if it exists in the request
    if (req.file) {
      profileFields.profilepicture = req.file.filename; // Save the filename of the uploaded file
    }

    try {
      let profile = await Profile.findOne({ user: req.user });

      if (profile) {
        // Check if a new profile picture is uploaded
        if (req.file) {
          // Delete the previous profile picture file if it exists
          const previousProfilePicture = profile.profilepicture;
          if (previousProfilePicture) {
            const profilePicturePath = `${profilePicturesDir}/${previousProfilePicture}`;
            if (fs.existsSync(profilePicturePath)) {
              fs.unlinkSync(profilePicturePath);
            }
          }

          // Update the profile with the new profile picture
          profile = await Profile.findOneAndUpdate(
            { user: req.user },
            { $set: { ...profileFields, profilepicture: req.file.filename } },
            { new: true, upsert: true, setDefaultsOnInsert: true }
          );

          return res.status(200).json({ message: 'Profile Updated successfully' });
        } else {
          // Update the profile without changing the profile picture
          profile = await Profile.findOneAndUpdate(
            { user: req.user },
            { $set: profileFields },
            { new: true, upsert: true, setDefaultsOnInsert: true }
          );

          return res.status(200).json({ message: 'Profile Updated successfully' });
        }
      }

      // Create a new profile
      profile = new Profile(profileFields);
      await profile.save();
      return res.status(200).json({ message: 'Profile Created successfully' });
    } catch (err) {
      console.error(err.message);
      return res.status(500).send('Server Error');
    }
  }
);


// @route    PUT api/profile/education
// @desc     Add profile education
// @access   Private
router.put(
  '/education',
  auth,
  check('school', 'School is required').notEmpty(),
  check('degree', 'Degree is required').notEmpty(),
  check('fieldofstudy', 'Field of study is required').notEmpty(),
  check('from', 'From date is required and needs to be from the past')
    .notEmpty()
    .custom((value, { req }) => {
      // Check if 'from' date is before today
      return moment(value).isBefore(moment(), 'day');
    }),
    check('to', 'To date is required').custom((value, { req }) => {
      if (value) {
          const fromDate = moment(req.body.from);
          const toDate = moment(value);
  
          return toDate.isBefore(moment(), 'day') && toDate.isAfter(fromDate, 'day') && !toDate.isSame(fromDate, 'day');
      }
      return true;
  }),
  check('to', 'To date is required').custom((value, { req }) => {
    // Check if 'to' date is not in the future and is after 'from' date
    if (value) {
      return moment(value).isBefore(moment(), 'day') && moment(value).isAfter(moment(req.body.from), 'day');
    }
    return true;  // 'to' is optional, so return true if not provided
  }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const profile = await Profile.findOne({ user: req.user });

      profile.education.unshift(req.body);

      await profile.save();

      res.status(200).json({ message: 'Education Added successfully' });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route    DELETE api/profile/education/:edu_id
// @desc     Delete education from profile
// @access   Private

router.delete('/education/:edu_id', auth, async (req, res) => {
  try {
    const foundProfile = await Profile.findOne({ user: req.user });
    foundProfile.education = foundProfile.education.filter(
      (edu) => edu._id.toString() !== req.params.edu_id
    );
    await foundProfile.save();
    return res.status(200).json(foundProfile);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Server error' });
  }
});



// @route    GET api/profile/:id
// @desc     Get user profile by ID
// @access   Public
router.get('/:id', insauth, async (req, res) => {
  try {
    const profile = await Profile.findById(req.params.id).populate('user', ['name', 'profilepicture']);

    if (!profile) {
      return res.status(404).json({ msg: 'Profile not found' });
    }

    const profileDataWithPicture = {
      _id: profile._id,
      user: {
        _id: profile.user._id,
        name: profile.firstName,
        profilepicture: profile.profilepicture
          ? `${req.protocol}://${req.get('host')}/uploads/profilePictures/${profile.profilepicture}`
          : null,
      },
      contact: profile.contact,
      address: profile.address,
      country: profile.country,
      bio: profile.bio,
      userName: profile.userName,
      email: profile.email,
      education: profile.education,
      date: profile.date,
    };

    res.json(profileDataWithPicture);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});




module.exports = router;
