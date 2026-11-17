from PIL import Image
import json, os, glob
BRUTO=os.environ.get('PIXELFX_BRUTO','/tmp/pixelfx-bruto')+'/'
D=os.path.join(os.path.dirname(os.path.abspath(__file__)),'../../public/images/cacada/pixelfx/')
os.makedirs(D,exist_ok=True)
for f in glob.glob(D+'*'): os.remove(f)
manifesto={}
total=0
for nome in sorted(os.listdir(BRUTO)):
    pasta=glob.glob(BRUTO+nome+'/*/*/')[0]
    png=glob.glob(pasta+'*.png'); png=[p for p in png if not p.endswith('contact.png')][0]
    js=json.load(open(glob.glob(pasta+'*.json')[0]))
    sheet=Image.open(png).convert('RGBA')
    fr=js['frames']; fr=fr if isinstance(fr,list) else list(fr.values())
    rects=[f['frame'] for f in fr]
    cortes=[sheet.crop((r['x'],r['y'],r['x']+r['w'],r['y']+r['h'])) for r in rects]
    # união das caixas de pixels não transparentes (alfa > 8)
    x0=y0=10**9; x1=y1=-1
    for c in cortes:
        a=c.getchannel('A').point(lambda v:255 if v>8 else 0); b=a.getbbox()
        if b: x0=min(x0,b[0]);y0=min(y0,b[1]);x1=max(x1,b[2]);y1=max(y1,b[3])
    cortes=[c.crop((x0,y0,x1,y1)) for c in cortes]
    # descarta quadros finais totalmente vazios
    while len(cortes)>1 and cortes[-1].getchannel('A').point(lambda v:255 if v>8 else 0).getbbox() is None: cortes.pop()
    w,h=cortes[0].size; n=len(cortes)
    S=Image.new('RGBA',(w*n,h),(0,0,0,0))
    for i,c in enumerate(cortes): S.paste(c,(i*w,0))
    meta=js['meta']['pixelfx']
    # lossless se couber em 350 KB; senão, com perdas (alfa sempre sem perdas)
    arq=D+nome+'.webp'
    for q in (None,92,85,78,70,60,50):
        if q is None: S.save(arq,'WEBP',lossless=True,quality=100,method=6)
        else: S.save(arq,'WEBP',quality=q,alpha_quality=100,method=6)
        tam=os.path.getsize(arq)
        if tam<=330*1024: break
    total+=tam
    manifesto[nome]={'quadros':n,'largura':w,'altura':h,'fps':meta['fps'] if False else js['meta']['pixelfx']['fps'],'laco':bool(meta['loop'])}
    print(f"{nome:20s} {n:3d}q {w}x{h} {meta['fps']}fps(origem) loop={meta['loop']} {tam//1024}KB q={q}")
json.dump(manifesto,open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'../../src/assets/pixelfxManifesto.json'),'w'),indent=1,ensure_ascii=False)
print('total',total//1024,'KB')
