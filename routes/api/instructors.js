const router = require("express").Router();
const  Instructor  = require("../../models/instructor");
const instAuth = require('../../middleware/instAuth');

const Token = require("../../models/token");
const crypto = require("crypto");
const sendEmail = require("../../utils/sendEmails");
const bcrypt = require("bcrypt");

require('dotenv').config();
const FRONTED_BASE_URL = process.env.FRONTED_BASE_URL
const validate = require("../../middleware/validate");
const axios = require("axios");
const Admin_Email = process.env.USER



//Sign Up Route Create Account Instructor 

async function verifyEmailWithHunter(email) {
	const apiKey = '3afe62ab2deb735ba329c7d8b81124d769ab6954'; // Replace with your Hunter API key
	const url = `https://api.hunter.io/v2/email-verifier?email=${email}&api_key=${apiKey}`;
  
	try {
	  const response = await axios.get(url);
	  return response.data.data;
	} catch (error) {
	  console.error("Error verifying email with Hunter:", error.response ? error.response.data : error.message);
	  throw error;
	}
  }
  
  // Sign Up Route Create Account Instructor
  router.post("/", async (req, res) => {
	try {
	  const { error } = validate(req.body);
	  if (error) {
		return res.status(400).send({ message: error.details[0].message });
	  }
  
	  // Check if email exists using Hunter API
	  const verificationResult = await verifyEmailWithHunter(req.body.email);
  
	  if (!verificationResult.result) {
		// Handle verification failure
		return res.status(400).send({ message: "Email verification failed" });
	  }
  
	  if (verificationResult.result !== 'deliverable') {
		// Email is not deliverable, handle accordingly
		return res.status(400).send({ message: "Email is not deliverable" });
	  }
  
	  let instructor = await Instructor.findOne({ email: req.body.email });
	  if (instructor) {
		return res.status(409).send({ message: "Instructor with given email already exists!" });
	  }
  
	  const salt = await bcrypt.genSalt(Number(process.env.SALT));
	  const hashPassword = await bcrypt.hash(req.body.password, salt);
  
	  instructor = await new Instructor({ ...req.body, password: hashPassword }).save();
  
	  const token = await new Token({
		type: "instructor",
		userId: instructor._id,
		token: crypto.randomBytes(32).toString("hex"),
	  }).save();
  
	  const url = `${FRONTED_BASE_URL}instructors/${instructor.id}/verify/${token.token}`;
	  const emailText = `New instructor registered:\n${req.body.email},${req.body.firstName}\n\nVerification URL: ${url}`;
  
  
	  
	  await sendEmail(Admin_Email, "Verify Email", emailText);
  
	  res.status(201).send({ message: "An Email has been sent to Admin ,You would Recive an Email Once You are Verified." });
	} catch (error) {
	  console.log(error);
	  res.status(500).send({ message: "Internal Server Error" });
	}
  });


  router.get("/:id/verify/:token", async (req, res) => {
	try {
	  const instructor = await Instructor.findOne({ _id: req.params.id });
	  if (!instructor) return res.status(400).send({ message: "Invalid link" });
  
	  const token = await Token.findOne({
		type: "instructor",
		userId: instructor._id,
		token: req.params.token,
	  });
	  if (!token) return res.status(400).send({ message: "Invalid link" });
  
	  await Instructor.updateOne({ _id: instructor._id }, { verified: true });
	  await token.remove();
  
	  // Send an email to the instructor when their email is verified
	  const emailText = `Dear ${instructor.firstName},\nYour email has been successfully verified. Thank you for registering with us!`;
	  await sendEmail(instructor.email, "Email Verified", emailText);
  
	  res.status(200).send({ message: "Email verified successfully" });
	} catch (error) {
	  res.status(500).send({ message: "Internal Server Error" });
	}
  });
  

// @route    GET api/instructors
// @desc     Get all instructors excluding the logged-in instructor
// @access   Private (assuming instAuth middleware checks for authentication)

router.get('/', instAuth, async (req, res) => {
	try {
		// Assuming you have a way to get the ID of the logged-in instructor from the request
		const loggedInInstructorId = req.instructor; // replace with the actual property that holds the instructor ID

		const verifiedInstructors = await Instructor.find({
			verified: true,
			_id: { $ne: loggedInInstructorId }, // Exclude the logged-in instructor
		}).select('-password');

		res.json(verifiedInstructors);
	} catch (err) {
		console.error(err);
		res.status(500).send('Server Error');
	}
});


module.exports = router;
