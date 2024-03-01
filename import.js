const xlsx = require('xlsx');
const mongoose = require('mongoose');
const md5 = require('md5');
const connectDB = require('./config/db');
const Data = require('./models/Ayah');

// Connect to MongoDB
connectDB();

// Read the Excel file
const workbook = xlsx.readFile('tayah.xlsx');
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const jsonData = xlsx.utils.sheet_to_json(worksheet);

// Hashing function using MD5
const hashData = (data) => {
  return md5(JSON.stringify(data));
};

// Insert the data into MongoDB
Data.insertMany(jsonData.map((data) => ({ ...data, hash: hashData(data) })), (err) => {
  if (err) {
    console.error('Error importing data:', err);
  } else {
    console.log('Data imported successfully');
  }

  // Close the MongoDB connection
  mongoose.connection.close();
});
