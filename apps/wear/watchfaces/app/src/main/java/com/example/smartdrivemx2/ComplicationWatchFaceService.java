package com.example.smartdrivemx2;

import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.res.Resources;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Rect;
import android.graphics.Typeface;
import android.os.Bundle;
import android.os.Handler;
import android.os.Message;
import android.support.wearable.complications.ComplicationData;
import android.support.wearable.complications.ComplicationHelperActivity;
import android.support.wearable.complications.SystemProviders;
import android.support.wearable.complications.rendering.ComplicationDrawable;
import android.support.wearable.watchface.CanvasWatchFaceService;
import android.support.wearable.watchface.WatchFaceService;
import android.support.wearable.watchface.WatchFaceStyle;
import android.text.format.DateFormat;
import android.util.Log;
import android.util.SparseArray;
import android.view.SurfaceHolder;
import android.view.WindowInsets;

import androidx.core.content.ContextCompat;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;
import java.util.concurrent.TimeUnit;

import io.sentry.Sentry;
import io.sentry.event.BreadcrumbBuilder;

/**
 * Watch Face for "Adding Complications to your Watch Face" code lab.
 */
public class ComplicationWatchFaceService extends CanvasWatchFaceService {
    private static Typeface BOLD_TYPEFACE;
    private static Typeface NORMAL_TYPEFACE;
    private static final String TAG = "ComplicationWatchFace";

    /**
     * Update rate in milliseconds for normal (not ambient and not mute) mode. We update twice
     * a second to blink the colons.
     */
    private static final long NORMAL_UPDATE_RATE_MS = 500;

    /**
     * Update rate in milliseconds for mute mode. We update every minute, like in ambient mode.
     */
    private static final long MUTE_UPDATE_RATE_MS = TimeUnit.MINUTES.toMillis(1);


    private static final int LEFT_COMPLICATION_ID = 0;
    private static final int BACKGROUND_COMPLICATION_ID = 1;
    private static final int CENTER_COMPLICATION_ID = 2;

    private static final int[] COMPLICATION_IDS = {LEFT_COMPLICATION_ID, BACKGROUND_COMPLICATION_ID, CENTER_COMPLICATION_ID};

    // Left and right dial supported types.
    private static final int[][] COMPLICATION_SUPPORTED_TYPES = {
            {
                    ComplicationData.TYPE_RANGED_VALUE,
                    ComplicationData.TYPE_ICON,
                    ComplicationData.TYPE_SHORT_TEXT,
            },
            {
                    ComplicationData.TYPE_RANGED_VALUE,
                    ComplicationData.TYPE_ICON,
                    ComplicationData.TYPE_SHORT_TEXT,
            },
            {
                    ComplicationData.TYPE_RANGED_VALUE,
                    ComplicationData.TYPE_ICON,
                    ComplicationData.TYPE_SHORT_TEXT,
                    ComplicationData.TYPE_SMALL_IMAGE
            }
    };

    // Used by {@link ComplicationConfigActivity} to retrieve id for complication locations and
    // to check if complication location is supported.

    static int getComplicationId(
            ComplicationConfigActivity.ComplicationLocation complicationLocation) {
        // Add any other supported locations here you would like to support. In our case, we are
        // only supporting a left and right complication.
        switch (complicationLocation) {
            case LEFT:
                return LEFT_COMPLICATION_ID;
            case BACKGROUND:
                return BACKGROUND_COMPLICATION_ID;
            case CENTER:
                return CENTER_COMPLICATION_ID;
            default:
                return -1;
        }
    }

    // Used by {@link ComplicationConfigActivity} to retrieve all complication ids.

    static int[] getComplicationIds() {
        return COMPLICATION_IDS;
    }

    // Used by {@link ComplicationConfigActivity} to retrieve complication types supported by
    // location.

    static int[] getSupportedComplicationTypes(
            ComplicationConfigActivity.ComplicationLocation complicationLocation) {
        // Add any other supported locations here.
        switch (complicationLocation) {
            case LEFT:
                return COMPLICATION_SUPPORTED_TYPES[1];
            case BACKGROUND:
                return COMPLICATION_SUPPORTED_TYPES[0];
            case CENTER:
                return COMPLICATION_SUPPORTED_TYPES[2];
            default:
                return new int[]{};
        }
    }

    /*
     * Update rate in milliseconds for interactive mode. We update once a second to advance the
     * second hand.
     */
    private static long mInteractiveUpdateRateMs = NORMAL_UPDATE_RATE_MS;

    @Override
    public Engine onCreateEngine() {
        return new Engine();
    }

    private class Engine extends CanvasWatchFaceService.Engine {
        private static final int MSG_UPDATE_TIME = 0;

        static final String COLON_STRING = ":";

        /**
         * Alpha value for drawing time when in mute mode.
         */
        static final int MUTE_ALPHA = 100;

        /**
         * Alpha value for drawing time when not in mute mode.
         */
        static final int NORMAL_ALPHA = 255;

        private static final float HOUR_AND_MINUTE_STROKE_WIDTH = 5f;
        private static final float SECOND_TICK_STROKE_WIDTH = 2f;
        private static final float CENTER_GAP_AND_CIRCLE_RADIUS = 4f;
        private static final int SHADOW_RADIUS = 6;

        private Calendar mCalendar;
        private Date mDate;
        private SimpleDateFormat mDayOfWeekFormat;
        private java.text.DateFormat mDateFormat;
        private boolean mRegisteredTimeZoneReceiver = false;

        private float mCenterX;
        private float mCenterY;

        private float mHourHandLength;
        private float mMinuteHandLength;
        private float mSecondHandLength;
        private float mScale = 1;

        private Paint mHourMinuteTicksHandPaint;
        private Paint mSecondHandPaint;
        private Paint mBackgroundPaint;
        private Bitmap mBackgroundBitmap;

        private boolean mAmbient;

        private Paint mDatePaint;
        private Paint mHourPaint;
        private Paint mMinutePaint;
        private Paint mSecondPaint;
        private Paint mAmPmPaint;
        private Paint mColonPaint;
        float mColonWidth;
        boolean mMute;

        boolean mShouldDrawColons;
        float mXOffset;
        float mYOffset;
        float mLineHeight;
        String mAmString;
        String mPmString;
        int mInteractiveBackgroundColor = Color.BLACK;
        int mInteractiveHourDigitsColor = Color.WHITE;
        int mInteractiveMinuteDigitsColor = Color.WHITE;
        int mInteractiveSecondDigitsColor = Color.GRAY;

        /*
         * Whether the display supports fewer bits for each color in ambient mode.
         * When true, we disable anti-aliasing in ambient mode.
         */
        private boolean mLowBitAmbient;

        /*
         * Whether the display supports burn in protection in ambient mode.
         * When true, remove the background in ambient mode.
         */
        private boolean mBurnInProtection;


        /* Maps active complication ids to the data for that complication. Note: Data will only be
         * present if the user has chosen a provider via the settings activity for the watch face.
         */
        private SparseArray<ComplicationData> mActiveComplicationDataSparseArray;

        /* Maps complication ids to corresponding ComplicationDrawable that renders the
         * the complication data on the watch face.
         */
        private SparseArray<ComplicationDrawable> mComplicationDrawableSparseArray;

        private final BroadcastReceiver mTimeZoneReceiver =
                new BroadcastReceiver() {
                    @Override
                    public void onReceive(Context context, Intent intent) {
                        mCalendar.setTimeZone(TimeZone.getDefault());
                        initFormats();
                        invalidate();
                    }
                };

        private void initFormats() {
            mDayOfWeekFormat = new SimpleDateFormat("EEEE", Locale.getDefault());
            mDayOfWeekFormat.setCalendar(mCalendar);
            mDateFormat = DateFormat.getDateFormat(ComplicationWatchFaceService.this);
            mDateFormat.setCalendar(mCalendar);
        }

        // Handler to update the time once a second in interactive mode.
        private final Handler mUpdateTimeHandler =
                new Handler() {
                    @Override
                    public void handleMessage(Message message) {
                        switch (message.what) {
                            case MSG_UPDATE_TIME:
                                if (Log.isLoggable(TAG, Log.VERBOSE)) {
                                    Log.v(TAG, "updating time");
                                }
                                invalidate();
                                if (shouldTimerBeRunning()) {
                                    long timeMs = System.currentTimeMillis();
                                    long delayMs =
                                            mInteractiveUpdateRateMs
                                                    - (timeMs % mInteractiveUpdateRateMs);
                                    mUpdateTimeHandler.sendEmptyMessageDelayed(MSG_UPDATE_TIME, delayMs);
                                }
                                break;
                        }
                    }
                };

        @Override
        public void onCreate(SurfaceHolder holder) {
            super.onCreate(holder);
            // create the fonts to set on the service class to use for styling text
            BOLD_TYPEFACE = Typeface.createFromAsset(getAssets(), "fonts/opensans_semibold.ttf");
            NORMAL_TYPEFACE = Typeface.createFromAsset(getAssets(), "fonts/opensans_regular.ttf");


            setWatchFaceStyle(
                    new WatchFaceStyle.Builder(ComplicationWatchFaceService.this)
                            .setAcceptsTapEvents(true)
                            .setHideStatusBar(true)
                            .build());

            Resources resources = ComplicationWatchFaceService.this.getResources();
            mYOffset = resources.getDimension(R.dimen.digital_y_offset);
            mLineHeight = resources.getDimension(R.dimen.digital_line_height);
            mAmString = resources.getString(R.string.digital_am);
            mPmString = resources.getString(R.string.digital_pm);
            mCalendar = Calendar.getInstance();
            mDate = new Date();

            initializeBackground();
            initFormats();
            initializeComplications();
            initSentrySetup();
            // TODO: set APP_SHORTCUT to smartdrive mx2+
        }

        private void initSentrySetup() {
            // Setup Sentry logging, uses `sentry.properties`
            Sentry.init();
            /*
            Record a breadcrumb in the current context which will be sent
            with the next event(s). By default the last 100 breadcrumbs are kept.
            */
            Sentry.getContext().recordBreadcrumb(
                    new BreadcrumbBuilder().setMessage("SmartDrive MX2 Digital WatchFace started.").build()
            );

            Thread.setDefaultUncaughtExceptionHandler(
                    new Thread.UncaughtExceptionHandler() {
                        @Override
                        public void uncaughtException(Thread thread, Throwable e) {
                            Log.e(TAG, e.getMessage());
                            Sentry.capture(e);
                        }
                    });
        }

        private void initializeBackground() {
            mBackgroundPaint = new Paint();
            mBackgroundPaint.setColor(mInteractiveBackgroundColor);

            final int backgroundResId = R.drawable.permobil;
            mBackgroundBitmap = BitmapFactory.decodeResource(getResources(), backgroundResId);


            mDatePaint = createTextPaint(
                    ContextCompat.getColor(getApplicationContext(), R.color.digital_date));
            mHourPaint = createTextPaint(mInteractiveHourDigitsColor, NORMAL_TYPEFACE);
            mMinutePaint = createTextPaint(mInteractiveMinuteDigitsColor, NORMAL_TYPEFACE);
            mSecondPaint = createTextPaint(mInteractiveSecondDigitsColor);
            mAmPmPaint = createTextPaint(
                    ContextCompat.getColor(getApplicationContext(), R.color.digital_am_pm), NORMAL_TYPEFACE);
            mColonPaint = createTextPaint(
                    ContextCompat.getColor(getApplicationContext(), R.color.digital_colons));
        }

        private Paint createTextPaint(int defaultInteractiveColor) {
            return createTextPaint(defaultInteractiveColor, NORMAL_TYPEFACE);
        }

        private Paint createTextPaint(int defaultInteractiveColor, Typeface typeface) {
            Paint paint = new Paint();
            paint.setColor(defaultInteractiveColor);
            paint.setTypeface(typeface);
            paint.setAntiAlias(true);
            return paint;
        }

        private void initializeComplications() {
            Log.d(TAG, "initializeComplications()");
            mActiveComplicationDataSparseArray = new SparseArray<>(COMPLICATION_IDS.length);

            // Creates a ComplicationDrawable for each location where the user can render a
            // complication on the watch face. In this watch face, we only create left and right,
            // but you could add many more.
            // All styles for the complications are defined in
            // drawable/custom_complication_styles.xml.
            ComplicationDrawable leftComplicationDrawable =
                    (ComplicationDrawable) getDrawable(R.drawable.custom_complication_styles);
            if (leftComplicationDrawable != null) {
                leftComplicationDrawable.setContext(getApplicationContext());
            }

            ComplicationDrawable backgroundComplicationDrawable =
                    (ComplicationDrawable) getDrawable(R.drawable.custom_complication_styles);
            if (backgroundComplicationDrawable != null) {
                backgroundComplicationDrawable.setContext(getApplicationContext());
            }

            ComplicationDrawable centerComplicationDrawable =
                    (ComplicationDrawable) getDrawable(R.drawable.custom_complication_styles);
            if (centerComplicationDrawable != null) {
                centerComplicationDrawable.setContext(getApplicationContext());
            }

            // Adds new complications to a SparseArray to simplify setting styles and ambient
            // properties for all complications, i.e., iterate over them all.
            mComplicationDrawableSparseArray = new SparseArray<>(COMPLICATION_IDS.length);
            mComplicationDrawableSparseArray.put(LEFT_COMPLICATION_ID, leftComplicationDrawable);
            mComplicationDrawableSparseArray.put(BACKGROUND_COMPLICATION_ID, backgroundComplicationDrawable);
            mComplicationDrawableSparseArray.put(CENTER_COMPLICATION_ID, centerComplicationDrawable);

            setActiveComplications(COMPLICATION_IDS);

            setDefaultComplicationProvider(COMPLICATION_IDS[1], new ComponentName("com.permobil.smartdrive.wearos", "com.permobil.smartdrive.wearos.BatteryComplicationProviderService"), ComplicationData.TYPE_RANGED_VALUE);
            setDefaultSystemComplicationProvider(COMPLICATION_IDS[2], SystemProviders.APP_SHORTCUT, ComplicationData.TYPE_SMALL_IMAGE);
            setDefaultSystemComplicationProvider(COMPLICATION_IDS[0], SystemProviders.WATCH_BATTERY, ComplicationData.TYPE_RANGED_VALUE);

//            Intent permissionRequestIntent =
//                    ComplicationHelperActivity.createPermissionRequestHelperIntent(
//                            getApplicationContext(), new ComponentName("com.permobil.smartdrive.wearos","com.permobil.smartdrive.wearos.BatteryComplicationProviderService"));
//
//            permissionRequestIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
//            startActivity(permissionRequestIntent);

            Log.e("TAG", "onCreate done.");
        }

        @Override
        public void onDestroy() {
            mUpdateTimeHandler.removeMessages(MSG_UPDATE_TIME);
            super.onDestroy();
        }

        @Override
        public void onPropertiesChanged(Bundle properties) {
            mLowBitAmbient = properties.getBoolean(PROPERTY_LOW_BIT_AMBIENT, false);
            mBurnInProtection = properties.getBoolean(PROPERTY_BURN_IN_PROTECTION, false);
            mHourPaint.setTypeface(mBurnInProtection ? NORMAL_TYPEFACE : BOLD_TYPEFACE);
            mMinutePaint.setTypeface(mBurnInProtection ? NORMAL_TYPEFACE : BOLD_TYPEFACE);

            // Updates complications to properly render in ambient mode based on the
            // screen's capabilities.
            ComplicationDrawable complicationDrawable;

            for (int i = 0; i < COMPLICATION_IDS.length; i++) {
                complicationDrawable = mComplicationDrawableSparseArray.get(COMPLICATION_IDS[i]);

                if (complicationDrawable != null) {
                    complicationDrawable.setLowBitAmbient(mLowBitAmbient);
                    complicationDrawable.setBurnInProtection(mBurnInProtection);
                }
            }
        }


        @Override
        public void onComplicationDataUpdate(
                int complicationId, ComplicationData complicationData) {
            Log.d(TAG, "onComplicationDataUpdate() id: " + complicationId);

            // Adds/updates active complication data in the array.
            mActiveComplicationDataSparseArray.put(complicationId, complicationData);

            // Updates correct ComplicationDrawable with updated data.
            ComplicationDrawable complicationDrawable =
                    mComplicationDrawableSparseArray.get(complicationId);
            complicationDrawable.setComplicationData(complicationData);

            invalidate();
        }

        @Override
        public void onTapCommand(int tapType, int x, int y, long eventTime) {

            Log.d(TAG, "OnTapCommand()");
            switch (tapType) {
                case TAP_TYPE_TAP:
                    int tappedComplicationId = getTappedComplicationId(x, y);
                    if (tappedComplicationId != -1) {
                        onComplicationTap(tappedComplicationId);
                    }
                    break;
            }
        }

        /*
         * Determines if tap inside a complication area or returns -1.
         */
        private int getTappedComplicationId(int x, int y) {
            int complicationId;
            ComplicationData complicationData;
            ComplicationDrawable complicationDrawable;

            long currentTimeMillis = System.currentTimeMillis();

            for (int i = 1; i < COMPLICATION_IDS.length; i++) {
                complicationId = COMPLICATION_IDS[i];
                complicationData = mActiveComplicationDataSparseArray.get(complicationId);

                if ((complicationData != null)
                        && (complicationData.isActive(currentTimeMillis))
                        && (complicationData.getType() != ComplicationData.TYPE_NOT_CONFIGURED)
                        && (complicationData.getType() != ComplicationData.TYPE_EMPTY)) {

                    // tap position: y < 125 => Refresh SD battery
                    //           125 < y < 275 => launch MX2+ app
                    //               y> 275 => call system battery setting
                    if (y < 125) {
                        complicationId = 1;
                        return complicationId;
                    } else if (y > 275) {
                        complicationId = 0;
                        return complicationId;
                    } else {
                        complicationId = 2;
                        return complicationId;
                    }

//                    complicationDrawable = mComplicationDrawableSparseArray.get(complicationId);
//                    Rect complicationBoundingRect = complicationDrawable.getBounds();
//
//                    if (complicationBoundingRect.width() > 0) {
//                        if (complicationBoundingRect.contains(x, y)) {
//                            return complicationId;
//                        }
//                    } else {
//                        Log.e(TAG, "Not a recognized complication id.");
//                    }
                }
            }
            return -1;
        }

        // Fires PendingIntent associated with complication (if it has one).
        private void onComplicationTap(int complicationId) {

            Log.d(TAG, "onComplicationTap()");

            ComplicationData complicationData =
                    mActiveComplicationDataSparseArray.get(complicationId);

            if (complicationData != null) {

                if (complicationData.getTapAction() != null) {
                    try {
                        if (complicationId != 2) {
                            complicationData.getTapAction().send();
                        } else {
                            Intent sdLaunch = getPackageManager().getLaunchIntentForPackage("com.permobil.smartdrive.wearos");
                            startActivity(sdLaunch);
                        }
                    } catch (PendingIntent.CanceledException e) {
                        Log.e(TAG, "onComplicationTap() tap action error: " + e);
                    }

                } else if (complicationData.getType() == ComplicationData.TYPE_NO_PERMISSION) {

                    // Watch face does not have permission to receive complication data, so launch
                    // permission request.
                    ComponentName componentName =
                            new ComponentName(
                                    getApplicationContext(), ComplicationWatchFaceService.class);

                    Intent permissionRequestIntent =
                            ComplicationHelperActivity.createPermissionRequestHelperIntent(
                                    getApplicationContext(), componentName);
                    permissionRequestIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(permissionRequestIntent);
                    //Log.e("TAG", "Need permission");
                }

            } else {
                Log.d(TAG, "No PendingIntent for complication " + complicationId + ".");
            }
        }

        @Override
        public void onTimeTick() {
            super.onTimeTick();
            invalidate();
        }

        @Override
        public void onAmbientModeChanged(boolean inAmbientMode) {
            super.onAmbientModeChanged(inAmbientMode);

            mAmbient = inAmbientMode;

            adjustPaintColorToCurrentMode(mBackgroundPaint, mInteractiveBackgroundColor,
                    Color.BLACK);
            adjustPaintColorToCurrentMode(mHourPaint, mInteractiveHourDigitsColor,
                    Color.WHITE);
            adjustPaintColorToCurrentMode(mMinutePaint, mInteractiveMinuteDigitsColor,
                    Color.WHITE);
            // Actually, the seconds are not rendered in the ambient mode, so we could pass just any
            // value as ambientColor here.
            adjustPaintColorToCurrentMode(mSecondPaint, mInteractiveSecondDigitsColor,
                    Color.GRAY);

            if (mLowBitAmbient) {
                boolean antiAlias = !inAmbientMode;
                mDatePaint.setAntiAlias(antiAlias);
                mHourPaint.setAntiAlias(antiAlias);
                mMinutePaint.setAntiAlias(antiAlias);
                mSecondPaint.setAntiAlias(antiAlias);
                mAmPmPaint.setAntiAlias(antiAlias);
                mColonPaint.setAntiAlias(antiAlias);
            }
            invalidate();

            // Update drawable complications' ambient state.
            // Note: ComplicationDrawable handles switching between active/ambient colors, we just
            // have to inform it to enter ambient mode.
            ComplicationDrawable complicationDrawable;

            for (int complicationId : COMPLICATION_IDS) {
                complicationDrawable = mComplicationDrawableSparseArray.get(complicationId);
                complicationDrawable.setInAmbientMode(mAmbient);
            }

            // Check and trigger whether or not timer should be running (only in active mode).
            updateTimer();
        }

        private void adjustPaintColorToCurrentMode(Paint paint, int interactiveColor, int ambientColor) {
            paint.setColor(isInAmbientMode() ? ambientColor : interactiveColor);
        }

        @Override
        public void onInterruptionFilterChanged(int interruptionFilter) {
            if (Log.isLoggable(TAG, Log.DEBUG)) {
                Log.d(TAG, "onInterruptionFilterChanged: " + interruptionFilter);
            }
            super.onInterruptionFilterChanged(interruptionFilter);

            boolean inMuteMode = interruptionFilter == WatchFaceService.INTERRUPTION_FILTER_NONE;
            // We only need to update once a minute in mute mode.
            setInteractiveUpdateRateMs(inMuteMode ? MUTE_UPDATE_RATE_MS : NORMAL_UPDATE_RATE_MS);

            if (mMute != inMuteMode) {
                mMute = inMuteMode;
                int alpha = inMuteMode ? MUTE_ALPHA : NORMAL_ALPHA;
                mDatePaint.setAlpha(alpha);
                mHourPaint.setAlpha(alpha);
                mMinutePaint.setAlpha(alpha);
                mColonPaint.setAlpha(alpha);
                mAmPmPaint.setAlpha(alpha);
                invalidate();
            }
        }

        private void setInteractiveUpdateRateMs(long updateRateMs) {
            if (updateRateMs == mInteractiveUpdateRateMs) {
                return;
            }
            mInteractiveUpdateRateMs = updateRateMs;

            // Stop and restart the timer so the new update rate takes effect immediately.
            if (shouldTimerBeRunning()) {
                updateTimer();
            }
        }

        @Override
        public void onSurfaceChanged(SurfaceHolder holder, int format, int width, int height) {
            super.onSurfaceChanged(holder, format, width, height);

            /*
             * Find the coordinates of the center point on the screen.
             * Ignore the window insets so that, on round watches
             * with a "chin", the watch face is centered on the entire screen,
             * not just the usable portion.
             */
            Log.d(TAG, "width:" + width);
            Log.d(TAG, "height:" + height);
            mCenterX = width / 2f;
            mCenterY = height / 2f;
            mScale = ((float) width) / (float) mBackgroundBitmap.getWidth();

            /*
             * Calculate lengths of different hands based on watch screen size.
             */
            mSecondHandLength = (float) (mCenterX * 0.875);
            mMinuteHandLength = (float) (mCenterX * 0.75);
            mHourHandLength = (float) (mCenterX * 0.5);

            mBackgroundBitmap = Bitmap.createScaledBitmap(mBackgroundBitmap,
                    (int) (mBackgroundBitmap.getWidth() * mScale),
                    (int) (mBackgroundBitmap.getHeight() * mScale), true);

            /*
             * Calculates location bounds for right and left circular complications. Please note,
             * we are not demonstrating a long text complication in this watch face.
             *
             * We suggest using at least 1/4 of the screen width for circular (or squared)
             * complications and 2/3 of the screen width for wide rectangular complications for
             * better readability.
             */

            // For most Wear devices, width and height are the same, so we just chose one (width).

            int sizeOfComplication = width / 4;
            int midpointOfScreen = width / 2;

            int horizontalOffset = (midpointOfScreen - sizeOfComplication) / 2;
            int verticalOffset = midpointOfScreen - (sizeOfComplication / 2);

            int offset = 15;
            Rect leftBounds =
                    // Left, Top, Right, Bottom
                    new Rect(offset, offset, width - offset, height - offset);
//                            horizontalOffset,
//                            verticalOffset,
//                            (horizontalOffset + sizeOfComplication),
//                            (verticalOffset + sizeOfComplication));

            ComplicationDrawable leftComplicationDrawable =
                    mComplicationDrawableSparseArray.get(LEFT_COMPLICATION_ID);
            leftComplicationDrawable.setBounds(leftBounds);

            Rect backgroundBounds =
                    // Left, Top, Right, Bottom
                    new Rect(0, 0, width, height);
//                            horizontalOffset,
//                            horizontalOffset,
//                            (width - horizontalOffset),
//                            (width - horizontalOffset));

            ComplicationDrawable backgroundComplicationDrawable =
                    mComplicationDrawableSparseArray.get(BACKGROUND_COMPLICATION_ID);
            backgroundComplicationDrawable.setBounds(backgroundBounds);

            Rect centerBounds =
                    // Left, Top, Right, Bottom
                    new Rect(200, 200, 200, 200);
//                            horizontalOffset,
//                            verticalOffset,
//                            (horizontalOffset + sizeOfComplication),
//                            (verticalOffset + sizeOfComplication));

            ComplicationDrawable centerComplicationDrawable =
                    mComplicationDrawableSparseArray.get(CENTER_COMPLICATION_ID);
            // hide app icon image
            centerComplicationDrawable.setBounds(centerBounds);
        }

        @Override
        public void onDraw(Canvas canvas, Rect bounds) {
            long now = System.currentTimeMillis();
            mCalendar.setTimeInMillis(now);
            mDate.setTime(now);
            boolean is24Hour = DateFormat.is24HourFormat(ComplicationWatchFaceService.this);

            // Show colons for the first half of each second so the colons blink on when the time
            // updates.
            mShouldDrawColons = (System.currentTimeMillis() % 1000) < 500;

            // Draw the background.
            canvas.drawRect(0, 0, bounds.width(), bounds.height(), mBackgroundPaint);

            drawBackground(canvas);

            drawComplications(canvas, now);

            // Draw the hours.
            float x = mXOffset;
            String hourString;
            if (is24Hour) {
                hourString = formatTwoDigitNumber(mCalendar.get(Calendar.HOUR_OF_DAY));
            } else {
                int hour = mCalendar.get(Calendar.HOUR);
                if (hour == 0) {
                    hour = 12;
                }
                hourString = String.valueOf(hour);
            }
            canvas.drawText(hourString, x, mYOffset, mHourPaint);
            x += mHourPaint.measureText(hourString);

            // In ambient and mute modes, always draw the first colon. Otherwise, draw the
            // first colon for the first half of each second.
            if (isInAmbientMode() || mMute || mShouldDrawColons) {
                canvas.drawText(COLON_STRING, x - 2, mYOffset - 2, mColonPaint);
            }
            x += mColonWidth;

            // Draw the minutes.
            String minuteString = formatTwoDigitNumber(mCalendar.get(Calendar.MINUTE));
            canvas.drawText(minuteString, x, mYOffset, mMinutePaint);
            x += mMinutePaint.measureText(minuteString);

            // Draw the am/pm.
            if (!is24Hour) {
                canvas.drawText(getAmPmString(
                        mCalendar.get(Calendar.AM_PM)), mXOffset + 40, mYOffset + 25, mAmPmPaint);
            }

            // In unmuted interactive mode, draw a second blinking colon followed by the seconds.
            // Otherwise, if we're in 12-hour mode, draw AM/PM
//            if (!isInAmbientMode() && !mMute) {
//                if (mShouldDrawColons) {
//                    canvas.drawText(COLON_STRING, x, mYOffset, mColonPaint);
//                }
//                x += mColonWidth;
//                canvas.drawText(formatTwoDigitNumber(
//                        mCalendar.get(Calendar.SECOND)), x, mYOffset, mSecondPaint);
//            }
//            else if (!is24Hour) {
//                x += mColonWidth;
//                canvas.drawText(getAmPmString(
//                        mCalendar.get(Calendar.AM_PM)), mXOffset+10, mYOffset+25, mAmPmPaint);
//            }
        }

        private String formatTwoDigitNumber(int hour) {
            return String.format(Locale.getDefault(), "%02d", hour);
        }

        private String getAmPmString(int amPm) {
            return amPm == Calendar.AM ? mAmString : mPmString;
        }

        private void drawComplications(Canvas canvas, long currentTimeMillis) {
            int complicationId;
            ComplicationDrawable complicationDrawable;

            for (int i = 0; i < COMPLICATION_IDS.length; i++) {
                complicationId = COMPLICATION_IDS[i];

                if (i == 0) {
                    complicationDrawable = mComplicationDrawableSparseArray.get(complicationId);

                    complicationDrawable.draw(canvas, currentTimeMillis);
                    complicationDrawable.setRangedValueRingWidthActive(8);
                    complicationDrawable.setRangedValuePrimaryColorActive(0xff28628E);
                    complicationDrawable.setRangedValueSecondaryColorActive(0xff434244);
                    complicationDrawable.setIconColorAmbient(0x00000000);
                    complicationDrawable.setTextColorAmbient(0x00000000);
                    complicationDrawable.setTextColorActive(0x00000000);
                    complicationDrawable.setIconColorActive(0x00000000);
                } else if (i == 1) {
                    complicationDrawable = mComplicationDrawableSparseArray.get(complicationId);

                    complicationDrawable.draw(canvas, currentTimeMillis);
                    complicationDrawable.setRangedValueRingWidthActive(8);
                    complicationDrawable.setRangedValuePrimaryColorActive(0xff89d4e3);
                    complicationDrawable.setRangedValueSecondaryColorActive(0xff434244);
                    complicationDrawable.setIconColorAmbient(0x00000000);
                    complicationDrawable.setTextColorAmbient(0x00000000);
                    complicationDrawable.setTextColorActive(0x00000000);
                    complicationDrawable.setIconColorActive(0x00000000);

                } else {
                    complicationDrawable = mComplicationDrawableSparseArray.get(complicationId);

                    complicationDrawable.draw(canvas, currentTimeMillis);

//                    complicationDrawable.setColorFilter(0x006ea4,PorterDuff.Mode.CLEAR);
//                    ColorFilter colorfilter = complicationDrawable.getColorFilter();
//
//                    //canvas.drawColor(0x00000000, PorterDuff.Mode.CLEAR);
//
//                    complicationDrawable.setImageColorFilterActive(colorfilter);
                }
            }
        }

        private void drawBackground(Canvas canvas) {
            if (mAmbient && (mLowBitAmbient || mBurnInProtection)) {
                canvas.drawColor(Color.BLACK);
            } else {
                canvas.drawBitmap(mBackgroundBitmap, 0, 0, mBackgroundPaint);
                //canvas.drawPaint(mBackgroundPaint);
            }
        }

        @Override
        public void onVisibilityChanged(boolean visible) {
            super.onVisibilityChanged(visible);

            if (visible) {
                registerReceiver();
                // Update time zone in case it changed while we weren't visible.
                mCalendar.setTimeZone(TimeZone.getDefault());
                initFormats();
                //invalidate();
            } else {
                unregisterReceiver();
            }

            /*
             * Whether the timer should be running depends on whether we're visible
             * (as well as whether we're in ambient mode),
             * so we may need to start or stop the timer.
             */
            updateTimer();
        }

        private void registerReceiver() {
            if (mRegisteredTimeZoneReceiver) {
                return;
            }
            mRegisteredTimeZoneReceiver = true;
            IntentFilter filter = new IntentFilter(Intent.ACTION_TIMEZONE_CHANGED);
            filter.addAction(Intent.ACTION_LOCALE_CHANGED);
            ComplicationWatchFaceService.this.registerReceiver(mTimeZoneReceiver, filter);
        }

        private void unregisterReceiver() {
            if (!mRegisteredTimeZoneReceiver) {
                return;
            }
            mRegisteredTimeZoneReceiver = false;
            ComplicationWatchFaceService.this.unregisterReceiver(mTimeZoneReceiver);
        }

        @Override
        public void onApplyWindowInsets(WindowInsets insets) {
            if (Log.isLoggable(TAG, Log.DEBUG)) {
                Log.d(TAG, "onApplyWindowInsets: " + (insets.isRound() ? "round" : "square"));
            }
            super.onApplyWindowInsets(insets);

            // Load resources that have alternate values for round watches.
            Resources resources = ComplicationWatchFaceService.this.getResources();
            boolean isRound = insets.isRound();
            mXOffset = resources.getDimension(isRound
                    ? R.dimen.digital_x_offset_round : R.dimen.digital_x_offset);
            float textSize = resources.getDimension(isRound
                    ? R.dimen.digital_text_size_round : R.dimen.digital_text_size);
            float amPmSize = resources.getDimension(isRound
                    ? R.dimen.digital_am_pm_size_round : R.dimen.digital_am_pm_size);

            mDatePaint.setTextSize(resources.getDimension(R.dimen.digital_date_text_size));
            mHourPaint.setTextSize(textSize);
            mMinutePaint.setTextSize(textSize);
            mSecondPaint.setTextSize(textSize);
            mAmPmPaint.setTextSize(amPmSize);
            mColonPaint.setTextSize(textSize);

            mColonWidth = mColonPaint.measureText(COLON_STRING);
        }

        /**
         * Starts/stops the {@link #mUpdateTimeHandler} timer based on the state of the watch face.
         */
        private void updateTimer() {
            mUpdateTimeHandler.removeMessages(MSG_UPDATE_TIME);
            if (shouldTimerBeRunning()) {
                mUpdateTimeHandler.sendEmptyMessage(MSG_UPDATE_TIME);
            }
        }

        /*
         * Returns whether the {@link #mUpdateTimeHandler} timer should be running. The timer
         * should only run when we're visible and in interactive mode.
         */
        private boolean shouldTimerBeRunning() {
            return isVisible() && !isInAmbientMode();
        }
    }
}
