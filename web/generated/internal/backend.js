export function backendPlan(backend) {
    return backend?.planId ?? backend?.diagnostics?.plan;
}
