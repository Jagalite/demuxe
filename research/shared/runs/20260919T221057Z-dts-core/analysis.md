<!-- SPDX-License-Identifier: CC-BY-4.0 -->

ActualFFmpeg archive DTS-HD MA5.1 core-plus-extension input yields329DTS corepackets; everycore packet is exact originalprefix,63276extensionbytes discarded (725224to661948). Bothhostdecoded168448frames; nonzero full/corePCM differs max0.00045344, so no losslessfullfidelity claim. Chrome152 rejects actual core.dts and core.mp4 decodeAudioData; DTSCoreMSE typefalse and realaddSourceBuffer raisesNotSupportedError. Samecore decodedtoFLAC positivecontrol succeeds6channels/168448frames/48k, provingvalidfixture. Destination correctness fails as proposalstoprule predicts; no downstreamperformance or video-preservation qualification attempted.

Stop current Chrome native DTS-core profile: extracted core stillunsupported, so addingbitstreamfilter alone cannot admit route. Reopen only for an actual supportedcore destination and explicit extension-loss intent, then test preservedvideo and completecost. Sourcefixture missingblock resolved; nativecapability failure is experimentalnegative, not environment/setupblock. External/derivedmedia NOASSERTION and localresearch-only attribution pinned.

No production integration or release qualification. Original provisional directory renamed after capture; replay into a new output directory. Exact original protocol and all measured samples retained.
