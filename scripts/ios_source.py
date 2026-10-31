"""Generate the LiveContainer/AltStore source from the completed iPhoneOS IPA."""

import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import plistlib
import re
from urllib.parse import quote
import zipfile


def create_source(ipa: Path, repo: str, tag: str, ref: str) -> dict:
    if not re.fullmatch(r'[\w.-]+/[\w.-]+', repo):
        raise ValueError('Invalid GitHub repository')
    with zipfile.ZipFile(ipa) as archive:
        entries = [name for name in archive.namelist()
                   if re.fullmatch(r'Payload/[^/]+\.app/Info\.plist', name)]
        if len(entries) != 1:
            raise ValueError('Expected exactly one iOS app bundle')
        info = plistlib.loads(archive.read(entries[0]))
    if info.get('CFBundleSupportedPlatforms') != ['iPhoneOS']:
        raise ValueError('Expected an iPhoneOS device build')
    if info.get('CFBundleIdentifier') != 'com.farmhelp.app':
        raise ValueError('Unexpected iOS bundle identifier')
    required = ('CFBundleShortVersionString', 'CFBundleVersion', 'MinimumOSVersion')
    if any(not isinstance(info.get(key), str) or not info[key] for key in required):
        raise ValueError('Missing iOS version or minimum OS metadata')
    digest = hashlib.sha256()
    with ipa.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    source_url = f'https://github.com/{repo}/releases/latest/download/apps.json'
    download_url = f'https://github.com/{repo}/releases/download/{quote(tag, safe="")}/{quote(ipa.name)}'
    icon_url = f'https://raw.githubusercontent.com/{repo}/{quote(ref, safe="")}/FrontEnd/assets/images/hygrow-icon.png'
    version = {
        'version': info['CFBundleShortVersionString'],
        'buildVersion': info['CFBundleVersion'],
        'date': datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z'),
        'downloadURL': download_url,
        'size': ipa.stat().st_size,
        'sha256': digest.hexdigest(),
        'minOSVersion': info['MinimumOSVersion'],
    }
    return {
        'name': 'HyGrow',
        'identifier': 'com.farmhelp.hygrow.source',
        'sourceURL': source_url,
        'website': f'https://github.com/{repo}',
        'iconURL': icon_url,
        'apps': [{
            'name': 'HyGrow',
            'bundleIdentifier': info['CFBundleIdentifier'],
            'developerName': 'HyGrow contributors',
            'localizedDescription': 'HyGrow hydroponics monitoring and farm tools. Unsigned iPhoneOS build for LiveContainer or external signing.',
            'iconURL': icon_url,
            'versions': [version],
            # Legacy fields support source readers predating the versions array.
            'version': version['version'],
            'versionDate': version['date'],
            'downloadURL': download_url,
            'size': version['size'],
            'minOSVersion': version['minOSVersion'],
        }],
        'news': [],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--ipa', required=True, type=Path)
    parser.add_argument('--repo', required=True)
    parser.add_argument('--tag', required=True)
    parser.add_argument('--ref', required=True)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    source = create_source(args.ipa, args.repo, args.tag, args.ref)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(source, indent=2) + '\n', encoding='utf-8')
    print(f'Generated {args.output}: {source["sourceURL"]}')


if __name__ == '__main__':
    main()
