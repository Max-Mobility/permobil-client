import { android as androidApp } from 'tns-core-modules/application';
import { knownFolders, path } from 'tns-core-modules/file-system';

declare const org: any;

export class TapDetector {
  public tapDetectorModelFileName: string = 'tapDetectorLSTM.tflite';
  public threshold: number = 0.75;

  private tflite: any = null;
  private tfliteModel: java.nio.MappedByteBuffer = null;
  private tapDetectorInput = null;
  private tapDetectorOutput = null;

  constructor() {
    try {
      // initialize the memory for the input
      this.tapDetectorInput = java.nio.ByteBuffer.allocateDirect(
        3 * 4 // 3 channels of 4-byte floating point data
      );
      this.tapDetectorInput.order(
        java.nio.ByteOrder.nativeOrder()
      );
      // initialize the memory for the output
      this.tapDetectorOutput = Array.create('[F', 1);
      const elements = Array.create('float', 1);
      elements[0] = new java.lang.Float("0.0");
      this.tapDetectorOutput[0] = elements;
      // load the model file
      this.tfliteModel = this.loadModelFile();
      // create the tflite interpreter
      const tfliteOptions = new org.tensorflow.lite.Interpreter.Options();
      tfliteOptions.setNumThreads(1);
      this.tflite = new org.tensorflow.lite.Interpreter(
        this.tfliteModel,
        tfliteOptions
      );
    } catch (e) {
      console.error('Could not initialize TapDetector:', e);
    }
  }

  public detectTap(inputData: number[]) {
    try {
      console.log('tap detector input', inputData);
      // reset pointer to 0
      this.tapDetectorInput.rewind();
      // format all input
      inputData.map(d => {
        this.tapDetectorInput.putFloat(d);
      });
      console.log('raw input data', this.tapDetectorInput);
      // run the inference
      this.tflite.run(this.tapDetectorInput, this.tapDetectorOutput);
      console.log('tap detector output', this.tapDetectorOutput);
      const prediction = this.tapDetectorOutput[0][0];
      console.log('prediction', prediction);
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
