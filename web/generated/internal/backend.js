// SPDX-License-Identifier: Apache-2.0
export function backendPlan(backend) {
    return backend?.planId ?? backend?.diagnostics?.plan;
}
