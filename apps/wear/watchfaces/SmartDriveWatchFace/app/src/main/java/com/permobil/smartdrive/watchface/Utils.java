package com.permobil.smartdrive.watchface;

import java.util.Calendar;
import java.util.Locale;

class Utils {

    public static String formatTwoDigitNumber(int hour) {
        return String.format(Locale.getDefault(), "%02d", hour);
    }

    public static String getAmPmString(int amPm) {
        return amPm == Calendar.AM ? "AM" : "PM";
    }
}
