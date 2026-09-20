<!-- SPDX-License-Identifier: CC-BY-4.0 -->

The native video loadeddata event did not yield a valid opaque black canvas snapshot. Seek to0.125s inside the first known black picture before observation, matching existing browser first-picture readiness behavior. Subtitle requested boundaries and exact oracle remain unchanged; black video is static throughout. Preserve the failed snapshot variant.
