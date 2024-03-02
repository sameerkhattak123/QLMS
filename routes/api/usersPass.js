const router = require("express").Router();
const  User = require("../../models/user");
const Token = require("../../models/token");
const crypto = require("crypto");
const sendEmail = require("../../utils/sendEmails");
const passwordComplexity = require("joi-password-complexity");
const bcrypt = require("bcrypt");
const BASE_URL = "http://localhost:3000/";
const Joi = require("joi");
const auth = require("../../middleware/auth");






// send password link
router.post("/", async (req, res) => {
	try {
		const emailSchema = Joi.object({
			email: Joi.string().email().required().label("Email"),
		});
		const { error } = emailSchema.validate(req.body);
		if (error)
			return res.status(400).send({ message: error.details[0].message });
		
			let user = await User.findOne({ email: { $regex: new RegExp(req.body.email, 'i') } });
		
		if (!user)
			return res
				.status(409)
				.send({ message: "User with given email does not exist!" });

		let token = await Token.findOne({ userId: user._id });
		if (!token) {
			token = await new Token({
                type: "user",
				userId: user._id,
				token: crypto.randomBytes(32).toString("hex"),
			}).save();
		}

		const url = `${BASE_URL}password-reset/${user._id}/${token.token}/`;
		await sendEmail(user.email, "Password Reset", url);

		res
			.status(200)
			.send({ message: "Password reset link sent to your email account" });
	} catch (error) {
		res.status(500).send({ message: "Internal Server Error" });
	}
});

// verify password reset link
router.get("/:id/:token", async (req, res) => {
	try {
	  const user = await User.findOne({ _id: req.params.id });
	  if (!user) return res.status(400).send({ success: false, message: "Invalid link" });
  
	  const token = await Token.findOne({
		type: "user",
		userId: user._id,
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
  
	  const user = await User.findOne({ _id: req.params.id });
	  if (!user) return res.status(400).send({ success: false, message: "Invalid link" });
  
	  const token = await Token.findOne({
		type: "user",
		userId: user._id,
		token: req.params.token,
	  });
	  if (!token) return res.status(400).send({ success: false, message: "Invalid link" });
  
	  if (!user.verified) user.verified = true;
  
	  const salt = await bcrypt.genSalt(10); // Set the desired salt value here
	  const hashPassword = await bcrypt.hash(req.body.password, salt);
  
	  user.password = hashPassword;
	  await user.save();
	  await token.remove();
  
	  res.status(200).send({ success: true, message: "Password reset successfully" });
	} catch (error) {
	  res.status(500).send({ success: false, message: "Internal Server Error" });
	}
  });
// Your existing route
router.post('/change-password', auth, async (req, res) => {
	try {
	  const { currentPassword, newPassword } = req.body;
	  const user = await User.findById(req.user);
  
	  // Check if the provided current password matches the stored password
	  const isMatch = await bcrypt.compare(currentPassword, user.password);
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
	  user.password = await bcrypt.hash(newPassword, salt);
  
	  // Save the updated user with the new password
	  await user.save();
  
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


module.exports = router;