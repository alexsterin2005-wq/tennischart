from functools import lru_cache
def other(s): return 2 if s==1 else 1
PTS={'0':0,'15':1,'30':2,'40':3,'AD':4}

def hold_from(p,a,b):
    # server wins game from (a,b) server-first, ad scoring
    @lru_cache(None)
    def g(a,b):
        if a>=4 and a-b>=2: return 1.0
        if b>=4 and b-a>=2: return 0.0
        if a>=3 and b>=3:
            d=p*p/(p*p+(1-p)*(1-p))
            if a==b: return d
            return p+(1-p)*d if a>b else p*d
        return p*g(a+1,b)+(1-p)*g(a,b+1)
    return g(a,b)

class Model:
    def __init__(self,pa,pb,final):
        self.pa,self.pb,self.final=pa,pb,final   # pa: P1 wins pt on own serve
        self.hA=hold_from(pa,0,0); self.hB=hold_from(pb,0,0)
        self._set={}; self._tb={}; self._m={}
    def ptwin(self,srv):  # prob P1 wins a point when srv serves
        return self.pa if srv==1 else 1-self.pb
    def tb(self,a,b,first,target=7):
        key=(a,b,first,target)
        if key in self._tb: return self._tb[key]
        if a>=target and a-b>=2: r=1.0
        elif b>=target and b-a>=2: r=0.0
        elif a>=target-1 and b>=target-1 and a==b:
            w=self.pa*(1-self.pb); l=(1-self.pa)*self.pb; r=w/(w+l)
        elif a>=target-1 and b>=target-1:
            # one ahead at deep tie: approximate via next point then tie
            n=a+b; srv=first if n==0 or ((n-1)//2)%2==1 else other(first)
            q=self.ptwin(srv); w=self.pa*(1-self.pb); l=(1-self.pa)*self.pb; t=w/(w+l)
            r = q*1+(1-q)*t if a>b else q*t
        else:
            n=a+b; srv=first if n==0 or ((n-1)//2)%2==1 else other(first)
            q=self.ptwin(srv); r=q*self.tb(a+1,b,first,target)+(1-q)*self.tb(a,b+1,first,target)
        self._tb[key]=r; return r
    def setw(self,g1,g2,srv,adv):
        key=(g1,g2,srv,adv)
        if key in self._set: return self._set[key]
        if (g1>=6 and g1-g2>=2) or (g1==7 and g2==6 and not adv): r=1.0
        elif (g2>=6 and g2-g1>=2) or (g2==7 and g1==6 and not adv): r=0.0
        elif g1==6 and g2==6 and not adv: r=self.tb(0,0,srv)
        elif adv and g1>=5 and g2>=5 and g1==g2:
            hs=self.hA if srv==1 else self.hB
            # two-game cycle
            if srv==1: w=self.hA*(1-self.hB); l=(1-self.hA)*self.hB
            else: w=(1-self.hB)*self.hA; l=self.hB*(1-self.hA)
            r=w/(w+l)
        else:
            h=self.hA if srv==1 else 1-self.hB   # prob P1 wins this game
            r=h*self.setw(g1+1,g2,other(srv),adv)+(1-h)*self.setw(g1,g2+1,other(srv),adv)
        self._set[key]=r; return r
    def match(self,s1,s2):
        if s1==2: return 1.0
        if s2==2: return 0.0
        key=(s1,s2)
        if key in self._m: return self._m[key]
        adv = (s1==1 and s2==1 and self.final=='A')
        s=(self.setw(0,0,1,adv)+self.setw(0,0,2,adv))/2
        r=s*self.match(s1+1,s2)+(1-s)*self.match(s1,s2+1)
        self._m[key]=r; return r
    def from_state(self,s1,s2,g1,g2,pts,srv):
        last=(s1==1 and s2==1); adv = last and self.final=='A'
        if g1==6 and g2==6 and not adv:
            x,y=[int(v) for v in pts.split('-')]
            a,b=(x,y) if srv==1 else (y,x)
            n=a+b
            # derive who served first in TB
            if n==0: first=srv
            else: first = srv if ((n-1)//2)%2==1 else other(srv)
            t=self.tb(a,b,first)
            return t*self.match(s1+1,s2)+(1-t)*self.match(s1,s2+1)
        x,y=[PTS[v] for v in pts.split('-')]
        p = self.pa if srv==1 else self.pb
        h=hold_from(p,x,y)
        pw = h if srv==1 else 1-h
        sw = pw*self.setw(g1+1,g2,other(srv),adv)+(1-pw)*self.setw(g1,g2+1,other(srv),adv)
        return sw*self.match(s1+1,s2)+(1-sw)*self.match(s1,s2+1)
