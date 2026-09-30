// SPDX-License-Identifier: Apache-2.0
/** Keep owner controls and the controller itself out of the runtime facade. */
export function createPlayerPreview(controller) {
    return Object.freeze({
        getFrame: controller.getFrame.bind(controller),
        request: controller.request.bind(controller),
        prefetch: controller.prefetch.bind(controller),
        addProvider: controller.addProvider.bind(controller),
        setProviders: controller.setProviders.bind(controller),
        clear: controller.clear.bind(controller),
        get enabled() { return controller.enabled; },
        set enabled(value) { controller.enabled = value; },
        get diagnostics() {
            const snapshot = controller.diagnostics;
            if (snapshot.lastFailure)
                Object.freeze(snapshot.lastFailure);
            return Object.freeze(snapshot);
        },
    });
}
