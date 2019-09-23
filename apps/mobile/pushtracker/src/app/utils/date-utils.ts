export function getTimeOfDayFromStartTime(startTime: number) {
  const date = new Date(startTime);
  const hour = date.getHours();
  const minutes = date.getMinutes();
  // Morning
  if (hour < 12) return TimeOfDay.MORNING;
  // Afternoon
  else if (hour === 12 && minutes >= 0) return TimeOfDay.AFTERNOON;
  else if (hour >= 12 && hour < 17) return TimeOfDay.AFTERNOON;
  // Evening
  else if (hour === 17 && minutes === 0) return TimeOfDay.EVENING;
  else if (hour >= 17 && hour < 20) return TimeOfDay.EVENING;
  // Night
  else if (hour === 20 && minutes === 0) return TimeOfDay.NIGHT;
  else return TimeOfDay.NIGHT;
}

export function getTimeOfDayString(timeOfDay: TimeOfDay) {
  if (timeOfDay === 0) return 'morning';
  else if (timeOfDay === 1) return 'afternoon';
  else if (timeOfDay === 2) return 'evening';
  else if (timeOfDay === 3) return 'night';
}

export function getDayOfWeek(date: Date) {
  // Sunday = 0, Saturday = 6;
  return date.getDay();
}

export function getFirstDayOfWeek(date) {
  date = new Date(date);
  const day = date.getDay();
  if (day === 0) return date; // Sunday is the first day of the week
  const diff = date.getDate() - day;
  return new Date(date.setDate(diff));
}

export function formatAMPM(date: Date) {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const strTime =
    hours + ':' + (minutes < 10 ? '0' + minutes : minutes) + ' ' + ampm;
  return strTime;
}

export function format24Hour(date: Date) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const strTime = (hours < 10 ? '0' + hours : hours) + ':' +
    (minutes < 10 ? '0' + minutes : minutes);
  return strTime;
}

export function areDatesSame(first: Date, second: Date): boolean {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

export enum TimeOfDay {
  'MORNING' = 0, // Before 12:00 PM
  'AFTERNOON' = 1, // 12:01 PM to 5:00 PM
  'EVENING' = 2, // 5:01 PM to 8:00 PM
  'NIGHT' = 3 // After 8:00 PM
}

export function YYYY_MM_DD(date: Date) {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return date.getFullYear() + '/' +
    (month < 10 ? '0' + month : month) +
    '/' + (day < 10 ? '0' + day : day);
}