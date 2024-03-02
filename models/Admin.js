const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const Joi = require("joi");
const passwordComplexity = require("joi-password-complexity");
const config = require("config");

const adminSchema = new mongoose.Schema({
	firstName: { type: String, required: true },
	lastName: { type: String, required: true },
	email: { type: String, required: true },
	password: { type: String, required: true },
	verified: { type: Boolean, default: false },
	userRole: { type: String, default: "admin" }, 
});


adminSchema.methods.generateAuthToken = function () {
	const token = jwt.sign({_id:this._id,userType:'admin'}, config.get("jwtSecret"), {
		expiresIn: "7d",
	});
	return token;
};

const Admin = mongoose.model("Admin", adminSchema);

const validate = (data) => {
	const schema = Joi.object({
		firstName: Joi.string().required().label("First Name"),
		lastName: Joi.string().required().label("Last Name"),
		email: Joi.string().email().required().label("Email"),
		password: passwordComplexity().required().label("Password"),
	});
	return schema.validate(data);
};

// module.exports = { User, validate };
module.exports = Admin; 