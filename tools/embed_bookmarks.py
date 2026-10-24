import re, sys, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
index = root / 'apps-script' / 'Index.html'
parts = {'gr': 'gr-capture.js', 'jde': 'jde-capture.js', 'sap': 'sap-fetch.js'}

html = index.read_text(encoding='utf-8')
for key, name in parts.items():
    code = (root / 'bookmarks' / name).read_text(encoding='utf-8').rstrip('\n')
    pattern = re.compile(r'(<script type="text/plain" id="bm-%s">\n)(.*?)(\n</script>)' % key, re.S)
    if not pattern.search(html):
        sys.exit('Khong tim thay khoi bm-%s trong Index.html' % key)
    html = pattern.sub(lambda m: m.group(1) + code + m.group(3), html, count=1)
index.write_text(html, encoding='utf-8')
print('Da cap nhat 3 bookmark vao Index.html')
