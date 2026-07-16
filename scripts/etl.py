#!/usr/bin/env python3
"""ETL: data_raw/{exhibitors.xlsx, afterparty.csv, forums.xlsx} -> public/data/*.json"""
import csv, json, re, sys, os
from read_xlsx import read_xlsx

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, 'data_raw')
OUT = os.path.join(ROOT, 'public', 'data')

UNKNOWN = ('未标明', '待人工', '信息未公开披露', '信息待补充', '')

def clean(v):
    v = (v or '').strip()
    return '' if v in UNKNOWN else v

# ---------------- exhibitors ----------------

def parse_hall(booth):
    """H1-A801 -> H1 ; X1A-501-07 -> X1A ; Z1A-318 -> Z1A ; L012 -> L ; ZT-004 -> ZT"""
    b = re.sub(r'^[^0-9A-Za-z]+', '', clean(booth))
    if not b:
        return ''
    m = re.match(r'([A-Z]+\d*[A-Z]*)[-\s]', b)
    if m:
        return m.group(1)
    m = re.match(r'([A-Z]+)\d', b)
    if m:
        return m.group(1)
    return b.split('-')[0][:4]

def split_name(raw):
    """'上海稀宇极智科技有限公司 / MiniMax' -> (cn, en/brand)"""
    raw = clean(raw)
    if ' / ' in raw:
        cn, en = raw.split(' / ', 1)
        return cn.strip(), en.strip()
    return raw, ''

def short_name(cn, en):
    if en:
        return en
    n = re.sub(r'(（.*?）|\(.*?\))', '', cn)
    n = re.sub(r'(有限公司|股份|科技|集团|信息|智能|技术|研发|（上海）|（北京）)$', '', n)
    return n or cn

def etl_exhibitors():
    data = read_xlsx(os.path.join(RAW, 'exhibitors.xlsx'))
    rows = data['全部汇总']
    out = []
    for r in rows:
        seq = r.get('A', '')
        if not re.match(r'^\d+$', str(seq or '')):
            continue
        cn, en = split_name(r.get('B', ''))
        booth = clean(r.get('D', ''))
        out.append({
            'id': f'e{int(seq):03d}',
            'name': cn,
            'brand': en,
            'venue': clean(r.get('C', '')),
            'booth': booth,
            'hall': parse_hall(booth),
            'industry': clean(r.get('E', '')),
            'sub': clean(r.get('F', '')),
            'biz': clean(r.get('G', '')),
            'investors': clean(r.get('H', '')),
            'funding': clean(r.get('I', '')),
            'hq': clean(r.get('J', '')),
        })
    return out

# ---------------- parties ----------------

def norm_date(d):
    """'7月17日' -> '07-17'; '7月16日-7月21日' -> '07-16'"""
    m = re.search(r'(\d{1,2})月(\d{1,2})日', d or '')
    return f'{int(m.group(1)):02d}-{int(m.group(2)):02d}' if m else ''

def parse_guests(raw):
    raw = clean(raw)
    if not raw:
        return []
    guests = []
    for m in re.finditer(r'名字[：:]\s*(.+?)\n背景[：:]\s*(.+?)(?:；|;|\n|$)', raw):
        guests.append({'name': m.group(1).strip(), 'bio': m.group(2).strip()})
    return guests

def etl_parties():
    rows = list(csv.reader(open(os.path.join(RAW, 'afterparty.csv'))))
    out = []
    for i, r in enumerate(rows):
        r = [c.strip() for c in r]
        signup = r[4] if r[4].startswith('http') else ''
        source = next((u for u in re.split(r'\s*\|\s*', r[12]) if u.startswith('http')), '')
        out.append({
            'id': f'p{i+1:03d}',
            'organizer': clean(r[0]),
            'date': norm_date(r[1]),
            'dateRaw': clean(r[1]),
            'time': clean(r[2]),
            'venue': clean(r[3]),
            'title': clean(r[6]),
            'desc': clean(r[7]),
            'audience': clean(r[8]),
            'guests': parse_guests(r[9]),
            'format': clean(r[10]),
            'price': clean(r[5]),
            'signup': signup or source,
            'signupNote': '' if signup else clean(r[4]),
            'address': clean(r[17]) or clean(r[16]),
        })
    # geocache merge
    cache_path = os.path.join(RAW, 'geocache.json')
    cache = json.load(open(cache_path)) if os.path.exists(cache_path) else {}
    missing = 0
    for p in out:
        hit = cache.get(p['address']) or cache.get(p['id'])
        if hit:
            p['lat'], p['lng'] = round(hit['lat'], 5), round(hit['lng'], 5)
            p['approx'] = bool(hit.get('approx'))
        else:
            p['lat'] = p['lng'] = None
            p['approx'] = True
            missing += 1
    if missing:
        print(f'  ! {missing} parties without coordinates (run geocode.py)', file=sys.stderr)
    return out

# ---------------- forums (v2) ----------------

def etl_forums():
    data = read_xlsx(os.path.join(RAW, 'forums.xlsx'))
    rows = data['完整175']
    out = []
    for r in rows:
        seq = r.get('A', '')
        if not re.match(r'^\d+$', str(seq or '')):
            continue
        name = clean(r.get('C', ''))
        cn = name.split('\n')[0].strip()
        en = name.split('\n')[1].strip() if '\n' in name else ''
        time_raw = clean(r.get('E', '')).split('\n')[0]
        time = re.sub(r'^\d{1,2}月\d{1,2}日\s*', '', time_raw)
        loc = clean(r.get('F', '')).split('\n')[0].strip()
        out.append({
            'id': f'f{int(seq):03d}',
            'track': clean(r.get('B', '')),
            'title': cn,
            'titleEn': en,
            'date': norm_date(r.get('D', '')),
            'time': time,
            'room': loc,
            'venue': clean(r.get('G', '')),
        })
    return out

# ---------------- venues ----------------

# WGS84, hand-verified anchor coordinates for the 4 main WAIC venues
VENUES = [
    {'id': 'expo-exhibition', 'name': '世博展览馆', 'nameEn': 'SWEECC',
     'lat': 31.18651, 'lng': 121.48113, 'address': '浦东新区博成路850号'},
    {'id': 'expo-center', 'name': '世博中心', 'nameEn': 'Expo Center',
     'lat': 31.18848, 'lng': 121.47444, 'address': '浦东新区世博大道1500号'},
    {'id': 'west-bund', 'name': '西岸国际会展中心', 'nameEn': 'West Bund ICC',
     'lat': 31.15320, 'lng': 121.45840, 'address': '徐汇区龙腾大道3398号'},
    {'id': 'zhangjiang', 'name': '张江科学会堂', 'nameEn': 'Zhangjiang Science Hall',
     'lat': 31.19170, 'lng': 121.63870, 'address': '浦东新区海科路1393号'},
]

def etl_venues(exhibitors):
    out = []
    for v in VENUES:
        exs = [e for e in exhibitors if e['venue'] == v['name']]
        halls = {}
        for e in exs:
            h = e['hall'] or '?'
            halls.setdefault(h, {'hall': h, 'count': 0, 'industries': {}})
            halls[h]['count'] += 1
            if e['industry']:
                halls[h]['industries'][e['industry']] = halls[h]['industries'].get(e['industry'], 0) + 1
        hall_list = sorted(halls.values(), key=lambda h: (h['hall'] == '?', h['hall']))
        for h in hall_list:
            h['topIndustries'] = sorted(h['industries'].items(), key=lambda kv: -kv[1])[:3]
            del h['industries']
        out.append({**v, 'exhibitorCount': len(exs), 'halls': hall_list})
    return out

# ---------------- main ----------------

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    ex = etl_exhibitors()
    pa = etl_parties()
    fo = etl_forums()
    ve = etl_venues(ex)
    for name, obj in [('exhibitors', ex), ('parties', pa), ('forums', fo), ('venues', ve)]:
        path = os.path.join(OUT, f'{name}.json')
        json.dump(obj, open(path, 'w'), ensure_ascii=False, separators=(',', ':'))
        print(f'{name}: {len(obj)} -> {path} ({os.path.getsize(path)//1024}KB)')
