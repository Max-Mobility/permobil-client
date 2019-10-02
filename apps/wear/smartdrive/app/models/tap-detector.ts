import { Log } from '@permobil/core';
import { android as androidApp } from 'tns-core-modules/application';

declare const org: any;

export interface Acceleration {
  x: number;
  y: number;
  z: number;
}

type TimeStamp = number;

export class TapDetector {
  public static TapLockoutTimeMs: number = 100;
  public static TapLockoutTimeNs: number = TapDetector.TapLockoutTimeMs * 1000 * 1000;

  public tapDetectorModelFileName: string = 'tapDetectorLSTM.tflite';

  /**
   * Higher-level tap detection configuration
   */
  private minPredictionThreshold: number = 0.5;
  private maxPredictionThreshold: number = 1.0;
  private predictionThreshold: number = 0.5; // tap prediction confidence
  private predictionThresholdOnOffDiff: number = 0.2; // predition confidence difference when motor on/off
  private predictionThresholdDynamic: number = 0.5; // calculated prediction confidence

  private jerkThresholdDynamic: number = 30.0; // calculated tap jerk threshold
  private jerkThresholdOnOffDiff: number = 10.0; // tap jerk threshold difference when motor on/off
  private jerkThreshold: number = 30.0; // tap jerk threshold value
  private maxJerkThreshold: number = 60.0;
  private minJerkThreshold: number = 30.0;

  private lastTapTime: TimeStamp; // timestamp of last detected tap

  private tapGap: boolean = true;

  /**
   * TensorFlow Lite related data
   */
  private tflite: any = null;
  private tfliteModel: java.nio.MappedByteBuffer = null;
  private tapDetectorInput = null;
  private tapDetectorOutput: java.util.Map<java.lang.Integer, java.lang.Object> = null;

  /**
   * Actual inputs / outputs for the TFLite model
   */
  private inputData = null;
  private previousState = null;
  private parsedPrediction = null;

  /**
   * TFLite model input / output configuration
   */
  private static StateSize: number = 128;
  private static Input_StateIndex: number = 0;
  private static Input_InputIndex: number = 1;
  private static Output_StateIndex: number = 0;
  private static Output_PredictionIndex: number = 1;

  /**
   * Higher-level tap detection - not TFLite related
   */
  private static InputHistorySize: number = 4;
  private static PredictionHistorySize: number = 2;
  private static InputRawHistorySize: number = 6;
  private static JerkHistorySize: number = 2;
  private inputHistory: Array<Acceleration> = [];
  private predictionHistory: Array<number> = [];
  private inputRawHistory: Array<Acceleration> = [];
  private jerkHistory: Array<number> = [];

  constructor() {
    try {
      // initialize the memory for the states
      this.previousState = Array.create('[F', 1);
      this.previousState[0] = Array.create('float', TapDetector.StateSize);
      // set initial states to 0
      for (let i = 0; i < TapDetector.StateSize; i++) {
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
      this.tapDetectorInput = Array.create(java.lang.Object, 2);
      this.tapDetectorInput[TapDetector.Input_InputIndex] = this.inputData;
      this.tapDetectorInput[TapDetector.Input_StateIndex] = this.previousState;
      // initialize the memory for the prediction
      this.parsedPrediction = Array.create('[F', 1);
      const outputElements = Array.create('float', 1);
      outputElements[0] = new java.lang.Float('0.0');
      this.parsedPrediction[0] = outputElements;
      // initialize the memory for the output
      this.tapDetectorOutput = new java.util.HashMap<java.lang.Integer, java.lang.Object>();
      this.tapDetectorOutput.put(
        new java.lang.Integer(TapDetector.Output_PredictionIndex),
        this.parsedPrediction
      );
      this.tapDetectorOutput.put(
        new java.lang.Integer(TapDetector.Output_StateIndex),
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
      // Log.D('TapDetector::TapDetector(): input tensor count = ', inputCount);
      const inputShapes = [0, 0];
      inputShapes[TapDetector.Input_StateIndex] = TapDetector.StateSize;
      inputShapes[TapDetector.Input_InputIndex] = 3;
      for (let i = 0; i < inputCount; i++) {
        const inputShape = Array.from(this.tflite.getInputTensor(i).shape());
        const dataType = this.tflite.getInputTensor(i).dataType();
        if (inputShapes[i] !== inputShape[1]) {
          Log.E(`TapDetector::TapDetector(): input tensor ${dataType} at ${i}  misconfigured!\n` +
            '  Expected shape of ' + inputShapes[i] + ' but got ' + inputShape[1]);
        }
      }
      const outputCount = this.tflite.getOutputTensorCount();
      // Log.D('TapDetector::TapDetector(): output tensor count = ', outputCount);
      const outputShapes = [0, 0];
      outputShapes[TapDetector.Output_StateIndex] = TapDetector.StateSize;
      outputShapes[TapDetector.Output_PredictionIndex] = 1;
      for (let i = 0; i < outputCount; i++) {
        const outputShape = Array.from(this.tflite.getOutputTensor(i).shape());
        const dataType = this.tflite.getOutputTensor(i).dataType();
        if (outputShapes[i] !== outputShape[1]) {
          Log.E(`TapDetector::TapDetector(): output tensor ${dataType} at ${i}  misconfigured!\n` +
            '  Expected shape of ' + outputShapes[i] + ' but got ' + outputShape[1]);
        }
      }
      Log.D('TapDetector initialized');
    } catch (e) {
      Log.E('Could not initialize TapDetector:', e);
    }
  }

  /**
   * Reset the histories to clear out old data
   */
  public reset() {
    this.inputHistory = [];
    this.predictionHistory = [];
    this.inputRawHistory = [];
    this.jerkHistory = [];
  }

  /**
   * Update tap detector tap sensitivity threshold
   *
   * @param sensitivity [number]: [0-100] percent sensitivity.
   */
  public setSensitivity(sensitivity: number, motorOn: boolean) {
    // ensure sensitivity is in range [0, 100]
    sensitivity = Math.min(100, Math.max(sensitivity, 0));
    // update jerk threshold
    this.jerkThreshold = this.maxJerkThreshold - (this.maxJerkThreshold - this.minJerkThreshold) * (sensitivity / 100.0);
    this.predictionThreshold = this.maxPredictionThreshold - (this.maxPredictionThreshold - this.minPredictionThreshold) * (sensitivity / 100.0);

    // harder to tap start and easier to tap stop the motor
    if (!motorOn) {
      this.jerkThresholdDynamic = this.jerkThreshold;
      this.predictionThresholdDynamic = this.predictionThreshold;
    }
    else {
      this.jerkThresholdDynamic = this.jerkThreshold - this.jerkThresholdOnOffDiff;
      this.predictionThresholdDynamic = this.predictionThreshold - this.predictionThresholdOnOffDiff;
    }
  }

  /**
   * Main inference Function for detecting tap
   * @return result [boolean]: true if there was a tap
   */
  public detectTap(acceleration: Acceleration, timestamp: TimeStamp) {
    try {
      // vectorize the input
      const inputData = [ acceleration.x, acceleration.y, acceleration.z ];

      // update the input history
      // remove the oldest element if history length > InputHistorySize
      this.updateHistory(acceleration);

      // copy the data into the input array
      this.inputData[0][0] = inputData[0];
      this.inputData[0][1] = inputData[1];
      this.inputData[0][2] = inputData[2];

      // run the inference
      this.tflite.runForMultipleInputsOutputs(this.tapDetectorInput, this.tapDetectorOutput);

      // get the prediction
      const prediction = this.parsedPrediction[0][0];

      // update the prediction history
      // remove the oldest element if history.length > PredictionHistorySize
      this.updatePredictions(prediction);

      // determine if there was a tap
      return this.didTap(timestamp) || false; // didTap is capable of returning undefined
    } catch (e) {
      Log.E('could not detect tap:', e);
      return false;
    }
  }

  /**
   * Determines (based on input and prediction histories) whether
   * there was a tap.
   */
  private didTap(timestamp: TimeStamp) {
    // Block high frequency tapping
    if (this.lastTapTime && (timestamp - this.lastTapTime) < TapDetector.TapLockoutTimeNs) {
      return false;
    }

    // Check if we have enough historical data
    if (this.inputHistory.length < TapDetector.InputHistorySize ||
      this.predictionHistory.length < TapDetector.PredictionHistorySize) {
      // we don't have enough historical data so return false
      // not enough historical data to reliably detect a tap
      return false;
    }

    // Check that inputRawHistory max-min > jerkThresholdDynamic
    const minZ = this.inputRawHistory.reduce((min, accel) => accel.z < min ? accel.z : min, this.inputRawHistory[0].z);
    const maxZ = this.inputRawHistory.reduce((max, accel) => accel.z > max ? accel.z : max, this.inputRawHistory[0].z);
    const jerk = maxZ - minZ;
    this.updateJerkHistory(jerk);
    const maxJerk = this.jerkHistory.reduce((max, jerk) => jerk > max ? jerk : max, this.jerkHistory[0]);
    const isJerkAboveThreshold = maxJerk > this.jerkThresholdDynamic;

    // check that the prediction(s) were all above the threshold
    const predictionsWereGood = this.predictionHistory.reduce((good, prediction) => {
      return good && prediction > this.predictionThresholdDynamic;
    }, true);

    // combine checks to predict tap
    const predictTap = isJerkAboveThreshold && predictionsWereGood && this.tapGap;

    // exceptions
    const predictionsOvermin = this.predictionHistory.reduce((good, prediction) => {
      return good && prediction > this.minPredictionThreshold;
    }, true);
    const mustTap = (maxJerk > this.maxJerkThreshold) && predictionsOvermin;

    // record that there has been a tap
    const realTap = predictTap || mustTap;
    if (realTap) {
      this.lastTapTime = timestamp;
      this.tapGap = false;
    }
    const gapWasGood = this.predictionHistory.reduce((good, prediction) => {
      return good && prediction < this.predictionThresholdDynamic;
    }, true);
    if (this.lastTapTime !== null && gapWasGood) {
      this.tapGap = true;
    }
    // return the prediction
    return realTap;
  }

  private updateHistory(accel: Acceleration) {
    this.inputHistory.push(accel);
    if (this.inputHistory.length > TapDetector.InputHistorySize) {
      this.inputHistory.shift(); // remove the oldest element
    }
  }

  private updatePredictions(prediction: number) {
    this.predictionHistory.push(prediction);
    if (this.predictionHistory.length > TapDetector.PredictionHistorySize) {
      this.predictionHistory.shift(); // remove the oldest element
    }
  }

  public updateRawHistory(accel: Acceleration) {
    this.inputRawHistory.push(accel);
    if (this.inputRawHistory.length > TapDetector.InputRawHistorySize) {
      this.inputRawHistory.shift(); // remove the oldest element
    }
  }

  private updateJerkHistory(jerk: number) {
    this.jerkHistory.push(jerk);
    if (this.jerkHistory.length > TapDetector.JerkHistorySize) {
      this.jerkHistory.shift();
    }
  }

  /**
   * TFLite model loading function
   */
  private loadModelFile() {
    const activity = androidApp.foregroundActivity || androidApp.startActivity;
    const fileDescriptor = activity.getAssets().openFd(this.tapDetectorModelFileName);
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
