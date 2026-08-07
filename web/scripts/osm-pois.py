import json, math, time, urllib.request, urllib.parse, os
ROOT="/Users/akds/Projects/RoutesWallet/.worktrees/web-map"
SD="/private/tmp/claude-501/-Users-akds-Projects-RoutesWallet--worktrees-web-map/56be7600-2760-4062-ab01-c85783c4601e/scratchpad"
CACHE=f"{SD}/osm-tile-cache2.json"
fc=json.load(open(f"{ROOT}/web/public/routes.geojson"))

CELL=0.002
def cellkey(lon,lat): return (round(lon/CELL), round(lat/CELL))
route_pts={}
for f in fc['features']:
    for lon,lat in f['geometry']['coordinates']:
        route_pts.setdefault(cellkey(lon,lat), []).append((lon,lat))
def hav(a,b):
    R=6371000;p1,p2=math.radians(a[1]),math.radians(b[1])
    dp=math.radians(b[1]-a[1]);dl=math.radians(b[0]-a[0])
    return 2*R*math.asin(math.sqrt(math.sin(dp/2)**2+math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2))
def near_route(lon,lat,maxm=150):
    ck=cellkey(lon,lat)
    for dx in (-1,0,1):
        for dy in (-1,0,1):
            for p in route_pts.get((ck[0]+dx,ck[1]+dy),[]):
                if hav((lon,lat),p)<=maxm: return True
    return False

TILE=0.4
def keep(lat,lon):
    return (50.9<=lat<=52.6 and -0.8<=lon<=1.35) or (38.0<=lat<=42.4 and -1.0<=lon<=3.6)
tiles=set()
for f in fc['features']:
    for lon,lat in f['geometry']['coordinates']:
        if keep(lat,lon): tiles.add((math.floor(lat/TILE),math.floor(lon/TILE)))
tiles=sorted(tiles)
print("tiles:", len(tiles), flush=True)

ENDPOINTS=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter','https://maps.mail.ru/osm/tools/overpass/api/interpreter']
cache=json.load(open(CACHE)) if os.path.exists(CACHE) else {}
def overpass(bbox, i):
    S,W,N,E=bbox
    q=f'[out:json][timeout:120];(nwr["amenity"~"^(cafe|toilets|drinking_water)$"]({S},{W},{N},{E});nwr["railway"~"^(station|halt)$"]({S},{W},{N},{E}););out center tags;'
    data=urllib.parse.urlencode({'data':q}).encode()
    for attempt in range(6):
        ep=ENDPOINTS[(i+attempt)%len(ENDPOINTS)]
        try:
            req=urllib.request.Request(ep, data=data, headers={'User-Agent':'RoutesWallet/1.0 (dev)'})
            return json.load(urllib.request.urlopen(req, timeout=150)).get('elements',[])
        except Exception as e:
            print('  retry',attempt,ep.split('/')[2],str(e)[:50],flush=True); time.sleep(6)
    return None

for i,(ty,tx) in enumerate(tiles):
    key=f"{ty},{tx}"
    if key in cache: continue
    els=overpass((ty*TILE,tx*TILE,(ty+1)*TILE,(tx+1)*TILE), i)
    if els is None: print(f"  tile {i+1}/{len(tiles)} {key}: FAILED (skipped)",flush=True); continue
    cache[key]=els; json.dump(cache,open(CACHE,'w'))
    print(f"  tile {i+1}/{len(tiles)} {key}: {len(els)} elements",flush=True)
    time.sleep(3)

def typ(t):
    a=t.get('amenity')
    if a=='cafe': return 'cafe'
    if a=='toilets': return 'toilet'
    if a=='drinking_water': return 'water'
    if t.get('railway') in ('station','halt'): return 'station'
    return None
seen=set(); feats=[]
from collections import Counter; cnt=Counter()
for els in cache.values():
    for e in els or []:
        lon=e.get('lon') or (e.get('center') or {}).get('lon')
        lat=e.get('lat') or (e.get('center') or {}).get('lat')
        if lon is None or lat is None: continue
        t=typ(e.get('tags',{}))
        if not t or not near_route(lon,lat): continue
        k=(t, round(lat,5), round(lon,5))
        if k in seen: continue
        seen.add(k)
        nm=e['tags'].get('name') or {'cafe':'Café','toilet':'Toilets','water':'Drinking water','station':'Station'}[t]
        feats.append({'type':'Feature','properties':{'type':t,'name':nm},'geometry':{'type':'Point','coordinates':[round(lon,6),round(lat,6)]}})
        cnt[t]+=1
json.dump({'type':'FeatureCollection','features':feats}, open(f"{ROOT}/web/public/pois.geojson",'w'), ensure_ascii=False, separators=(',',':'))
print("DONE. real-OSM POIs within 150m of routes:", len(feats), dict(cnt), flush=True)
