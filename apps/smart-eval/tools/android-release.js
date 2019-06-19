const prompt = require('prompt');
const { exec } = require('child_process');

let keyPassword = Array.prototype.slice.call(process.argv, 2)[0];

function askKeystorePassword() {
  return new Promise((resolve, reject) => {
    // if password entered with npm run then just resolve it
    if (keyPassword) {
      resolve(keyPassword);
      return;
    }
    prompt.start();
    prompt.get(
      {
        name: 'keystore_password',
        description:
          'What is the Smart Evaluation Mobile App keystore password?'
      },
      (err, result) => {
        if (err) {
          reject(err);
          return console.log(err);
        }
        if (!result.keystore_password) {
          return console.log(
            'The keystore password is required to produce a signed release AAB for Android.'
          );
        }
        keyPassword = result.keystore_password;
        resolve(keyPassword);
      }
    );
  });
}

askKeystorePassword().then(result => {
  console.log(
    'Executing the android release build process. This will take a few minutes as the entire project is built from scratch. Go get a cup ☕️ or 🍺.'
  );
  // execute the android release build cmd with the result as password
  exec(
    `npm run nuki && cd ../.. && tns build android --release --bundle --env.aot --env.uglify --key-store-path ./tools/smarteval-keystore.jks --key-store-password ${result} --key-store-alias upload --key-store-alias-password ${result} --aab --copy-to ./smart-eval.aab`,
    // `cd ../.. && tns build android --release --bundle --env.aot --env.uglify --key-store-path ../tools/smarteval-keystore.jks --key-store-password ${result} --key-store-alias upload --key-store-alias-password ${result} --aab --copy-to ./smart-eval.aab`,
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
        'Android release finished. A new release AAB should be located in the permobil-client/apps/smart-eval/tools directory.'
      );
    }
  );
});
