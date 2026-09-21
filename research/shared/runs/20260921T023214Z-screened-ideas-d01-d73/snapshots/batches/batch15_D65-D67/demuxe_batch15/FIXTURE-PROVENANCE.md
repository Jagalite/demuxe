# Fixture provenance and licenses

All media in fixtures/ is procedurally authored in the included Python scripts. Audio consists of deterministic integer sequences; video consists of generated RGB patterns encoded with host FFmpeg; WebP consists of generated RGBA patches encoded by Pillow/libwebp and wrapped by the authored RIFF builder. There is no downloaded or user-private media, no font file, and no copied photograph.

`common.py` and `sha256.js` originate from the earlier MIT-licensed Demuxe research packages supplied in this conversation. That MIT permission notice is retained in LICENSE-CODE.txt. Other source code is MIT-licensed. The reports are CC-BY-4.0 as marked. Procedurally authored fixture content is offered under CC0-1.0. Installed FFmpeg, Chromium, Python, Pillow, and other tool binaries are not redistributed.

This is a statement of this package's authored content and provenance, not legal advice or a determination about codec patent obligations.
