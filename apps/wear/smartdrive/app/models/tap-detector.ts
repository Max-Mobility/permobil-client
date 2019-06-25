import { knownFolders, path, Folder, File } from "tns-core-modules/file-system";
import { android as androidApp } from "tns-core-modules/application";

export class TapDetector {
  public tapDetectorModelFileName: string = "tapDetectorLSTM.tflite";
  public threshold: number = 0.75;

  private modelPath: string = null;
  private tflite: org.tensorflow.lite.Interpreter = null;
  private tfliteModel: java.nio.MappedByteBuffer = null;
  private tapDetectorOutput = Array.create("float", 1);

  constructor() {
    // get the path to the model
    this.modelPath = path.join(
      knownFolders.currentApp().path,
      'assets',
      'models',
      this.tapDetectorModelFileName
    );
    try {
      // load the model file
      this.tfliteModel = this.loadModelFile();
      // create the tflite interpreter
      const tfliteOptions = new org.tensorflow.lite.Interpreter.Options();
      tfliteOptions.setNumThreads(1);
      this.tflite = new org.tensorflow.lite.Interpreter(this.tfliteModel, tfliteOptions);
    } catch (e) {
      console.error('Could not initialize TapDetector:', e);
    }
  }

  public detectTap(inputData: number[]) {
    if (this.tflite) {
      this.tflite.run(inputData, this.tapDetectorOutput);
      return (this.tapDetectorOutput[0] > this.threshold);
    } else {
      return false;
    }
  }

  private loadModelFile() {
    const activity =
      androidApp.foregroundActivity ||
      androidApp.startActivity;

    console.log('loading model file', this.modelPath);
    const fileDescriptor = activity.getAssets().openFd(this.modelPath);
    const inputStream =
      new java.io.FileInputStream(fileDescriptor.getFileDescriptor());
    const fileChannel = inputStream.getChannel();
    const startOffset = fileDescriptor.getStartOffset();
    const declaredLength = fileDescriptor.getDeclaredLength();
    return fileChannel.map(
      java.nio.channels.FileChannel.MapMode.READ_ONLY,
      startOffset,
      declaredLength
    );
    /*
    return File.fromPath(this.modelPath).readSync((err) => {
      console.error('Could not load tflite model:', err);
    });
    */
  }
}
