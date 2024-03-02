const calculateMD5Hash = require('./md5Hash');
const Quran = require('../models/Quran');
const sendEmail = require('./sendEmails');
const _ = require('lodash'); 

async function monitorChanges() {
  // Get all data from MongoDB
  const allData = await Quran.find();

  try {
    console.log('Running Check');
    // Check for changes and log hash calculations
    allData.forEach(async (record) => {
      // Create a new object without the md5Hash property
      const recordWithoutMD5Hash = _.omit(record.toObject(), 'md5Hash');
      const calculatedHash = calculateMD5Hash(JSON.stringify(recordWithoutMD5Hash));
      
   
      if (calculatedHash !== record.md5Hash) {
        // Send email alert
        sendEmail(
          'sp20-bse-050@cuilahore.edu.pk',
          'Data Change Alert',
          'Data in MongoDB has been modified!'
        );

        // Delete existing data
        Quran.deleteMany({}, (err) => {
          if (err) {
            console.error('Error deleting data:', err);
          } else {
            console.log('Data deleted due to integrity check failure.');
          }
        });
      }
    });
  } catch (error) {
    console.error('Error checking data integrity:', error);
  }
}

// Schedule the function to run periodically (e.g., using setInterval)
setInterval(monitorChanges, 3600000); // Runs every hour (3600000 milliseconds)

module.exports = monitorChanges;
