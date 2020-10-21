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
      message: 'What is the Smart Evaluation Mobile App keystore password?',
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
    `ns clean && ns build android --release --no-hmr --env.aot --env.uglify --key-store-path ./tools/smarteval-keystore.jks --key-store-password ${result} --key-store-alias upload --key-store-alias-password ${result} --aab --copy-to ./smart-eval.aab`,
    // `tns build android --release --bundle --env.aot --env.uglify --key-store-path ../tools/smarteval-keystore.jks --key-store-password ${result} --key-store-alias upload --key-store-alias-password ${result} --aab --copy-to ./smart-eval.aab`,
    (err, stdout, stderr) => {
      if (err) {
        console.error('Error executing the android-release command.', err);
        return;
      }

      console.log(
        'Android release finished. A new release AAB should be located in the permobil/apps/mobile/smart-eval/tools directory.'
      );
    }
  );
});
