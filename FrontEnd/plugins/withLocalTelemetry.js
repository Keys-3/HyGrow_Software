// Opt in only the configured host to public read-only local HTTP.
const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');
module.exports = (config) => {
  const endpoint = process.env.EXPO_PUBLIC_LOCAL_STATUS_URL;
  if (!endpoint) return config;
  const url = new URL(endpoint);
  if (url.protocol !== 'http:' || !/^[a-zA-Z0-9.-]+$/.test(url.hostname)) throw new Error('Invalid local telemetry URL');
  config = withAndroidManifest(config, (config) => {
    config.modResults.manifest.application[0].$['android:networkSecurityConfig'] = '@xml/hygrow_network_security';
    return config;
  });
  return withDangerousMod(config, ['android', async (config) => {
    const target = path.join(config.modRequest.platformProjectRoot, 'app/src/main/res/xml');
    fs.mkdirSync(target, { recursive: true });
    fs.writeFileSync(path.join(target, 'hygrow_network_security.xml'), `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="false" />
  <domain-config cleartextTrafficPermitted="true"><domain includeSubdomains="false">${url.hostname}</domain></domain-config>
</network-security-config>
`);
    return config;
  }]);
};
