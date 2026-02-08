// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.resolver.mainFields = ['react-native', 'browser', 'main'];

config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName === 'axios') {
        // Force resolve to the browser build (CommonJS) which doesn't use Node modules like crypto
        return context.resolveRequest(context, 'axios/dist/browser/axios.cjs', platform);
    }
    return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
