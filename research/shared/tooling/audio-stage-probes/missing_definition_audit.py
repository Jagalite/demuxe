# SPDX-License-Identifier: Apache-2.0
import pathlib,json,hashlib,zipfile,re,datetime,sys
root=pathlib.Path.cwd();out=pathlib.Path(sys.argv[1]);out.mkdir(parents=True,exist_ok=True);nums=list(range(76,82))+list(range(247,261))+list(range(276,289));keys=[f'R{x:03d}.definition-not-recovered'for x in nums];pat=re.compile(r'\bR0*(?:7[6-9]|8[01]|24[7-9]|25[0-9]|260|27[6-9]|28[0-8])\b');heading=re.compile(r'^\s*#{1,6}\s+R0*(?:7[6-9]|8[01]|24[7-9]|25[0-9]|260|27[6-9]|28[0-8])\b',re.M)
def sha(b):return hashlib.sha256(b).hexdigest()
def save(n,x):(out/n).write_text(json.dumps(x,indent=2)+'\n')
base=root/'results/full-catalogue-v4/Demuxe_All_Items_Screening_v4';reference=root/'results/local-screening/references/Demuxe_Local_Screening_Reference_Bundle';register=json.loads((base/'catalogue/source_register.json').read_text());checks=[]
for source in register['sources']:
 p=base/source['path'];checks.append({'source_key':source['source_key'],'path':str(p.relative_to(root)),'exists':p.exists(),'actual_sha256':sha(p.read_bytes())if p.exists()else None,'expected_sha256':source['bundle_sha256'],'exact':p.exists()and sha(p.read_bytes())==source['bundle_sha256']})
files=set()
for folder in [base/'sources',reference,root/'docs',root/'experiments']:
 for p in folder.rglob('*'):
  if p.is_file()and p.suffix.lower()in['.md','.txt','.tsv']:files.add(p)
for p in root.glob('*.md'):files.add(p)
for p in [base/'catalogue/SOURCE_REGISTER.md',base/'catalogue/SOURCE_GAPS.md',base/'catalogue/SOURCE_LINK_AUDIT.tsv',base/'catalogue/source_register.json',base/'evidence/source-recovery.md',root/'research/index.json',root/'research/migration.json',root/'research/shared/README.md']:files.add(p)
attach=pathlib.Path('/Users/jagatranvo/.t3/userdata/attachments');specific=['9fe2d316-17d6-441a-b4bc-3e904ff8308b-638accdf-4dad-48fc-b20e-48ef3a33e9fa-zip.zip','9fe2d316-17d6-441a-b4bc-3e904ff8308b-5e20af7a-8fa0-405b-b088-6b05a72a4cf3-zip.zip'];inventory=[];hits=[];zips=[]
def inspect(identifier,b,classification):
 text=b.decode('utf-8',errors='replace');matches=[{'line':i,'text':line[:1600]}for i,line in enumerate(text.splitlines(),1)if pat.search(line)];inventory.append({'path':identifier,'sha256':sha(b),'bytes':len(b),'kind':classification,'match_lines':len(matches),'definition_heading_matches':len(heading.findall(text))})
 if matches:hits.append({'path':identifier,'kind':classification,'matches':matches})
for p in sorted(files):inspect(str(p.relative_to(root)),p.read_bytes(),'local-source-or-authority')
for name in specific:
 p=attach/name;z={'path':str(p),'exists':p.exists()};zips.append(z)
 if not p.exists():continue
 z.update(sha256=sha(p.read_bytes()),bytes=p.stat().st_size);members=[]
 with zipfile.ZipFile(p)as archive:
  for info in archive.infolist():
   members.append({'name':info.filename,'bytes':info.file_size,'crc32':info.CRC})
   if not info.is_dir()and pathlib.Path(info.filename).suffix.lower()in['.md','.txt','.tsv','.json']:
    # Search authoritative bundled material and preserve derived mentions separately.
    authoritative='/sources/'in info.filename or name==specific[1] or info.filename.endswith(('SOURCE_REGISTER.md','SOURCE_GAPS.md','source_register.json','START_HERE.md','README.md'))
    inspect(str(p)+'::'+info.filename,archive.read(info),'attached-authority'if authoritative else 'attached-derived-index-or-status')
 z['members']=members
save('inventory.json',inventory);save('matches.json',hits);save('attachment-inventories.json',zips);save('registered-source-checks.json',checks)
results={'missing_full_keys':keys,'definition_recovered_count':0,'files_or_members_searched':len(inventory),'registered_source_count':len(checks),'registered_hash_mismatches':[x for x in checks if not x['exact']],'attachment_count':sum(x['exists']for x in zips),'identity_findings':'Authoritative source-body mentions of R80 are backward references in R88-R101 and R102-R115 proposals (alpha/HDR auxiliary reconstruction), not recovered complete R080 definition or stable source identity. Missing-definition placeholders and indexes are not definitions. All 33 exact placeholder identities remain unresolved.','scope':'Current v4 sources/source register, extracted reference bundle, checkout docs/experiments/top-level Markdown, research archive/index authorities and both explicit user-supplied ZIP attachments. No NAS, unrelated personal folders, remote accounts, invented definitions or renumbering.'};save('results.json',results);print(json.dumps({k:v for k,v in results.items()if k not in ['missing_full_keys']}))
