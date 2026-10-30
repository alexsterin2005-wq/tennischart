from functools import lru_cache
def game(p, noad=False):
    # prob server holds from 0-0
    @lru_cache(None)
    def g(a,b):
        if a>=4 and a-b>=2: return 1.0
        if b>=4 and b-a>=2: return 0.0
        if noad and a==3 and b==3: return p
        if a>=3 and b>=3 and a==b: # deuce
            return p*p/(p*p+(1-p)*(1-p))
        return p*g(a+1,b)+(1-p)*g(a,b+1)
    return g
def tb(pa,pb,target):
    # A serves first point; serve alternates 1,2,2,...
    @lru_cache(None)
    def t(a,b):
        if a>=target and a-b>=2: return 1.0
        if b>=target and b-a>=2: return 0.0
        if a>=target-1 and b>=target-1 and a==b:
            # from tied deuce-like state, approx with avg
            n=a+b
            srvA = (n==0) or (((n-1)//2)%2==1)
            # two-point cycle covers one A serve one B serve
            w = pa*(1-pb); l=(1-pa)*pb
            return w/(w+l)
        n=a+b
        srvA = (n==0) or (((n-1)//2)%2==1)
        q = pa if srvA else 1-pb
        return q*t(a+1,b)+(1-q)*t(a,b+1)
    return t
def set_(pa,pb,noad=False):
    hA=game(pa,noad)(0,0); hB=game(pb,noad)(0,0)
    TB=tb(pa,pb,7)(0,0); TBb=1-tb(pb,pa,7)(0,0)
    @lru_cache(None)
    def s(a,b,aserv):
        if a>=6 and a-b>=2: return 1.0
        if b>=6 and b-a>=2: return 0.0
        if a==6 and b==6: return TB if aserv else TBb
        if aserv: return hA*s(a+1,b,False)+(1-hA)*s(a,b+1,False)
        return (1-hB)*s(a+1,b,True)+hB*s(a,b+1,True)
    return s
def match(pa,pb,noad=False,mtb=True):
    S=set_(pa,pb,noad)
    sA=S(0,0,True)
    third = tb(pa,pb,10)(0,0) if mtb else sA
    # simplify: who serves first each set alternates ~; use A-serve-first approx
    return sA*sA + 2*sA*(1-sA)*third
base=0.60
import math
target=1/(1+10**(-0.5/2))
print("target",round(target,4))
lo,hi=0,0.2
for _ in range(60):
    d=(lo+hi)/2
    if match(base+d/2,base-d/2)>target: hi=d
    else: lo=d
print("d",round(d,4),"pA",round(base+d/2,4),"pB",round(base-d/2,4),"match",round(match(base+d/2,base-d/2),4))
for gap in [0,0.5,1,1.5,2]:
    t=1/(1+10**(-gap/2))
    lo,hi=0,0.4
    for _ in range(60):
        dd=(lo+hi)/2
        if match(base+dd/2,base-dd/2)>t: hi=dd
        else: lo=dd
    print(gap, round(t,3), "pA",round(base+dd/2,3),"pB",round(base-dd/2,3))
pA,pB=base+d/2,base-d/2
print("hold A",round(game(pA)(0,0),3),"hold B",round(game(pB)(0,0),3))

def from_state(pa,pb,setsA,setsB,gA,gB,ptA,ptB,aServing,noad=False,mtb=True):
    # prob A wins match from: current game points (ptA,ptB as 0..), games, sets; non-tiebreak game in progress
    S=set_(pa,pb,noad)
    def match_after_set(sa,sb):
        if sa==2: return 1.0
        if sb==2: return 0.0
        if sa==1 and sb==1:
            return tb(pa,pb,10)(0,0) if mtb else S(0,0,True)
        s=S(0,0,True)
        # one more set at least
        if sa==1: return s + (1-s)*(tb(pa,pb,10)(0,0) if mtb else s)
        if sb==1: return s*(tb(pa,pb,10)(0,0) if mtb else s)
        return match(pa,pb,noad,mtb)
    winSet=match_after_set(setsA+1,setsB); loseSet=match_after_set(setsA,setsB+1)
    def setwin_from_games(a,b,aserv):
        return S(a,b,aserv)
    if aServing:
        h=game(pa,noad)(ptA,ptB)
        sw = h*setwin_from_games(gA+1,gB,False)+(1-h)*setwin_from_games(gA,gB+1,False)
    else:
        hb=game(pb,noad)(ptB,ptA)
        sw = (1-hb)*setwin_from_games(gA+1,gB,True)+hb*setwin_from_games(gA,gB+1,True)
    return sw*winSet+(1-sw)*loseSet
pa,pb=pA,pB
print("start", round(from_state(pa,pb,0,0,0,0,0,0,True),3))
# 1st set 4-4, Aaron serving, 30-40 (Alex BP): ptA=3 ptB=2 from Alex view
print("4-4 30-40 BP for Alex", round(from_state(pa,pb,0,0,4,4,3,2,False),3))
print(" Alex converts -> 5-4 Alex to serve", round(from_state(pa,pb,0,0,5,4,0,0,True),3))
print(" Aaron saves -> deuce", round(from_state(pa,pb,0,0,4,4,3,3,False),3))
print("15-0 first game A serving", round(from_state(pa,pb,0,0,0,0,1,0,True),3))
print("0-15 first game", round(from_state(pa,pb,0,0,0,0,0,1,True),3))
# in-match learning example: after 40 Alex serve pts, he won 20 (50%)
k=40
for won,played in [(20,40)]:
    new=(k*pa+won)/(k+played)
    print("blend pA", round(new,3))
