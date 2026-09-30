# SPDX-License-Identifier: Apache-2.0
import ctypes,json,sys,time
names='ri_user_time ri_system_time ri_pkg_idle_wkups ri_interrupt_wkups ri_pageins ri_wired_size ri_resident_size ri_phys_footprint ri_proc_start_abstime ri_proc_exit_abstime ri_child_user_time ri_child_system_time ri_child_pkg_idle_wkups ri_child_interrupt_wkups ri_child_pageins ri_child_elapsed_abstime ri_diskio_bytesread ri_diskio_byteswritten ri_cpu_time_qos_default ri_cpu_time_qos_maintenance ri_cpu_time_qos_background ri_cpu_time_qos_utility ri_cpu_time_qos_legacy ri_cpu_time_qos_user_initiated ri_cpu_time_qos_user_interactive ri_billed_system_time ri_serviced_system_time ri_logical_writes ri_lifetime_max_phys_footprint ri_instructions ri_cycles ri_billed_energy ri_serviced_energy ri_interval_max_phys_footprint ri_runnable_time'.split()
class R(ctypes.Structure):_fields_=[('uuid',ctypes.c_uint8*16)]+[(n,ctypes.c_uint64) for n in names]
lib=ctypes.CDLL('/usr/lib/libproc.dylib');system=ctypes.CDLL('/usr/lib/libSystem.B.dylib');base=(ctypes.c_uint32*2)();system.mach_timebase_info(ctypes.byref(base))
out={'at':time.monotonic(),'timebase':list(base),'processes':[]}
for arg in sys.argv[1:]:
 r=R();pid=int(arg);rc=lib.proc_pid_rusage(pid,4,ctypes.byref(r));out['processes'].append({'pid':pid,'returnCode':rc,**{n:getattr(r,n) for n in names}})
print(json.dumps(out))
