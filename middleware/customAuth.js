// Custom middleware to handle both user and instructor authentication
const jwt = require('jsonwebtoken');
const config = require('config');
const JWT_SECRET = "mysecrttoken";

module.exports = function (req, res, next) {
  // Get token from header
  const token = req.header('x-auth-token');

  // Check if not token
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  // Try to verify token for user authentication
  jwt.verify(token, JWT_SECRET, (error, decoded) => {
    if (!error) {
      req.user = decoded._id;
      console.log('User authenticated:', req.user);
      next();
    } else {
      // If user authentication fails, try instructor authentication
      jwt.verify(token, JWT_SECRET, (error, decoded) => {
        if (!error) {
          req.instructor = decoded._id;
          // Set req.user to undefined when authenticated as instructor
          req.user = undefined;
          console.log('Instructor authenticated:', req.instructor);
          next();
        } else {
          return res.status(401).json({ msg: 'Token is not valid ' });
        }
      });
    }
  });
};
