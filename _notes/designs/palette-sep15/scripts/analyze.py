import re, math, pathlib, collections, itertools
REPO = pathlib.Path(__file__).resolve().parents[4]
dirt = (REPO/"_sass/minimal-mistakes/skins/_dirt.scss").read_text(encoding="utf8")
def block(src, opener):
    i = src.index(opener)+len(opener); d=1; j=i
    while d: d += src[j]=="{"; d -= src[j]=="}"; j+=1
    return src[i:j-1]
def toks(body):
    return {m[1]: m[2].strip() for m in re.finditer(r"(--[a-z0-9-]+)\s*:\s*([^;]+);", re.sub(r"/\*.*?\*/","",body,flags=re.S))}
L = toks(block(dirt,"@mixin site-light-palette {")); D = toks(block(dirt,"@mixin site-dark-palette {"))
inv_body = dirt[dirt.index(":root {\n  @include site-light-palette;"):]; I = toks(block(inv_body, ":root {"))
def rgba(v, t):
    if v.startswith("var("): return rgba(t[v[4:-1]], t)
    if v.startswith("#"):
        h=v[1:]; h="".join(c*2 for c in h) if len(h)<=4 else h
        return tuple(int(h[i:i+2],16) for i in (0,2,4))+(1.0,)
    n=[float(x) for x in re.findall(r"[\d.]+",v)]; return (n[0],n[1],n[2],n[3] if len(n)>3 else 1.0)
def lin(x): x/=255; return x/12.92 if x<=0.04045 else ((x+0.055)/1.055)**2.4
def oklab(c):
    r,g,b=(lin(x) for x in c[:3])
    l=0.4122214708*r+0.5363325363*g+0.0514459929*b; m=0.2119034982*r+0.6806995451*g+0.1073969566*b; s=0.0883024619*r+0.2817188376*g+0.6299787005*b
    l,m,s=(x**(1/3) for x in (l,m,s))
    return (0.2104542553*l+0.7936177850*m-0.0040720468*s, 1.9779984951*l-2.4285922050*m+0.4505937099*s, 0.0259040371*l+0.7827717662*m-0.8086757660*s)
def lch(c):
    L_,a,b=oklab(c); return L_, math.hypot(a,b), (math.degrees(math.atan2(b,a))%360)
def hx(c): return "#%02x%02x%02x"%tuple(int(round(x)) for x in c[:3])
SKIP=re.compile(r"notice|h000|alpha|-hover$|primary-color-hover|contrast|on-accent")
for name,t in (("LIGHT",L),("DARK",D)):
    print("\n=====",name)
    opaque={k:rgba(v,t) for k,v in t.items() if not SKIP.search(k)}
    op={k:c for k,c in opaque.items() if c[3]==1}
    byv=collections.defaultdict(list)
    for k,c in op.items(): byv[hx(c)].append(k)
    print("-- exact shared:"); [print("  ",v,ks) for v,ks in byv.items() if len(ks)>1]
    print("-- near (OKLab dE<0.045):")
    vals=list(byv)
    for a,b in itertools.combinations(vals,2):
        la,lb=oklab(rgba(a,{})),oklab(rgba(b,{}))
        d=math.dist(la,lb)
        if d<0.045: print(f"   {d:.3f}  {a} {byv[a]}  ~  {b} {byv[b]}")
    print("-- all by hue family (L C h):")
    for v in sorted(vals,key=lambda v:(round(lch(rgba(v,{}))[1]>0.02), lch(rgba(v,{}))[2]//30, -lch(rgba(v,{}))[0])):
        L_,C,h=lch(rgba(v,{})); print(f"   {v}  L{L_:.2f} C{C:.3f} h{h:5.0f}  {byv[v]}")
    print("-- translucent:"); [print("  ",k,t[k]) for k,c in opaque.items() if c[3]<1]
print("\nINVARIANT"); [print("  ",k,v, "L%.2f C%.3f h%.0f"%lch(rgba(v,I))) for k,v in I.items()]
