// app.config.js
const config = {
  name: "Parliament",
  slug: "parliament",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./src/assets/images/pp.png",
  userInterfaceStyle: "light",
  assetBundlePatterns: ["**/*"],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.parliament.app"
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff"
    },
    package: "com.parliament.app"
  },
  web: {
    favicon: "./assets/favicon.png"
  },
  plugins: [
    "expo-router",
    [
      "expo-build-properties",
      {
        ios: {
          useFrameworks: "static"
        },
        android: {
          compileSdkVersion: 33,
          targetSdkVersion: 33,
          buildToolsVersion: "33.0.0"
        }
      }
    ]
  ],
  extra: {
    eas: {
      projectId: "your-project-id"
    },
    router: {
      origin: false
    }
  }
};

module.exports = config; 