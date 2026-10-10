#!/usr/bin/env python3
"""GET external anchors, prompt references and metadata from every production route.
Run browser-check.mjs first. Uses curl for a hard total timeout per request.
"""
import concurrent.futures
import datetime
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / 'artifacts/browser'
pages = json.loads((OUTPUT / 'external-links.json').read_text())
links = {}
for page in pages:
    for anchor in page['links']:
        item = links.setdefault(anchor['href'], {'url': anchor['href'], 'labels': [], 'routes': []})
        for key, value in [('labels', anchor['label']), ('routes', page['route'])]:
            if value not in item[key]:
                item[key].append(value)

def request(item):
    attempts = []
    for user_agent in ['Mozilla/5.0', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36']:
        try:
            response = subprocess.run([
                'curl', '--silent', '--show-error', '--location', '--max-redirs', '8',
                '--connect-timeout', '10', '--max-time', '20',
                '--user-agent', user_agent, '--header',
                'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                '--output', '/dev/null', '--write-out', '%{json}', item['url'],
            ], capture_output=True, text=True, timeout=23)
            result = json.loads(response.stdout)
            attempts.append({
                'status': result['http_code'] or None,
                'finalUrl': result['url_effective'],
                'bytesRead': result['size_download'],
                'exitCode': response.returncode,
                **({'error': response.stderr.strip()} if response.returncode else {}),
            })
        except Exception as error:
            attempts.append({'status': None, 'error': str(error)})
        if attempts[-1]['status'] == 200 and not attempts[-1].get('error'):
            break
    item = {**item, 'attempts': attempts, 'status': attempts[-1]['status']}
    print(item['status'], item['url'], flush=True)
    return item

with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    results = list(pool.map(request, sorted(links.values(), key=lambda link: link['url'])))
report = {'checkedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'method': 'curl GET, following redirects, 20-second total timeout; retry non-200/error once with desktop browser headers', 'uniqueLinks': len(results), 'all200': all(r['status'] == 200 and not r['attempts'][-1].get('error') for r in results), 'results': results}
(OUTPUT / 'link-report.json').write_text(json.dumps(report, indent=2) + '\n')
print(f"{sum(r['status'] == 200 for r in results)}/{len(results)} HTTP 200")
raise SystemExit(0 if report['all200'] else 1)
