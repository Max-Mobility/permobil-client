package com.permobil.smartdrive.wearos.util;

import java.util.Calendar;
import java.util.Locale;

public class DateUtils {

    public static String formatTwoDigitNumber(int value) {
        return String.format(Locale.getDefault(), "%02d", value);
    }

    public static String getAmPmString(int amPm) {
        return amPm == Calendar.AM ? "AM" : "PM";
    }
}
