import { android as androidApp } from 'tns-core-modules/application';
import { knownFolders, path } from 'tns-core-modules/file-system';

declare const org: any;

export class TapDetector {
  public tapDetectorModelFileName: string = 'tapDetectorLSTM.tflite';
  public threshold: number = 0.5;

  private tflite: any = null;
  private tfliteModel: java.nio.MappedByteBuffer = null;
  private tapDetectorInput = null;
  private tapDetectorOutput: java.util.Map<java.lang.Integer, java.lang.Object> = null;

  private inputData = null;
  private previousState = null;
  private parsedPrediction = null;

  constructor() {
    try {
      // initialize the memory for the states
      this.previousState = Array.create('[F', 1);
      this.previousState[0] = Array.create('float', 64);
      // set initial states to 0
      for (let i = 0; i < 64; i++) {
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
      this.tapDetectorInput[0] = this.inputData;
      this.tapDetectorInput[1] = this.previousState;
      // initialize the memory for the prediction
      this.parsedPrediction = Array.create('[F', 1);
      const outputElements = Array.create('float', 1);
      outputElements[0] = new java.lang.Float('0.0');
      this.parsedPrediction[0] = outputElements;
      // initialize the memory for the output
      this.tapDetectorOutput = new java.util.HashMap<java.lang.Integer, java.lang.Object>();
      this.tapDetectorOutput.put(
        new java.lang.Integer(1),
        this.parsedPrediction
      );
      this.tapDetectorOutput.put(
        new java.lang.Integer(0),
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
      console.log('TapDetector::TapDetector(): input tensor count = ',
                  inputCount);
      for (let i = 0; i < inputCount; i++) {
        console.log('TapDetector::TapDetector(): input tensor ' + i + ' type = ',
                    this.tflite.getInputTensor(i).dataType());
        console.log('TapDetector::TapDetector(): input tensor ' + i + ' shape = ',
                    Array.from(this.tflite.getInputTensor(i).shape()));
      }
      const outputCount = this.tflite.getOutputTensorCount();
      console.log('TapDetector::TapDetector(): output tensor count = ',
                  outputCount);
      for (let i = 0; i < outputCount; i++) {
        console.log('TapDetector::TapDetector(): output tensor ' + i + ' type = ',
                    this.tflite.getOutputTensor(i).dataType());
        console.log('TapDetector::TapDetector(): output tensor ' + i + ' shape = ',
                    Array.from(this.tflite.getOutputTensor(i).shape()));
      }
    } catch (e) {
      console.error('Could not initialize TapDetector:', e);
    }
  }

  public detectTap(inputData: number[]) {
    try {
      // console.log('tap detector input', inputData);
      // copy the data into the input array
      this.inputData[0][0] = inputData[0];
      this.inputData[0][1] = inputData[1];
      this.inputData[0][2] = inputData[2];
      // console.log('raw input data', this.tapDetectorInput);
      // run the inference
      this.tflite.runForMultipleInputsOutputs(this.tapDetectorInput, this.tapDetectorOutput);
      // console.log('tap detector output', this.tapDetectorOutput);
      const prediction = this.parsedPrediction[0][0];
      // console.log('prediction', prediction);
      // get the ouput and check against threshold
      return prediction > this.threshold;
    } catch (e) {
      console.error('could not detect tap:', e);
      return false;
    }
  }

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
