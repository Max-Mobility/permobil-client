import { Log } from '@permobil/core';

export const currentSystemTime = () => {
  return new java.text.SimpleDateFormat('h:mm', java.util.Locale.US).format(
    new java.util.Date()
  );
};

export const currentSystemTimeMeridiem = () => {
  const c = java.util.Calendar.getInstance();
  const AM_PM = c.get(java.util.Calendar.AM_PM);
  if (AM_PM === java.util.Calendar.PM) {
    return 'PM';
  } else if (AM_PM === java.util.Calendar.AM) {
    return 'AM';
  }
};
