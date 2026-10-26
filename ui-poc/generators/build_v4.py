import json, re
OLD=open('gen/Review.bak28.html').read()
L=OLD.split('\n')
d=json.load(open('qa.json'))
case=[c for c in d['summary_cases'] if c['case_id']=='summary_1321763_5321127'][0]

# ---- reuse pieces from v3 ----
def block(start, end_pat):
    i=OLD.index(start); j=OLD.index(end_pat,i)+len(end_pat); return OLD[i:j]
inputLine=[l for l in L if l.startswith('    this.input = ')][0]
flagsBlk=block('    this.flags = [','\n    ];')
soyBlk=block('    this.soy = [','\n    ];')
passesBlk=block('    this.passes = [','\n    ];')
a=OLD.index('    const PAL = ['); b=OLD.index('    const flagTone')
chartMatrix=OLD[a:b].replace('parseFloat(c) >= 5','parseFloat(c) >= 3')
flagsMap=[l for l in L if l.startswith('    const flags = this.flags.map')][0]
flagTone=[l for l in L if l.startswith('    const flagTone')][0]
# input section inner (between section open and close)
si=OLD.index('<section style="height: 540px'); si=OLD.index('\n',si)+1; se=OLD.index('</section>',si)
inner=OLD[si:se]
inner=inner.replace('<div style="display: flex; justify-content: space-between; align-items: center; gap: 16px">\n<div style="display: flex; align-items: center; gap: 14px">','<div style="display: flex; flex-direction: column; gap: 6px">\n<div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap">',1)
inner=inner.replace('grid-template-columns: 210px repeat(6, minmax(0, 1fr))','grid-template-columns: 150px repeat(6, minmax(0, 1fr))')
inner=inner.replace('<div style="padding: 6px 8px; background: #eef0e7; border-radius: 6px">\n<div style="font-size: 11.5px; color: #565c4d">P{{p.n}}','<div style="{{p.style}}">\n<div style="font-size: 11px; color: #565c4d">P{{p.n}}')
inner=inner.replace('grid-template-columns: 170px 230px 80px 130px minmax(0, 1fr)','grid-template-columns: 120px 160px 70px 104px minmax(0, 1fr)')
assert inner.count('{{p.style}}')==1


# ---- chart: legend row above, narrow leading no-data passes ----
def R(txt, a, b, n=1):
    assert txt.count(a)==n, (a[:60], txt.count(a)); return txt.replace(a,b)
inner=R(inner,'<div style="display: grid; grid-template-columns: 150px repeat(6, minmax(0, 1fr)); gap: 4px">','<div style="{{gridStyle}}">')
li=inner.index('<div style="padding: 8px; display: flex; flex-direction: column; gap: 5px">'); lj=inner.index('<div style="{{chart.boxStyle}}">')
inner=inner[:li]+"""<div style="padding: 8px; font-size: 11.5px; font-weight: 600; color: #565c4d">% of samples</div>
<sc-for list="{{chart.gapCells}}" as="gc" hint-placeholder-count="2">
<div style="{{gc.style}}">{{gc.t}}</div>
</sc-for>
"""+inner[lj:]
LEG="""<div style="grid-column: 1 / -1; display: flex; flex-direction: column; gap: 6px; padding: 2px 2px 6px">
<div style="font-size: 12px; font-weight: 700; color: #3d4235">{{chart.title}}</div>
<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4px 16px">
<sc-for list="{{chart.legend}}" as="s" hint-placeholder-count="3">
<div style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #3d4235; min-width: 0"><span style="{{s.swatch}}"></span><span style="flex: 1; min-width: 0">{{s.name}}</span><span style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #565c4d; white-space: nowrap">{{s.peak}}</span></div>
</sc-for>
</div>
</div>
"""
inner=R(inner,'</sc-if>\n<sc-for list="{{matrix}}"', LEG+'</sc-if>\n<sc-for list="{{matrix}}"')
inner=R(inner,'<div style="position: absolute; left: 0; top: 0; right: 0; bottom: 0; display: grid; grid-template-columns: repeat(6, minmax(0, 1fr))">\n<sc-for list="{{chart.cols}}"','<div style="{{chart.colsStyle}}">\n<sc-for list="{{chart.cols}}"')
cm=chartMatrix
cm=R(cm,"    let chart = null;\n    if (ch) {","    let chart = null;\n    let lead = 0;\n    if (ch) {\n      while (lead < 5 && ch.series.every((x) => x.v[lead] === null)) lead++;\n      const kc = 6 - lead;\n      const IDX = [0, 1, 2, 3, 4, 5].slice(lead);")
cm=R(cm,"      const X = (i) => (i + 0.5) * 100;","      const X = (i) => (i - lead + 0.5) * (600 / kc);")
cm=R(cm,"      const cols = [0, 1, 2, 3, 4, 5].map((i) => {","      const cols = IDX.map((i) => {")
cm=R(cm,"boxStyle: 'grid-column: span 6;","boxStyle: 'grid-column: span ' + kc + ';")
cm=R(cm,"[0, 1, 2, 3, 4, 5].map((i) => 'M ' + X(i)","IDX.map((i) => 'M ' + X(i)")
cm=R(cm,"        cols: cols\n      };","        cols: cols,\n        colsStyle: 'position: absolute; left: 0; top: 0; right: 0; bottom: 0; display: grid; grid-template-columns: repeat(' + kc + ', minmax(0, 1fr))',\n        gapCells: [0, 1, 2, 3, 4, 5].slice(0, lead).map(() => ({ t: 'no data', style: 'display: flex; align-items: center; justify-content: center; background: #fbfbf8; border-radius: 8px; font-size: 10.5px; color: #a3a796; writing-mode: vertical-rl; transform: rotate(180deg)' }))\n      };")
cm=R(cm,"swatch: 'width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; background: ' + x.color, peak:","swatch: 'width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; background: ' + x.color, peak:")
inner=R(inner,'<div style="display: flex; flex-direction: column; gap: 6px">\n<div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap">','<div style="position: sticky; top: -12px; z-index: 5; margin: -12px -14px 0; padding: 12px 14px 8px; background: #ffffff; border-bottom: 1px solid #eef0e7; display: flex; flex-direction: column; gap: 6px">\n<div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap">')
inner=R(inner,'<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4px 16px">','<div style="display: grid; grid-template-columns: repeat(3, max-content); gap: 4px 32px">')
inner=R(inner,'<span style="flex: 1; min-width: 0">{{s.name}}</span>','<span>{{s.name}}</span>')
cm=R(cm,"      const top = [1, 2, 5, 10, 20, 40, 50, 100].find((t) => t >= mx) || 100;","      const nzAll = [].concat(...ser.map((x) => x.raw.filter((y) => y !== null && y > 0)));\n      const hiE = Math.ceil(Math.log10(Math.max(mx, 1e-6)));\n      let loE = Math.floor(Math.log10(Math.min(...nzAll, mx || 1)));\n      if (hiE - loE < 1) loE = hiE - 1;")
cm=R(cm,"      const H = Math.max(200,","      const H = Math.max(260,")
cm=R(cm,"      const Y = (y) => T + (1 - Math.sqrt(y) / Math.sqrt(top)) * (H - T - B);","      const Z = 18;\n      const Y = (y) => y <= 0 ? H - B : T + (1 - (Math.log10(y) - loE) / (hiE - loE)) * (H - T - B - Z);")
cm=R(cm,"      const tickVals = [0].concat([0.1, 1, 5, 10, 20, 40].filter((t) => t < top && !(top >= 20 && t === 0.1)), [top]);","      const tickVals = [0]; for (let e = loE; e <= hiE; e++) tickVals.push(Number(Math.pow(10, e).toPrecision(1)));")
chartMatrix=cm
chartMatrix=chartMatrix+"    const gridStyle = 'display: grid; grid-template-columns: 150px ' + '56px '.repeat(lead) + 'repeat(' + (6 - lead) + ', minmax(0, 1fr)); gap: 4px';\n"

# ---- judge check catalogue (subset needed for trails) ----
ALL_KEYS=set(re.findall(r'SEASON_[A-Z0-9_]+', open('gen/checks191.txt').read())) if False else None
ANALYSIS={'STAGE_CITED_NOT_RECORDED','WEED_TREND_GROUNDED','NUTRIENT_TREND_GROUNDED','DISEASE_TREND_GROUNDED','NO_MERGED_STAGE','TREND_WORD_ACCURACY'}
RECO=set()
def trail(key):
    fam=key.replace('SEASON_SUMMARY_','')
    a=('unknown' if fam in ANALYSIS else 'none'); r=('unknown' if fam in RECO else 'none')
    return [a,'fail',r]

desc={f['criterion']:f['reasoning'].replace(' Flagged critical=True in the subscriber repo.','') for f in case['failed']}
checks=[
 dict(id='F1',key='SEASON_SUMMARY_STAGE_CITED_NOT_RECORDED',critical=True,score='0',rtype='Against input · stages',threat='insects',rule='stage'),
 dict(id='F2',key='SEASON_SUMMARY_CONCLUSION_YIELD_IMPACT_COVERAGE',critical=False,score='0',rtype='Against yield loss',threat='insects',rule='yield'),
 dict(id='F3',key='SEASON_SUMMARY_WEED_TREND_REACHES_FINAL_MISSION',critical=False,score='0',rtype='Against input · weeds',threat='weeds',rule='weedtrend'),
]
bq=json.load(open('bq/case.json'))
ja=bq['summary_meta']['judge_analysis']; jr=bq['reco_judge']
def st(v): return 'none' if v is None else ('pass' if v==10 else 'fail')
for c in checks:
    fam=c['key'].replace('SEASON_SUMMARY_','')
    c['desc']=desc[c['key']]; c['short']=fam
    c['trail']=[st(ja.get('SEASON_ANALYSIS_'+fam)),'fail',st(jr.get('SEASON_RECO_'+fam))]
related={'analysisFails':[k.replace('SEASON_ANALYSIS_','') for k,v in ja.items() if v!=10],
 'sumFixed':[k.replace('SEASON_SUMMARY_','') for k in bq['summary_meta']['judge_corrections']],
 'recoFixed':[k.replace('SEASON_RECO_','') for k in bq['reco_meta']['judge_corrections']],
 'sumAvg':bq['summary_meta']['judge_stats']['average_score'],'recoAvg':bq['reco_meta']['judge_stats']['average_score'],
 'recoN':len(jr),'sumN':len(bq['summary_judge']),'anaN':len(ja),'anaAvg':bq['summary_meta']['judge_analysis_stats']['average_score']}

HTML=open('gen/v4_markup.html').read().replace('%%INPUT_INNER%%',inner)
JS=open('gen/v4_logic.js').read()
JS=JS.replace('%%INPUT%%',inputLine).replace('%%FLAGS%%',flagsBlk).replace('%%SOY%%',soyBlk).replace('%%PASSES%%',passesBlk)
JS=JS.replace('%%CHARTMATRIX%%',chartMatrix).replace('%%FLAGTONE%%',flagTone).replace('%%FLAGSMAP%%',flagsMap)
JS=JS.replace('%%SUMMARY%%',json.dumps(case['output_text'],ensure_ascii=False)).replace('%%ANALYSIS%%',json.dumps(case['season_analysis_text'],ensure_ascii=False)).replace('%%CHECKS%%',json.dumps(checks,ensure_ascii=False)).replace('%%RECO%%',json.dumps(bq['reco_text'].strip(),ensure_ascii=False)).replace('%%RELATED%%',json.dumps(related))
out=HTML.replace('%%SCRIPT%%',JS)
open('qcui/project/Review.dc.html','w').write(out)
print('ok', len(out))
