const mongoose = require('mongoose');
const calculateMD5Hash = require('./utils/md5Hash');
const Quran = require('./models/Quran');
const connectDB = require('./config/db');


async function addMD5Hash() {
  try {
    // Initialize the database connection
    connectDB();

    // Retrieve all documents from MongoDB
    const allData = await Quran.find();

    // Iterate through documents and add MD5 hash
    for (const record of allData) {
      const md5Hash = calculateMD5Hash(JSON.stringify(record));
    //    console.log(`Added MD5 Hash to Record ID: ${record._id}, Hash: ${md5Hash}`);
      
      // Update the document in MongoDB to include the MD5 hash
      await Quran.findByIdAndUpdate(record._id, { $set: { md5Hash } });
    }

    console.log('MD5 hashes added to all documents.');

    // Close the MongoDB connection
    mongoose.connection.close();
  } catch (error) {
    console.error('Error adding MD5 hashes:', error);
  }
}

// Run the MD5 hash addition function
addMD5Hash();
