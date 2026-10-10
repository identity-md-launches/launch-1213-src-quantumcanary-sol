#!/usr/bin/env python3
"""GET every distinct external anchor collected on the production routes.
Run browser-check.mjs first. Output reports belong in artifacts/, outside delivery.
"""
import concurrent.futures
import datetime
import json
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

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
            req = Request(item['url'], headers={'User-Agent': user_agent, 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'})
            with urlopen(req, timeout=25) as response:
                attempts.append({'status': response.status, 'finalUrl': response.geturl(), 'bytesRead': len(response.read())})
        except HTTPError as error:
            attempts.append({'status': error.code, 'finalUrl': error.geturl(), 'reason': error.reason})
        except Exception as error:
            attempts.append({'status': None, 'error': str(error)})
        if attempts[-1]['status'] == 200:
            break
    return {**item, 'attempts': attempts, 'status': attempts[-1]['status']}

with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    results = list(pool.map(request, sorted(links.values(), key=lambda link: link['url'])))
report = {'checkedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'method': 'GET, following redirects; retry non-200 once with desktop browser headers', 'uniqueLinks': len(results), 'all200': all(r['status'] == 200 for r in results), 'results': results}
(OUTPUT / 'link-report.json').write_text(json.dumps(report, indent=2) + '\n')
for result in results:
    print(result['status'], result['url'])
print(f"{sum(r['status'] == 200 for r in results)}/{len(results)} HTTP 200")
raise SystemExit(0 if report['all200'] else 1)
