import { Log } from '@permobil/core';
import { android as androidApp } from 'tns-core-modules/application';
import { knownFolders, path } from 'tns-core-modules/file-system';

declare const org: any;

export class TapDetector {
  public tapDetectorModelFileName: string = 'tapDetectorLSTM.tflite';
  public threshold: number = 0.9;

  private minThreshold = 0.7;
  private maxThreshold = 1.1;

  private tflite: any = null;
  private tfliteModel: java.nio.MappedByteBuffer = null;
  private tapDetectorInput = null;
  private tapDetectorOutput: java.util.Map<java.lang.Integer, java.lang.Object> = null;

  private inputData = null;
  private previousState = null;
  private parsedPrediction = null;

  private static StateSize = 128;
  private static Input_StateIndex = 0;
  private static Input_InputIndex = 1;
  private static Output_StateIndex = 0;
  private static Output_PredictionIndex = 1;

  private static InputHistorySize = 3;
  private static PredictionHistorySize = 2;
  private inputHistory: any[] = [];
  private predictionHistory: number[] = [];

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
   * Update tap detector prediction threshold
   *
   * @param sensitivity[number]: [0-100] percent sensitivity.
   */
  public setSensitivity(sensitivity: number) {
    this.threshold = this.maxThreshold -
      (this.maxThreshold - this.minThreshold) *
      (sensitivity / 100.0);
  }

  /**
   * Main inference Function for detecting tap
   */
  public detectTap(acceleration: any) {
    try {
      const inputData = [
        acceleration.x,
        acceleration.y,
        acceleration.z
      ];
      // update the input history
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
      this.updatePredictions(prediction);
      // determine if there was a tap (based on histories)
      return this.didTap();
    } catch (e) {
      Log.E('could not detect tap:', e);
      return false;
    }
  }

  /**
   * Determines (based on input and prediction histories) whether
   * there was a tap.
   */
  private didTap() {
    const inputsWereGood = this.inputHistory.reduce((good, accel) => {
      return good && this.tapAxisIsPrimary(accel);
    }, true);
    const predictionsWereGood = this.predictionHistory.reduce((good, prediction) => {
      return good && prediction > this.threshold;
    }, true);
    return predictionsWereGood; // && inputsWereGood;
  }

  private tapAxisIsPrimary(accel: any) {
    const a = {
      x: Math.abs(accel.x),
      y: Math.abs(accel.y),
      z: Math.abs(accel.z)
    };
    const max = Math.max(
      a.z,
      Math.max(a.x, a.y)
    );
    const xPercent = a.x / max;
    const yPercent = a.y / max;
    const zPercent = a.z / max;
    const outOfAxisThreshold = 0.5;
    return (
      zPercent > 0.9 &&
      xPercent < outOfAxisThreshold &&
      yPercent < outOfAxisThreshold
    );
  }

  private updateHistory(accel: any) {
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
