package com.permobil.smartdrivemx2digital;

import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.res.Resources;
import android.graphics.Canvas;
import android.graphics.Rect;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.BatteryManager;
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
import android.view.LayoutInflater;
import android.view.SurfaceHolder;
import android.view.View;
import android.view.WindowInsets;
import android.widget.ImageButton;
import android.widget.ImageView;
import android.widget.RelativeLayout;
import android.widget.TextView;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;
import java.util.concurrent.TimeUnit;

import at.grabner.circleprogress.CircleProgressView;
import butterknife.BindView;
import butterknife.ButterKnife;
import io.sentry.Sentry;
import io.sentry.event.BreadcrumbBuilder;

/**
 * Watch Face for "Adding Complications to your Watch Face" code lab.
 */
public class ComplicationWatchFaceService extends CanvasWatchFaceService {
    private static final String TAG = "ComplicationWatchFace";
    private static Typeface BOLD_TYPEFACE;
    private static Typeface NORMAL_TYPEFACE;


    /**
     * Update rate in milliseconds for normal (not ambient and not mute) mode. We update twice
     * a second to blink the colons.
     */
    private static final long NORMAL_UPDATE_RATE_MS = 500;

    /**
     * Update rate in milliseconds for mute mode. We update every minute, like in ambient mode.
     */
    private static final long MUTE_UPDATE_RATE_MS = TimeUnit.MINUTES.toMillis(1);

    private static final int TOP_COMPLICATION_ID = 1;
    private static final int CENTER_COMPLICATION_ID = 0;
    private static final int[] COMPLICATION_IDS = {TOP_COMPLICATION_ID, CENTER_COMPLICATION_ID};

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
                    ComplicationData.TYPE_SMALL_IMAGE,
                    ComplicationData.TYPE_LARGE_IMAGE
            }
    };

    private LayoutInflater mInflater;
    private RelativeLayout mRelativeLayout;

    // Used by {@link ComplicationConfigActivity} to retrieve id for complication locations and
    // to check if complication location is supported.

    static int getComplicationId(ComplicationConfigActivity.ComplicationLocation complicationLocation) {
        // Add any other supported locations here you would like to support. In our case, we are only supporting a center top complication
        if (complicationLocation == ComplicationConfigActivity.ComplicationLocation.CENTER) {
            return CENTER_COMPLICATION_ID;
        } else if (complicationLocation == ComplicationConfigActivity.ComplicationLocation.TOP) {
            return TOP_COMPLICATION_ID;
        }
        return -1;
    }

    // Used by {@link ComplicationConfigActivity} to retrieve all complication ids.

    static int[] getComplicationIds() {
        return COMPLICATION_IDS;
    }

    // Used by {@link ComplicationConfigActivity} to retrieve complication types supported by
    // location.

    static int[] getSupportedComplicationTypes(ComplicationConfigActivity.ComplicationLocation complicationLocation) {
        // Add any other supported locations here.
        if (complicationLocation == ComplicationConfigActivity.ComplicationLocation.TOP) {
            return COMPLICATION_SUPPORTED_TYPES[0];
        } else if (complicationLocation == ComplicationConfigActivity.ComplicationLocation.CENTER) {
            return COMPLICATION_SUPPORTED_TYPES[1];
        }

        return new int[]{};
    }

    /*
     * Update rate in milliseconds for interactive mode. We update once a second to advance the
     * second hand.
     */
    private static long mInteractiveUpdateRateMs = NORMAL_UPDATE_RATE_MS;

    @Override
    public Engine onCreateEngine() {
        mInflater = (LayoutInflater) this.getSystemService(Context.LAYOUT_INFLATER_SERVICE);
        return new Engine();
    }

    public class Engine extends CanvasWatchFaceService.Engine {
        private static final int MSG_UPDATE_TIME = 0;

        // Gets our view instances in our layout bound with ButterKnife
        @BindView(R.id.batteryIcon)
        ImageView batteryIcon;
        @BindView(R.id.watchBatteryCircle)
        CircleProgressView watchBatteryCircle;
        @BindView(R.id.smartDriveBatteryCircle)
        CircleProgressView smartDriveBatteryCircle;
        @BindView(R.id.hourTextView)
        TextView hourTextView;
        @BindView(R.id.smartDriveBtn)
        ImageButton smartDriveBtn;
        @BindView(R.id.colonTextView)
        TextView colonTextView;
        @BindView(R.id.minuteTextView)
        TextView minuteTextView;
        @BindView(R.id.amPmTextView)
        TextView amPmTextView;


        /**
         * Alpha value for drawing time when in mute mode.
         */
        static final int MUTE_ALPHA = 100;

        /**
         * Alpha value for drawing time when not in mute mode.
         */
        static final int NORMAL_ALPHA = 255;

        private Calendar mCalendar;
        private Date mDate;

        private boolean mRegisteredTimeZoneReceiver = false;

        boolean mMute;
        boolean mShouldDrawColons;

        float mXOffset;
        float mYOffset;
        float mLineHeight;

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
            SimpleDateFormat mDayOfWeekFormat = new SimpleDateFormat("EEEE", Locale.getDefault());
            mDayOfWeekFormat.setCalendar(mCalendar);
            java.text.DateFormat mDateFormat = DateFormat.getDateFormat(ComplicationWatchFaceService.this);
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

            mRelativeLayout = (RelativeLayout) mInflater.inflate(R.layout.watchface_layout, null);

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
            mCalendar = Calendar.getInstance();
            mDate = new Date();

            initFormats();
            initializeComplications();
            initSentrySetup();
        }

        @Override
        public void onDestroy() {
            mUpdateTimeHandler.removeMessages(MSG_UPDATE_TIME);
            super.onDestroy();
        }

        @Override
        public void onSurfaceChanged(SurfaceHolder holder, int format, int width, int height) {
            super.onSurfaceChanged(holder, format, width, height);

            Log.d(TAG, "width: " + width + " " + "height: " + height);

            // For most Wear devices, width and height are the same, so we just chose one (width).
            int sizeOfComplication = width / 4;
            Log.d(TAG, "size of complication: " + sizeOfComplication);
            int midpointOfScreen = width / 2;
            Log.d(TAG, "midpoint of screen: " + midpointOfScreen);
            int horizontalOffset = (midpointOfScreen - sizeOfComplication) / 2;
            Log.d(TAG, "horizontalOffset: " + horizontalOffset);
            int verticalOffset = midpointOfScreen - (sizeOfComplication / 2);
            Log.d(TAG, "verticalOffset: " + verticalOffset);

            int left = midpointOfScreen - (sizeOfComplication / 2);
            int top = midpointOfScreen / 2;
            int right = (horizontalOffset + sizeOfComplication);
            int bottom = (verticalOffset + sizeOfComplication);
            Rect topComplicationBounds = new Rect(left, top, right, bottom);

            Rect leftBounds =
                    // Left, Top, Right, Bottom
                    new Rect(
                            horizontalOffset,
                            verticalOffset,
                            (horizontalOffset + sizeOfComplication),
                            (verticalOffset + sizeOfComplication));

            ComplicationDrawable topComplicationDrawable = mComplicationDrawableSparseArray.get(TOP_COMPLICATION_ID);
            topComplicationDrawable.setBounds(leftBounds);

            Rect rect = new Rect(left, top, right, bottom);
            Rect rightBounds =
                    // Left, Top, Right, Bottom
                    new Rect(
                            (midpointOfScreen + horizontalOffset),
                            verticalOffset,
                            (midpointOfScreen + horizontalOffset + sizeOfComplication),
                            (verticalOffset + sizeOfComplication));
            ComplicationDrawable centerComplicationDrawable = mComplicationDrawableSparseArray.get(CENTER_COMPLICATION_ID);
            centerComplicationDrawable.setBounds(rightBounds);
            Log.d(TAG, "set the bounds for the center complication");
        }

        @Override
        public void onDraw(Canvas canvas, Rect bounds) {
            long now = System.currentTimeMillis();
            mCalendar.setTimeInMillis(now);
            mDate.setTime(now);

            // Measure the view at the exact dimensions (otherwise the text won't center correctly)
            int widthSpec = View.MeasureSpec.makeMeasureSpec(bounds.width(), View.MeasureSpec.EXACTLY);
            int heightSpec = View.MeasureSpec.makeMeasureSpec(bounds.height(), View.MeasureSpec.EXACTLY);
            mRelativeLayout.measure(widthSpec, heightSpec);

            // Lay the view out at the rect width and height
            mRelativeLayout.layout(0, 0, bounds.width(), bounds.height());
            mRelativeLayout.draw(canvas);

            ButterKnife.bind(this, mRelativeLayout);

            drawTimeStrings();
            float batteryLvl = getWatchBatteryLevel();
            watchBatteryCircle.setValue(batteryLvl);
            drawComplications(canvas, now);
        }

        @Override
        public void onTimeTick() {
            super.onTimeTick();
            invalidate();
        }

        @Override
        public void onAmbientModeChanged(boolean inAmbientMode) {
            super.onAmbientModeChanged(inAmbientMode);
            Log.d(TAG, "onAmbientModeChanged: " + inAmbientMode);

            if (inAmbientMode) {
                smartDriveBtn.setVisibility(View.GONE);
                watchBatteryCircle.setBarColor(getResources().getColor(R.color.ambient_mode_text, getTheme()));
                smartDriveBatteryCircle.setBarColor(getResources().getColor(R.color.ambient_mode_text, getTheme()));
                smartDriveBatteryCircle.setValue(75f);
                Log.d(TAG, "hard coding the smartdrive value right now, need to get it from complication data available");
            } else {
                smartDriveBtn.setVisibility(View.VISIBLE);
                watchBatteryCircle.setBarColor(getResources().getColor(R.color.permobil_ocean, getTheme()));
                smartDriveBatteryCircle.setBarColor(getResources().getColor(R.color.permobil_primary, getTheme()));
                smartDriveBatteryCircle.setValue(38f);
            }

            if (mLowBitAmbient) {
                boolean antiAlias = !inAmbientMode;
                hourTextView.getPaint().setAntiAlias(antiAlias);
                colonTextView.getPaint().setAntiAlias(antiAlias);
                minuteTextView.getPaint().setAntiAlias(antiAlias);
                amPmTextView.getPaint().setAntiAlias(antiAlias);
            }
            invalidate();

            // Update drawable complications' ambient state.
            // Note: ComplicationDrawable handles switching between active/ambient colors, we just
            // have to inform it to enter ambient mode.
            ComplicationDrawable complicationDrawable;

            for (int complicationId : COMPLICATION_IDS) {
                complicationDrawable = mComplicationDrawableSparseArray.get(complicationId);
                complicationDrawable.setInAmbientMode(inAmbientMode);
            }

            // Check and trigger whether or not timer should be running (only in active mode).
            updateTimer();
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
                hourTextView.setAlpha(alpha);
                colonTextView.setAlpha(alpha);
                minuteTextView.setAlpha(alpha);
                amPmTextView.setAlpha(alpha);
                invalidate();
            }
        }

        @Override
        public void onPropertiesChanged(Bundle properties) {
            mLowBitAmbient = properties.getBoolean(PROPERTY_LOW_BIT_AMBIENT, false);
            mBurnInProtection = properties.getBoolean(PROPERTY_BURN_IN_PROTECTION, false);
            if (hourTextView != null) {
                hourTextView.setTypeface(mBurnInProtection ? NORMAL_TYPEFACE : BOLD_TYPEFACE);
            }
            if (colonTextView != null) {
                colonTextView.setTypeface(mBurnInProtection ? NORMAL_TYPEFACE : BOLD_TYPEFACE);
            }
            if (minuteTextView != null) {
                minuteTextView.setTypeface(mBurnInProtection ? NORMAL_TYPEFACE : BOLD_TYPEFACE);
            }
            if (amPmTextView != null) {
                amPmTextView.setTypeface(mBurnInProtection ? NORMAL_TYPEFACE : BOLD_TYPEFACE);
            }

            // Updates complications to properly render in ambient mode based on the screen's capabilities.
            ComplicationDrawable complicationDrawable;

            for (int complicationId : COMPLICATION_IDS) {
                complicationDrawable = mComplicationDrawableSparseArray.get(complicationId);

                if (complicationDrawable != null) {
                    complicationDrawable.setLowBitAmbient(mLowBitAmbient);
                    complicationDrawable.setBurnInProtection(mBurnInProtection);
                }
            }
        }

        @Override
        public void onComplicationDataUpdate(int complicationId, ComplicationData complicationData) {
            Log.d(TAG, "onComplicationDataUpdate() id: " + complicationId);

            // Adds/updates active complication data in the array.
            mActiveComplicationDataSparseArray.put(complicationId, complicationData);

            // Updates correct ComplicationDrawable with updated  data.
            ComplicationDrawable complicationDrawable = mComplicationDrawableSparseArray.get(complicationId);
            complicationDrawable.setComplicationData(complicationData);

            invalidate();
        }

        @Override
        public void onTapCommand(int tapType, int x, int y, long eventTime) {
            // leave as switch statement
            switch (tapType) {
                case TAP_TYPE_TAP:
                    int tappedComplicationId = getTappedComplicationId(x, y);
                    if (tappedComplicationId != -1) {
                        onComplicationTap(tappedComplicationId);
                    }
                    break;
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

            if (hourTextView != null) {
                hourTextView.setTextSize(textSize);
            }
            if (colonTextView != null) {
                colonTextView.setTextSize(textSize);
            }
            if (minuteTextView != null) {
                minuteTextView.setTextSize(textSize);
            }
            if (amPmTextView != null) {
                amPmTextView.setTextSize(amPmSize);
            }
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

        private void initializeComplications() {
            Log.d(TAG, "initializeComplications()");
            mActiveComplicationDataSparseArray = new SparseArray<>(COMPLICATION_IDS.length);

            // Creates a ComplicationDrawable for each location where the user can render a
            // complication on the watch face. In this watch face, we only create left and right,
            // but you could add many more.
            // All styles for the complications are defined in
            // drawable/custom_complication_styles.xml.
            ComplicationDrawable topComplicationDrawable = (ComplicationDrawable) getDrawable(R.drawable.custom_complication_styles);
            if (topComplicationDrawable != null) {
                topComplicationDrawable.setContext(getApplicationContext());
            }

            ComplicationDrawable centerComplicationDrawable = (ComplicationDrawable) getDrawable(R.drawable.custom_complication_styles);
            if (centerComplicationDrawable != null) {
                centerComplicationDrawable.setContext(getApplicationContext());
            }


            // Adds new complications to a SparseArray to simplify setting styles and ambient
            // properties for all complications, i.e., iterate over them all.
            mComplicationDrawableSparseArray = new SparseArray<>(COMPLICATION_IDS.length);
            mComplicationDrawableSparseArray.put(TOP_COMPLICATION_ID, topComplicationDrawable);
            mComplicationDrawableSparseArray.put(CENTER_COMPLICATION_ID, centerComplicationDrawable);

            setActiveComplications(COMPLICATION_IDS);

            setDefaultComplicationProvider(COMPLICATION_IDS[0], new ComponentName("com.permobil.smartdrive.wearos", "com.permobil.smartdrive.wearos.BatteryComplicationProviderService"), ComplicationData.TYPE_RANGED_VALUE);
            setDefaultSystemComplicationProvider(COMPLICATION_IDS[1], SystemProviders.APP_SHORTCUT, ComplicationData.TYPE_LARGE_IMAGE);
//            setDefaultSystemComplicationProvider(COMPLICATION_IDS[0], SystemProviders.WATCH_BATTERY, ComplicationData.TYPE_RANGED_VALUE);

        }


        // Fires PendingIntent associated with complication (if it has one).
        private void onComplicationTap(int complicationId) {
            Log.d(TAG, "onComplicationTap()");

            ComplicationData complicationData = mActiveComplicationDataSparseArray.get(complicationId);
            Log.d(TAG, "Complication Id: " + complicationId);
            if (complicationId == 0) {
                Log.d(TAG, "TODO: Need to create a Rect() that holds the SmartDriveButton so we can rely on the actual bounding Rect of the button instead of a value between the Y axis");
                Intent smartDriveWearIntent = getPackageManager().getLaunchIntentForPackage("com.permobil.smartdrive.wearos");
                if (smartDriveWearIntent != null) {
                    smartDriveWearIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(smartDriveWearIntent);
                } else {
                    Uri uri = Uri.parse("market://details?id=" + "com.permobil.smartdrive.wearos");
                    Intent playStoreIntent = new android.content.Intent(android.content.Intent.ACTION_VIEW, uri);
                    playStoreIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(playStoreIntent);
                }
            }

            if (complicationData != null) {
                if (complicationData.getTapAction() != null) {

                    try {
                        complicationData.getTapAction().send();
                    } catch (PendingIntent.CanceledException e) {
                        Sentry.capture(e);
                        Log.e(TAG, "onComplicationTap() tap action error: " + e);
                    }
                } else if (complicationData.getType() == ComplicationData.TYPE_NO_PERMISSION) {
                    // Watch face does not have permission to receive complication data, so launch permission request.
                    ComponentName componentName = new ComponentName(getApplicationContext(), ComplicationWatchFaceService.class);

                    Intent permissionRequestIntent = ComplicationHelperActivity.createPermissionRequestHelperIntent(getApplicationContext(), componentName);
                    permissionRequestIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(permissionRequestIntent);
                    //Log.e("TAG", "Need permission");
                }

            } else {
                Log.d(TAG, "No PendingIntent for complication " + complicationId + ".");
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

        /*
         * Determines if tap inside a complication area or returns -1.
         */
        private int getTappedComplicationId(int x, int y) {
            int complicationId;
            ComplicationData complicationData;
            ComplicationDrawable complicationDrawable;

            long currentTimeMillis = System.currentTimeMillis();

            // leave as for loop to iterate correctly
            for (int i = 0; i < COMPLICATION_IDS.length; i++) {
                complicationId = COMPLICATION_IDS[i];
                complicationData = mActiveComplicationDataSparseArray.get(complicationId);

                if ((complicationData != null)
                        && (complicationData.isActive(currentTimeMillis))
                        && (complicationData.getType() != ComplicationData.TYPE_NOT_CONFIGURED)
                        && (complicationData.getType() != ComplicationData.TYPE_EMPTY)) {

                    complicationDrawable = mComplicationDrawableSparseArray.get(complicationId);
                    Rect complicationBoundingRect = complicationDrawable.getBounds();

                    if (complicationBoundingRect.width() > 0) {
                        if (complicationBoundingRect.contains(x, y)) {
                            return complicationId;
                        }
                    } else {
                        Log.e(TAG, "Not a recognized complication id.");
                    }
                } else {
                    // the complication isn't active so lets check if the user is tapping the smartdrive button in center of screen


                    // we are going to get the rect for the smartDriveBtn and then check if the tap is within the top, left, right, bottom of the button
                    Rect rectView = new Rect();
                    smartDriveBtn.getGlobalVisibleRect(rectView);

                    if (y < rectView.bottom && y > rectView.top && x > rectView.left && x < rectView.right) {
                        complicationId = 0;
                        return complicationId;
                    }
                }
            }
            return -1;
        }

        private void drawTimeStrings() {
            boolean is24Hour = DateFormat.is24HourFormat(ComplicationWatchFaceService.this);

            // Show colons for the first half of each second so the colons blink on when the time updates.
            mShouldDrawColons = (System.currentTimeMillis() % 1000) < 500;
            if (mShouldDrawColons) {
                colonTextView.setVisibility(View.VISIBLE);
            } else {
                colonTextView.setVisibility(View.INVISIBLE);
            }

            // Get the hours.
            String hourString;
            if (is24Hour) {
                hourString = Utils.formatTwoDigitNumber(mCalendar.get(Calendar.HOUR_OF_DAY));
            } else {
                int hour = mCalendar.get(Calendar.HOUR);
                if (hour == 0) {
                    hour = 12;
                }
                hourString = String.valueOf(hour);
            }
            hourTextView.setText(hourString);


            // Get the minutes.
            String minuteString = Utils.formatTwoDigitNumber(mCalendar.get(Calendar.MINUTE));
            // Set the time value combining the hours & minute strings
            minuteTextView.setText(minuteString);

            // Set the am/pm.
            if (!is24Hour) {
                String value = Utils.getAmPmString(mCalendar.get(Calendar.AM_PM));
                amPmTextView.setText(value);
                amPmTextView.setVisibility(View.VISIBLE);
            } else {
                amPmTextView.setVisibility(View.INVISIBLE);
            }

            // handle color of text depending if ambient mode
            if (!isInAmbientMode()) {
                hourTextView.setTextColor(getResources().getColor(R.color.white, getTheme()));
                colonTextView.setTextColor(getResources().getColor(R.color.white, getTheme()));
                minuteTextView.setTextColor(getResources().getColor(R.color.white, getTheme()));
                amPmTextView.setTextColor(getResources().getColor(R.color.white, getTheme()));
            } else {
                // in ambient so use ambient color
                hourTextView.setTextColor(getResources().getColor(R.color.ambient_mode_text, getTheme()));
                colonTextView.setTextColor(getResources().getColor(R.color.ambient_mode_text, getTheme()));
                minuteTextView.setTextColor(getResources().getColor(R.color.ambient_mode_text, getTheme()));
                amPmTextView.setTextColor(getResources().getColor(R.color.ambient_mode_text, getTheme()));
            }
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

        private float getWatchBatteryLevel() {
            IntentFilter iFilter = new IntentFilter(Intent.ACTION_BATTERY_CHANGED);
            Intent batteryStatus = getApplicationContext().registerReceiver(null, iFilter);
            int level = batteryStatus.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
            int scale = batteryStatus.getIntExtra(BatteryManager.EXTRA_SCALE, -1);

            return level * 100 / (float) scale;
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
