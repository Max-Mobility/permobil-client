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
      message: 'What is the PushTracker Mobile App keystore password?',
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
    `tns build android --release --env.aot --env.uglify --key-store-path ./pushtracker-keystore.jks --key-store-password ${result} --key-store-alias upload --key-store-alias-password ${result} --aab --copy-to ./pushtracker.aab`,
    // `tns build android --release --env.aot --env.uglify --key-store-path ./tools/pushtracker-keystore.jks --key-store-password ${result} --key-store-alias upload --key-store-alias-password ${result} --aab --copy-to ./pushtracker.aab`,
    (err, stdout, stderr) => {
      if (err) {
        console.error('Error executing the android-release command.', err);
        console.log(stdout);
        console.log(stderr);
        return;
      }

      console.log(
        'Android release finished. A new release AAB should be located in the permobil-client/apps/mobile/pushtracker/ directory.'
      );
    }
  );
});
