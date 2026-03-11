const fs = require('fs');
const { execSync } = require('child_process');

// 1. Load app.json
const appJson = JSON.parse(fs.readFileSync('./app.json', 'utf8'));

// 2. Bump Version Code (Play Store Requirement)
appJson.expo.android.versionCode = (appJson.expo.android.versionCode || 0) + 1;

// 3. Bump Version String (e.g. 1.0.5 -> 1.0.6)
const parts = appJson.expo.version.split('.');
parts[2] = parseInt(parts[2]) + 1;
appJson.expo.version = parts.join('.');

// 4. Save Changes
fs.writeFileSync('./app.json', JSON.stringify(appJson, null, 2));
console.log(`🚀 Version bumped to ${appJson.expo.version} (Code: ${appJson.expo.android.versionCode})`);

// 5. Run Prebuild (This applies the Plugin fixes to the native folder)
console.log("🛠️ Syncing changes to Android folder...");
execSync('npx expo prebuild --platform android', { stdio: 'inherit' });

console.log("\n✅ Ready! Now go to Android Studio and 'Generate Signed Bundle'.");