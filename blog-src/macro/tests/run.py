"""Run portable stdlib/Node tests. Real browser tests are explicitly separate."""
from pathlib import Path
import datetime, hashlib, json, os, subprocess, sys, tempfile
sys.dont_write_bytecode = True
from fixture import fixture
ROOT = Path(__file__).resolve().parents[1]
commands = [[sys.executable,'build.py','--check'],[sys.executable,'tests/content.py']]
commands += [[sys.executable,'tests/introduction.py']]
commands += [[sys.executable,'tests/section0-opening.py']]
commands += [['node',f'tests/section{i}.test.cjs'] for i in range(5)]
commands += [['node','tests/interaction.test.cjs']]
checks, logs = [], []
with tempfile.TemporaryDirectory(prefix='macro-tests-') as temporary:
    fixture_path = Path(temporary)/'dom.json'
    fixture_path.write_text(json.dumps(fixture((ROOT/'index.html').read_text()),ensure_ascii=False))
    env = {**os.environ,'PYTHONDONTWRITEBYTECODE':'1','BLOG_DOM_FIXTURE':str(fixture_path)}
    for command in commands:
        result = subprocess.run(command,cwd=ROOT,env=env,capture_output=True,text=True)
        output = result.stdout+result.stderr
        checks.append({'command':' '.join(command),'exit_code':result.returncode})
        logs.append('$ '+' '.join(command)+'\n'+output)
        print(('PASS' if result.returncode == 0 else 'FAIL')+': '+' '.join(command),flush=True)
        if result.returncode:
            print(output,flush=True)
            break
passed = len(checks)==len(commands) and all(c['exit_code']==0 for c in checks)
report = {
 'generated_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),
 'status':'passed' if passed else 'failed',
 'html_sha256':hashlib.sha256((ROOT/'index.html').read_bytes()).hexdigest(),
 'checks':checks,
 'browser_tests':'not run; prior local acceptance arrangement retained',
 'limits':['Node DOM contract is not a browser','SVG coordinates are checked at narrow widths; actual layout, screenshots, console and file:// acceptance remain pending locally'],
}
(ROOT/'tests/results.json').write_text(json.dumps(report,indent=2)+'\n')
(ROOT/'tests/results.txt').write_text('\n'.join(logs)+'\nActual browser rendering, screenshots, console and file:// tests: NOT RUN.\n')
raise SystemExit(0 if passed else 1)
