import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch


class ReleaseVersionTests(unittest.TestCase):
    def setUp(self):
        spec = importlib.util.spec_from_file_location('release_version', Path(__file__).with_name('release_version.py'))
        self.module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.module)
        self.config = {'expo': {'version': '1.0.0', 'android': {'package': 'com.prithvi.hygrow'}, 'ios': {'bundleIdentifier': 'com.farmhelp.app'}}}

    def test_each_reserved_tag_gets_next_patch_and_build(self):
        first = self.module.next_release(self.config, {})
        self.assertEqual(first, ('1.0.1', 2))
        # A failed build still reserved its tag, so its version is never reused.
        second = self.module.next_release(self.config, {'v1.0.1': {'build_number': 2}})
        self.assertEqual(second, ('1.0.2', 3))

    def test_semantic_order_and_unrelated_tags(self):
        version, build = self.module.next_release(self.config, {
            'v1.0.9': {'build_number': 20}, 'v1.0.10': {'build_number': 21},
            'ios-source': {}, 'v1.0.2': {},
        })
        self.assertEqual((version, build), ('1.0.11', 22))

    def test_manual_source_version_and_existing_build_are_respected(self):
        self.config['expo']['version'] = '2.0.0'
        self.config['expo']['android']['versionCode'] = 70
        self.config['expo']['ios']['buildNumber'] = '80'
        self.assertEqual(self.module.next_release(self.config, {'v1.9.9': {}}), ('2.0.1', 81))

    def test_apply_updates_both_platforms_and_preserves_identity(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / 'app.json'
            path.write_text(json.dumps(self.config), encoding='utf-8')
            self.module.apply_version(path, '1.0.2', 3)
            expo = json.loads(path.read_text(encoding='utf-8'))['expo']
        self.assertEqual(expo['version'], '1.0.2')
        self.assertEqual(expo['ios']['buildNumber'], '3')
        self.assertEqual(expo['android']['versionCode'], 3)
        self.assertEqual(expo['ios']['bundleIdentifier'], 'com.farmhelp.app')
        self.assertEqual(expo['android']['package'], 'com.prithvi.hygrow')

    def test_reservation_pushes_unique_annotated_tags_on_same_commit(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            origin, checkout = root / 'origin.git', root / 'checkout'
            def git(*args, cwd=root):
                return subprocess.check_output(['git', *args], cwd=cwd, text=True, stderr=subprocess.DEVNULL).strip()
            git('init', '--bare', str(origin))
            git('init', str(checkout))
            git('config', 'user.name', 'Release test', cwd=checkout)
            git('config', 'user.email', 'test@example.invalid', cwd=checkout)
            app = checkout / 'FrontEnd/app.json'
            app.parent.mkdir()
            app.write_text(json.dumps(self.config), encoding='utf-8')
            git('add', '.', cwd=checkout)
            git('commit', '-m', 'Fixture', cwd=checkout)
            git('remote', 'add', 'origin', str(origin), cwd=checkout)
            sha = git('rev-parse', 'HEAD', cwd=checkout)
            with patch.object(self.module, 'ROOT', checkout), patch.object(self.module, 'APP', app), patch.dict(os.environ, {'GITHUB_SHA': sha, 'GITHUB_RUN_ID': 'test'}):
                first = self.module.reserve_release()
                second = self.module.reserve_release()
            self.assertEqual(first['tag'], 'v1.0.1')
            self.assertEqual(second['tag'], 'v1.0.2')
            self.assertGreater(int(second['build_number']), int(first['build_number']))
            self.assertEqual(first['config_hash'], second['config_hash'])
            remote_tags = git('ls-remote', '--tags', str(origin))
            self.assertIn('refs/tags/v1.0.1^{}', remote_tags)
            self.assertIn('refs/tags/v1.0.2^{}', remote_tags)


if __name__ == '__main__':
    unittest.main()
