import zipfile, re, sys
from xml.etree import ElementTree as ET

NS = {'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}

def read_xlsx(path, max_rows=None):
    z = zipfile.ZipFile(path)
    # shared strings
    sst = []
    if 'xl/sharedStrings.xml' in z.namelist():
        root = ET.fromstring(z.read('xl/sharedStrings.xml'))
        for si in root.findall('m:si', NS):
            sst.append(''.join(t.text or '' for t in si.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')))
    # workbook sheets
    wb = ET.fromstring(z.read('xl/workbook.xml'))
    rels = ET.fromstring(z.read('xl/_rels/xl/workbook.xml.rels'.replace('xl/_rels/xl/','xl/_rels/')))
    relmap = {r.get('Id'): r.get('Target') for r in rels}
    sheets = []
    for s in wb.find('m:sheets', NS):
        rid = s.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
        target = relmap[rid]
        if not target.startswith('xl/'): target = 'xl/' + target
        sheets.append((s.get('name'), target))
    out = {}
    for name, target in sheets:
        root = ET.fromstring(z.read(target))
        rows = []
        for row in root.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row'):
            cells = {}
            for c in row.findall('m:c', NS):
                ref = c.get('r'); col = re.match(r'[A-Z]+', ref).group()
                t = c.get('t'); v = c.find('m:v', NS)
                if t == 's' and v is not None: val = sst[int(v.text)]
                elif t == 'inlineStr':
                    val = ''.join(x.text or '' for x in c.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t'))
                else: val = v.text if v is not None else ''
                cells[col] = val
            rows.append(cells)
            if max_rows and len(rows) >= max_rows: break
        out[name] = rows
    return out

def colnum(col):
    n = 0
    for ch in col: n = n*26 + ord(ch)-64
    return n

if __name__ == '__main__':
    path = sys.argv[1]
    data = read_xlsx(path, max_rows=int(sys.argv[2]) if len(sys.argv)>2 else None)
    for name, rows in data.items():
        print('='*70)
        print('SHEET:', name, ' total rows read:', len(rows))
        for r in rows[:6]:
            items = sorted(r.items(), key=lambda kv: colnum(kv[0]))
            print(' | '.join(f'{k}:{str(v)[:30]}' for k,v in items))
