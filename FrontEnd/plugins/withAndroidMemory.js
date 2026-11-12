const { withGradleProperties } = require('expo/config-plugins');

module.exports = function withAndroidMemory(config) {
  return withGradleProperties(config, (config) => {
    let found = false;
    config.modResults = config.modResults.map((item) => {
      if (item.type === 'property' && item.key === 'org.gradle.jvmargs') {
        found = true;
        return {
          ...item,
          value: '-Xmx4096m -XX:MaxMetaspaceSize=2048m',
        };
      }
      return item;
    });
    if (!found) {
      config.modResults.push({
        type: 'property',
        key: 'org.gradle.jvmargs',
        value: '-Xmx4096m -XX:MaxMetaspaceSize=2048m',
      });
    }
    return config;
  });
};

