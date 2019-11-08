package com.permobil.pushtracker;

import android.content.Context;
import android.content.res.AssetFileDescriptor;
import android.util.Log;

import java.io.BufferedReader;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.ByteOrder;
import java.nio.MappedByteBuffer;
import java.nio.channels.FileChannel;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import org.tensorflow.lite.Interpreter;

public class ActivityDetector {

  public static class Detection {
    public static enum Activity {
      INACTIVE, PUSH, TRANSFER, REACH
    }

    public float confidence;
    public Activity activity;
    public String name;
    public long time;

    public Detection() {
      this.confidence = 0;
      this.activity = Activity.INACTIVE;
      this.name = Activity.INACTIVE.name();
      this.time = System.nanoTime();
    }

    public Detection(float conf, Activity activity, long ts) {
      this.confidence = conf;
      this.activity = activity;
      this.name = activity.name();
      this.time = ts;
    }
  }

  private static final String TAG = "ActivityDetector";

  private static final int LOCKOUT_TIME_MS = 600;

  private static final String MODEL_FILE_NAME = "activityDetectorLSTM.tflite";

  public float predictionThreshold = 0.75f; // confidence
  public float minPredictionThreshold = 0.5f;
  public float maxPredictionThreshold = 1.0f;

  private long lastActivityTime = 0; // timestamp of last detected activity

  /**
   * TensorFlow Lite related data
   */
  private Interpreter tflite;
  private MappedByteBuffer tfliteModel;
  private boolean properlyConfigured = true;
  private Object[] inputs = new Object[2];
  private Map<Integer, Object> outputs = new HashMap<Integer, Object>();

  /**
   * Actual inputs / outputs for the TFLite model
   */
  private float[][] inputData = new float[1][InputSize];
  private float[][] previousState = new float[1][StateSize];
  private float[][] parsedPrediction = new float[1][1];

  /**
   * TFLite model input / output configuration
   */
  public static final int InputSize = 6;
  private static final int StateSize = 128;
  public static final int InputAcclOffset = 0;
  public static final int InputGravOffset = 3;
  private static final int Input_StateIndex = 1;
  private static final int Input_DataIndex = 0;
  private static final int Output_StateIndex = 1;
  private static final int Output_PredictionIndex = 0;

  /**
   * Higher-level activity detection - not TFLite related
   */
  private static final int InputHistorySize = 10;
  private static final int PredictionHistorySize = 1;
  private float[] inputHistory = new float[InputHistorySize];
  private float[] predictionHistory = new float[PredictionHistorySize];

  /**
   * Creates a classifier with the provided configuration.
   *
   * @param activity The current Activity.
   */
  public static ActivityDetector create(Context context) {
    return new ActivityDetector(context);
  }

  public ActivityDetector(Context context) {
    // initialize the memory for the states
    for (int i = 0; i < StateSize; i++) {
      previousState[0][i] = 0.0f;
    }
    // set up the inputs and outputs
    inputs[Input_StateIndex] = previousState;
    inputs[Input_DataIndex] = inputData;
    outputs.put(Output_StateIndex, previousState);
    outputs.put(Output_PredictionIndex, parsedPrediction);
    // load the model file
    try {
      tfliteModel = loadModelFile(context);
      // create the tflite interpreter
      Interpreter.Options tfliteOptions = new Interpreter.Options();
      tfliteOptions.setNumThreads(1);
      tflite = new Interpreter(tfliteModel, tfliteOptions);
      // now check the input shapes
      int[] inputShapes = { 0, 0 };
      inputShapes[Input_StateIndex] = StateSize;
      inputShapes[Input_DataIndex] = InputSize;
      int inputCount = tflite.getInputTensorCount();
      for (int i = 0; i < inputCount; i++) {
        int[] inputShape = tflite.getInputTensor(i).shape();
        Log.d(TAG,
            "Checking input tensor at " + i + " :\n" + "\tshape of " + inputShapes[i] + " == " + inputShape[1] + " ?");
        if (inputShapes[i] != inputShape[1]) {
          Log.e(TAG, "input tensor at " + i + " misconfigured\n" + "\texpected shape of " + inputShapes[i] + " but got "
              + inputShape[1]);
          properlyConfigured = false;
        }
      }
      // now check the output shapes
      int[] outputShapes = { 0, 0 };
      outputShapes[Output_StateIndex] = StateSize;
      outputShapes[Output_PredictionIndex] = 1;
      int outputCount = tflite.getOutputTensorCount();
      for (int i = 0; i < outputCount; i++) {
        int[] outputShape = tflite.getOutputTensor(i).shape();
        Log.d(TAG, "Checking output tensor at " + i + " :\n" + "\tshape of " + outputShapes[i] + " == " + outputShape[1]
            + " ?");
        if (outputShapes[i] != outputShape[1]) {
          Log.e(TAG, "output tensor at " + i + " misconfigured\n" + "\texpected shape of " + outputShapes[i]
              + " but got " + outputShape[1]);
          properlyConfigured = false;
        }
      }
    } catch (Exception e) {
      Log.e(TAG, "Initialization exception: " + e);
      properlyConfigured = false;
    }
  }

  /**
   * TFLite model loading function
   */
  private MappedByteBuffer loadModelFile(Context context) throws IOException {
    AssetFileDescriptor fileDescriptor = context.getAssets().openFd(MODEL_FILE_NAME);
    FileInputStream inputStream = new FileInputStream(fileDescriptor.getFileDescriptor());
    FileChannel fileChannel = inputStream.getChannel();
    long startOffset = fileDescriptor.getStartOffset();
    long declaredLength = fileDescriptor.getDeclaredLength();
    return fileChannel.map(FileChannel.MapMode.READ_ONLY, startOffset, declaredLength);
  }

  /**
   * Reset the histories to clear out old data
   */
  public void reset() {
    inputHistory = new float[InputHistorySize];
    predictionHistory = new float[PredictionHistorySize];
  }

  /**
   * Update activity detector activity sensitivity threshold
   *
   * @param sensitivity [number]: [0-100] percent sensitivity.
   */
  public void setSensitivity(int sensitivity) {
  }

  private static final long LOG_TIME_MS = 1000;
  private long lastLogTimeMs = 0;
  private long totalDetectionDuration = 0;

  /**
   * Main inference Function for detecting activity
   */
  public Detection detectActivity(float[] data, long timestamp) {
    if (!properlyConfigured) {
      return new Detection();
    }
    // Log.d(TAG, "data: " + Arrays.toString(data));
    // copy the data into our input buffer
    for (int i = 0; i < 3; i++) {
      inputData[0][i] = data[i];
    }
    for (int i = 3; i < InputSize; i++) {
      if (data[i] / 10.0 > 1.0) {
        inputData[0][i] = (float) Math.acos(1.0d);
      } else if (data[i] / 10.0 < -1.0){
        inputData[0][i] =(float) Math.acos(-1.0d);
      } else {
        inputData[0][i] = (float) Math.acos((double) data[i] / 10.0);
      }
    }
    // Log.d(TAG, "input: " + Arrays.deepToString(inputData));
    // update the input history
    updateHistory(data);
    // run the inference
    long startTime = System.nanoTime();
    tflite.runForMultipleInputsOutputs(inputs, outputs);
    long endTime = System.nanoTime();
    long duration = (endTime - startTime);
    // Log.d(TAG, "Inference duration: " + duration);
    // get the prediction
    float prediction = parsedPrediction[0][0];
    // update the prediction history
    updatePredictions(prediction);
    // determine the activity
    return getActivity(timestamp);
  }

  public void setDetectionConfidencePercent(float percent) {
    if (percent < 0.0f) percent = 0.0f;
    else if (percent > 1.0f) percent = 1.0f;
    predictionThreshold = maxPredictionThreshold - (maxPredictionThreshold - minPredictionThreshold) * percent;
  }

  /**
   * Determines (based on input and prediction histories) whether there was a
   * activity.
   */
  private Detection getActivity(long timestamp) {
    // block high-frequency motion
    if (lastActivityTime > 0) {
      long timeDiffNs = timestamp - lastActivityTime;
      long timeDiffThreshold = LOCKOUT_TIME_MS * 1000 * 1000; // convert to ns
      if (timeDiffNs < timeDiffThreshold) {
        return new Detection(); // no valid detection
      }
    }
    // make sure the confidences are above the threshold
    boolean predictionsWereGood = true;
    for (int i = 0; i < predictionHistory.length; i++) {
      float prediction = predictionHistory[i];
      predictionsWereGood = predictionsWereGood && prediction > predictionThreshold;
    }
    if (!predictionsWereGood) {
      return new Detection();
    }
    // TODO: determine the activity based on the prediction output
    // everything was good - now retrun a valid detection based
    Detection detection = new Detection(predictionHistory[0], Detection.Activity.PUSH, timestamp);
    // update the timestamp of the last activity
    lastActivityTime = detection.time;
    return detection;
  }

  private void updateHistory(float[] data) {
    // update input data[0] only
    for (int i = inputHistory.length - 1; i > 0; i--) {
      inputHistory[i] = inputHistory[i - 1];
    }
    inputHistory[0] = data[0];
  }

  private void updatePredictions(float prediction) {
    for (int i = predictionHistory.length - 1; i > 0; i--) {
      predictionHistory[i] = predictionHistory[i - 1];
    }
    predictionHistory[0] = prediction;
  }
}
