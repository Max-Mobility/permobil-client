import { android as androidApp } from '@nativescript/core/application';
import { Log } from '@permobil/core';

declare const org: any;

export class ActivityDetector {
  public static ActivityLockoutTimeMs: number = 200;

  public activityDetectorModelFileName: string = 'activityDetectorLSTM.tflite';

  /**
   * Higher-level activity detection configuration
   */
  private minPredictionThreshold = 0.7;
  private maxPredictionThreshold = 1.1;
  private predictionThreshold: number = 0.8; // confidence

  private minJerkThreshold = 5.0;
  private maxJerkThreshold = 25.0;
  private jerkThreshold: number = 5.0; // acceleration value

  private lastActivityTime: number; // timestamp of last detected activity

  /**
   * TensorFlow Lite related data
   */
  private tflite: any = null;
  private tfliteModel: java.nio.MappedByteBuffer = null;
  private activityDetectorInput = null;
  private activityDetectorOutput: java.util.Map<
    java.lang.Integer,
    java.lang.Object
  > = null;

  /**
   * Actual inputs / outputs for the TFLite model
   */
  private inputData = null;
  private previousState = null;
  private parsedPrediction = null;

  /**
   * TFLite model input / output configuration
   */
  private static StateSize = 128;
  private static Input_StateIndex = 0;
  private static Input_InputIndex = 1;
  private static Output_StateIndex = 0;
  private static Output_PredictionIndex = 1;

  /**
   * Higher-level activity detection - not TFLite related
   */
  private static InputHistorySize = 4;
  private static PredictionHistorySize = 2;
  private inputHistory: any[] = [];
  private predictionHistory: number[] = [];

  constructor() {
    try {
      // initialize the memory for the states
      this.previousState = Array.create('[F', 1);
      this.previousState[0] = Array.create('float', ActivityDetector.StateSize);
      // set initial states to 0
      for (let i = 0; i < ActivityDetector.StateSize; i++) {
        this.previousState[0][i] = new java.lang.Float('0.0');
      }
      // initialize the memory for the input
      this.inputData = Array.create('[F', 1);
      const inputElements = Array.create('float', 3);
      inputElements[0] = new java.lang.Float('0.0');
      inputElements[1] = new java.lang.Float('0.0');
      inputElements[2] = new java.lang.Float('0.0');
      this.inputData[0] = inputElements;
      // this.inputData = Array.create('float', 3);
      this.activityDetectorInput = Array.create(java.lang.Object, 2);
      this.activityDetectorInput[
        ActivityDetector.Input_InputIndex
      ] = this.inputData;
      this.activityDetectorInput[
        ActivityDetector.Input_StateIndex
      ] = this.previousState;
      // initialize the memory for the prediction
      this.parsedPrediction = Array.create('[F', 1);
      const outputElements = Array.create('float', 1);
      outputElements[0] = new java.lang.Float('0.0');
      this.parsedPrediction[0] = outputElements;
      // initialize the memory for the output
      this.activityDetectorOutput = new java.util.HashMap<
        java.lang.Integer,
        java.lang.Object
      >();
      this.activityDetectorOutput.put(
        new java.lang.Integer(ActivityDetector.Output_PredictionIndex),
        this.parsedPrediction
      );
      this.activityDetectorOutput.put(
        new java.lang.Integer(ActivityDetector.Output_StateIndex),
        this.previousState
      );
      // load the model file
      this.tfliteModel = this.loadModelFile();
      // create the tflite interpreter
      const tfliteOptions = new org.tensorflow.lite.Interpreter.Options();
      tfliteOptions.setNumThreads(1);
      this.tflite = new org.tensorflow.lite.Interpreter(
        this.tfliteModel,
        tfliteOptions
      );
      const inputCount = this.tflite.getInputTensorCount();
      // Log.D('ActivityDetector::ActivityDetector(): input tensor count = ', inputCount);
      const inputShapes = [0, 0];
      inputShapes[ActivityDetector.Input_StateIndex] =
        ActivityDetector.StateSize;
      inputShapes[ActivityDetector.Input_InputIndex] = 3;
      for (let i = 0; i < inputCount; i++) {
        const inputShape = Array.from(this.tflite.getInputTensor(i).shape());
        const dataType = this.tflite.getInputTensor(i).dataType();
        if (inputShapes[i] !== inputShape[1]) {
          Log.E(
            `ActivityDetector::ActivityDetector(): input tensor ${dataType} at ${i}  misconfigured!\n` +
              '  Expected shape of ' +
              inputShapes[i] +
              ' but got ' +
              inputShape[1]
          );
        }
      }
      const outputCount = this.tflite.getOutputTensorCount();
      // Log.D('ActivityDetector::ActivityDetector(): output tensor count = ', outputCount);
      const outputShapes = [0, 0];
      outputShapes[ActivityDetector.Output_StateIndex] =
        ActivityDetector.StateSize;
      outputShapes[ActivityDetector.Output_PredictionIndex] = 1;
      for (let i = 0; i < outputCount; i++) {
        const outputShape = Array.from(this.tflite.getOutputTensor(i).shape());
        const dataType = this.tflite.getOutputTensor(i).dataType();
        if (outputShapes[i] !== outputShape[1]) {
          Log.E(
            `ActivityDetector::ActivityDetector(): output tensor ${dataType} at ${i}  misconfigured!\n` +
              '  Expected shape of ' +
              outputShapes[i] +
              ' but got ' +
              outputShape[1]
          );
        }
      }
      Log.D('ActivityDetector initialized');
    } catch (e) {
      Log.E('Could not initialize ActivityDetector:', e);
    }
  }

  /**
   * Reset the histories to clear out old data
   */
  public reset() {
    this.inputHistory = [];
    this.predictionHistory = [];
  }

  /**
   * Update activity detector activity sensitivity threshold
   *
   * @param sensitivity [number]: [0-100] percent sensitivity.
   */
  public setSensitivity(sensitivity: number) {
    // ensure sensitivity is in range [0, 100]
    sensitivity = Math.min(100, Math.max(sensitivity, 0));
    // update jerk threshold
    this.jerkThreshold =
      this.maxJerkThreshold -
      (this.maxJerkThreshold - this.minJerkThreshold) * (sensitivity / 100.0);
  }

  /**
   * Main inference Function for detecting activity
   */
  public detectActivity(acceleration: any, timestamp: number) {
    try {
      const inputData = [acceleration.x, acceleration.y, acceleration.z];
      // update the input history
      this.updateHistory(acceleration);
      // copy the data into the input array
      this.inputData[0][0] = inputData[0];
      this.inputData[0][1] = inputData[1];
      this.inputData[0][2] = inputData[2];
      // run the inference
      this.tflite.runForMultipleInputsOutputs(
        this.activityDetectorInput,
        this.activityDetectorOutput
      );
      // get the prediction
      const prediction = this.parsedPrediction[0][0];
      // update the prediction history
      this.updatePredictions(prediction);
      // determine if there was a activity
      return this.getActivity(timestamp);
    } catch (e) {
      Log.E('could not detect activity:', e);
      return false;
    }
  }

  /**
   * Determines (based on input and prediction histories) whether
   * there was a activity.
   */
  private getActivity(timestamp: number) {
    // block high frequency motion
    if (this.lastActivityTime !== null) {
      const timeDiffNs = timestamp - this.lastActivityTime;
      const timeDiffThreshold =
        ActivityDetector.ActivityLockoutTimeMs * 1000 * 1000; // convert to ns
      if (timeDiffNs < timeDiffThreshold) {
        return false;
      }
    }
    // time was good - now determine if the inputs / predictions were good
    if (
      this.inputHistory.length < ActivityDetector.InputHistorySize ||
      this.predictionHistory.length < ActivityDetector.PredictionHistorySize
    ) {
      // we don't have enough historical data so detect no activitys
      return false;
    }
    // check that input history contains >= 1 difference (jerk) above
    // the threshold
    let minZ = null;
    let maxZ = null;
    this.inputHistory.forEach(accel => {
      const z = accel.z;
      if (minZ === null || z < minZ) {
        minZ = z;
      }
      if (maxZ === null || z > maxZ) {
        maxZ = z;
      }
    });
    const jerk = maxZ - minZ;
    const jerkAboveThreshold = jerk > this.jerkThreshold;
    // check that the prediction(s) were all above the threshold
    const predictionsWereGood = this.predictionHistory.reduce(
      (good, prediction) => {
        return good && prediction > this.predictionThreshold;
      },
      true
    );
    // combine checks to predict activity
    const predictActivity = predictionsWereGood;
    // record that there has been a activity
    if (predictActivity) {
      this.lastActivityTime = timestamp;
    }
    // return the prediction
    return predictActivity;
  }

  private updateHistory(accel: any) {
    this.inputHistory.push(accel);
    if (this.inputHistory.length > ActivityDetector.InputHistorySize) {
      this.inputHistory.shift(); // remove the oldest element
    }
  }

  private updatePredictions(prediction: number) {
    this.predictionHistory.push(prediction);
    if (
      this.predictionHistory.length > ActivityDetector.PredictionHistorySize
    ) {
      this.predictionHistory.shift(); // remove the oldest element
    }
  }

  /**
   * TFLite model loading function
   */
  private loadModelFile() {
    const activity = androidApp.foregroundActivity || androidApp.startActivity;
    const fileDescriptor = activity
      .getAssets()
      .openFd(this.activityDetectorModelFileName);
    const inputStream = new java.io.FileInputStream(
      fileDescriptor.getFileDescriptor()
    );
    const fileChannel = inputStream.getChannel();
    const startOffset = fileDescriptor.getStartOffset();
    const declaredLength = fileDescriptor.getDeclaredLength();
    return fileChannel.map(
      java.nio.channels.FileChannel.MapMode.READ_ONLY,
      startOffset,
      declaredLength
    );
  }
}
