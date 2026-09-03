import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Fitwish — Capacitor configuration for Android packaging.
 *
 * The web build (Next.js) is served through Capacitor's WebView.
 * For a local APK, build the web app and point `webDir` at the build
 * output, or use `server.url` to load a deployed instance while developing.
 *
 *   npm run build          → web production build
 *   npx cap sync android   → copies web assets into android/
 *   npx cap open android   → build APK / AAB from Android Studio
 */
const config: CapacitorConfig = {
  appId: "app.fitwish.gym",
  appName: "Fitwish",
  webDir: "out",
  android: {
    allowMixedContent: true,
    backgroundColor: "#000000",
  },
  server: {
    androidScheme: "https",
    // Point this at your deployed Fitwish URL during development:
    // url: "https://your-fitwish-deployment.example.com",
    cleartext: false,
  },
};

export default config;
