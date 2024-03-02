const crypto = require('crypto');

function calculateMD5Hash(data) {
  const md5 = crypto.createHash('md5');
  return md5.update(data).digest('hex');
}

module.exports = calculateMD5Hash;
