from pathlib import Path
import re, json
text = Path('enhanced-reference/jawwalpay-dashboard-redesign.html').read_text(encoding='utf-8')
match = re.search(r'<div class="svc-grid">(.*?)</div>\s*</div>\s*</div>', text, re.S)
if not match:
    raise SystemExit('services grid not found')
chunk = match.group(1)
blocks = re.findall(r'<div class="svc-tile">(.*?)</div>\s*</div>', chunk, re.S)
out = []
for block in blocks:
    label = re.search(r'<span>(.*?)</span>', block)
    img = re.search(r'<img[^>]*src="([^"]+)"', block)
    out.append({'label': label.group(1) if label else '', 'img': img.group(1) if img else ''})
print(json.dumps(out, ensure_ascii=False))
