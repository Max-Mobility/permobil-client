# Permobil-Mobile

This repo contains multiple mobile app projects built with NativeScript and Angular.

## Setup

Execute `npm run nuki`

## Running the Smart Evaluation Mobile app

Execute - `npm run se.` for Android.
Execute - `npm run se.i` for iOS.

- _This should path down to the `apps/smart-eval` directory and exec the `tns run android --env.aot` cmd to start the smart eval app._

## Running the Pushtracker Mobile app

Execute - `npm run pt.a` for Android.
Execute - `npm run pt.i` for iOS.

## Release Builds for publishing Smart Evaluation (smart-eval-app)

#### Android

**Important Android Release Note**: The release .keystore file, this is kept internally so only Permobil can publish. Without it, you cannot create a signed release build.
For the build to work successfully, the script will look for the keystore in the `apps/smart-eval-app/tools/` directory. Image below shows where it should be for the script to work properly.

![keystore](./apps/smart-eval-app/tools/keystore_directory.png)

- Execute `npm run se.android.release $KEYSTORE_PASSWORD` - replace \$KEYSTORE_PASSWORD with the actual password for the keystore for smart-eval-app). If you do not provide the password argument in the command, you'll be prompted for it.

#### iOS

- Execute `npm run se.ios.release` - this will create a release build for iOS.
- Open the .xcworkspace file in xcode, the file is located in `apps/smart-eval/platforms/ios`
- Make sure the build # has been incremented or the upload will fail if it's already used.
- Create an archive and then upload to iTunesConnect via XCode.
