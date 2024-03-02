const express = require('express');
const axios = require('axios');
const config = require('config');
const router = express.Router();
const instAuth = require('../../middleware/instAuth');
const { check, validationResult } = require('express-validator');
// bring in normalize to give us a proper url, regardless of what user entered
const normalize = require('normalize-url');
const checkObjectId = require('../../middleware/checkObjectId');
const multer = require('multer');
const fs = require("fs");
const moment = require('moment');

const InstructorProfile = require('../../models/instructorProfile');
const Instructor = require('../../models/instructor');

const profilePicturesDir = "public/uploads/profilePictures";
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
    const uniqueFileName = `${req.instructor}-${Date.now()}.${ext}`;
    cb(null, uniqueFileName); // Set the filename as "profile-{user_id}.{ext}"
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG and PNG files are allowed."));
  }
};

const upload = multer({ storage, fileFilter, 
  limits: {
    fileSize: 10 * 1024 * 1024, 
  },  
});


// @route    GET api/profile/me
// @desc     Get current user's profile
// @access   Private
router.get('/me', instAuth, async (req, res) => {
  try {
    const profile = await InstructorProfile.findOne({
      user: req.instructor
    }).populate('user', ['name', 'profilepicture']);
      user= req.instructor;
    if (!profile) {
      return res.status(400).json({ msg: 'There is no profile for this user' });
    }

    const profileDataWithPicture = {
      _id: profile._id,
      user: {
        _id: profile.user._id,
        name: profile.user.firstName,
        profilepicture: profile.profilepicture
          ? `${req.protocol}://${req.get('host')}/uploads/profilePictures/${profile.profilepicture}`
          : null,
      },
      userName:profile.userName,
      email:profile.email,
      contact: profile.contact,
      address: profile.address,
      country: profile.country,
      website: profile.website,
      bio: profile.bio,
      education: profile.education,
      skills: profile.skills,
      experience: profile.experience,
      social: profile.social,
      date: profile.date,
    };

    res.json(profileDataWithPicture);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    GET api/profile
// @desc     Get all profiles
// @access   Public
router.get('/', async (req, res) => {
  try {
    const profiles = await InstructorProfile.find().populate('user', ['firstName']);

    const profileDataWithPicture = profiles.map((profile) => {
      return {
        _id: profile._id,
        user: profile.user,
        profilepicture: profile.profilepicture
          ? `${req.protocol}://${req.get('host')}/uploads/profilePictures/${profile.profilepicture}`
          : null,
        contact: profile.contact,
        userName:profile.userName,
        email:profile.email,
        address: profile.address,
        country: profile.country,
        website: profile.website,
        bio: profile.bio,
        education: profile.education,
        skills: profile.skills,
        experience: profile.experience,
        social: profile.social,
        date: profile.date,
      };
    });

    res.json(profileDataWithPicture);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    GET api/profile/user/:user_id
// @desc     Get profile by user ID
// @access   Public
router.get('/instructor/:user_id', checkObjectId('user_id'), async (req, res) => {
  try {
    const { user_id } = req.params;
    const profile = await InstructorProfile.findOne({
      user: user_id
    }).populate('user', ['firstName', 'profilepicture']);

    if (!profile) return res.status(400).json({ msg: 'Profile not found' });

    const profileDataWithPicture = {
      _id: profile._id,
      user: {
        _id: profile.user._id,
        firstName: profile.firstName,
        profilepicture: profile.profilepicture
          ? `${req.protocol}://${req.get('host')}/uploads/profilePictures/${profile.profilepicture}`
          : null,
      },
      userName:profile.userName,
      email:profile.email,
      contact: profile.contact,
      address: profile.address,
      country: profile.country,
      website: profile.website,
      bio: profile.bio,
      education: profile.education,
      skills: profile.skills,
      experience: profile.experience,
      social: profile.social,
      date: profile.date,
    };

    return res.json(profileDataWithPicture);
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ msg: 'Server error' });
  }
});

router.post(
  '/',
  instAuth,
  upload.single('profilepicture'), // Middleware to handle file upload
  [
    check('country', 'Country is required').notEmpty(),
    check('skills', 'Skills is required').notEmpty(),
    // Add validation checks for other fields
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      // Get the profile fields from the request body
      const { 
        country, bio, address, 
        contact, website, skills, youtube, twitter, instagram,
        linkedin, facebook, ...rest
      } = req.body;

      // Get user's email and username from the User model
      const user = await Instructor.findById(req.instructor);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Build the profile object
      const profileFields = {
        user: req.instructor,
        website:
          website && website !== ''
            ? normalize(website, { forceHttps: true })
            : '',
        skills: Array.isArray(skills)
          ? skills
          : skills.split(',').map((skill) => skill.trim()),
        country,
        bio,
        address,
        contact,
        ...rest
      };

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

      let profile = await InstructorProfile.findOne({ user: req.instructor });

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
          profile = await InstructorProfile.findOneAndUpdate(
            { user: req.instructor },
            { $set: { ...profileFields, profilepicture: req.file.filename } },
            { new: true, upsert: true, setDefaultsOnInsert: true }
          );
        } else {
          // Update the profile without changing the profile picture
          profile = await InstructorProfile.findOneAndUpdate(
            { user: req.instructor },
            { $set: profileFields },
            { new: true, upsert: true, setDefaultsOnInsert: true }
          );
        }

        return res.status(200).json({ message: 'Profile Updated successfully' });
      }

      // Create a new profile
      profile = new InstructorProfile(profileFields);
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
  instAuth,
  check('school', 'School is required').notEmpty(),
  check('degree', 'Degree is required').notEmpty(),
  check('fieldofstudy', 'Field of study is required').notEmpty(),
  check('from', 'From date is required and needs to be from the past')
    .notEmpty()
    .custom((value, { req }) => (req.body.to ? moment(value).isBefore(req.body.to, 'day') : true)),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const profile = await InstructorProfile.findOne({ user: req.instructor });

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
  
  router.delete('/education/:edu_id', instAuth, async (req, res) => {
    try {
      const foundProfile = await InstructorProfile.findOne({ user: req.instructor });
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

  router.put(
    '/experience',
    instAuth,
    check('title', 'Title is required').notEmpty(),
    check('company', 'Company is required').notEmpty(),
    check('from', 'From date is required and needs to be from the past')
      .notEmpty()
      .custom((value, { req }) => (req.body.to ? moment(value).isBefore(req.body.to, 'day') : true)),
    check('to', 'To date is required').custom((value, { req }) => {
      if (value) {
        const fromDate = moment(req.body.from);
        const toDate = moment(value);
  
        return toDate.isBefore(moment(), 'day') && toDate.isAfter(fromDate, 'day') && !toDate.isSame(fromDate, 'day');
      }
      return true;
    }),
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
  
      try {
        const profile = await InstructorProfile.findOne({ user: req.instructor });
  
        profile.experience.unshift(req.body);
  
        await profile.save();
  
        res.status(200).json({ message: 'Experience Added successfully' });
      } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
      }
    }
  );

// @route    DELETE api/profile/experience/:exp_id
// @desc     Delete experience from profile
// @access   Private

router.delete('/experience/:exp_id', instAuth, async (req, res) => {
  try {
    const foundProfile = await InstructorProfile.findOne({ user: req.instructor });

    foundProfile.experience = foundProfile.experience.filter(
      (exp) => exp._id.toString() !== req.params.exp_id
    );

    await foundProfile.save();
    return res.status(200).json(foundProfile);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;