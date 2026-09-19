const express = require('express');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const bookingRouter = require('./bookingRoutes');
const bookingController = require('../controllers/bookingController');
const reviewRouter = require('./reviewRoutes');
const reviewController = require('../controllers/reviewController');

const router = express.Router();

router.use('/:userId/bookings', bookingRouter);
router.use('/:userId/reviews', reviewRouter);

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/logout', authController.logout);
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

// Protect all routes after this middleware
router.use(authController.protect);

router.get(
  '/bookings',
  authController.restrictTo('user'),
  bookingController.getMyBookings,
);
router.get(
  '/reviews',
  authController.restrictTo('user'),
  reviewController.getMyReviews,
);

router.patch('/updateMyPassword', authController.updatePassword);
router.get('/me', userController.getMe, userController.getUser);
router.patch(
  '/updateMe',
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe,
);
router.delete('/deleteMe', userController.deleteMe);
router.get('/liked-tours', userController.getLikedTours);
router
  .route('/liked-tours/:tourId')
  .post(userController.addLikedTour)
  .delete(userController.removeLikedTour);

router.use(authController.restrictTo('admin'));

router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
