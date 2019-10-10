/// <reference path="android-declarations.d.ts"/>

declare module com {
	export module google {
		export module android {
			export module gms {
				export module tasks {
					export abstract class CancellationToken {
						public static class: java.lang.Class<com.google.android.gms.tasks.CancellationToken>;
						public constructor();
						public isCancellationRequested(): boolean;
						public onCanceledRequested(param0: com.google.android.gms.tasks.OnTokenCanceledListener): com.google.android.gms.tasks.CancellationToken;
					}
				}
			}
		}
	}
}

declare module com {
	export module google {
		export module android {
			export module gms {
				export module tasks {
					export class CancellationTokenSource {
						public static class: java.lang.Class<com.google.android.gms.tasks.CancellationTokenSource>;
						public constructor();
						public cancel(): void;
						public getToken(): com.google.android.gms.tasks.CancellationToken;
					}
				}
			}
		}
	}
}

declare module com {
	export module google {
		export module android {
			export module gms {
				export module tasks {
					export class Continuation<TResult, TContinuationResult>  extends java.lang.Object {
						public static class: java.lang.Class<com.google.android.gms.tasks.Continuation<any,any>>;
						/**
						 * Constructs a new instance of the com.google.android.gms.tasks.Continuation<any,any> interface with the provided implementation. An empty constructor exists calling super() when extending the interface class.
						 */
						public constructor(implementation: {
							then(param0: com.google.android.gms.tasks.Task<TResult>): TContinuationResult;
						});
						public constructor();
						public then(param0: com.google.android.gms.tasks.Task<TResult>): TContinuationResult;
					}
				}
			}
		}
	}
}

declare module com {
	export module google {
		export module android {
			export module gms {
				export module tasks {
					export class OnCanceledListener {
						public static class: java.lang.Class<com.google.android.gms.tasks.OnCanceledListener>;
						/**
						 * Constructs a new instance of the com.google.android.gms.tasks.OnCanceledListener interface with the provided implementation. An empty constructor exists calling super() when extending the interface class.
						 */
						public constructor(implementation: {
							onCanceled(): void;
						});
						public constructor();
						public onCanceled(): void;
					}
				}
			}
		}
	}
}

declare module com {
	export module google {
		export module android {
			export module gms {
				export module tasks {
					export class OnCompleteListener<TResult>  extends java.lang.Object {
						public static class: java.lang.Class<com.google.android.gms.tasks.OnCompleteListener<any>>;
						/**
						 * Constructs a new instance of the com.google.android.gms.tasks.OnCompleteListener<any> interface with the provided implementation. An empty constructor exists calling super() when extending the interface class.
						 */
						public constructor(implementation: {
							onComplete(param0: com.google.android.gms.tasks.Task<TResult>): void;
						});
						public constructor();
						public onComplete(param0: com.google.android.gms.tasks.Task<TResult>): void;
					}
				}
			}
		}
	}
}

declare module com {
	export module google {
		export module android {
			export module gms {
				export module tasks {
					export class OnFailureListener {
						public static class: java.lang.Class<com.google.android.gms.tasks.OnFailureListener>;
						/**
						 * Constructs a new instance of the com.google.android.gms.tasks.OnFailureListener interface with the provided implementation. An empty constructor exists calling super() when extending the interface class.
						 */
						public constructor(implementation: {
							onFailure(param0: java.lang.Exception): void;
						});
						public constructor();
						public onFailure(param0: java.lang.Exception): void;
					}
				}
			}
		}
	}
}

declare module com {
	export module google {
		export module android {
			export module gms {
				export module tasks {
					export class OnSuccessListener<TResult>  extends java.lang.Object {
						public static class: java.lang.Class<com.google.android.gms.tasks.OnSuccessListener<any>>;
						/**
						 * Constructs a new instance of the com.google.android.gms.tasks.OnSuccessListener<any> interface with the provided implementation. An empty constructor exists calling super() when extending the interface class.
						 */
						public constructor(implementation: {
							onSuccess(param0: TResult): void;
						});
						public constructor();
						public onSuccess(param0: TResult): void;
					}
				}
			}
		}
	}
}

declare module com {
	export module google {
		export module android {
			export module gms {
				export module tasks {
					export class OnTokenCanceledListener {
						public static class: java.lang.Class<com.google.android.gms.tasks.OnTokenCanceledListener>;
						/**
						 * Constructs a new instance of the com.google.android.gms.tasks.OnTokenCanceledListener interface with the provided implementation. An empty constructor exists calling super() when extending the interface class.
						 */
						public constructor(implementation: {
							onCanceled(): void;
						});
						public constructor();
						public onCanceled(): void;
					}
				}
			}
		}
	}
}

declare module com {
	export module google {
		export module android {
			export module gms {
				export module tasks {
					export class RuntimeExecutionException {
						public static class: java.lang.Class<com.google.android.gms.tasks.RuntimeExecutionException>;
						public constructor(param0: java.lang.Throwable);
					}
				}
			}
		}
	}
}

declare module com {
	export module google {
		export module android {
			export module gms {
				export module tasks {
					export class SuccessContinuation<TResult, TContinuationResult>  extends java.lang.Object {
						public static class: java.lang.Class<com.google.android.gms.tasks.SuccessContinuation<any,any>>;
						/**
						 * Constructs a new instance of the com.google.android.gms.tasks.SuccessContinuation<any,any> interface with the provided implementation. An empty constructor exists calling super() when extending the interface class.
						 */
						public constructor(implementation: {
							then(param0: TResult): com.google.android.gms.tasks.Task<TContinuationResult>;
						});
						public constructor();
						public then(param0: TResult): com.google.android.gms.tasks.Task<TContinuationResult>;
					}
				}
			}
		}
	}
}

declare module com {
	export module google {
		export module android {
			export module gms {
				export module tasks {
					export abstract class Task<TResult>  extends java.lang.Object {
						public static class: java.lang.Class<com.google.android.gms.tasks.Task<any>>;
						public addOnFailureListener(param0: com.google.android.gms.tasks.OnFailureListener): com.google.android.gms.tasks.Task<TResult>;
						public continueWithTask(param0: java.util.concurrent.Executor, param1: com.google.android.gms.tasks.Continuation<any,any>): com.google.android.gms.tasks.Task<any>;
						public addOnFailureListener(param0: globalAndroid.app.Activity, param1: com.google.android.gms.tasks.OnFailureListener): com.google.android.gms.tasks.Task<TResult>;
						public addOnCompleteListener(param0: java.util.concurrent.Executor, param1: com.google.android.gms.tasks.OnCompleteListener<TResult>): com.google.android.gms.tasks.Task<TResult>;
						public continueWithTask(param0: com.google.android.gms.tasks.Continuation<any,any>): com.google.android.gms.tasks.Task<any>;
						public addOnFailureListener(param0: java.util.concurrent.Executor, param1: com.google.android.gms.tasks.OnFailureListener): com.google.android.gms.tasks.Task<TResult>;
						public addOnCompleteListener(param0: com.google.android.gms.tasks.OnCompleteListener<TResult>): com.google.android.gms.tasks.Task<TResult>;
						public continueWith(param0: com.google.android.gms.tasks.Continuation<any,any>): com.google.android.gms.tasks.Task<any>;
						public continueWith(param0: java.util.concurrent.Executor, param1: com.google.android.gms.tasks.Continuation<any,any>): com.google.android.gms.tasks.Task<any>;
						public addOnCanceledListener(param0: globalAndroid.app.Activity, param1: com.google.android.gms.tasks.OnCanceledListener): com.google.android.gms.tasks.Task<TResult>;
						public addOnSuccessListener(param0: com.google.android.gms.tasks.OnSuccessListener<any>): com.google.android.gms.tasks.Task<TResult>;
						public isSuccessful(): boolean;
						public addOnSuccessListener(param0: java.util.concurrent.Executor, param1: com.google.android.gms.tasks.OnSuccessListener<any>): com.google.android.gms.tasks.Task<TResult>;
						public addOnSuccessListener(param0: globalAndroid.app.Activity, param1: com.google.android.gms.tasks.OnSuccessListener<any>): com.google.android.gms.tasks.Task<TResult>;
						public addOnCanceledListener(param0: java.util.concurrent.Executor, param1: com.google.android.gms.tasks.OnCanceledListener): com.google.android.gms.tasks.Task<TResult>;
						public onSuccessTask(param0: com.google.android.gms.tasks.SuccessContinuation<any,any>): com.google.android.gms.tasks.Task<any>;
						public constructor();
						public addOnCompleteListener(param0: globalAndroid.app.Activity, param1: com.google.android.gms.tasks.OnCompleteListener<TResult>): com.google.android.gms.tasks.Task<TResult>;
						public onSuccessTask(param0: java.util.concurrent.Executor, param1: com.google.android.gms.tasks.SuccessContinuation<any,any>): com.google.android.gms.tasks.Task<any>;
						public addOnCanceledListener(param0: com.google.android.gms.tasks.OnCanceledListener): com.google.android.gms.tasks.Task<TResult>;
						public getResult(): TResult;
						public isComplete(): boolean;
						public isCanceled(): boolean;
						public getResult(param0: java.lang.Class): any;
						public getException(): java.lang.Exception;
					}
				}
			}
		}
	}
}

declare module com {
	export module google {
		export module android {
			export module gms {
				export module tasks {
					export class TaskCompletionSource<TResult>  extends java.lang.Object {
						public static class: java.lang.Class<com.google.android.gms.tasks.TaskCompletionSource<any>>;
						public trySetResult(param0: TResult): boolean;
						public getTask(): com.google.android.gms.tasks.Task<TResult>;
						public constructor();
						public constructor(param0: com.google.android.gms.tasks.CancellationToken);
						public trySetException(param0: java.lang.Exception): boolean;
						public setException(param0: java.lang.Exception): void;
						public setResult(param0: TResult): void;
					}
				}
			}
		}
	}
}

declare module com {
	export module google {
		export module android {
			export module gms {
				export module tasks {
					export class TaskExecutors {
						public static class: java.lang.Class<com.google.android.gms.tasks.TaskExecutors>;
						public static MAIN_THREAD: java.util.concurrent.Executor;
					}
					export module TaskExecutors {
						export class zza {
							public static class: java.lang.Class<com.google.android.gms.tasks.TaskExecutors.zza>;
							public constructor();
							public execute(param0: java.lang.Runnable): void;
						}
					}
				}
			}
		}
	}
}

declare module com {
	export module google {
		export module android {
			export module gms {
				export module tasks {
					export class Tasks {
						public static class: java.lang.Class<com.google.android.gms.tasks.Tasks>;
						public static await(param0: com.google.android.gms.tasks.Task<any>, param1: number, param2: java.util.concurrent.TimeUnit): any;
						public static forResult(param0: any): com.google.android.gms.tasks.Task<any>;
						public static call(param0: java.util.concurrent.Executor, param1: java.util.concurrent.Callable): com.google.android.gms.tasks.Task<any>;
						public static whenAllComplete(param0: native.Array<com.google.android.gms.tasks.Task<any>>): com.google.android.gms.tasks.Task<java.util.List<com.google.android.gms.tasks.Task<any>>>;
						public static whenAllSuccess(param0: java.util.Collection): com.google.android.gms.tasks.Task<any>;
						public static whenAll(param0: java.util.Collection<any>): com.google.android.gms.tasks.Task<java.lang.Void>;
						public static forException(param0: java.lang.Exception): com.google.android.gms.tasks.Task<any>;
						public static await(param0: com.google.android.gms.tasks.Task<any>): any;
						public static whenAllSuccess(param0: native.Array<com.google.android.gms.tasks.Task<any>>): com.google.android.gms.tasks.Task<any>;
						public static whenAllComplete(param0: java.util.Collection<any>): com.google.android.gms.tasks.Task<java.util.List<com.google.android.gms.tasks.Task<any>>>;
						public static forCanceled(): com.google.android.gms.tasks.Task<any>;
						public static call(param0: java.util.concurrent.Callable): com.google.android.gms.tasks.Task<any>;
						public static whenAll(param0: native.Array<com.google.android.gms.tasks.Task<any>>): com.google.android.gms.tasks.Task<java.lang.Void>;
					}
					export module Tasks {
						export class zza extends com.google.android.gms.tasks.Tasks.zzb {
							public static class: java.lang.Class<com.google.android.gms.tasks.Tasks.zza>;
							public onSuccess(param0: any): void;
							public onFailure(param0: java.lang.Exception): void;
							public await(param0: number, param1: java.util.concurrent.TimeUnit): boolean;
							public await(): void;
							public onCanceled(): void;
						}
						export class zzb extends java.lang.Object {
							public static class: java.lang.Class<com.google.android.gms.tasks.Tasks.zzb>;
							/**
							 * Constructs a new instance of the com.google.android.gms.tasks.Tasks$zzb interface with the provided implementation. An empty constructor exists calling super() when extending the interface class.
							 */
							public constructor(implementation: {
								onCanceled(): void;
								onFailure(param0: java.lang.Exception): void;
								onSuccess(param0: any): void;
							});
							public constructor();
							public onSuccess(param0: any): void;
							public onFailure(param0: java.lang.Exception): void;
							public onCanceled(): void;
						}
						export class zzc extends com.google.android.gms.tasks.Tasks.zzb {
							public static class: java.lang.Class<com.google.android.gms.tasks.Tasks.zzc>;
							public constructor(param0: number, param1: com.google.android.gms.tasks.zzu<java.lang.Void>);
							public onSuccess(param0: any): void;
							public onFailure(param0: java.lang.Exception): void;
							public onCanceled(): void;
						}
					}
				}
			}
		}
	}
}

declare module com {
	export module google {
		export module android {
			export module gms {
				export module tasks {
					export class zza extends com.google.android.gms.tasks.CancellationToken {
						public static class: java.lang.Class<com.google.android.gms.tasks.zza>;
						public isCancellationRequested(): boolean;
						public cancel(): void;
						public onCanceledRequested(param0: com.google.android.gms.tasks.OnTokenCanceledListener): com.google.android.gms.tasks.CancellationToken;
					}
				}
			}
		}
	}
}

declare module com {
	export module google {
		export module android {
			export module gms {
				export module tasks {
					export class zzb extends com.google.android.gms.tasks.OnSuccessListener<java.lang.Void> {
						public static class: java.lang.Class<com.google.android.gms.tasks.zzb>;
						public onSuccess(param0: any): void;
					}
				}
			}
		}
	}
}

declare module com {
	export module google {
		export module android {
			export module gms {
				export module tasks {
					export class zzc<TResult, TContinuationResult>  extends java.lang.Object /* com.google.android.gms.tasks.zzq<any>*/ {
						public static class: java.lang.Class<com.google.android.gms.tasks.zzc<any,any>>;
						public cancel(): void;
						public onComplete(param0: com.google.android.gms.tasks.Task<any>): void;
						public constructor(param0: java.util.concurrent.Executor, param1: com.google.android.gms.tasks.Continuation<any,any>, param2: any /* com.google.android.gms.tasks.zzu<any>*/);
					}
				}
			}
		}
	}
}

declare module com {
	export module google {
		export module android {
			export module gms {
				export module tasks {
					export class zzd {
						public static class: java.lang.Class<com.google.android.gms.tasks.zzd>;
						public run(): void;
					}
				}
			}
		}
	}
}

declare module com {
	export module google {
		export module android {
			export module gms {
				export module tasks {
					export class zze<TResult, TContinuationResult>  extends java.lang.Object {
						public static class: java.lang.Class<com.google.android.gms.tasks.zze<any,any>>;
						public onFailure(param0: java.lang.Exception): void;
						public onComplete(param0: com.google.android.gms.tasks.Task<TResult>): void;
						public cancel(): void;
						public constructor(param0: java.util.concurrent.Executor, param1: com.google.android.gms.tasks.Continuation<TResult,com.google.android.gms.tasks.Task<TContinuationResult>>, param2: any /* com.google.android.gms.tasks.zzu<TContinuationResult>*/);
						public onSuccess(param0: TContinuationResult): void;
						public onCanceled(): void;
						public onSuccess(param0: TResult): void;
					}
				}
			}
		}
	}
}

declare module com {
	export module google {
		export module android {
			export module gms {
				export module tasks {
					export class zzf {
						public static class: java.lang.Class<com.google.android.gms.tasks.zzf>;
						public run(): void;
					}
				}
			}
		}
	}
}

declare module com {
	export module google {
		export module android {
			export module gms {
				export module tasks {
					export class zzg<TResult>  extends java.lang.Object /* com.google.android.gms.tasks.zzq<any>*/ {
						public static class: java.lang.Class<com.google.android.gms.tasks.zzg<any>>;
						public onComplete(param0: com.google.android.gms.tasks.Task<any>): void;
						public cancel(): void;
						public onComplete(param0: com.google.android.gms.tasks.Task<any>): void;
						public constructor(param0: java.util.concurrent.Executor, param1: com.google.android.gms.tasks.OnCanceledListener);
					}
				}
			}
		}
	}
}

declare module com {
	export module google {
		export module android {
			export module gms {
				export module tasks {
					export class zzh {
						public static class: java.lang.Class<com.google.android.gms.tasks.zzh>;
						public run(): void;
					}
				}
			}
		}
	}
}

declare module com {
	export module google {
		export module android {
			export module gms {
				export module tasks {
					export class zzi<TResult>  extends java.lang.Object /* com.google.android.gms.tasks.zzq<any>*/ {
						public static class: java.lang.Class<com.google.android.gms.tasks.zzi<any>>;
						public cancel(): void;
						public onComplete(param0: com.google.android.gms.tasks.Task<any>): void;
						public constructor(param0: java.util.concurrent.Executor, param1: com.google.android.gms.tasks.OnCompleteListener<any>);
					}
				}
			}
		}
	}
}

declare module com {
	export module google {
		export module android {
			export module gms {
				export module tasks {
					export class zzj {
						public static class: java.lang.Class<com.google.android.gms.tasks.zzj>;
						public run(): void;
					}
				}
			}
		}
	}
}

declare module com {
	export module google {
		export module android {
			export module gms {
				export module tasks {
					export class zzk<TResult>  extends java.lang.Object /* com.google.android.gms.tasks.zzq<any>*/ {
						public static class: java.lang.Class<com.google.android.gms.tasks.zzk<any>>;
						public cancel(): void;
						public onComplete(param0: com.google.android.gms.tasks.Task<any>): void;
						public constructor(param0: java.util.concurrent.Executor, param1: com.google.android.gms.tasks.OnFailureListener);
					}
				}
			}
		}
	}
}

declare module com {
	export module google {
		export module android {
			export module gms {
				export module tasks {
					export class zzl {
						public static class: java.lang.Class<com.google.android.gms.tasks.zzl>;
						public run(): void;
					}
				}
			}
		}
	}
}

declare module com {
	export module google {
		export module android {
			export module gms {
				export module tasks {
					export class zzm<TResult>  extends java.lang.Object /* com.google.android.gms.tasks.zzq<any>*/ {
						public static class: java.lang.Class<com.google.android.gms.tasks.zzm<any>>;
						public constructor(param0: java.util.concurrent.Executor, param1: com.google.android.gms.tasks.OnSuccessListener<any>);
						public cancel(): void;
						public onComplete(param0: com.google.android.gms.tasks.Task<any>): void;
					}
				}
			}
		}
	}
}

declare module com {
	export module google {
		export module android {
			export module gms {
				export module tasks {
					export class zzn {
						public static class: java.lang.Class<com.google.android.gms.tasks.zzn>;
						public run(): void;
					}
				}
			}
		}
	}
}

declare module com {
	export module google {
		export module android {
			export module gms {
				export module tasks {
					export class zzo<TResult, TContinuationResult>  extends java.lang.Object {
						public static class: java.lang.Class<com.google.android.gms.tasks.zzo<any,any>>;
						public constructor(param0: java.util.concurrent.Executor, param1: com.google.android.gms.tasks.SuccessContinuation<TResult,TContinuationResult>, param2: any /* com.google.android.gms.tasks.zzu<TContinuationResult>*/);
						public onFailure(param0: java.lang.Exception): void;
						public onComplete(param0: com.google.android.gms.tasks.Task<TResult>): void;
						public cancel(): void;
						public onSuccess(param0: TContinuationResult): void;
						public onCanceled(): void;
						public onSuccess(param0: TResult): void;
					}
				}
			}
		}
	}
}

declare module com {
	export module google {
		export module android {
			export module gms {
				export module tasks {
					export class zzp {
						public static class: java.lang.Class<com.google.android.gms.tasks.zzp>;
						public run(): void;
					}
				}
			}
		}
	}
}

declare module com {
	export module google {
		export module android {
			export module gms {
				export module tasks {
					export class zzq<TResult>  extends java.lang.Object {
						public static class: java.lang.Class<com.google.android.gms.tasks.zzq<any>>;
						/**
						 * Constructs a new instance of the com.google.android.gms.tasks.zzq<any> interface with the provided implementation. An empty constructor exists calling super() when extending the interface class.
						 */
						public constructor(implementation: {
							onComplete(param0: com.google.android.gms.tasks.Task<TResult>): void;
							cancel(): void;
						});
						public constructor();
						public onComplete(param0: com.google.android.gms.tasks.Task<TResult>): void;
						public cancel(): void;
					}
				}
			}
		}
	}
}

declare module com {
	export module google {
		export module android {
			export module gms {
				export module tasks {
					export class zzr<TResult>  extends java.lang.Object {
						public static class: java.lang.Class<com.google.android.gms.tasks.zzr<any>>;
					}
				}
			}
		}
	}
}

declare module com {
	export module google {
		export module android {
			export module gms {
				export module tasks {
					export class zzs extends com.google.android.gms.tasks.OnTokenCanceledListener {
						public static class: java.lang.Class<com.google.android.gms.tasks.zzs>;
						public onCanceled(): void;
					}
				}
			}
		}
	}
}

declare module com {
	export module google {
		export module android {
			export module gms {
				export module tasks {
					export class zzt {
						public static class: java.lang.Class<com.google.android.gms.tasks.zzt>;
						public execute(param0: java.lang.Runnable): void;
					}
				}
			}
		}
	}
}

declare module com {
	export module google {
		export module android {
			export module gms {
				export module tasks {
					export class zzu<TResult>  extends com.google.android.gms.tasks.Task<any> {
						public static class: java.lang.Class<com.google.android.gms.tasks.zzu<any>>;
						public setResult(param0: any): void;
						public addOnCompleteListener(param0: com.google.android.gms.tasks.OnCompleteListener<any>): com.google.android.gms.tasks.Task<any>;
						public addOnCanceledListener(param0: java.util.concurrent.Executor, param1: com.google.android.gms.tasks.OnCanceledListener): com.google.android.gms.tasks.Task<any>;
						public addOnSuccessListener(param0: globalAndroid.app.Activity, param1: com.google.android.gms.tasks.OnSuccessListener<any>): com.google.android.gms.tasks.Task<any>;
						public continueWithTask(param0: java.util.concurrent.Executor, param1: com.google.android.gms.tasks.Continuation<any,any>): com.google.android.gms.tasks.Task<any>;
						public continueWithTask(param0: com.google.android.gms.tasks.Continuation<any,any>): com.google.android.gms.tasks.Task<any>;
						public continueWith(param0: com.google.android.gms.tasks.Continuation<any,any>): com.google.android.gms.tasks.Task<any>;
						public continueWith(param0: java.util.concurrent.Executor, param1: com.google.android.gms.tasks.Continuation<any,any>): com.google.android.gms.tasks.Task<any>;
						public isSuccessful(): boolean;
						public trySetResult(param0: any): boolean;
						public setException(param0: java.lang.Exception): void;
						public addOnSuccessListener(param0: com.google.android.gms.tasks.OnSuccessListener<any>): com.google.android.gms.tasks.Task<any>;
						public addOnFailureListener(param0: globalAndroid.app.Activity, param1: com.google.android.gms.tasks.OnFailureListener): com.google.android.gms.tasks.Task<any>;
						public onSuccessTask(param0: com.google.android.gms.tasks.SuccessContinuation<any,any>): com.google.android.gms.tasks.Task<any>;
						public trySetException(param0: java.lang.Exception): boolean;
						public getResult(): any;
						public onSuccessTask(param0: java.util.concurrent.Executor, param1: com.google.android.gms.tasks.SuccessContinuation<any,any>): com.google.android.gms.tasks.Task<any>;
						public addOnCanceledListener(param0: globalAndroid.app.Activity, param1: com.google.android.gms.tasks.OnCanceledListener): com.google.android.gms.tasks.Task<any>;
						public isComplete(): boolean;
						public isCanceled(): boolean;
						public getResult(param0: java.lang.Class): any;
						public addOnCompleteListener(param0: java.util.concurrent.Executor, param1: com.google.android.gms.tasks.OnCompleteListener<any>): com.google.android.gms.tasks.Task<any>;
						public addOnFailureListener(param0: java.util.concurrent.Executor, param1: com.google.android.gms.tasks.OnFailureListener): com.google.android.gms.tasks.Task<any>;
						public addOnSuccessListener(param0: java.util.concurrent.Executor, param1: com.google.android.gms.tasks.OnSuccessListener<any>): com.google.android.gms.tasks.Task<any>;
						public getException(): java.lang.Exception;
						public addOnFailureListener(param0: com.google.android.gms.tasks.OnFailureListener): com.google.android.gms.tasks.Task<any>;
						public addOnCanceledListener(param0: com.google.android.gms.tasks.OnCanceledListener): com.google.android.gms.tasks.Task<any>;
						public addOnCompleteListener(param0: globalAndroid.app.Activity, param1: com.google.android.gms.tasks.OnCompleteListener<any>): com.google.android.gms.tasks.Task<any>;
					}
					export module zzu {
						export class zza {
							public static class: java.lang.Class<com.google.android.gms.tasks.zzu.zza>;
							public onStop(): void;
						}
					}
				}
			}
		}
	}
}

declare module com {
	export module google {
		export module android {
			export module gms {
				export module tasks {
					export class zzv {
						public static class: java.lang.Class<com.google.android.gms.tasks.zzv>;
						public run(): void;
					}
				}
			}
		}
	}
}

declare module com {
	export module google {
		export module android {
			export module gms {
				export module tasks {
					export class zzw extends com.google.android.gms.tasks.Continuation<java.lang.Void,java.util.List<any>> {
						public static class: java.lang.Class<com.google.android.gms.tasks.zzw>;
						public then(param0: com.google.android.gms.tasks.Task<any>): any;
					}
				}
			}
		}
	}
}

declare module com {
	export module google {
		export module android {
			export module gms {
				export module tasks {
					export class zzx extends com.google.android.gms.tasks.Continuation<java.lang.Void,com.google.android.gms.tasks.Task<java.util.List<com.google.android.gms.tasks.Task<any>>>> {
						public static class: java.lang.Class<com.google.android.gms.tasks.zzx>;
						public then(param0: com.google.android.gms.tasks.Task<any>): any;
					}
				}
			}
		}
	}
}

//Generics information:
//com.google.android.gms.tasks.Continuation:2
//com.google.android.gms.tasks.OnCompleteListener:1
//com.google.android.gms.tasks.OnSuccessListener:1
//com.google.android.gms.tasks.SuccessContinuation:2
//com.google.android.gms.tasks.Task:1
//com.google.android.gms.tasks.TaskCompletionSource:1
//com.google.android.gms.tasks.zzc:2
//com.google.android.gms.tasks.zze:2
//com.google.android.gms.tasks.zzg:1
//com.google.android.gms.tasks.zzi:1
//com.google.android.gms.tasks.zzk:1
//com.google.android.gms.tasks.zzm:1
//com.google.android.gms.tasks.zzo:2
//com.google.android.gms.tasks.zzq:1
//com.google.android.gms.tasks.zzr:1
//com.google.android.gms.tasks.zzu:1

