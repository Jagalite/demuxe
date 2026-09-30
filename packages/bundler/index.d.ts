// SPDX-License-Identifier: Apache-2.0
export interface BundleConfig {
  /** Installed, matching modular demuxe core directory. */
  core: string;
  /** Installed provider directories; all selects providers in providerDirectory. */
  providers?: string[] | 'all';
  providerDirectory?: string;
  delivery?: 'assets' | 'embedded';
  /** A fresh output directory. Existing output is never overwritten. */
  output: string;
}
export interface BundleManifest {
  schema: 1;
  delivery: 'assets' | 'embedded';
  version: string;
  providers: {name:string;version:string;implementationIdentity:string}[];
  inputs: Record<string,{bytes:number;sha256:string}>;
  outputs: Record<string,{bytes:number;sha256:string}>;
}
export function buildDemuxe(config: BundleConfig): Promise<BundleManifest>;
export function collectPackages(config: Omit<BundleConfig,'output'|'delivery'>): Promise<{
  files: Map<string,Uint8Array>;
  records: BundleManifest['providers'];
  version: string;
  entry: string;
  playerEntry: string;
}>;
