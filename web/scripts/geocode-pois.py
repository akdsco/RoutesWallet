import csv, re, json, time, urllib.request, urllib.parse, os
SD="/private/tmp/claude-501/-Users-akds-Projects-RoutesWallet--worktrees-web-map/56be7600-2760-4062-ab01-c85783c4601e/scratchpad"
ROOT="/Users/akds/Projects/RoutesWallet/.worktrees/web-map"
CACHE=f"{SD}/poi-geocode-cache.json"
rows=list(csv.reader(open(f"{SD}/hv-routes.csv")))[1:]
routes={f['properties']['id']:f for f in json.load(open(f"{ROOT}/web/public/routes.geojson"))['features']}
cache=json.load(open(CACHE)) if os.path.exists(CACHE) else {}

def rid(u):
    m=re.search(r'strava\.com/routes/(\d+)', u or ''); return m.group(1) if m else None
def bbox(coords, pad=0.03):
    xs=[p[0] for p in coords]; ys=[p[1] for p in coords]
    return min(xs)-pad,min(ys)-pad,max(xs)+pad,max(ys)+pad
def clean_names(cell):
    if not cell: return []
    cell=re.sub(r'\([^)]*\)','',cell)
    out=[]
    for p in re.split(r',|/| or | and | & ', cell, flags=re.I):
        p=p.strip().rstrip('.').strip()
        if not p or len(p)>45: continue
        if re.search(r'\b(can|divert|prefers|closes?|option|advisory|route|near|km)\b', p, re.I): continue
        out.append(p)
    return out

TYPES={8:'cafe',10:'toilet',11:'water',9:'station'}
def geocode(name, vb, station=False):
    q=name+(' station' if station else '')
    url='https://nominatim.openstreetmap.org/search?'+urllib.parse.urlencode(
        {'q':q,'format':'jsonv2','limit':'1','viewbox':f'{vb[0]},{vb[3]},{vb[2]},{vb[1]}','bounded':'1'})
    try:
        d=json.load(urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'RoutesWallet/1.0'}),timeout=20))
        if d: return [round(float(d[0]['lon']),6), round(float(d[0]['lat']),6)]
    except Exception: pass
    return None

# gather tasks
tasks=[]  # (type, name, vb)
seen=set()
for r in rows:
    i=rid(r[12] if len(r)>12 else '')
    if not i or i not in routes: continue
    vb=bbox(routes[i]['geometry']['coordinates'])
    for col,typ in TYPES.items():
        for name in clean_names(r[col] if len(r)>col else ''):
            k=f"{typ}|{name.lower()}"
            if k in seen: continue
            seen.add(k); tasks.append((typ,name,vb,k))

for typ,name,vb,k in tasks:
    if k in cache: continue
    cache[k]=geocode(name, vb, station=(typ=='station'))
    json.dump(cache, open(CACHE,'w'))
    time.sleep(1.1)

# build pois.geojson from cache + tasks (name attribution)
attempted={t:0 for t in TYPES.values()}; hit={t:0 for t in TYPES.values()}
pois={}
for typ,name,vb,k in tasks:
    attempted[typ]+=1
    pt=cache.get(k)
    if pt:
        hit[typ]+=1
        pkey=(typ, round(pt[1],4), round(pt[0],4))
        pois.setdefault(pkey, {'type':typ,'name':name,'lng':pt[0],'lat':pt[1]})
feats=[{'type':'Feature','properties':{'type':v['type'],'name':v['name']},
        'geometry':{'type':'Point','coordinates':[v['lng'],v['lat']]}} for v in pois.values()]
json.dump({'type':'FeatureCollection','features':feats}, open(f"{ROOT}/web/public/pois.geojson",'w'), ensure_ascii=False, separators=(',',':'))
from collections import Counter
print('DONE. POIs (deduped):', len(feats), '| by type:', dict(Counter(f['properties']['type'] for f in feats)))
for t in TYPES.values(): print(f'  {t:8} {hit[t]}/{attempted[t]}')
