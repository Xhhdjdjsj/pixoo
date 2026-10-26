import json, math, re, sys, xml.etree.ElementTree as ET
from pathlib import Path

SHEET_L = r"public/source/illustration-L.svg"
SHEET_S = r"public/source/illustration-S.svg"
OUT = Path("public/library.json")
NAMES = [
    ("book", "Книга", ["книга", "чтение", "обучение", "book", "reading"]),
    ("phone", "Смартфон", ["смартфон", "телефон", "технологии", "phone", "technology"]),
    ("puzzle", "Пазл", ["пазл", "идея", "команда", "puzzle", "idea"]),
    ("coin", "Монета", ["монета", "финансы", "деньги", "coin", "finance"]),
    ("headphones", "Наушники", ["наушники", "музыка", "звук", "headphones", "music"]),
    ("lamp", "Настольная лампа", ["лампа", "идея", "работа", "lamp", "idea"]),
    ("flowers", "Цветы", ["цветы", "растение", "декор", "flowers", "plant"]),
    ("notebook", "Блокнот", ["блокнот", "тетрадь", "записи", "notebook"]),
    ("tablet", "Планшет", ["планшет", "заметки", "tablet", "notes"]),
    ("pencil", "Карандаш", ["карандаш", "рисование", "pencil", "drawing"]),
]
TOKENS = re.compile(r"[A-Za-z]|[-+]?(?:\d*\.)?\d+(?:[eE][-+]?\d+)?")
def path_bounds(d):
    t=TOKENS.findall(d); i=0; c=None; x=y=0.0; pts=[]
    while i<len(t):
        if t[i].isalpha(): c=t[i]; i+=1
        if not c: break
        op=c.upper(); rel=c.islower()
        if op=="Z": c=None; continue
        n={"M":2,"L":2,"T":2,"H":1,"V":1,"C":6,"S":4,"Q":4,"A":7}.get(op)
        if not n or i+n>len(t) or any(a.isalpha() for a in t[i:i+n]): c=None; continue
        a=list(map(float,t[i:i+n])); i+=n
        if op in ("M","L","T"):
            xx,yy=a; x=xx+x if rel else xx; y=yy+y if rel else yy; pts.append((x,y))
            if op=="M": c="l" if rel else "L"
        elif op=="H": x=x+a[0] if rel else a[0]; pts.append((x,y))
        elif op=="V": y=y+a[0] if rel else a[0]; pts.append((x,y))
        elif op in ("C","S","Q"):
            q=[(a[k]+(x if rel else 0),a[k+1]+(y if rel else 0)) for k in range(0,n,2)]
            pts.extend(q); x,y=q[-1]
        else:
            x=a[5]+(x if rel else 0); y=a[6]+(y if rel else 0); pts.append((x,y))
    if not pts: return None
    return min(p[0] for p in pts),min(p[1] for p in pts),max(p[0] for p in pts),max(p[1] for p in pts)

def union(boxes):
    boxes=[b for b in boxes if b]
    if not boxes:return None
    return min(b[0] for b in boxes),min(b[1] for b in boxes),max(b[2] for b in boxes),max(b[3] for b in boxes)

def apply_transform(box, text):
    if not text:return box
    points=[(box[0],box[1]),(box[2],box[1]),(box[2],box[3]),(box[0],box[3])]
    for name,args in re.findall(r"([A-Za-z]+)\s*\(([^)]*)\)",text):
        v=[float(n) for n in re.findall(r"[-+]?(?:\d*\.)?\d+(?:[eE][-+]?\d+)?",args)]
        if name=="translate" and v:
            dx=v[0];dy=v[1] if len(v)>1 else 0; points=[(x+dx,y+dy) for x,y in points]
        elif name=="scale" and v:
            sx=v[0];sy=v[1] if len(v)>1 else sx;points=[(x*sx,y*sy) for x,y in points]
        elif name=="matrix" and len(v)==6:
            a,b,c,d,e,f=v;points=[(a*x+c*y+e,b*x+d*y+f) for x,y in points]
    return min(p[0] for p in points),min(p[1] for p in points),max(p[0] for p in points),max(p[1] for p in points)

def element_bounds(el):
    tag=el.tag.split("}")[-1]
    if tag=="path": b=path_bounds(el.get("d",""))
    elif tag=="rect":
        x=float(el.get("x",0)); y=float(el.get("y",0)); b=(x,y,x+float(el.get("width",0)),y+float(el.get("height",0)))
    elif tag=="circle":
        x=float(el.get("cx",0));y=float(el.get("cy",0));r=float(el.get("r",0));b=(x-r,y-r,x+r,y+r)
    elif tag=="ellipse":
        x=float(el.get("cx",0));y=float(el.get("cy",0));rx=float(el.get("rx",0));ry=float(el.get("ry",0));b=(x-rx,y-ry,x+rx,y+ry)
    elif tag in ("g","svg"): b=union([element_bounds(c) for c in el])
    else: b=None
    return apply_transform(b,el.get("transform")) if b else None

def source_markup(root, selected):
    defs=root.find("{http://www.w3.org/2000/svg}defs")
    body="".join(ET.tostring(el,encoding="unicode") for el in selected)
    defs_markup=""
    if defs is not None and re.search(r"url\(#|href=[\"']#",body):
        defs_markup=ET.tostring(defs,encoding="unicode")
    return defs_markup+body

def specs(size,width,height):
    if size=="S":
        xs=[(0,1010),(1010,1780),(1780,2315),(2315,width)]
        ys_main=[(1750,2750),(2750,3550),(3550,4700)]
        ys_bg=[(4900,5800),(5800,6650),(6650,7800)]
    else:
        xs=[(0,1750),(1750,2900),(2900,3800),(3800,width)]
        ys_main=[(3000,4550),(4550,5700),(5700,7200)]
        ys_bg=[(7200,8700),(8700,9750),(9750,height)]
    rows=[([0,1,2,3],ys_main[0]),([4,5,6,7],ys_main[1]),([8,9],ys_main[2])]
    out=[]
    for role,bands in (("main",ys_main),("background",ys_bg)):
        rows=([0,1,2,3],[4,5,6,7],[8,9])
        for ri,indices in enumerate(rows):
            ylo,yhi=bands[ri]
            for col,index in enumerate(indices):
                xlo,xhi=xs[col]
                out.append((role,index,(xlo,ylo,xhi,yhi)))
    return out

ET.register_namespace("", "http://www.w3.org/2000/svg")
assets=[]
for size,path in (("L",SHEET_L),("S",SHEET_S)):
    root=ET.parse(path).getroot()
    width,height=map(float,root.get("viewBox").split()[2:4])
    nodes=list(root)
    records=[]
    for order,node in enumerate(nodes):
        if node.tag.endswith("defs"): continue
        b=element_bounds(node)
        if not b: continue
        if (b[2]-b[0])>width*.9 and (b[3]-b[1])>height*.9: continue
        records.append((order,node,b))
    for role,index,region in specs(size,width,height):
        xlo,ylo,xhi,yhi=region
        selected=[]
        for order,node,b in records:
            cx=(b[0]+b[2])/2;cy=(b[1]+b[3])/2
            if xlo<=cx<xhi and ylo<=cy<yhi:
                selected.append((order,node,b))
        if not selected:
            print("EMPTY",size,role,NAMES[index][1],region)
            continue
        bounds=union([entry[2] for entry in selected])
        pad_x=max(5,(bounds[2]-bounds[0])*.015);pad_y=max(5,(bounds[3]-bounds[1])*.015)
        x=max(0,bounds[0]-pad_x);y=max(0,bounds[1]-pad_y)
        w=min(width-x,bounds[2]+pad_x-x);h=min(height-y,bounds[3]+pad_y-y)
        markup=source_markup(root,[entry[1] for entry in selected])
        family,name,tags=NAMES[index]
        assets.append({"id":f"{role}-{family}-{size.lower()}","name":name,"category":"Фоны" if role=="background" else "Главные объекты","width":w,"height":h,"viewBox":f"{x:.3f} {y:.3f} {w:.3f} {h:.3f}","markup":markup,"source":f"Исходная иллюстрация · {size}","sourceFileId":f"source-illustrations-{size}-{role}-{family}","imported":True,"role":role,"familyId":f"{role}-{family}","detailSize":size,"tags":tags+(["фон"] if role=="background" else [])})
        print(size,role,name,"paths",len(selected),"box",f"{x:.0f},{y:.0f} {w:.0f}x{h:.0f}")
if len(assets)!=40: raise SystemExit(f"Expected 40 extracted variants, got {len(assets)}")
palette_data=[
 {"id":"palette-01","name":"Лавандовая","objectColors":["#F9ECB0","#F9A3AA","#FFE3E1","#FFFFFF"],"backgroundColors":["#D7CDF5","#AA9BF0","#7864D7","#181817"]},
 {"id":"palette-02","name":"Персиковая","objectColors":["#F9ECB0","#80DADA","#BEEBEB","#FFFFFF"],"backgroundColors":["#FDD7B9","#FAC896","#D27532","#181817"]},
 {"id":"palette-03","name":"Мятная","objectColors":["#FFD4F2","#6D7BFC","#B6C6FE","#FFFFFF"],"backgroundColors":["#BEEBEB","#80DADA","#5ABEBE","#181817"]},
]
base_bg=["#D7CDF5","#AA9BF0","#7864D7","#181817"]
base_obj=["#F9ECB0","#F9A3AA","#FFE3E1","#FFFFFF"]
for p in palette_data:
    p["backgroundColorMap"]={s:t for s,t in zip(base_bg,p["backgroundColors"])}
    p["objectColorMap"]={**{s:t for s,t in zip(base_bg,p["backgroundColors"])},**{s:t for s,t in zip(base_obj,p["objectColors"])}}
OUT.write_text(json.dumps({"version":1,"assets":assets,"palettes":palette_data},ensure_ascii=False,separators=(",",":")),encoding="utf-8")
print(f"Wrote {len(assets)} vector components and {len(palette_data)} palettes to {OUT} ({OUT.stat().st_size:,} bytes)")
