// User Roles
const ROLES = {
  ADMIN: 'admin',
  REGISTERED: 'registered'
};

// User Status
const USER_STATUS = {
  ACTIVE: 'active',
  DISABLED: 'disabled'
};

// Room Status
const ROOM_STATUS = {
  AVAILABLE: 'available',
  BOOKED: 'booked',
  MAINTENANCE: 'maintenance'
};

// Booking Status
const BOOKING_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed'
};

// Departments (from requirements)
// ✅ ONLY THIS ARRAY WAS CHANGED to the 27 official ESS departments
const DEPARTMENTS = [
  'Audit Executive Officer II',
  'Legal Service Executive Officer',
  'Ethics Executive Officer I',
  'Public Relation and Communication Executive Officer I',
  'Women and Social Affair inclusiveness Executive Officer I',
  'Procurement and Finance Executive Officer II',
  'Institutional Change Executive Officer II',
  'Human Resource Management and Competence Executive Officer II',
  'Strategic Affairs Executive Officer II',
  'Information Communication Tecnology Chief Executive Officer',
  'Chief Executive Office of Basic service',
  'Vehicle de ployment and maintenance Executive Officer I',
  'Population Statistics Chief Executive Officer',
  'Social and Inclusiveness Statistics Chief Executive Officer',
  'Vital Statistics Chief Executive Officer',
  'Price Statistics Chief Executive Officer',
  'Director of the Business Statistics Directorate',
  'Chief Executive Officer Of Agricultural Statistics',
  'Chief Executive Officer of Household Budget and Labour Statistics',
  'Economic Statistics',
  'Information Technology and Infrastructure Development Chief Executive Officer',
  'Geospatial Statistics Chief Executive Officer',
  'Statistical Data Dissemination and Access Chief Executive Officer',
  'Statistical Surveys Methodology Chief Executive Officer',
  'Statistics Research and training Chief Executive Officer',
  'Administrative Data Harmonization, Standard and Quality Chief Executive Officer',
  'Branch Offices and Operation Coordination Chief Executive Officer'
];

// API Response Status
const RESPONSE_STATUS = {
  SUCCESS: 'success',
  ERROR: 'error',
  FAIL: 'fail'
};

// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500
};

// Booking validation limits
const BOOKING_LIMITS = {
  MIN_DURATION: 15, // minutes
  MAX_DURATION: 480, // 8 hours in minutes
  MIN_GUESTS: 0,
  MAX_GUESTS: 100,
  MIN_CAPACITY: 1,
  MAX_CAPACITY: 100,
  BUSINESS_HOURS_START: 8, // 8:00 AM
  BUSINESS_HOURS_END: 20 // 8:00 PM
};

// Time format
const TIME_FORMAT = {
  PATTERN: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
  DISPLAY: 'HH:mm'
};

// Message constants
const MESSAGES = {
  // Auth messages
  LOGIN_SUCCESS: 'Login successful',
  LOGIN_FAILED: 'Invalid username or password',
  ACCOUNT_DISABLED: 'Your account has been deactivated. Please contact admin.',
  TOKEN_EXPIRED: 'Token expired. Please login again.',
  TOKEN_INVALID: 'Invalid token. Please login again.',
  NO_TOKEN: 'No token provided. Please login.',

  // User messages
  USER_CREATED: 'User created successfully',
  USER_UPDATED: 'User updated successfully',
  USER_DELETED: 'User deleted successfully',
  USER_NOT_FOUND: 'User not found',
  USER_EXISTS: 'User with this username or email already exists',
  CANNOT_DELETE_LAST_ADMIN: 'Cannot delete the last admin user',

  // Room messages
  ROOM_CREATED: 'Room created successfully',
  ROOM_UPDATED: 'Room updated successfully',
  ROOM_DELETED: 'Room deleted successfully',
  ROOM_NOT_FOUND: 'Room not found',
  ROOM_EXISTS: 'Room with this name already exists',
  ROOM_HAS_BOOKINGS: 'Cannot delete room with active bookings',

  // Booking messages
  BOOKING_CREATED: 'Booking created successfully',
  BOOKING_UPDATED: 'Booking updated successfully',
  BOOKING_CANCELLED: 'Booking cancelled successfully',
  BOOKING_NOT_FOUND: 'Booking not found',
  BOOKING_CONFLICT: 'Room is already booked for the selected time slot',
  CAPACITY_EXCEEDED: 'Number of guests exceeds room capacity',
  INVALID_TIME: 'Start time must be before end time',
  DURATION_TOO_SHORT: 'Meeting duration must be at least 15 minutes',
  DURATION_TOO_LONG: 'Meeting duration cannot exceed 8 hours',
  OUTSIDE_BUSINESS_HOURS: 'Meeting time must be between 8:00 AM and 8:00 PM',

  // Validation messages
  REQUIRED_FIELD: 'This field is required',
  INVALID_EMAIL: 'Please provide a valid email address',
  PASSWORD_MIN_LENGTH: 'Password must be at least 6 characters',
  USERNAME_MIN_LENGTH: 'Username must be at least 3 characters',
  USERNAME_PATTERN: 'Username can only contain letters, numbers and underscore',

  // Access messages
  ACCESS_DENIED: 'Access denied',
  ADMIN_REQUIRED: 'Admin access required',
  NOT_AUTHENTICATED: 'User not authenticated'
};

// Export all constants
module.exports = {
  ROLES,
  USER_STATUS,
  ROOM_STATUS,
  BOOKING_STATUS,
  DEPARTMENTS,
  RESPONSE_STATUS,
  HTTP_STATUS,
  BOOKING_LIMITS,
  TIME_FORMAT,
  MESSAGES
};