import hashlib
import importlib.util
import plistlib
from pathlib import Path
import tempfile
import unittest
import zipfile


class SourceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.ipa = Path(self.temp.name) / 'HyGrow-v1.0.0.ipa'
        self.info = {
            'CFBundleIdentifier': 'com.farmhelp.app',
            'CFBundleShortVersionString': '1.0.0',
            'CFBundleVersion': '7',
            'CFBundleSupportedPlatforms': ['iPhoneOS'],
            'MinimumOSVersion': '16.4',
        }

    def source(self):
        with zipfile.ZipFile(self.ipa, 'w') as archive:
            archive.writestr('Payload/HyGrow.app/Info.plist', plistlib.dumps(self.info))
        spec = importlib.util.spec_from_file_location('ios_source', Path(__file__).with_name('ios_source.py'))
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module.create_source(self.ipa, 'Keys-3/HyGrow_Software', 'v1.0.0', 'abc123')

    def test_feed_uses_actual_ipa_metadata_and_download(self):
        source = self.source()
        app = source['apps'][0]
        version = app['versions'][0]
        self.assertEqual(app['bundleIdentifier'], self.info['CFBundleIdentifier'])
        self.assertEqual(version['version'], '1.0.0')
        self.assertEqual(version['buildVersion'], '7')
        self.assertEqual(version['minOSVersion'], '16.4')
        self.assertEqual(version['size'], self.ipa.stat().st_size)
        self.assertEqual(version['sha256'], hashlib.sha256(self.ipa.read_bytes()).hexdigest())
        self.assertEqual(version['downloadURL'], 'https://github.com/Keys-3/HyGrow_Software/releases/download/v1.0.0/HyGrow-v1.0.0.ipa')
        self.assertEqual(source['sourceURL'], 'https://github.com/Keys-3/HyGrow_Software/releases/latest/download/apps.json')

    def test_simulator_build_is_rejected(self):
        self.info['CFBundleSupportedPlatforms'] = ['iPhoneSimulator']
        with self.assertRaisesRegex(ValueError, 'iPhoneOS'):
            self.source()

    def test_wrong_app_is_rejected(self):
        self.info['CFBundleIdentifier'] = 'com.example.other'
        with self.assertRaisesRegex(ValueError, 'bundle identifier'):
            self.source()

    def test_missing_version_is_rejected(self):
        del self.info['MinimumOSVersion']
        with self.assertRaisesRegex(ValueError, 'metadata'):
            self.source()


if __name__ == '__main__':
    unittest.main()
