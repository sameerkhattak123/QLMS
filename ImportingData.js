const xlsx = require('xlsx');
const connectDB = require('./config/db');
const mongoose = require('mongoose');
const Quran = require('./models/Quran');

const filePath = 'Quran.xlsx';

async function importData() {
  // Read data from XLS file
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

  try {
    // Initialize the database connection
    connectDB();

    // Insert data into MongoDB without MD5 hash
    await Quran.insertMany(data);

    console.log('Data imported successfully.');

    // Close the MongoDB connection
    mongoose.connection.close();
  } catch (error) {
    console.error('Error importing data:', error);
  }
}

// Run the import function
importData();
