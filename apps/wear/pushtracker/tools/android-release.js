const prompts = require('prompts');
const { exec } = require('child_process');

let keyPassword = Array.prototype.slice.call(process.argv, 2)[0];

function askKeystorePassword() {
  // if password entered with npm run then just resolve it
  if (keyPassword) {
    return Promise.resolve(keyPassword);
  } else {
    return prompts({
      type: 'text',
      name: 'value',
      message: 'What is the PushTracker Wear OS App keystore password?',
      style: 'password'
    }).then(response => {
      return response.value;
    });
  }
}

askKeystorePassword().then(result => {
  console.log(
    'Executing the android release build process. This will take a few minutes as the entire project is built from scratch. Go get a cup ☕️ or 🍺.'
  );
  // execute the android release build cmd with the result as password
  exec(
    `npm i && cd apps/wear/pushtracker && rimraf platforms node_modules hooks && tns build android --release --bundle --env.uglify --key-store-path ./tools/pushtracker-wearos.jks --key-store-password ${result} --key-store-alias upload --key-store-alias-password ${result} --copy-to ./tools/pushtracker-wearos.apk`,
    (err, stdout, stderr) => {
      if (err) {
        console.error(
          'Error executing the android-release command.',
          err,
          stdout,
          stderr
        );
        return;
      }

      console.log(
        'Android release finished. A new release APK should be located in the permobil-client/apps/wear/pushtracker/tools/ directory.'
      );
    }
  );
});
