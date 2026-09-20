# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,ast,struct,subprocess,json
p=pathlib.Path(sys.argv[1]);tree=ast.parse(pathlib.Path(__file__).with_name('huffman_prepare.py').read_text());exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef)and n.name=='parse'],type_ignores=[]),__file__,'exec'));args=['/opt/homebrew/opt/jpeg-turbo/bin/cjpeg','-quality','83','-restart','4B','-outfile',str(p/'restart.jpg'),str(p/'frame0.pgm')];subprocess.run(args,check=True);coeff=subprocess.check_output([str(p/'oracle'),'c',str(p/'restart.jpg')]);assert coeff==(p/'frame0.coeff').read_bytes()
try:parse((p/'restart.jpg').read_bytes());rejected=False
except ValueError:rejected=True
assert rejected;(p/'restart-control.json').write_text(json.dumps({'actualRestartJPEG':True,'independentCoefficientsExact':True,'profileRejectsRestart':rejected,'command':args},indent=2));print('Actual valid restart JPEG independently exact, explicit profile rejects')
