import json, re, sys
d=json.load(open(sys.argv[1]))
c=[c for c in d['summary_cases'] if c['case_id']=='summary_1321763_5321127'][0]
inp=c['input']
orders=sorted(inp['orders'],key=lambda o:int(o['pass_number_header']))
Y={r['up_to_date']:r['losses'] for r in inp['yield_impact_data']}
def g(o,k): return (o.get(k) or '').strip()
def last_list(s):
    m=re.findall(r'([\d.]+)%',s); return (m[-1]+'%') if m else '–'
def last_word_list(s):
    m=re.search(r'are: (.*)\.$',s.strip());
    return m.group(1).split(',')[-1].strip() if m else '–'
def num(s,pat,fmt='{}'):
    m=re.search(pat,s); return fmt.format(m.group(1)) if m else '–'
def species(s):
    m=re.search(r'detected: (.*)',s); return m.group(1) if m else '–'
def spec_missions(s):
    out=[]
    for name,vals in re.findall(r'^(.*?) was detected so far this season.*?levels ([\d.%, ]+)',s,re.M):
        v=re.findall(r'([\d.]+)%',vals); out.append(f"{name} {v[-1]}%" if v else name)
    return ' · '.join(out) if out else '–'
def nutrients(s):
    out=[]
    for name,v in re.findall(r'^([A-Za-z\- ]+?) deficiency was detected in the latest flight at ([\d.]+)%',s,re.M):
        out.append(f"{name.split('-')[-1].strip().capitalize() if '-' in name else name} {v}%")
    return ' · '.join(out) if out else ('none' if s else '–')
def insects(s):
    out=[]
    for name,v in re.findall(r'^(.*?) (?:deficiency )?(?:was|were) detected in the latest f\w* in ([\d.]+)%',s,re.M):
        out.append(f"{name.strip()} {v}%")
    return ' · '.join(out) if out else ('none' if s else '–')
def diseases(s):
    m=re.findall(r'which (.*?) was detected is: ([\d.]+)%',s)
    if m: return ' · '.join(f"{a.replace('Northern (Tercicum) corn leaf blight','NCLB').replace('Grey leaf spot','GLS')} {b}%" for a,b in m)
    return 'none' if s else '–'
def regional(s):
    m=re.findall(r', (.*?) was detected in (\d+) fields',s)
    return ' · '.join(f"{a.replace('Northern (Tercicum) corn leaf blight','NCLB').replace('Grey leaf spot','GLS').replace('common rust','rust')} {b}" for a,b in m)+' fields / 20 mi' if m else '–'
def region(s):
    if not s: return '–'
    p=num(s,r'approximately ([\d.]+)%','{}% of area'); p2=num(s,r'about ([\d.]+)%','{}% of field')
    regs=re.findall(r'(north\w*|south\w*|east\w*|west\w*) region',s)
    regs=list(dict.fromkeys(r[:2].upper().replace('NO','N').replace('SO','S') for r in regs))
    pct=p if p!='–' else p2
    if 'scattered' in s: return 'scattered'
    return ' · '.join([x for x in [pct, ', '.join(dict.fromkeys(ab(x) for x in re.findall(r'(northeastern|northwestern|southeastern|southwestern|western|eastern|northern|southern) region',s))) ] if x and x!='–']) or s[:60]
def ab(w):
    m={'northeastern':'NE','northwestern':'NW','southeastern':'SE','southwestern':'SW','western':'W','eastern':'E','northern':'N','southern':'S'}
    return m.get(w,w)
def bu(s): return num(s,r'is (\d+) bushels','{} bu/ac') if s else '–'
def products(s):
    if not s: return '–'
    m=re.findall(r'(?:one of|deficiency): (.*?)\.(?:\n|$)',s)
    return ' · '.join(dict.fromkeys(m)) if m else s[:80]
def full(s):
    return ' '.join(x.strip() for x in s.split('\n') if x.strip()) if s else '–'
reco=full
agent=full
def loss(o,cat,when):
    L=Y.get(o['flight_date_header'])
    if not L: return '–'
    v=L[when].get(cat,[0])[0]; return f"{v:.1f}"
def lst(s):
    m=re.findall(r'(\d+(?:\.\d+)?)',s.split(':',1)[1]) if ':' in s else []
    return [float(x) for x in m]
def wk_precip(o):
    s=g(o,'daily_weather_past_week_precip') or g(o,'daily_weather_past_3weeks_precip')
    v=lst(s); n=len(v)
    if not v: return '–'
    mx=max(v); return f"{sum(v):.2f} in / {n}d · max {mx:.2f}"
def wk_temp(o):
    s=g(o,'daily_weather_past_week_max_temp') or g(o,'daily_weather_past_3weeks_temp')
    v=lst(s)
    if not v: return '–'
    hot=sum(1 for x in v if x>=90)
    return f"peak {max(v):.0f}°F" + (f" · {hot}d ≥90°F" if hot else '')
P=orders
rows=lambda f:[f(o) for o in P]

def p_weeds(s):
    out=[]
    for name,vals in re.findall(r'^(.*?) was detected so far this season.*?levels ([\d.%, ]+)',s,re.M):
        v=re.findall(r'([\d.]+)%',vals); out.append((name.strip(), v[-1]+'%' if v else '?'))
    return out
def p_nutr(s):
    return [((n.split('-')[-1].strip().capitalize() if '-' in n else n.strip()), v+'%') for n,v in re.findall(r'^([A-Za-z\- ]+?) deficiency was detected in the latest flight at ([\d.]+)%',s,re.M)]
def p_ins(s):
    return [(n.strip(), v+'%') for n,v in re.findall(r'^(.*?) (?:deficiency )?(?:was|were) detected in the latest f\w* in ([\d.]+)%',s,re.M)]
def p_dis(s):
    return [(a.replace('Northern (Tercicum) corn leaf blight','NCLB').replace('Grey leaf spot','GLS'), b+'%') for a,b in re.findall(r'which (.*?) was detected is: ([\d.]+)%',s)]
CH={}
def split_rows(field,parser,src=None):
    per=[]; names=[]
    for o in P:
        t=g(o,field) or (g(o,src) if src else '')
        items=parser(t) if t else None
        per.append(dict(items) if items is not None else None)
        for n,_ in (items or []):
            if n not in names: names.append(n)
    if not names: return [[field, ['–' if x is None else 'none' for x in per]]]
    CH[field]=[{'name':n,'v':[None if x is None else (float(x[n].rstrip('%')) if n in x else 0) for x in per]} for n in names]
    return [[field if k==0 else '', ['–' if (x is None or n not in x) else f"{n} {x[n]}" for x in per], k] for k,n in enumerate(names)]
topics=[
 {'key':'emergence','label':'Stand count','rows':[
   ['Phenological stage', rows(lambda o: num(g(o,'phenological_stages'),r'are (.*)\.') )],
   ['Avg population', rows(lambda o: num(g(o,'avg_population'),r'is (\d+)','{} /ac'))],
   ['Population % of target', rows(lambda o: num(g(o,'population_percent'),r'is (\d+) percent','{}%'))],
   ['GDDs since planting', rows(lambda o: num(g(o,'gdds'),r'is (\d+)'))],
   ['Uniformity (samples near avg)', rows(lambda o: num(g(o,'percent_uniformity'),r'only (\d+)%','{}%'))],
   ['CV · skips and gaps', rows(lambda o: num(g(o,'standcount_skipsandgaps'),r'CV \(([\d.]+)%\)','CV {}%'))],
   ['Patches', rows(lambda o: (lambda s: ('low: ' if 'low' in s else 'high: ')+' · '.join(f"{ab(a)} {b}" for a,b in re.findall(r'(\w+) region averaging ([\d,]+)',s)) if s else '–')(g(o,'patches')))],
   ['Yield loss · past', rows(lambda o: loss(o,'emergence','past'))],
   ['Yield loss · future', rows(lambda o: loss(o,'emergence','future'))],
   ['emergence_recommendation', rows(lambda o: full(g(o,'emergence_recommendation')))]]},
 {'key':'weeds','label':'Weeds','rows':[
   ['weeds_detected (severity)', rows(lambda o: last_list(g(o,'weeds_detected')))],
   ['weeds_pressure', rows(lambda o: last_word_list(g(o,'weeds_pressure')))],
   *split_rows('specific_weeds_missions',p_weeds,'specific_weeds'),
   ['specific_weeds_dominant', rows(lambda o: species(g(o,'specific_weeds_dominant')))],
   ['specific_weeds_minor', rows(lambda o: species(g(o,'specific_weeds_minor')) if g(o,'specific_weeds_minor') else '–')],
   ['allweeds_concentration', rows(lambda o: region(g(o,'allweeds_concentration')))],
   ['herbicide_products', rows(lambda o: products(g(o,'herbicide_products')))],
   ['weeds_yield_impact', rows(lambda o: bu(g(o,'weeds_yield_impact')) if 'Potential' in g(o,'weeds_yield_impact') else ('0' if g(o,'weeds_yield_impact') else '–'))],
   ['Yield loss · past', rows(lambda o: loss(o,'weed','past'))],
   ['Yield loss · future', rows(lambda o: loss(o,'weed','future'))],
   ['weeds_recommendation', rows(lambda o: reco(g(o,'weeds_recommendation')))],
   ['weeds_agent', rows(lambda o: agent(g(o,'weeds_agent')))]]},
 {'key':'nutrients','label':'Nutrients','rows':[
   *split_rows('specific_nutrients',p_nutr),
   ['localized_nutrient_regions', rows(lambda o: region(g(o,'localized_nutrient_regions')))],
   ['nutrients_products', rows(lambda o: products(g(o,'nutrients_products')))],
   ['yield_impact_nutrients', rows(lambda o: bu(g(o,'yield_impact_nutrients')))],
   ['Yield loss · past', rows(lambda o: loss(o,'nutrient','past'))],
   ['Yield loss · future', rows(lambda o: loss(o,'nutrient','future'))],
   ['nutrients_recommendation', rows(lambda o: reco(g(o,'nutrients_recommendation')))],
   ['nutrients_agent', rows(lambda o: agent(g(o,'nutrients_agent')))]]},
 {'key':'diseases','label':'Diseases','rows':[
   *split_rows('specific_diseases_dominant',p_dis),
   *split_rows('specific_diseases_minor',p_dis),
   ['disease_impacts', rows(lambda o: g(o,'disease_impacts').replace('Northern (Tercicum) corn leaf blight','NCLB').replace(' can have a significant impact.',': significant') or '–')],
   ['localized_disease_regions', rows(lambda o: region(g(o,'localized_disease_regions')))],
   ['regional_detections', rows(lambda o: regional(g(o,'regional_detections')))],
   ['fungicide_products', rows(lambda o: products(g(o,'fungicide_products')))],
   ['yield_impact_diseases', rows(lambda o: bu(g(o,'yield_impact_diseases')) if 'Potential' in g(o,'yield_impact_diseases') else ('0' if g(o,'yield_impact_diseases') else '–'))],
   ['Yield loss · past', rows(lambda o: loss(o,'disease','past'))],
   ['Yield loss · future', rows(lambda o: loss(o,'disease','future'))],
   ['diseases_recommendation', rows(lambda o: reco(g(o,'diseases_recommendation')))],
   ['diseases_agent', rows(lambda o: agent(g(o,'diseases_agent')))]]},
 {'key':'insects','label':'Insects','rows':[
   ['overall_severity', rows(lambda o: num(g(o,'overall_severity'),r'is (\w+)'))],
   *split_rows('specific_insects',p_ins),
   ['insects_products', rows(lambda o: (lambda s: ' · '.join(re.findall(r'treating (.*?): (.*?)\.',s) and [f"{a}: {b}" for a,b in re.findall(r'treating (.*?): (.*?)\.',s)]) or '–')(g(o,'insects_products')))],
   ['yield_impact_insects', rows(lambda o: bu(g(o,'yield_impact_insects')) if 'Potential' in g(o,'yield_impact_insects') else ('0' if g(o,'yield_impact_insects') else '–'))],
   ['Yield loss · past', rows(lambda o: loss(o,'insect','past'))],
   ['Yield loss · future', rows(lambda o: loss(o,'insect','future'))],
   ['insects_recommendation', rows(lambda o: full(g(o,'insects_recommendation')))]]},
 {'key':'weather','label':'Weather','rows':[
   ['Precip, window before pass', rows(wk_precip)],
   ['Max temp, window before pass', rows(wk_temp)],
   ['Prev month precip', rows(lambda o: num(g(o,'prev_month_precip'),r'was ([\d.]+) inches','{} in'))],
   ['Prev month avg temp', rows(lambda o: num(g(o,'prev_month_temps'),r'were ([\d.]+)°F','{}°F'))],
   ['Pre-plant week precip', rows(lambda o: num(g(o,'weather_preplant'),r'was ([\d.]+) inches','{} in'))],
   ['7d before → 14d after planting', rows(lambda o: num(g(o,'weather_prepostplant'),r'was ([\d.]+) inches','{} in'))],
   ['10 days after planting', rows(lambda o: num(g(o,'planting_10days_precip'),r'was: (\d+(?:\.\d+)?)','{} in'))]]}
]
meta={'passes':[{'n':int(o['pass_number_header']),'date':o['flight_date_header'][5:].replace('-','/'),'order':o['order_id_header'],'stage':num(g(o,'phenological_stages'),r'100% (\S+)\.')} for o in P],
 'planting':num(g(P[0],'planting_date'),r'is (\S+?)\.?$'),'soil':inp['soil']}
CF={'weeds':('specific_weeds_missions','Weed severity by species, % of samples'),'nutrients':('specific_nutrients','Deficiency severity by nutrient, % of samples'),'diseases':('specific_diseases_dominant','Disease severity by type, % of samples'),'insects':('specific_insects','Insect severity by type, % of samples')}
def trow(r):
    d={'label':r[0],'cells':r[1]}
    if len(r)>2: d['sw']=r[2]
    return d
def tchart(t):
    if t['key'] not in CF: return None
    f,title=CF[t['key']]; return {'field':f,'title':title,'series':CH.get(f,[])}
print(json.dumps({'topics':[{'key':t['key'],'label':t['label'],'chart':tchart(t),'rows':[trow(r) for r in t['rows']]} for t in topics],'meta':meta},ensure_ascii=False))
