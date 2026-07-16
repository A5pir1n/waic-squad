#!/usr/bin/env python3
"""Geocode party addresses -> data_raw/geocache.json  (WGS84, matches OSM basemap)

Priority: LANDMARKS exact key -> LANDMARKS substring -> Nominatim -> AREAS centroid.
Vague district-level addresses get approx=True (rendered as hollow pins).
"""
import json, os, re, ssl, sys, time, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, 'data_raw')

# Hand-anchored WGS84 coordinates (verified visually on OSM basemap during QA)
LANDMARKS = {
    '世博大道1368号': (31.18720, 121.48530),   # 世博源
    '世博大道1500号': (31.18848, 121.47444),   # 世博中心
    '世博大道1750号': (31.18540, 121.47080),   # 世博天地
    '世博大道1588号': (31.18660, 121.47850),   # 世博滨江酒店
    '世博大道1200号': (31.19050, 121.48950),   # 梅赛德斯奔驰文化中心
    '银飞路166号':   (31.19050, 121.48950),   # 梅奔文化中心 6号口
    '博成路850号':   (31.18651, 121.48113),   # 世博展览馆
    '即墨路3号':     (31.18720, 121.48530),   # 世博源F1
    '海科路张江科学会堂': (31.19170, 121.63870),
    '海科路1393号':  (31.19170, 121.63870),
    '龙腾大道3398号': (31.15320, 121.45840),   # 西岸国际会展中心
    '龙腾大道2380号': (31.16850, 121.45560),   # 油罐艺术中心
    '龙腾大道2555号': (31.16560, 121.45680),   # 西岸模速空间
    '龙腾大道2727号': (31.16200, 121.45700),   # 西岸(穹顶艺术中心一带)
    '龙腾大道西岸':   (31.16500, 121.45650),
    '云锦路701号':   (31.16230, 121.45900),   # 西岸人工智能大厦
    '虹梅路3081号':  (31.16580, 121.39680),   # 漕河泾万丽酒店
    '老沪闵路1226':  (31.14980, 121.42890),   # AGI Bar 华泾
    '雁荡路109号':   (31.21740, 121.46760),   # INS LA FIN 复兴公园
    '太仓路181弄':   (31.22050, 121.47370),   # 新天地
    '龙华东路810号': (31.20630, 121.47870),   # 黄浦绿地缤纷城
    '梧桐路':       (31.23530, 121.49010),   # 黄浦 梧桐路
    '巨鹿路':       (31.22200, 121.45300),
    '政立路489号':   (31.30820, 121.50630),   # 杨浦 创智天地一带
    '四川北路':      (31.25980, 121.48370),   # 虹口 盛邦国际/滨港商业中心一带
    '陆家嘴环路1366号': (31.23640, 121.50350), # 富士康大厦
    '世纪大道800号': (31.23180, 121.51720),
    '东育路500':    (31.19850, 121.50820),   # 前滩太古里
    '前滩':         (31.19700, 121.50500),
    '衡山路复兴中路': (31.21200, 121.45300),
    '北杨人工智能小镇': (31.11720, 121.41500), # 徐汇华泾北杨
    '越界':         (31.11720, 121.41500),   # 越界锦和(北杨)
    '张江人工智能岛': (31.20560, 121.60800),
    '张江镇':       (31.20250, 121.61300),
    '博云路2号':    (31.21150, 121.61280),   # 浦软大厦
    '漕河泾':       (31.16900, 121.40200),
    '花博大道':     (31.60000, 121.51000),   # 崇明(源数据如此,如实标)
}

# District-level fallbacks -> approximate
AREAS = {
    '世博片区': (31.18650, 121.47800),
    '世博大道': (31.18650, 121.47800),
    '上海世博园': (31.18650, 121.47800),
    '前滩国际商务区': (31.19700, 121.50500),
    '陆家嘴': (31.23800, 121.50100),
    '徐汇区': (31.17000, 121.43500),
    '浦东新区': (31.20500, 121.52000),
    '虹口区': (31.26000, 121.48000),
    '黄浦区': (31.22500, 121.48000),
    '静安区': (31.22800, 121.45500),
    '青浦区': (31.15000, 121.12000),
    '陆家嘴': (31.23800, 121.50100),
}

def nominatim(q):
    url = 'https://nominatim.openstreetmap.org/search?' + urllib.parse.urlencode(
        {'q': q, 'format': 'json', 'limit': 1, 'countrycodes': 'cn'})
    req = urllib.request.Request(url, headers={'User-Agent': 'waic-squad-etl/1.0'})
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    with urllib.request.urlopen(req, timeout=15, context=ctx) as r:
        hits = json.load(r)
    return (float(hits[0]['lat']), float(hits[0]['lon'])) if hits else None

def resolve(addr):
    for key, (lat, lng) in LANDMARKS.items():
        if key in addr:
            return {'lat': lat, 'lng': lng, 'approx': False, 'src': f'landmark:{key}'}
    # street-number address worth a nominatim try
    if re.search(r'\d+号|\d+弄', addr):
        try:
            hit = nominatim(addr)
            time.sleep(1.1)
            if hit:
                return {'lat': hit[0], 'lng': hit[1], 'approx': False, 'src': 'nominatim'}
        except Exception as e:
            print(f'  nominatim fail {addr}: {e}', file=sys.stderr)
    for key, (lat, lng) in AREAS.items():
        if key in addr:
            return {'lat': lat, 'lng': lng, 'approx': True, 'src': f'area:{key}'}
    return None

if __name__ == '__main__':
    parties = json.load(open(os.path.join(ROOT, 'public/data/parties.json')))
    cache_path = os.path.join(RAW, 'geocache.json')
    cache = json.load(open(cache_path)) if os.path.exists(cache_path) else {}
    addrs = sorted({p['address'] for p in parties if p['address']})
    for a in addrs:
        if a in cache:
            continue
        hit = resolve(a)
        if hit:
            cache[a] = hit
            print(f'{hit["src"]:28s} {a}')
        else:
            print(f'{"UNRESOLVED":28s} {a}', file=sys.stderr)
    json.dump(cache, open(cache_path, 'w'), ensure_ascii=False, indent=1)
    print(f'cache: {len(cache)}/{len(addrs)}')
