/// <reference path="android-declarations.d.ts"/>

declare module com {
	export module github {
		export module maxmobility {
			export module wearmessage {
				export class Data {
					public static class: java.lang.Class<com.github.maxmobility.wearmessage.Data>;
					public constructor(param0: globalAndroid.content.Context);
					public sendData(param0: string): void;
				}
			}
		}
	}
}

declare module com {
	export module github {
		export module maxmobility {
			export module wearmessage {
				export class DataLayerListenerService {
					public static class: java.lang.Class<com.github.maxmobility.wearmessage.DataLayerListenerService>;
					public static APP_DATA_PATH: string;
					public static APP_DATA_KEY: string;
					public static WEAR_DATA_PATH: string;
					public static WEAR_DATA_KEY: string;
					public onMessageReceived(param0: com.google.android.gms.wearable.MessageEvent): void;
					public constructor();
					public onDataChanged(param0: com.google.android.gms.wearable.DataEventBuffer): void;
				}
			}
		}
	}
}

declare module com {
	export module github {
		export module maxmobility {
			export module wearmessage {
				export class Message {
					public static class: java.lang.Class<com.github.maxmobility.wearmessage.Message>;
					public constructor(param0: globalAndroid.content.Context);
					public sendMessage(param0: string, param1: string): void;
					public getNodes(): java.util.Collection<string>;
				}
				export module Message {
					export class StartWearableTask extends globalAndroid.os.AsyncTask<java.lang.Void,java.lang.Void,java.lang.Void> {
						public static class: java.lang.Class<com.github.maxmobility.wearmessage.Message.StartWearableTask>;
						public doInBackground(param0: native.Array<java.lang.Void>): java.lang.Void;
					}
				}
			}
		}
	}
}

declare module com {
	export module github {
		export module maxmobility {
			export module wearosmessenger {
				export class BuildConfig {
					public static class: java.lang.Class<com.github.maxmobility.wearosmessenger.BuildConfig>;
					public static DEBUG: boolean;
					public static LIBRARY_PACKAGE_NAME: string;
					public static APPLICATION_ID: string;
					public static BUILD_TYPE: string;
					public static FLAVOR: string;
					public static VERSION_CODE: number;
					public static VERSION_NAME: string;
					public constructor();
				}
			}
		}
	}
}

//Generics information:

