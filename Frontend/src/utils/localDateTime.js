export const localDateTimeToISOString = (date, time) => {
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  const localDateTime = new Date(year, month - 1, day, hours, minutes);

  if (
    Number.isNaN(localDateTime.getTime()) ||
    localDateTime.getFullYear() !== year ||
    localDateTime.getMonth() !== month - 1 ||
    localDateTime.getDate() !== day ||
    localDateTime.getHours() !== hours ||
    localDateTime.getMinutes() !== minutes
  ) {
    throw new Error('The selected date or time is invalid in your local timezone.');
  }

  return localDateTime.toISOString();
};

export const localDateToISOString = (date) => (
  localDateTimeToISOString(date, '00:00')
);

export const localDateKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid date value.');
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const dateFromLocalDateKey = (dateKey) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
};
