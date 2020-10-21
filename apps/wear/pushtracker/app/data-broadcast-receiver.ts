@NativeClass()
@JavaProxy('com.permobil.pushtracker.DataBroadcastReceiver')
export class DataBroadcastReceiver extends android.content.BroadcastReceiver {
  onReceiveFunction: any = null;
  constructor() {
    super();
    return global.__native(this);
  }
  onReceive(
    androidContext: android.content.Context,
    intent: android.content.Intent
  ) {
    if (this.onReceiveFunction) this.onReceiveFunction(androidContext, intent);
  }
}
