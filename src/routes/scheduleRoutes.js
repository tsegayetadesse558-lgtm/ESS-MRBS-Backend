const express = require('express');
const router = express.Router();
const { protect, isAdmin } = require('../middleware/auth');
const {
  createSchedule,
  getSchedules,
  getRoomSchedules,
  deleteSchedule,
  updateSchedule,
} = require('../controllers/scheduleController');

// All schedule routes require authentication and admin role
router.use(protect);
router.use(isAdmin);

// Create a new schedule
router.post('/', createSchedule);

// Get all schedules
router.get('/', getSchedules);

// Get schedules for a specific room
router.get('/room/:roomId', getRoomSchedules);

// Update a schedule
router.put('/:id', updateSchedule);

// Delete a schedule
router.delete('/:id', deleteSchedule);

module.exports = router;