# SPDX-License-Identifier: MIT
"""Fail-closed result validation; success booleans alone are not evidence."""
BACKENDS=('jspi','asyncify')
SUITES=('units','range')
def validate_result(backend,suite,negative,name,result):
    errors=[]
    def check(value,message):
        if not value:errors.append(message)
    if not isinstance(result,dict):return False,['missing result object']
    check(backend in BACKENDS and suite in SUITES,'unknown backend/suite')
    check(result.get('name')==name,'wrong case identity')
    check(result.get('testBackend')==backend,'wrong requested backend')
    check(result.get('crossOriginIsolated') is False,'wrong isolation')
    check(result.get('sharedArrayBufferAvailable') is False,'SAB exposed or unreported')
    check(result.get('memoryType')=='ArrayBuffer','private memory unproved')
    check(result.get('nestedWorkersCreated')==0,'nested workers unproved')
    if backend=='asyncify':
        check(result.get('jspiSuspendingAvailable') is False,'Suspending not disabled')
        check(result.get('jspiPromisingAvailable') is False,'promising not disabled')
    stats=result.get('stats' if suite=='units' else 'scheduler')
    if not isinstance(stats,dict):
        errors.append('missing scheduler evidence')
        stats={}
    check(stats.get('continuations',{}).get('kind')==backend,'wrong executed continuation backend')
    if negative:
        reason='C assertion' if suite=='units' else 'ready read not revoked'
        check(result.get('ok') is False and reason in result.get('error',''),'wrong negative failure')
    else:
        check(result.get('ok') is True,'positive case failed')
        for key in ('liveTasks','retainedTasks','waitKeys','timers'):
            check(stats.get(key)==0,'unproved cleanup: '+key)
        check(stats.get('freeSlots')==24,'unproved stack reclamation')
        check(stats.get('abandoned')==0,'positive case abandoned execution')
        check(stats.get('created')==stats.get('completed') and isinstance(stats.get('created'),int),'C completion unproved')
        if suite=='range':
            source=result.get('source',{})
            for key in ('handles','pending','timers'):
                check(source.get(key)==0,'unproved source cleanup: '+key)
            check(result.get('cLiveCookies')==0,'C cookie cleanup unproved')
    return not errors,errors
