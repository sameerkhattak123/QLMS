const jwt = require('jsonwebtoken');
const config = require('config');
const JWT_SECRET = "mysecrttoken";


module.exports = function (req, res, next) {
  // Get token from header
  const token = req.header('x-auth-token');

  console.log('Received token:', token);

  // Check if not token
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  // Verify token
  try {
    jwt.verify(token, JWT_SECRET, (error, decoded) => {
      if (error) {
        return res.status(401).json({ msg: 'Token is not valid ' });
      } else {
        console.log('Decoded token:', decoded);
        req.admin = decoded._id;
        req.userType = decoded.userType;
        console.log('Decoded token:', req.admin);
        
        console.log('Decoded token:', req.admin._id);
        console.log('Decoded admin ID:', req.admin);
        console.log('Decoded user type:', req.userType);
         
        next();
      }
    });
  } catch (err) {
    console.error('Something went wrong with the auth middleware');
    res.status(500).json({ msg: 'Server Error' });
  }
};
