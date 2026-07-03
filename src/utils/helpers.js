// Format date to readable string
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Format time to readable string
const formatTime = (time) => {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

// Format date time
const formatDateTime = (date, time) => {
  return `${formatDate(date)} at ${formatTime(time)}`;
};

// Generate random ID
const generateId = () => {
  return Math.random().toString(36).substring(2, 10);
};

// Check if string is valid JSON
const isValidJson = (str) => {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
};

// Paginate results
const paginate = (data, page = 1, limit = 10) => {
  const start = (page - 1) * limit;
  const end = page * limit;
  const paginated = data.slice(start, end);
  return {
    data: paginated,
    total: data.length,
    page,
    limit,
    totalPages: Math.ceil(data.length / limit)
  };
};

// Capitalize first letter
const capitalize = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

module.exports = {
  formatDate,
  formatTime,
  formatDateTime,
  generateId,
  isValidJson,
  paginate,
  capitalize
};
