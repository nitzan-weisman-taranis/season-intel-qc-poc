class Component extends DCLogic {
  constructor(props) {
    super(props);
%%INPUT%%
%%FLAGS%%
%%SOY%%
%%PASSES%%
    this.summary = %%SUMMARY%%;
    this.analysis = %%ANALYSIS%%;
    this.checks = %%CHECKS%%;
    this.reco = %%RECO%%;
    this.related = %%RELATED%%;
    this.colors = ['#c0392b', '#256abf', '#8e44ad'];
    this.wash = ['#f9dcd8', '#dde8f7', '#ecdff4'];
    this.finalLoss = [['emergence', 'Stand count', 0.0], ['weeds', 'Weeds', 10.0], ['nutrients', 'Nutrients', 13.4], ['insects', 'Insects', 0.7], ['diseases', 'Diseases', 0.1]];
    this.threshold = 3;
    this.state = { selF: 'F1', threat: 'insects', edit: false, draft: this.summary, editR: false, draftR: this.reco, lower: 'reco', status: { F1: 'open', F2: 'open', F3: 'open' }, notes: { F1: '', F2: '', F3: '' }, showSubmit: false, done: false, dryRun: true, lastDry: true, applied: 0, showSoy: false };
  }

  blocks(text) {
    const chunks = text.split(/\n\s*\n/).map((c) => c.trim()).filter(Boolean);
    const out = [];
    chunks.forEach((c) => {
      let heading = '';
      let body = c;
      const m = c.match(/^\*\*(Season Conclusion|Season Detail):\*\*\s*/);
      if (m) { heading = m[1]; body = c.slice(m[0].length).trim(); }
      if (!body) { out.push({ heading: heading, body: '', threat: '' }); return; }
      let threat = 'weather';
      if (heading === 'Season Conclusion') threat = 'conclusion';
      else if (/stand count|emergence/i.test(body)) threat = 'emergence';
      else if (/weed/i.test(body)) threat = 'weeds';
      else if (/deficien|potassium|nitrogen|sulfur/i.test(body)) threat = 'nutrients';
      else if (/leaf spot|nclb|blight|rust|disease/i.test(body)) threat = 'diseases';
      else if (/beetle|stink bug|insect|borer|chewing/i.test(body)) threat = 'insects';
      out.push({ heading: heading, body: body, threat: threat });
    });
    // merge a bare "Season Detail" header into the block that follows it
    const merged = [];
    out.forEach((b) => { if (!b.body && merged.length >= 0) { b.pending = true; merged.push(b); return; } const prev = merged[merged.length - 1]; if (prev && prev.pending) { merged.pop(); b.heading = prev.heading; } merged.push(b); });
    return merged.filter((b) => b.body);
  }

  ruleCheck(blocks) {
    const STAGE = /(?<![A-Za-z0-9])(?:V[ET]|V\d{1,2}|R\d)(?:\s*[-–]\s*(?:V[ET]|V\d{1,2}|R\d))?(?![A-Za-z0-9])/g;
    const norm = (t) => t.replace(/\s/g, '').replace('–', '-');
    const recorded = this.passes.map((p) => p.stage);
    const marks = blocks.map(() => []);
    const re = {};
    // F1 · stage cited not recorded
    const bad = [];
    blocks.forEach((b, i) => { let m; STAGE.lastIndex = 0; while ((m = STAGE.exec(b.body))) { if (recorded.indexOf(norm(m[0])) < 0) { marks[i].push({ s: m.index, e: m.index + m[0].length, f: 'F1' }); bad.push(m[0] + ' (' + b.threat + ')'); } } });
    const terms = { F1: [], F2: [], F3: [] };
    marks.forEach((ml, i) => ml.forEach((m) => { if (m.f === 'F1') terms.F1.push(blocks[i].body.slice(m.s, m.e)); }));
    re.F1 = bad.length ? bad.map((x) => '"' + x.replace(' (', '" (').replace(/\(([a-z])/, (m, c) => '(' + c.toUpperCase())).join(', ') + ' is not a recorded stage · Recorded: ' + recorded.join(', ') : 'No unrecorded stage found';
    // F2 · conclusion yield coverage
    const ci = blocks.findIndex((b) => b.threat === 'conclusion');
    const pats = { emergence: /stand count|emergence/gi, weeds: /weed\w*/gi, nutrients: /potassium|sulfur|nitrogen|nutrient\w*/gi, insects: /stink bug\w*|insect\w*|beetle\w*|corn borer/gi, diseases: /disease\w*|gray leaf spot|nclb|rust|blight/gi };
    const named = {};
    if (ci >= 0) {
      const body = blocks[ci].body;
      this.finalLoss.forEach((l) => {
        const p = pats[l[0]]; p.lastIndex = 0; let m; const hits = [];
        while ((m = p.exec(body))) hits.push(m);
        if (hits.length) {
          named[l[0]] = hits.map((h) => h[0]);
          if (l[2] < this.threshold) hits.forEach((h) => { marks[ci].push({ s: h.index, e: h.index + h[0].length, f: 'F2' }); terms.F2.push(h[0]); });
        }
      });
    }
    const extra = this.finalLoss.filter((l) => named[l[0]] && l[2] < this.threshold).map((l) => l[1] + ' ' + l[2].toFixed(1) + ' ("' + named[l[0]][0] + '")');
    const missing = this.finalLoss.filter((l) => !named[l[0]] && l[2] >= this.threshold).map((l) => l[1] + ' ' + l[2].toFixed(1));
    const ok = this.finalLoss.filter((l) => named[l[0]] && l[2] >= this.threshold).map((l) => l[1] + ' ' + l[2].toFixed(1));
    re.F2 = 'Below ' + this.threshold + ' bu/ac but named: ' + (extra.join(', ') || 'none') + ' · Above ' + this.threshold + ', named: ' + (ok.join(', ') || 'none') + ' · Missing: ' + (missing.join(', ') || 'none');
    // F3 · weed trend reaches final mission
    const wi = blocks.findIndex((b) => b.threat === 'weeds');
    const finalStage = this.passes[this.passes.length - 1].stage;
    const wt = this.input.find((t) => t.key === 'weeds');
    const pr = wt ? wt.rows.find((r) => r.label === 'weeds_pressure') : null;
    const p6 = pr ? pr.cells[pr.cells.length - 1] : '–';
    re.F3 = 'No weed block found.';
    if (wi >= 0) {
      const body = blocks[wi].body; let m; let last = null; STAGE.lastIndex = 0;
      while ((m = STAGE.exec(body))) last = m;
      if (last) {
        let s0 = last.index + last[0].length; while (/[,\s]/.test(body[s0])) s0++;
        const rest = body.slice(s0); const cut = rest.search(/[;.]/); const e0 = s0 + (cut < 0 ? rest.length : cut);
        if (norm(last[0]) !== finalStage) marks[wi].push({ s: s0, e: e0, f: 'F3' });
        re.F3 = 'Last weed stage cited: ' + last[0] + ' · Final pass P6 (' + finalStage + '): weeds_pressure "' + p6 + '"';
      }
    }
    terms.F3 = ['remained mild', 'rest of the season', 'through the season'];
    return { marks: marks, recheck: re, named: named, terms: terms };
  }

  carry(rblocks, terms) {
    const marks = rblocks.map(() => []);
    const found = { F1: [], F2: [], F3: [] };
    Object.keys(terms).forEach((f) => {
      const uniq = Array.from(new Set(terms[f].map((t) => t.toLowerCase())));
      rblocks.forEach((b, i) => {
        const low = b.body.toLowerCase();
        uniq.forEach((t) => { let k = low.indexOf(t); while (k >= 0) { marks[i].push({ s: k, e: k + t.length, f: f }); found[f].push('"' + b.body.slice(k, k + t.length) + '" in the ' + b.threat + ' block'); k = low.indexOf(t, k + t.length); } });
      });
    });
    Object.keys(found).forEach((f) => { const n = {}; found[f].forEach((x) => { n[x] = (n[x] || 0) + 1; }); found[f] = Object.keys(n).map((x) => n[x] > 1 ? x + ' (' + n[x] + '×)' : x); });
    return { marks: marks, found: found };
  }

  renderVals() {
    const s = this.state;
    const statusDefs = [['open', 'Open'], ['fixed', 'Fixed in edit'], ['false', 'Judge false claim'], ['team', 'Question for team']];
    const statusTone = { open: 'background: #fbe3e0; color: #7a1815', fixed: 'background: #e3f2df; color: #075c07', false: 'background: #e6e3f4; color: #4b4380', team: 'background: #fbefd9; color: #7a4e08' };
    const blocks = this.blocks(this.summary);
    const rc = this.ruleCheck(blocks);
    const rblocks = this.reco.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean).map((body) => {
      let threat = 'weather';
      if (/weed/i.test(body)) threat = 'weeds'; else if (/fungicide|leaf spot|blight|rust|disease/i.test(body)) threat = 'diseases'; else if (/nutrient|potassium|nitrogen|sulfur|fertility/i.test(body)) threat = 'nutrients'; else if (/stink bug|insect|beetle|borer/i.test(body)) threat = 'insects'; else if (/stand|emergence|planter/i.test(body)) threat = 'emergence';
      return { heading: '', body: body, threat: threat };
    });
    const co = this.carry(rblocks, rc.terms);
    const fidx = (id) => this.checks.findIndex((c) => c.id === id);
    const selC = this.checks.find((c) => c.id === s.selF);
    const trailDef = { pass: ['passed', 'background: #e3f2df; color: #075c07'], fail: ['failed', 'background: #fbe3e0; color: #7a1815'], unknown: ['not in export', 'background: #ffffff; color: #565c4d; border: 1px dashed #b9bcae'], none: ['no check', 'background: #f7f8f3; color: #a3a796'] };
    const jumpF = (t) => setTimeout(() => { ['sum', 'reco', 'ana'].forEach((pre) => { const el = document.querySelector('[data-jump="' + pre + '-' + t + '"]'); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }); }, 60);
    const findings = this.checks.map((c, i) => {
      const on = c.id === s.selF; const st = s.status[c.id];
      return {
        num: String(i + 1), short: c.short, rtype: c.rtype, score: c.score, on: on ? 'true' : 'false',
        critLabel: c.critical ? 'Critical' : 'Non-critical',
        critStyle: 'font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px; ' + (c.critical ? 'background: #7a1815; color: #ffffff' : 'background: #eef0e7; color: #565c4d'),
        cardStyle: 'width: 100%; text-align: left; padding: 10px 12px; border-radius: 10px; display: flex; flex-direction: column; gap: 7px; background: #ffffff; ' + (on ? 'border: 2px solid ' + this.colors[i] + '; box-shadow: 0 1px 4px rgba(28, 33, 23, 0.12)' : 'border: 1px solid #dcded3'),
        dotStyle: 'width: 22px; height: 22px; flex-shrink: 0; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: #ffffff; background: ' + this.colors[i],
        statusLabel: statusDefs.find((x) => x[0] === st)[1],
        statusStyle: 'flex-shrink: 0; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px; ' + statusTone[st],
        trail: ['Analysis', 'Summary', 'Reco'].map((n, k) => ({ label: n + ' · ' + trailDef[c.trail[k]][0], style: 'font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 6px; ' + trailDef[c.trail[k]][1] })),
        pick: () => { this.setState({ selF: c.id, threat: c.threat }); jumpF(c.threat); }
      };
    });
    const si = fidx(s.selF);
    const sel = {
      key: selC.key, desc: selC.desc, recheck: rc.recheck[selC.id],
      carry: co.found[selC.id].length ? 'Same wording found in the recommendation: ' + co.found[selC.id].join(', ') + '.' : 'Not found in the recommendation text.',
      statuses: statusDefs.map((x) => ({ label: x[1], style: 'height: 30px; padding: 0 10px; font-size: 12px; font-weight: 600; border-radius: 999px; ' + (s.status[selC.id] === x[0] ? statusTone[x[0]] + '; border: 1px solid currentColor' : 'background: #ffffff; color: #565c4d; border: 1px solid #c7cabb'), pick: () => { const o = Object.assign({}, s.status); o[selC.id] = x[0]; this.setState({ status: o }); } })),
      note: s.notes[selC.id],
      onNote: (e) => { const o = Object.assign({}, s.notes); o[selC.id] = e.target.value; this.setState({ notes: o }); }
    };
    const jump = (t) => setTimeout(() => {
      ['sum', 'reco', 'ana'].forEach((pre) => { const el = document.querySelector('[data-jump="' + pre + '-' + t + '"]'); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });
    }, 60);
    const renderBlocks = (blocks, allMarks, pre) => blocks.map((b, bi) => {
      const ms = allMarks[bi].slice().sort((p, q) => p.s - q.s);
      const segs = []; let pos = 0;
      ms.forEach((m) => { if (m.s < pos) return; if (m.s > pos) segs.push({ t: b.body.slice(pos, m.s), style: '' }); const k = fidx(m.f); const on = m.f === s.selF; segs.push({ t: b.body.slice(m.s, m.e), style: 'border-radius: 3px; padding: 1px 2px; background: ' + this.wash[k] + '; ' + (on ? 'box-shadow: inset 0 -2px 0 ' + this.colors[k] + '; font-weight: 600' : '') }); pos = m.e; });
      if (pos < b.body.length) segs.push({ t: b.body.slice(pos), style: '' });
      const hasSel = ms.some((m) => m.f === s.selF);
      const onThreat = b.threat === s.threat;
      const tags = { conclusion: 'Conclusion', emergence: 'Emergence', weeds: 'Weeds', nutrients: 'Nutrients', diseases: 'Diseases', insects: 'Insects', weather: 'Weather' };
      return {
        hasHeading: !!b.heading, heading: b.heading, tag: tags[b.threat] || '',
        tagStyle: 'display: inline-block; font-size: 10.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; margin-right: 8px; color: #8b9080',
        style: 'width: 100%; text-align: left; padding: 8px 10px; font-size: 13.5px; line-height: 1.55; color: #1c2117; border-radius: 8px; background: #ffffff; ' + (hasSel ? 'border: 2px solid ' + this.colors[si] : (onThreat ? 'border: 1px solid #0a7a0a' : 'border: 1px solid transparent')),
        segs: segs, jumpId: pre + '-' + (blocks.findIndex((x) => x.threat === b.threat) === bi ? b.threat : 'x' + bi),
        pick: () => { const m = ms.find((x) => true); const t = b.threat === 'conclusion' ? (m ? 'insects' : s.threat) : b.threat; this.setState(m ? { threat: t, selF: m.f } : { threat: t }); jump(t); }
      };
    });
    const sumBlocks = renderBlocks(blocks, rc.marks, 'sum');
    const recoBlocks = renderBlocks(rblocks, co.marks, 'reco');
    const anaMap = { emergence: 'emergence', weeds: 'weeds', diseases: 'diseases', nutrients: 'nutrients', insects: 'insects', weather: 'weather' };
    const anaBlocks = this.analysis.split(/\n\s*\n/).map((x) => x.replace(/^\s+|\s+$/g, '')).filter(Boolean).map((txt) => {
      const first = txt.split('\n')[0]; const w = first.split(/[\s—-]/)[0].toLowerCase(); const t = anaMap[w] || 'weather';
      const on = t === s.threat;
      return { head: first, body: txt.split('\n').slice(1).map((l) => l.trim()).join('\n'), jumpId: 'ana-' + t,
        style: 'width: 100%; text-align: left; padding: 8px 10px; font-size: 12.5px; line-height: 1.5; color: #3d4235; border-radius: 8px; background: #ffffff; ' + (on ? 'border: 1px solid #0a7a0a' : 'border: 1px solid #eef0e7'),
        pick: () => { this.setState({ threat: t }); jump(t); } };
    });
    const R = this.related;
    const relatedText = 'Analysis: ' + R.anaN + ' checks, avg ' + R.anaAvg + ', failed ' + (R.analysisFails.join(', ') || 'none') + ' (analysis corrections are off) · Auto-fixed: Summary ' + (R.sumFixed.join(', ') || 'none') + ' · Recommendation ' + (R.recoFixed.join(', ') || 'none');
    const lowerTabs = [['reco', 'Recommendations'], ['analysis', 'Analysis']].map((t) => ({ label: t[1], on: s.lower === t[0] ? 'true' : 'false', pick: () => this.setState({ lower: t[0] }), style: 'height: 30px; padding: 0 12px; font-size: 13px; font-weight: 700; border-radius: 7px; ' + (s.lower === t[0] ? 'background: #1c2117; color: #ffffff; border: 1px solid #1c2117' : 'background: #ffffff; color: #565c4d; border: 1px solid #c7cabb') }));
    const losses = this.finalLoss.map((l) => {
      const above = l[2] >= this.threshold; const nm = !!rc.named[l[0]];
      const bad = (above && !nm) || (!above && nm);
      const tag = above ? (nm ? 'above · in conclusion' : 'above · missing from conclusion') : (nm ? 'below · named in conclusion' : 'below · not named');
      const focus = selC.rule === 'yield' && bad;
      return { label: l[1], value: l[2].toFixed(1), tag: tag,
        style: 'padding: 8px 10px; border-radius: 8px; display: flex; flex-direction: column; gap: 2px; ' + (above ? 'background: #f6d7b8; color: #6b3a0c' : 'background: #f7f8f3; color: #3d4235') + (focus ? '; box-shadow: inset 0 0 0 2px ' + this.colors[si] : ''),
        tagStyle: 'font-size: 11px; font-weight: 600; ' + (bad ? 'color: #9b1c14' : 'color: #565c4d') };
    });
    const topicKeys = [['emergence', 'Stand count'], ['weeds', 'Weeds'], ['nutrients', 'Nutrients'], ['diseases', 'Diseases'], ['insects', 'Insects'], ['weather', 'Weather']];
    const topicTabs = topicKeys.map((k) => ({ label: k[1], on: s.threat === k[0] ? 'true' : 'false', style: 'height: 30px; padding: 0 12px; font-size: 12.5px; font-weight: 600; border-radius: 7px; ' + (s.threat === k[0] ? 'background: #0a7a0a; color: #ffffff; border: 1px solid #0a7a0a' : 'background: #ffffff; color: #565c4d; border: 1px solid #c7cabb'), pick: () => this.setState({ threat: k[0] }) }));
    const passHeads = this.passes.map((p, i) => {
      const hl = (selC.rule === 'stage') || (selC.rule === 'weedtrend' && i === this.passes.length - 1);
      return Object.assign({}, p, { style: 'padding: 6px 8px; background: #eef0e7; border-radius: 6px' + (hl ? '; box-shadow: inset 0 0 0 2px ' + this.colors[si] : '') });
    });
    const topic = this.input.find((x) => x.key === s.threat);
%%CHARTMATRIX%%
    if (selC.rule === 'weedtrend' && s.threat === 'weeds') {
      matrix.forEach((r) => { if (r.label === 'weeds_pressure') { r.labelStyle += '; box-shadow: inset 0 0 0 2px ' + this.colors[si] + '; border-radius: 6px'; r.cells[r.cells.length - 1].style += '; box-shadow: inset 0 0 0 2px ' + this.colors[si]; } });
    }
    if (selC.rule === 'stage' && s.threat === 'emergence') {
      matrix.forEach((r) => { if (r.label === 'Phenological stage') { r.labelStyle += '; box-shadow: inset 0 0 0 2px ' + this.colors[si] + '; border-radius: 6px'; } });
    }
%%FLAGTONE%%
%%FLAGSMAP%%
    const changed = s.draft !== this.summary;
    const changedR = s.draftR !== this.reco;
    const openCount = Object.values(s.status).filter((v) => v === 'open').length;
    const resolutionRows = this.checks.map((c, i) => ({ num: String(i + 1), key: c.short, label: statusDefs.find((x) => x[0] === s.status[c.id])[1], style: 'font-size: 12px; font-weight: 700; padding: 2px 8px; border-radius: 999px; ' + statusTone[s.status[c.id]] }));
    return {
      gridStyle, findings, sel, sumBlocks, recoBlocks, relatedText, lowerTabs,
      sumMeta: 'Summary · ' + R.sumN + ' checks · avg ' + R.sumAvg + ' · 3 failed (1 critical)', recoMeta: R.recoN + ' checks passed · avg ' + R.recoAvg + ' · ' + R.recoFixed.length + ' auto-fixed', losses, topicTabs, passHeads, matrix, flags, resolutionRows,
      hasChart: !!chart, chart: chart || { legend: [], ticks: [], cols: [] },
      isWeather: s.threat === 'weather', notWeather: s.threat !== 'weather', showSoy: !!s.showSoy, soy: this.soy, soyLabel: s.showSoy ? 'Hide soybean thresholds' : 'Show soybean thresholds', toggleSoy: () => this.setState({ showSoy: !s.showSoy }),
      showReco: s.lower === 'reco', showAnalysis: s.lower === 'analysis', analysis: this.analysis, anaBlocks,
      viewMode: !s.edit, editMode: s.edit, editLabel: s.edit ? 'Done editing' : 'Edit text',
      editBtnStyle: 'height: 30px; padding: 0 12px; font-size: 12px; font-weight: 700; border-radius: 7px; ' + (s.edit ? 'background: #0a7a0a; color: #ffffff; border: 1px solid #0a7a0a' : 'background: #ffffff; color: #0a7a0a; border: 1px solid #0a7a0a'),
      toggleEdit: () => this.setState({ edit: !s.edit }),
      viewModeR: !s.editR, editModeR: s.editR, editLabelR: s.editR ? 'Done editing' : 'Edit text',
      editBtnStyleR: 'height: 30px; padding: 0 12px; font-size: 12px; font-weight: 700; border-radius: 7px; ' + (s.editR ? 'background: #0a7a0a; color: #ffffff; border: 1px solid #0a7a0a' : 'background: #ffffff; color: #0a7a0a; border: 1px solid #0a7a0a'),
      toggleEditR: () => this.setState({ editR: !s.editR }),
      draftR: s.draftR, onDraftR: (e) => this.setState({ draftR: e.target.value }), resetTextR: () => this.setState({ draftR: this.reco, editR: false }),
      changedLabelR: changedR ? 'Edited' : 'Unchanged',
      changedStyleR: 'font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px; ' + (changedR ? 'background: #e3f2df; color: #075c07' : 'background: #eef0e7; color: #8b9080'),
      draft: s.draft, onDraft: (e) => this.setState({ draft: e.target.value }), resetText: () => this.setState({ draft: this.summary, edit: false }),
      changedLabel: changed ? 'Edited' : 'Unchanged',
      changedStyle: 'font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px; ' + (changed ? 'background: #e3f2df; color: #075c07' : 'background: #eef0e7; color: #8b9080'),
      resolvedLabel: (3 - openCount) + ' of 3 resolved',
      overrideLabel: s.applied ? 'Submitted' : 'Not submitted',
      showSubmit: s.showSubmit, notDone: !s.done, isDone: s.done,
      warnText: openCount ? openCount + ' finding(s) still open. Resolve each one (fixed, judge false claim, or question for team) before submitting.' : 'All findings resolved.',
      warnStyle: 'padding: 8px 10px; border-radius: 8px; font-size: 13px; font-weight: 600; ' + (openCount ? 'background: #fbe3e0; color: #7a1815' : 'background: #e3f2df; color: #075c07'),
      changeSummary: 'Summary ' + (changed ? 'edited' : 'unchanged') + ' · Recommendation ' + (changedR ? 'edited' : 'unchanged'),
      openSubmit: () => this.setState({ showSubmit: true, done: false }),
      closeSubmit: () => this.setState({ showSubmit: false, done: false }),
      dryRun: s.dryRun, toggleDry: () => this.setState({ dryRun: !s.dryRun }),
      submitLabel: s.dryRun ? 'Run dry run' : 'Submit to Argo',
      doSubmit: () => { if (openCount) return; this.setState({ done: true, lastDry: s.dryRun, applied: s.dryRun ? s.applied : 1 }); },
      doneTitle: s.lastDry ? 'Dry run complete' : 'Correction submitted',
      doneBody: s.lastDry ? 'Nothing was sent. The corrected summary and recommendation and each finding\'s resolution and note are logged as a dry run.' : 'The override workflow is running; the tool reads the status back by workflow name. (Prototype: nothing was actually sent.)'
    };
  }
}
