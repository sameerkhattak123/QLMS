const express = require('express');
const connectDB = require('./config/db');
require('dotenv').config();
const path = require('path');
const cors = require('cors');
 const monitorChanges = require('./utils/monitorChanges');
 const config = require("config");
 const FRONTED_BASE_URL = process.env.FRONTED_BASE_URL
// const importData = require('./ImportingData');



const app = express();

app.use(cors());

// Serve static files from the "public" directory
app.use(express.static('public'));

// Connect Database
connectDB();

// monitorChanges();

// Init Middleware
app.use(express.json());


// Define Routes
app.use('/api/quran', require('./routes/api/quran'))
app.use('/api/users', require('./routes/api/users'))
app.use('/api/instructors', require('./routes/api/instructors'))
app.use('/api/admin', require('./routes/api/admin'))
app.use('/api/auth', require('./routes/api/auth'))
app.use('/api/usersPass', require('./routes/api/usersPass'))
app.use('/api/instructorsPass', require('./routes/api/instructorsPass'))
app.use('/api/profile', require('./routes/api/profile'))
app.use('/api/instructorProfile', require('./routes/api/instructorProfile'))
app.use('/api/course', require('./routes/api/course'))
app.use('/api/enrollment',require('./routes/api/enrollment'))
app.use('/api/announcements',require('./routes/api/announcements'))
app.use('/api/assignment',require('./routes/api/assignment'))
app.use('/api/submission',require('./routes/api/submission'))
app.use('/api/quiz',require('./routes/api/quiz'));
app.use('/api/attemptQuiz',require('./routes/api/attemptQuiz'));
app.use('/api/courseContent',require('./routes/api/courseContent'));
app.use('/api/marks',require('./routes/api/marks'));
app.use('/api/forums',require('./routes/api/forums'));
app.use('/api/notification',require('./routes/api/notification'));

// Serve static assets in production
// if (process.env.NODE_ENV === 'production') {
//   // Set static folder
//   app.use(express.static('Final Updated Frontend/build'));

//   app.get('*', (req, res) => {
//     res.sendFile(path.resolve(__dirname, 'Final Updated Frontend', 'build', 'index.html'));
//   });
// }


app.get('/', (req, res) => {
     app.use(express.static(path.resolve(__dirname,"final-updated-frontend","build")));
     res.sendFile(path.resolve(__dirname, 'final-updated-frontend', 'build', 'index.html'));
  });


const PORT = process.env.PORT || 5000;

app.listen(PORT, () =>
console.log(`Server started on port ${PORT}`));
