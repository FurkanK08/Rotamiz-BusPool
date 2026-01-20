const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Fix for "runtime not ready" and StyleSheet errors
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
