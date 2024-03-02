const nodemailer = require("nodemailer");
require('dotenv').config();
const HOST = process.env.HOST
const SERVICE = process.env.SERVICE
const EMAIL_PORT = process.env.EMAIL_PORT
const USER = process.env.USER
const PASS = process.env.PASS
const SECURE = false;


module.exports = async (email, subject, text) => {
  try {
    const transporter = nodemailer.createTransport({
      host: HOST,
      service: SERVICE,
      port: EMAIL_PORT,
      secure: SECURE,
      auth: {
        user: USER,
        pass: PASS,
      },
      connectionTimeout:10000,
      socketTimeout: 10000
    });

      await transporter.sendMail({
        from: USER,
        to: email,
        subject: subject,
        text: text,
      });
    console.log("Email sent successfully");
  } catch (error) {
    console.log("Email not sent!");
    console.log(error);
    return error;
  }
};
