@NativeClass()
@JavaProxy('com.permobil.pushtracker.ResultReceiver')
export class ResultReceiver extends android.os.ResultReceiver {
  public onReceiveFunction: any = null;
  constructor(handler: android.os.Handler) {
    super(handler);
    return global.__native(this);
  }
  onReceiveResult(resultCode: number, resultData: android.os.Bundle) {
    if (this.onReceiveFunction) this.onReceiveFunction(resultCode, resultData);
  }
}
