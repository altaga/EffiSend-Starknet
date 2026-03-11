const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const appJsonPath = path.join(rootDir, 'app.json');

try {
  // 1. Load and Parse app.json
  const fileContent = fs.readFileSync(appJsonPath, 'utf8');
  const appJson = JSON.parse(fileContent);

  // 2. Increment Version (1.0.X)
  let currentVersion = appJson.expo.version || "1.0.0";
  let parts = currentVersion.split('.');
  
  // Ensure we have 3 parts, then increment the last one
  let patch = parseInt(parts[2] || 0) + 1;
  appJson.expo.version = `${parts[0]}.${parts[1]}.${patch}`;

  // 3. Increment Version Code (Android)
  if (!appJson.expo.android) appJson.expo.android = {};
  appJson.expo.android.versionCode = (appJson.expo.android.versionCode || 0) + 1;

  // 4. Save changes
  fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
  console.log(`🚀 Version updated to: ${appJson.expo.version} (Code: ${appJson.expo.android.versionCode})`);

  // 5. Run Native Commands
  console.log("🛠️  Running Expo Prebuild...");
  execSync('npx expo prebuild --platform android', { stdio: 'inherit', cwd: rootDir });

  console.log("📦 Building Release APK...");
  // Use 'gradlew' for Windows or './gradlew' for Mac/Linux
  const gradlew = process.platform === 'win32' ? 'gradlew' : './gradlew';
  execSync(`cd android && ${gradlew} assembleRelease`, { stdio: 'inherit', cwd: rootDir });

  console.log("\n✅ Build complete! APK is in android/app/build/outputs/apk/release/");

} catch (error) {
  if (error instanceof SyntaxError) {
    console.error("❌ Syntax Error in app.json: Please check for trailing commas or missing quotes.");
  } else {
    console.error("❌ Error:", error.message);
  }
  process.exit(1);
}