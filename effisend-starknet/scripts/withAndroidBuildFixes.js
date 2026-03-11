const { withGradleProperties, withAppBuildGradle } = require('expo/config-plugins');

module.exports = function withAndroidBuildFixes(config) {
  
  // FIX 1: Increase JVM Heap & Metaspace (Fixes "Out of Memory" crashes)
  config = withGradleProperties(config, (config) => {
    const jvmArgsKey = 'org.gradle.jvmargs';
    // Allocation: 4GB Heap, 1GB Metaspace
    const newValue = '-Xmx4096m -XX:MaxMetaspaceSize=1024m';
    
    const index = config.modResults.findIndex(x => x.key === jvmArgsKey);
    if (index !== -1) {
      config.modResults[index].value = newValue;
    } else {
      config.modResults.push({ type: 'property', key: jvmArgsKey, value: newValue });
    }
    return config;
  });

  // FIX 2 & 3: Disable Linting & Enable Deobfuscation (R8/Mapping)
  config = withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    // A. Disable Linting (Prevents crashes on libraries like react-native-fs)
    if (!contents.includes('lint {')) {
      const lintBlock = `
    lint {
        checkReleaseBuilds false
        abortOnError false
    }
`;
      contents = contents.replace(/android\s*\{/, `android {${lintBlock}`);
    }

    // B. Enable R8/Minification (Generates the mapping file for Play Store)
    // This ensures 'minifyEnabled true' is set in the release build type
    if (!contents.includes('minifyEnabled true')) {
        const releaseBlock = `
        release {
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
`;
        // We look for the existing buildTypes { release { ... } } or inject it
        if (contents.includes('buildTypes {')) {
            contents = contents.replace(/buildTypes\s*\{/, `buildTypes {${releaseBlock}`);
        }
    }

    config.modResults.contents = contents;
    return config;
  });

  return config;
};