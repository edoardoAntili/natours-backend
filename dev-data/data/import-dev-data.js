const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Tour = require('../../models/tourModel');
const User = require('../../models/userModel');
const Review = require('../../models/reviewModel');
const StartDate = require('../../models/startDateModel');
const Booking = require('../../models/bookingModel');

dotenv.config({ path: './config.env' });

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD,
);

mongoose.connect(DB).then(() => console.log('DB connection successful!'));

// READ JSON FILE
const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`, 'utf-8'));
const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`, 'utf-8'));
const reviews = JSON.parse(
  fs.readFileSync(`${__dirname}/reviews.json`, 'utf-8'),
);
const startDates = JSON.parse(
  fs.readFileSync(`${__dirname}/startDates.json`, 'utf-8'),
);
const bookings = JSON.parse(
  fs.readFileSync(`${__dirname}/bookings.json`, 'utf-8'),
);

// IMPORT DATA INTO DB
const importData = async () => {
  try {
    const datesWithBookings = startDates.map((startDate) => {
      const participants = bookings.filter(
        (booking) => booking.bookedDate === startDate._id,
      ).length;
      const tour = tours.find((item) => item._id === startDate.tour);
      return {
        ...startDate,
        participants,
        soldOut: participants >= tour.maxGroupSize,
      };
    });

    await Tour.create(tours);
    await User.create(users, { validateBeforeSave: false });
    await Review.create(reviews);
    await StartDate.create(datesWithBookings);
    await Booking.create(bookings);
    console.log('Data successfully loaded!');
  } catch (err) {
    console.log(err);
    process.exitCode = 1;
  }
  await mongoose.disconnect();
};

// DELETE ALL DATA FROM COLLECTION
const deleteData = async () => {
  try {
    await Booking.deleteMany();
    await Tour.deleteMany();
    await User.deleteMany();
    await Review.deleteMany();
    await StartDate.deleteMany();
    console.log('Data successfully deleted!');
  } catch (err) {
    console.log(err);
    process.exitCode = 1;
  }
  await mongoose.disconnect();
};

if (process.argv[2] === '--import') importData();
else if (process.argv[2] === '--delete') deleteData();

console.log(process.argv);
