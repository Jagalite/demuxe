// SPDX-License-Identifier: Apache-2.0
// A complete release catalogue must include actual successful browser observation.
export function campaignExitCode(summary,{catalogue=false,selection='all'}={}){
  if(summary.kind==='correctness'&&catalogue&&selection==='demuxe'&&
    (!summary.browserIdentity||!summary.cases.some(c=>c.status==='passed'||c.status==='blocked'&&c.screenPassed===true)))return 2;
  return summary.passed?0:1;
}
