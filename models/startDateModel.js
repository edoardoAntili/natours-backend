const mongoose = require('mongoose');
const Tour = require('./tourModel');

const startDateSchema = new mongoose.Schema({
  date: Date,
  participants: {
    type: Number,
    default: 0,
  },
  soldOut: {
    type: Boolean,
    default: false,
  },
  tour: {
    type: mongoose.Schema.ObjectId,
    ref: 'Tour',
    required: [true, 'Tour date must belong to a tour.'],
  },
});

startDateSchema.pre('save', async function () {
  const tour = await Tour.findById(this.tour);

  if (this.participants === tour.maxGroupSize) this.soldOut = true;
});

const StartDate = mongoose.model('StartDate', startDateSchema);

module.exports = StartDate;
