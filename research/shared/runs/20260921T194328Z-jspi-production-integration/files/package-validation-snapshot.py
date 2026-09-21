import importlib.util,shutil,subprocess,pathlib
spec=importlib.util.spec_from_file_location('license_tests','tests/licenses.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
test=module.LicenseBoundaries();test.policy=module.Policy(module.ROOT)
try:
 root=test.fixture()
 for folder in ['web','src','docs','bin','fixtures','scripts','examples','third_party']:
  shutil.copytree(module.ROOT/folder,root/folder,dirs_exist_ok=True,ignore=lambda folder,names:[n for n in names if n=='__pycache__' or (n.startswith('engine-') and (pathlib.Path(folder)/n).is_dir())])
 for folder in ['engine-remux','engine-remux-jspi','engine-hybrid','engine-software-full']:
  shutil.copytree(module.ROOT/'web'/folder,root/'web'/folder,dirs_exist_ok=True)
 for name in ['sources.lock.json','toolchain.lock.json','README.md']:
  shutil.copy2(module.ROOT/name,root/name)
 subprocess.run(['git','-c','user.name=Local packaging validation','-c','user.email=test@example.invalid','commit','--allow-empty','-qm','Local packaging validation snapshot; not a release'],cwd=root,check=True)
 subprocess.run(['python3','scripts/package-beta.py','--output',str(module.ROOT/'build/jspi-review-fixes-20260921T194328Z')],cwd=root,check=True)
finally:test.doCleanups()
