# Max-Mobility

## Setup

Execute `npm run nuki`

## Running the Smart Evaluation mobile app

Execute - `npm run sea.start.android` for Android
Execute - `npm run sea.start.android.hmr` for Android [HMR](https://docs.nativescript.org/performance-optimizations/bundling-with-webpack?_ga=2.194425965.1312035776.1551802855-226918736.1498689363#hot-module-replacement)
Execute - `npm run sea.start.ios` for iOS
Execute - `npm run sea.start.ios.hmr` for iOS [HMR](https://docs.nativescript.org/performance-optimizations/bundling-with-webpack?_ga=2.194425965.1312035776.1551802855-226918736.1498689363#hot-module-replacement)

- _This should path down to the `apps/smart-eval-app` directory and exec the `tns run android --bundle --env.aot` cmd to start the mobile app._

### Release builds for publishing Smart Evaluation (smart-eval-app)

#### Android

**Important Android Release Note**: The release .keystore file, this is kept internally so only Permobil can publish. Without it, you cannot create a signed release build.
For the build to work successfully, the script will look for the keystore in the `apps/smart-eval-app/tools/` directory. Image below shows where it should be for the script to work properly.

![keystore](./apps/smart-eval-app/tools/keystore_directory.png)

- Execute `npm run sea.android.release $KEYSTORE_PASSWORD` - replace \$KEYSTORE_PASSWORD with the actual password for the keystore for smart-eval-app). If you do not provide the password argument in the command, you'll be prompted for it.

#### iOS

- Execute `npm run sea.ios.release` - this will create a release build for iOS.
- Open the .xcworkspace file in xcode, the file is located in `apps/smart-eval-app/platforms/ios`
- Make sure the build # has been incremented or the upload will fail if it's already used.
- Create an archive and then upload to iTunesConnect.

- You can try publishing to iOS from the command line but you'll need your apple dev account username and password to execute the `tns publish ios` command. In the past, this has been spotty, so the manual upload through XCode has been more reliable.
