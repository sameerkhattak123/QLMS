const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const Joi = require("joi");
const passwordComplexity = require("joi-password-complexity");
const config = require("config");


const instructorSchema = new mongoose.Schema({
	firstName: { type: String, required: true },
	lastName: { type: String, required: true },
	email: { type: String, required: true },
	password: { type: String, required: true },
	verified: { type: Boolean, default: false },
	userRole: { type: String, default: "instructor" }, 
	
});

instructorSchema.methods.generateAuthToken = function () {
	const token = jwt.sign({ _id: this._id ,userType:'instructor'}, config.get("jwtSecret"), {
		expiresIn: "7d",
	});
	return token;
};

const Instructor = mongoose.model("Instructor", instructorSchema);

const validate = (data) => {
	const schema = Joi.object({
		firstName: Joi.string().required().label("First Name"),
		lastName: Joi.string().required().label("Last Name"),
		email: Joi.string().email().required().label("Email"),
		password: passwordComplexity().required().label("Password"),
	});
	return schema.validate(data);
};

// module.exports = { Instructor, validate };

module.exports = Instructor;