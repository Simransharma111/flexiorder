# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Android APK build

This project is configured for Capacitor with app ID `com.flexiorder.app`, app name `FlexiOrder`, and Vite output directory `dist`.

To generate a debug APK on a machine with Android Studio or the Android SDK installed:

```bash
npm install
npm install @capacitor/android@8.3.4
npx cap add android
npm run android:build:debug
```

After a successful build, the APK will be available at:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

For a release APK, open the generated `android` project in Android Studio or configure signing in Gradle, then run the appropriate release build task.
