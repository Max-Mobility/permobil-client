package com.permobil.pushtracker.wearos;

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
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import org.tensorflow.lite.Interpreter;

public class ActivityDetector {

  public static class Detection {
    public float confidence;
    public int classId;
    public String name;
    public long time;

    public Detection() {
      this.confidence = 0;
      this.time = System.currentTimeMillis() / 1000;
    }

    public Detection(float con, int cla, String n) {
      this.confidence = con;
      this.classId = cla;
      this.name = n;
      this.time = System.currentTimeMillis() / 1000;
    }
  }

  private static final int LOCKOUT_TIME_MS = 200;
  private static final String MODEL_FILE_NAME = "activityDetectorLSTM.tflite";

  public float predictionThreshold = 0.8f; // confidence

  private long lastActivityTime = 0; // timestamp of last detected activity

  /**
   * TensorFlow Lite related data
   */
  private Interpreter tflite;
  private MappedByteBuffer tfliteModel;
  private float[][] inputs = new float[2][];
  private float[][] outputs = new float[2][];

  /**
   * Actual inputs / outputs for the TFLite model
   */
  private float[] inputData = new float[3];
  private float[] previousState = new float[StateSize];
  private float[] parsedPrediction = new float[1];

  /**
   * TFLite model input / output configuration
   */
  private static final int StateSize = 128;
  private static final int Input_StateIndex = 0;
  private static final int Input_DataIndex = 1;
  private static final int Output_StateIndex = 0;
  private static final int Output_PredictionIndex = 1;

  /**
   * Higher-level activity detection - not TFLite related
   */
  private static final int InputHistorySize = 4;
  private static final int PredictionHistorySize = 2;
  private float[][] inputHistory = new float[InputHistorySize][3];
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
    for (int i=0; i<StateSize; i++) {
      previousState[i] = 0.0f;
    }
    // set up the inputs and outputs
    inputs[Input_StateIndex] = previousState;
    inputs[Input_DataIndex] = inputData;
    outputs[Output_StateIndex] = previousState;
    outputs[Output_PredictionIndex] = parsedPrediction;
    // load the model file
    try {
      tfliteModel = loadModelFile(context);
      // create the tflite interpreter
      Interpreter.Options tfliteOptions = new Interpreter.Options();
      tfliteOptions.setNumThreads(1);
      tflite = new Interpreter(tfliteModel, tfliteOptions);
    } catch (Exception e) {
      Log.e("ActivityDetector", "Initialization exception: " + e);
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
    inputHistory = new float[InputHistorySize][3];
    predictionHistory = new float[PredictionHistorySize];
  }

  /**
   * Update activity detector activity sensitivity threshold
   *
   * @param sensitivity [number]: [0-100] percent sensitivity.
   */
  public void setSensitivity(int sensitivity) {
  }

  /**
   * Main inference Function for detecting activity
   */
  public Detection detectActivity(float[] data, long timestamp) {
    // copy the data into our input buffer
    for (int i=0; i<3; i++) {
      inputs[Input_DataIndex][i] = data[i];
    }
    // update the input history
    updateHistory(data);
    // run the inference
    tflite.run(inputs, outputs);
    // get the prediction
    float prediction = parsedPrediction[0];
    // update the prediction history
    updatePredictions(prediction);
    // determine the activity
    return getActivity(timestamp);
  }

  /**
   * Determines (based on input and prediction histories) whether
   * there was a activity.
   */
  private Detection getActivity(long timestamp) {
    Detection detection = new Detection();
    // block high-frequency motion
    if (lastActivityTime > 0) {
      long timeDiffNs = timestamp - lastActivityTime;
      long timeDiffThreshold = LOCKOUT_TIME_MS * 1000 * 1000; // convert to ns
      if (timeDiffNs < timeDiffThreshold) {
        return detection;
      }
    }
    return detection;
  }

  private void updateHistory(float[] data) {
    Collections.rotate(Arrays.asList(inputHistory), 1);
    inputHistory[0] = data;
  }

  private void updatePredictions(float prediction) {
    Collections.rotate(Arrays.asList(predictionHistory), 1);
    predictionHistory[0] = prediction;
  }
}
