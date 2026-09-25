#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Exercise the generated-build release gate with adversarial build receipts."""
import hashlib
import importlib.util
import json
import pathlib
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('lgpl_closure', ROOT / 'scripts/verify-lgpl-closure.py')
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)


class ClosureGate(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = pathlib.Path(temporary.name)
        self.write('build/obj-mpv/meson-info/intro-buildoptions.json', json.dumps([
            {'name': key, 'value': value} for key, value in
            {'gpl': False, 'libmpv': True, 'cplayer': False, 'gl': 'disabled', 'lua': 'disabled'}.items()]))
        self.write('build/obj-mpv/compile_commands.json', json.dumps([
            {'file': str(self.root / 'build/sources/mpv/audio/out/ao.c')}]))
        self.write('build/sources/mpv/Copyright',
                   'The following files are still GPL only (-Dgpl=false disables them):\n\n'
                   '    audio/out/ao_jack.c  GPL\n    stream/dvb*  GPL\n\n')
        self.write('build/sources/ffmpeg/configure', '''EXTERNAL_LIBRARY_GPL_LIST="
    libx264
"
EXTERNAL_LIBRARY_NONFREE_LIST="
    libfdk_aac
"
EXTERNAL_LIBRARY_GPLV3_LIST="
    libsmbclient
"
pp_filter_deps="gpl postproc"
''')
        config = ('#define FFMPEG_LICENSE "LGPL version 2.1 or later"\n' +
                  ''.join(f'#define CONFIG_{name} 0\n' for name in
                          ['GPL', 'GPLV3', 'NONFREE', 'VERSION3', 'POSTPROC',
                           'LIBX264', 'LIBFDK_AAC', 'LIBSMBCLIENT']))
        full = ('\n'.join(f'#define CONFIG_{name}_{kind} 1' for kind, names in
                          [('DECODER', gate.REQUIRED_DECODERS),
                           ('DEMUXER', gate.REQUIRED_DEMUXERS),
                           ('FILTER', gate.REQUIRED_FILTERS)] for name in names) + '\n')
        for folder in ('build/obj-ffmpeg', 'build/obj-software-full-ffmpeg', 'build/native-remux/ffmpeg'):
            self.write(folder + '/config.h', config)
            self.write(folder + '/config_components.h', full)
        self.write('build/obj-software-full-ffmpeg/configure-request', '--disable-postproc --disable-asm\n')
        for name in ('baseline', 'software', 'software-yuv', 'hybrid', 'selective', 'remux', 'subtitles'):
            self.write(f'build/link-maps/{name}.map', 'libmpv.a(ao.o)\n')
        self.write('build/subtitle-service/manifest.json', json.dumps({
            'mpvBuildRoot': str(self.root),
            'subtitleFFmpegConfigurationSHA256': hashlib.sha256(full.encode()).hexdigest()}))
        for folder, stem in [('engine', 'player'), ('engine-software-full', 'player'), ('engine-software-yuv', 'player'),
                             ('engine-hybrid', 'player'), ('engine-selective', 'player'), ('engine-remux', 'remux'),
                             ('engine-subtitles', 'service')]:
            self.write(f'web/{folder}/{stem}.mjs', '// SPDX-License-Identifier: LGPL-2.1-or-later\n')

    def write(self, name, value):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(value)

    def replace(self, name, before, after):
        path = self.root / name
        text = path.read_text()
        self.assertIn(before, text)
        path.write_text(text.replace(before, after, 1))

    def test_clean_generated_receipts_pass(self):
        self.assertEqual(gate.verify(self.root)['status'], 'verified')
        self.write('build/link-maps/software.map', 'libavfilter.a(vf_removegrain.o)\n')
        self.assertEqual(gate.verify(self.root)['status'], 'verified')
        self.write('build/link-maps/software.map', 'libavfilter.a(x86/vf_removegrain.o)\n')
        with self.assertRaisesRegex(ValueError, 'GPL-only input in linker map'):
            gate.verify(self.root)

    def test_rejects_gpl_mpv_and_forbidden_compiled_source(self):
        path = 'build/obj-mpv/meson-info/intro-buildoptions.json'
        self.replace(path, '"gpl", "value": false', '"gpl", "value": true')
        with self.assertRaisesRegex(ValueError, 'mpv gpl'):
            gate.verify(self.root)
        self.replace(path, '"gpl", "value": true', '"gpl", "value": false')
        self.write('build/obj-mpv/compile_commands.json', json.dumps([
            {'file': str(self.root / 'build/sources/mpv/video/out/vo_x11.c')}]))
        with self.assertRaisesRegex(ValueError, 'GPL-only mpv source'):
            gate.verify(self.root)

    def test_rejects_gpl_nonfree_and_postproc(self):
        path = 'build/obj-software-full-ffmpeg/config.h'
        for flag in ('GPL', 'NONFREE', 'POSTPROC'):
            with self.subTest(flag=flag):
                self.replace(path, f'#define CONFIG_{flag} 0', f'#define CONFIG_{flag} 1')
                with self.assertRaisesRegex(ValueError, f'CONFIG_{flag}'):
                    gate.verify(self.root)
                self.replace(path, f'#define CONFIG_{flag} 1', f'#define CONFIG_{flag} 0')
        self.write('build/link-maps/hybrid.map', 'libpostproc.a(pp.o)\n')
        with self.assertRaisesRegex(ValueError, 'GPL-only input in linker map'):
            gate.verify(self.root)
        self.write('build/link-maps/hybrid.map', 'libmpv.a(ao.o)\n')
        self.write('web/engine-hybrid/player.mjs', '// SPDX-License-Identifier: GPL-3.0-or-later\n')
        with self.assertRaisesRegex(ValueError, 'missing/conflicting LGPL header'):
            gate.verify(self.root)

    def test_rejects_external_gpl_and_missing_required_components(self):
        self.replace('build/obj-software-full-ffmpeg/config.h',
                     '#define CONFIG_LIBX264 0', '#define CONFIG_LIBX264 1')
        with self.assertRaisesRegex(ValueError, 'external dependency enabled'):
            gate.verify(self.root)
        self.replace('build/obj-software-full-ffmpeg/config.h',
                     '#define CONFIG_LIBX264 1', '#define CONFIG_LIBX264 0')
        self.replace('build/obj-software-full-ffmpeg/config_components.h',
                     '#define CONFIG_ZSCALE_FILTER 1', '#define CONFIG_ZSCALE_FILTER 0')
        with self.assertRaisesRegex(ValueError, 'required filter removed'):
            gate.verify(self.root)
        self.replace('build/obj-software-full-ffmpeg/config_components.h',
                     '#define CONFIG_ZSCALE_FILTER 0', '#define CONFIG_ZSCALE_FILTER 1')
        self.write('build/link-maps/software.map', 'libx264.a(x264.o)\n')
        with self.assertRaisesRegex(ValueError, 'GPL/nonfree external library in linker map'):
            gate.verify(self.root)
        self.write('build/link-maps/software.map', 'libmpv.a(ao.o)\n')
        path = 'build/obj-software-full-ffmpeg/config_components.h'
        self.write(path, (self.root / path).read_text() + '#define CONFIG_PP_FILTER 1\n')
        with self.assertRaisesRegex(ValueError, 'GPL-only FFmpeg filter enabled'):
            gate.verify(self.root)


if __name__ == '__main__':
    unittest.main()
