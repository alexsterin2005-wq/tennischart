import sys, math, random, pandas as pd, numpy as np
sys.path.insert(0,'/home/claude/backtest')
from engine import Model
D='/home/claude/data/mcp/'
random.seed(1)
def load(g,n):
    m=pd.read_csv(D+f'charting-{g}-matches.csv',encoding='latin1')
    m['Final TB?']=m['Final TB?'].astype(str).str.strip()
    m=m[(m['Best of'].astype(str)=='3')&(m['Final TB?'].isin(['1','A']))]
    p=pd.read_csv(D+f'charting-{g}-points-2020s.csv',encoding='latin1',low_memory=False)
    p=p[p.match_id.isin(set(m.match_id))]
    final=dict(zip(m.match_id,m['Final TB?']))
    ids=sorted(set(p.match_id)); random.shuffle(ids); ids=ids[:n]
    p=p[p.match_id.isin(ids)].sort_values(['match_id','Pt'])
    return p,final
def complete(rows):
    # match complete if winner of last point reaches 2 sets: check last row state
    r=rows[-1]; w=int(r['PtWinner'])
    s=(int(r['Set1']),int(r['Set2'])); return s[w-1]==1
cache={}
def model(pa,pb,final):
    k=(round(pa*400)/400,round(pb*400)/400,final)
    if k not in cache:
        if len(cache)>20000: cache.clear()
        cache[k]=Model(k[0],k[1],final)
    return cache[k]
def evaluate(g,n,weights):
    p,final=load(g,n)
    srvp=[]
    base=(p.Svr==p.PtWinner).mean()
    out={w:[] for w in weights}
    nm=0
    for mid,df in p.groupby('match_id',sort=False):
        rows=df.to_dict('records')
        try:
            rows=[r for r in rows if str(r['PtWinner']) in ('1','2') and str(r['Svr']) in ('1','2')]
            if len(rows)<40 or not complete(rows): continue
            winner=1 if int(rows[-1]['PtWinner'])==1 else 2
            y=1 if winner==1 else 0
            fr=final[mid]
            for w in weights:
                sw=[0,0,0]; sp=[0,0,0]
                for r in rows:
                    srv=int(r['Svr'])
                    if w is None: pa=pb=base
                    else:
                        pa=(w*base+sw[1])/(w+sp[1]); pb=(w*base+sw[2])/(w+sp[2])
                    pa=min(max(pa,.3),.9); pb=min(max(pb,.3),.9)
                    pr=model(pa,pb,fr).from_state(int(r['Set1']),int(r['Set2']),int(r['Gm1']),int(r['Gm2']),str(r['Pts']).strip(),srv)
                    out[w].append((pr,y))
                    sp[srv]+=1; sw[srv]+= 1 if int(r['PtWinner'])==srv else 0
            nm+=1
        except Exception as e:
            continue
    return base,nm,out
if __name__=='__main__':
    g=sys.argv[1]; n=int(sys.argv[2])
    W=[None,20,40,60,80,120]
    base,nm,out=evaluate(g,n,W)
    print(f'{g}: base serve-pt rate {base:.3f}, matches {nm}, points {len(out[W[0]])}')
    for w in W:
        a=np.array(out[w]); pr=np.clip(a[:,0],1e-6,1-1e-6); y=a[:,1]
        brier=np.mean((pr-y)**2); ll=-np.mean(y*np.log(pr)+(1-y)*np.log(1-pr))
        print(f'  weight {str(w):>5}: Brier {brier:.4f}  logloss {ll:.4f}')
    import pickle; pickle.dump((base,nm,out),open(f'/home/claude/backtest/out_{g}.pkl','wb'))
