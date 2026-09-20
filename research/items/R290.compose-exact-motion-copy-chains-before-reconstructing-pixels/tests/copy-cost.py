# SPDX-License-Identifier: Apache-2.0
import ast,pathlib,sys,json,subprocess,time,statistics,random,hashlib
h=pathlib.Path(__file__).parent;p=pathlib.Path(sys.argv[1]);src=pathlib.Path(sys.argv[2]);p.mkdir(exist_ok=True)
text=(h/'copy-map-alternating.py').read_text();tree=ast.parse(text);nodes=[]
for n in tree.body:
 if isinstance(n,(ast.Import,ast.ImportFrom,ast.FunctionDef,ast.ClassDef)):nodes.append(n)
 elif isinstance(n,ast.Assign) and not any(isinstance(z,ast.Call) for z in ast.walk(n)):nodes.append(n)
g={};exec(compile(ast.Module(nodes,type_ignores=[]),'<pinnedcopyparser>','exec'),g)
# Explicit integer-luma but half-chroma motion: motion vector2 half-luma samples.
fn=next(n for n in ast.parse(text.replace('(1 if half else','(2 if half else')).body if isinstance(n,ast.FunctionDef) and n.name=='picture');gg=dict(g);exec(compile(ast.Module([fn],type_ignores=[]),'<chroma-control>','exec'),gg)
anchor=(src/'anchor.m2v').read_bytes().removesuffix(b'\0\0\1\xb7');data=anchor+b''.join(gg['picture'](i,i==8) for i in range(1,33));(p/'chroma-half.m2v').write_bytes(data);ref=g['decode'](data);got,trace,fallback=g['execute'](data);bad=g['execute'](data,True)[0];assert got==ref[-6144:] and bad!=got and fallback==[8]
(p/'chroma-control.json').write_text(json.dumps({'actualVectorHalfLumaSamples':2,'integerLumaDisplacement':1,'fractionalChromaDisplacement':.5,'fallback':fallback,'wholeFinalYUVExact':True,'roundingChromaWrong':True},indent=2))
contract={'metric':'Complete cold per-source CPUcomponent walltime to one requested finalYUV picture, including fresh FFmpeg anchor decoder startup, bit parsing, map allocation/composition, fallback prefix reconstruction and finalgather versus fresh fullFFmpegdecode and finalselection. Inputbytesalreadyresident both; independent fixturegeneration excluded.','pairs':11,'order':'alternating','gateMedianSaving':.05,'profiles':['integer','fractional','chroma-half'],'scope':'Python component executor; no browser/GPU/native claim; no intermediate pictures requested.'};(p/'contract.json').write_text(json.dumps(contract,indent=2))
rows=[]
for name,file in [('integer',src/'integer.m2v'),('fractional',src/'fractional.m2v'),('chroma-half',p/'chroma-half.m2v')]:
 data=file.read_bytes();want=g['decode'](data)[-6144:]
 for i in range(11):
  row={'profile':name,'pair':i}
  for mode in (['candidate','baseline'] if i%2 else ['baseline','candidate']):
   start=time.perf_counter();out=g['execute'](data)[0] if mode=='candidate' else g['decode'](data)[-6144:];row[mode+'Ms']=(time.perf_counter()-start)*1000;assert out==want
  row['saving']=1-row['candidateMs']/row['baselineMs'];rows.append(row)
rng=random.Random(240);summary={}
for name in ['integer','fractional','chroma-half']:
 vals=[x['saving'] for x in rows if x['profile']==name];boot=sorted(statistics.median(rng.choices(vals,k=len(vals))) for _ in range(5000));summary[name]={'medianSaving':statistics.median(vals),'bootstrap95':[boot[125],boot[4874]],'gate':.05,'passed':statistics.median(vals)>=.05}
(p/'results.json').write_text(json.dumps({'pairs':rows,'summary':summary,'all66TimedOutputsExact':True},indent=2));print(summary)
