"""Reserve a unique release tag and apply its version to both mobile builds."""

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / 'FrontEnd/app.json'


def next_release(config: dict, tags: dict) -> tuple[str, int]:
    expo = config['expo']
    versions = [tuple(map(int, expo['version'].split('.')))]
    builds = [int(expo.get('android', {}).get('versionCode', 1)),
              int(expo.get('ios', {}).get('buildNumber', '1'))]
    release_count = 0
    for tag, metadata in tags.items():
        match = re.fullmatch(r'v(\d+)\.(\d+)\.(\d+)', tag)
        if match:
            release_count += 1
            versions.append(tuple(map(int, match.groups())))
            if isinstance(metadata, dict) and isinstance(metadata.get('build_number'), int):
                builds.append(metadata['build_number'])
    major, minor, patch = max(versions)
    return f'{major}.{minor}.{patch + 1}', max(*builds, release_count + 1) + 1


def apply_version(path: Path, version: str, build_number: int) -> None:
    config = json.loads(path.read_text(encoding='utf-8'))
    config['expo']['version'] = version
    config['expo'].setdefault('android', {})['versionCode'] = build_number
    config['expo'].setdefault('ios', {})['buildNumber'] = str(build_number)
    path.write_text(json.dumps(config, indent=2) + '\n', encoding='utf-8')


def reserve_release() -> dict:
    def git(*args):
        return subprocess.check_output(['git', *args], cwd=ROOT, text=True).strip()

    git('fetch', 'origin', '--tags')
    tags = {}
    for line in git('for-each-ref', '--format=%(refname:strip=2)%00%(contents:subject)', 'refs/tags').splitlines():
        tag, _, subject = line.partition('\0')
        try:
            tags[tag] = json.loads(subject)
        except (ValueError, TypeError):
            tags[tag] = {}
    config = json.loads(APP.read_text(encoding='utf-8'))
    version, build = next_release(config, tags)
    tag = f'v{version}'
    metadata = {'version': version, 'build_number': build, 'run_id': os.environ['GITHUB_RUN_ID']}
    git('tag', '-a', tag, os.environ['GITHUB_SHA'], '-m', json.dumps(metadata))
    # Reserving before compilation prevents failed runs or reruns reusing a version.
    git('push', 'origin', f'refs/tags/{tag}')
    return {
        'tag': tag, 'version': version, 'build_number': str(build),
        # Use the original configuration so changing the release number keeps caches useful.
        'config_hash': hashlib.sha256(json.dumps(config, sort_keys=True).encode()).hexdigest(),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    commands.add_parser('prepare')
    apply = commands.add_parser('apply')
    apply.add_argument('--version', required=True)
    apply.add_argument('--build-number', required=True, type=int)
    args = parser.parse_args()
    if args.command == 'apply':
        apply_version(APP, args.version, args.build_number)
    else:
        outputs = reserve_release()
        with open(os.environ['GITHUB_OUTPUT'], 'a', encoding='utf-8') as stream:
            for key, value in outputs.items():
                stream.write(f'{key}={value}\n')
        print(f'Reserved {outputs["tag"]} (build {outputs["build_number"]})')


if __name__ == '__main__':
    main()
