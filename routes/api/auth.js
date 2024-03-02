const router = require("express").Router();
const  User  = require("../../models/user");
require('dotenv').config();
const Instructor = require("../../models/instructor");
const Token = require("../../models/token");
const crypto = require("crypto");
const sendEmail = require("../../utils/sendEmails");
const bcrypt = require("bcrypt");
const Joi = require("joi");
const FRONTED_BASE_URL = process.env.FRONTED_BASE_URL

const auth = require('../../middleware/auth');
const instAuth = require('../../middleware/instAuth');
const { check, validationResult } = require('express-validator');
const adminAuth = require('../../middleware/adminAuth');
const Admin = require('../../models/Admin');
const BlockedUser = require('../../models/BlockedUser');

const validate = (data) => {
	const schema = Joi.object({
		email: Joi.string().email().required().label("Email"),
		password: Joi.string().required().label("Password"),
	});
	return schema.validate(data);
};
//Post Route
//User Token / Student Token
router.get('/', auth, async (req, res) => {
	try {
	  const user = await User.findById(req.user).select('-password');
	  res.json(user);
	} catch (err) {
	  console.error(err.message);
	  res.status(500).send('Server Error');
	}
  });


//User Login 
router.post("/", 
check('email', 'Please include a valid email').isEmail(),
  check('password', 'Password is required').exists(),
async (req, res) => {
	const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
	try {
		const  {error} = validate(req.body);
		if (error)
			return res.status(400).json({ errors: errors.array() });

	let user = await User.findOne({ email: { $regex: new RegExp(req.body.email, 'i') } });
		
		if (!user)
			return res.status(401).json({ errors: [{ msg: 'Invalid Credentials' }] });

			 // Check if the user is blocked
		const blockedUser = await BlockedUser.findOne({ userId: user._id, userType: 'user' });

		if (blockedUser) {
		return res.status(401).json({ errors: [{ msg: 'Your account is blocked. Please contact the administrator.' }] });
			 }

		const validPassword = await bcrypt.compare(
			req.body.password,
			user.password
		);
		if (!validPassword)
			return res.status(401).json({ errors: [{ msg: 'Invalid Credentials' }] });

		if (!user.verified) {
			let token = await Token.findOne({ userId: user._id });
			if (!token) {
				token = await new Token({
					type: "user",
					userId: user._id,
					token: crypto.randomBytes(32).toString("hex"),
				}).save();
        const url = `${FRONTED_BASE_URL}users/${user.id}/verify/${token.token}`;
				await sendEmail(user.email, "Verify Email", url);
			}

			return res
				.status(400)
				.json({ errors: [{ msg:  'An Email sent to your account please verify' }] });
				
		}

		const token = user.generateAuthToken();
		res.status(200).send({ data:{ token,userId: user._id,userType: 'user'}, message: "logged in successfully" });
	} catch (error) {
		res.status(500).send({ message: "Internal Server Error" });
	}
});


 //Instructor Token 
 router.get('/instAuth', instAuth, async (req, res) => {
	try {
	  const user = await Instructor.findById(req.instructor).select('-password');
	  res.json(user);
	} catch (err) {
	  console.error(err.message);
	  res.status(500).send('Server Error');
	}
  });

//Instructor  Login 
router.post("/instLogin",
check('email', 'Please include a valid email').isEmail(),
  check('password', 'Password is required').exists(),
async (req, res) => {
	const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
	try {
		const {error} = validationResult(req);
		if (error)
			return res.status(400).json({ errors: errors.array() });

		let instructor = await Instructor.findOne({ email: { $regex: new RegExp(req.body.email, 'i') } });
		if (!instructor)
		return res.status(401).json({ errors: [{ msg: 'Invalid Credentials' }] });

	const blockedUser = await BlockedUser.findOne({ userId: instructor._id, userType: 'instructor' });

      if (blockedUser) {
        return res.status(401).json({ errors: [{ msg: 'Your account is blocked. Please contact the administrator.' }] });
      }


		const validPassword = await bcrypt.compare(
			req.body.password,
			instructor.password
		);
		if (!validPassword)
		return res.status(401).json({ errors: [{ msg: 'Invalid Credentials' }] });

		if (!instructor.verified) {
			let token = await Token.findOne({ userId: instructor._id });
			if (!token) {
				token = await new Token({
					type:"instructor",
					userId: instructor._id,
					token: crypto.randomBytes(32).toString("hex"),
				}).save();
        const url = `${FRONTED_BASE_URL}users/${instructor.id}/verify/${token.token}`;
				await sendEmail(instructor.email, "Verify Email", url);
			}

			return res
				.status(400)
				.json({ errors: [{ msg:  'An Email sent to your account please verify' }] });
		}

		const token = instructor.generateAuthToken();
		res.status(200).send({ data:{ token,userId: instructor._id,userType: 'instructor'}, message: "logged in successfully" });
	} catch (error) {
		res.status(500).send({ message: "Internal Server Error" });
	}
});


//Admin  Login 
router.post("/adminLogin",
check('email', 'Please include a valid email').isEmail(),
  check('password', 'Password is required').exists(),
async (req, res) => {
	const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
	try {
		const {error} = validationResult(req);
		if (error)
			return res.status(400).json({ errors: errors.array() });
			let admin = await Admin.findOne({ email: { $regex: new RegExp(req.body.email, 'i') } });
		
		if (!admin)
		return res.status(401).json({ errors: [{ msg: 'Invalid Credentials' }] });

		const validPassword = await bcrypt.compare(
			req.body.password,
			admin.password
		);
		if (!validPassword)
		return res.status(401).json({ errors: [{ msg: 'Invalid Credentials' }] });

		if (!admin.verified) {
			let token = await Token.findOne({ userId: admin._id });
			if (!token) {
				token = await new Token({
					type:"admin",
					userId: admin._id,
					token: crypto.randomBytes(32).toString("hex"),
				}).save();
        const url = `${FRONTED_BASE_URL}admin/${admin.id}/verify/${token.token}`;
				await sendEmail(admin.email, "Verify Email", url);
			}

			return res
				.status(400)
				.json({ errors: [{ msg:  'An Email sent to your account please verify' }] });
		}

		const token = admin.generateAuthToken();
		res.status(200).send({ data:{ token,userId: admin._id,userType: 'admin'}, message: "logged in successfully" });
	} catch (error) {
		res.status(500).send({ message: "Internal Server Error" });
	}
});


router.get('/adminLogin', adminAuth, async (req, res) => {
	try {
		console.log('Decoded admin ID:', req.admin);

	  const user = await Admin.findById(req.admin).select('-password');
	  
	  console.log('User found:', user);

	  if(!user	)
	  {
		return res.status(404).json({ msg: 'Admin user not found' });
	  }
	  res.json(user);
	} catch (err) {
	  console.error(err.message);
	  res.status(500).send('Server Error');
	}
  });

module.exports = router;
