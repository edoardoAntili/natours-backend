const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  tour: {
    type: mongoose.Schema.ObjectId,
    ref: 'Tour',
    required: [true, 'Booking must belong to a Tour!'],
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Booking must belong to a User!'],
  },
  bookedDate: {
    type: mongoose.Schema.ObjectId,
    ref: 'StartDate',
    required: [true, 'Booking must have a start date!'],
  },
  price: {
    type: Number,
    required: [true, 'Booking must have a price.'],
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  paid: {
    type: Boolean,
    default: true,
  },
});

bookingSchema.index({ tour: 1, user: 1, bookedDate: 1 }, { unique: true });

bookingSchema.pre(/^find/, function () {
  this.populate('user')
    .populate({ path: 'tour', select: 'name' })
    .populate({ path: 'bookedDate', select: 'date' });
});

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
