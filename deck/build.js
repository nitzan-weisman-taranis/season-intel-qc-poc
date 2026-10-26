const pptxgen = require('pptxgenjs');
const pres = new pptxgen();
pres.layout = 'LAYOUT_16x9'; // 10 x 5.625
pres.title = 'Season Intelligence QC Automation POC';
pres.author = 'Nitzan Weisman';
pres.theme = { headFontFace: 'Arial', bodyFontFace: 'Arial' };

const F = 'Arial', MONO = 'Courier New';
const INK = '1D1F1C', MUTED = '5B5F58', GREEN = '2F6B4F', DKGREEN = '1F4A36',
  TINT = 'E8F2EC', AMBER = '8A5A0B', AMBERT = 'FBEFD9', AMBERL = 'B7791F',
  BORDER = 'D6D4CB', BG = 'FAFAFA', WHITE = 'FFFFFF', PURPLE = '4B4380', RED = '8C2F12', REDT = 'FBF1EE', PANEL = 'F4F3EE';

const T = (s, text, x, y, w, h, o = {}) => s.addText(text, Object.assign({ x, y, w, h, fontFace: F, fontSize: 14, color: INK, margin: 0, valign: 'top', isTextBox: true }, o));
const R = (s, x, y, w, h, o = {}) => s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: o.r ?? 0.08, fill: { color: o.fill || WHITE }, line: { color: o.line || BORDER, width: o.lw || 1 } });
const A = (s, x1, y1, x2, y2, color = MUTED) => s.addShape(pres.shapes.LINE, { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1) || 0.001, h: Math.abs(y2 - y1) || 0.001, flipV: y2 < y1, flipH: x2 < x1, line: { color, width: 1.5, endArrowType: 'triangle' } });
const title = (s, text) => T(s, text, 0.5, 0.35, 9, 0.95, { fontSize: 26, bold: true, valign: 'top' });
const slide = () => { const s = pres.addSlide(); s.background = { color: BG }; return s; };
const circle = (s, x, y, d, n, fill = GREEN) => { s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: fill }, line: { color: fill } }); T(s, String(n), x, y, d, d, { fontSize: 14, bold: true, color: WHITE, align: 'center', valign: 'middle' }); };

// 1. Title
{
  const s = pres.addSlide(); s.background = { color: DKGREEN };
  T(s, 'Season Intelligence QC Automation POC', 0.7, 1.6, 8.6, 1.3, { fontSize: 36, bold: true, color: WHITE, valign: 'bottom' });
  T(s, 'Connectivity needed and the suggested review UI', 0.7, 3.05, 8.6, 0.5, { fontSize: 18, color: 'D8E8DE' });
  T(s, 'Nitzan Weisman · QC Agronomy · October 2026', 0.7, 4.6, 8.6, 0.4, { fontSize: 14, color: 'B9D3C3' });
}

// 2. Today
{
  const s = slide();
  title(s, 'Fixing a flagged recommendation takes three manual steps today');
  const cards = [
    ['Judge flags a result', 'An automated judge marks season recommendations that fail a check.', false],
    ['Analyst verifies in GCS', 'I open the input data in GCS buckets to check whether the judge found a real error.', false],
    ['Copy-paste into Argo', 'I paste the corrected text into the Argo web UI by hand to submit the fix.', true]
  ];
  const w = 2.6, gap = 0.6, y = 1.5, h = 2.45;
  cards.forEach(([head, body, hi], i) => {
    const x = 0.5 + i * (w + gap);
    R(s, x, y, w, h, { fill: hi ? AMBERT : WHITE, line: hi ? AMBERL : BORDER, lw: hi ? 1.5 : 1 });
    circle(s, x + 0.2, y + 0.2, 0.42, i + 1, hi ? AMBERL : GREEN);
    T(s, head, x + 0.2, y + 0.75, w - 0.4, 0.55, { fontSize: 16, bold: true });
    T(s, body, x + 0.2, y + 1.38, w - 0.4, 0.85, { fontSize: 13, color: hi ? INK : MUTED });
    if (i < 2) A(s, x + w + 0.08, y + h / 2, x + w + gap - 0.08, y + h / 2);
  });
  T(s, 'The POC removes this step', 0.5 + 2 * (w + gap), y + h + 0.12, w, 0.3, { fontSize: 12, bold: true, color: AMBER });
  T(s, [{ text: 'Step 2 stays a human judgment; ', options: { bold: true } }, { text: 'the tool puts the judge call and the input data on one screen. Step 3 becomes one reviewed submit.' }], 0.5, 4.45, 9, 0.6, { fontSize: 14 });
}

// 3. Architecture
{
  const s = slide();
  title(s, 'The POC links judge results, GCS and Argo through one review tool');
  const box = (x, y, w, h, head, sub, o = {}) => {
    R(s, x, y, w, h, o);
    T(s, head, x + 0.15, y + 0.13, w - 0.3, 0.3, { fontSize: 14, bold: true });
    T(s, sub, x + 0.15, y + 0.45, w - 0.3, h - 0.5, { fontSize: o.subSize || 12, color: MUTED, fontFace: o.mono ? MONO : F });
  };
  box(0.5, 1.5, 2.2, 1.0, 'Judge results', 'BigQuery, or Postgres if BigQuery lags');
  box(0.5, 2.9, 2.2, 1.0, 'GCS input data', 'The inputs the judge checked');
  R(s, 3.3, 1.5, 2.6, 2.4, { fill: TINT, line: GREEN, lw: 2 });
  T(s, 'Review tool (you)', 3.45, 1.63, 2.3, 0.3, { fontSize: 14, bold: true, color: DKGREEN });
  T(s, [
    { text: 'Work queue from judge fails', options: { bullet: true, breakLine: true } },
    { text: 'Judge call next to input data', options: { bullet: true, breakLine: true } },
    { text: 'Edit the correction', options: { bullet: true, breakLine: true } },
    { text: 'Approve, dry run or reject', options: { bullet: true } }
  ], 3.45, 2.02, 2.35, 1.75, { fontSize: 12, paraSpaceAfter: 4 });
  box(6.5, 1.5, 3.0, 1.0, 'Argo override workflow', 'ag-assistant-season-reco-override-by-agronomist', { mono: true, subSize: 9 });
  box(6.5, 2.9, 3.0, 1.0, 'Status store and audit log', 'Who approved what, workflow name, status');
  A(s, 2.72, 2.0, 3.28, 2.0); A(s, 2.72, 3.4, 3.28, 3.4);
  A(s, 5.92, 2.0, 6.48, 2.0); A(s, 5.92, 3.4, 6.48, 3.4);
  A(s, 8.0, 2.52, 8.0, 2.88);
  T(s, [{ text: 'Nothing reaches Argo without a reviewer approving ', options: {} }, { text: 'a before/after check.', options: { bold: true } }], 0.5, 4.4, 9, 0.5, { fontSize: 14 });
}

// 4. Connections table
{
  const s = slide();
  title(s, 'Five connections, each needing access the tool does not have yet');
  const bnone = { type: 'none' }, bl = { pt: 1, color: 'E0E0E0' };
  const cell = (text, o = {}) => ({ text, options: Object.assign({ border: [bnone, bnone, bl, bnone], fontFace: F, fontSize: 12, color: INK, valign: 'middle', margin: [3, 6, 3, 0] }, o) });
  const first = (a, b) => cell([{ text: a, options: { bold: true, breakLine: true } }, { text: b, options: { color: MUTED, fontSize: 10 } }]);
  const rows = [
    [cell('Connection', { bold: true }), cell('Used for', { bold: true }), cell('Access needed (owner)', { bold: true })],
    [first('Judge results', 'BigQuery BI_POSTGRES.mavrx_ag_assistant_results'), cell('Build the work queue from failed checks'), cell('BigQuery read on the dataset (Raz/Avi)')],
    [first('Live text', 'Postgres ag_assistant_results'), cell('Re-read the latest text just before submit, if BigQuery lags'), cell('Read-only database connection (Raz/Avi)')],
    [first('Input data', 'GCS input buckets'), cell('Show the inputs the judge checked'), cell('Object viewer on the buckets (Raz/Avi)')],
    [first('Argo override workflow', 'production template'), cell('Submit the fix and read its status'), cell('API token or SSO, plus submit permission on the template (Dafna/AJ)')],
    [first('Status store', 'new small BigQuery table'), cell('Track reviewed cases, log every submit'), cell('Write access to one table (Raz/Avi)')]
  ];
  s.addTable(rows, { x: 0.5, y: 1.4, w: 9, colW: [3.1, 2.8, 3.1], rowH: [0.38, 0.62, 0.62, 0.62, 0.62, 0.62] });
}

// 5. Multipool access
{
  const s = slide();
  title(s, 'Multipool users need one shared, approved way into the tool');
  const card = (x, head, tag, body, pro, con, hi) => {
    R(s, x, 1.5, 4.3, 2.55, { fill: hi ? TINT : WHITE, line: hi ? GREEN : BORDER, lw: hi ? 2 : 1 });
    T(s, head, x + 0.25, 1.68, 3.0, 0.35, { fontSize: 17, bold: true });
    if (tag) T(s, tag, x + 2.9, 1.72, 1.2, 0.3, { fontSize: 11, bold: true, color: DKGREEN, align: 'right' });
    T(s, body, x + 0.25, 2.12, 3.8, 0.8, { fontSize: 13, color: MUTED });
    T(s, [{ text: '+ ', options: { bold: true, color: GREEN } }, { text: pro, options: { breakLine: true } }, { text: '– ', options: { bold: true, color: RED } }, { text: con }], x + 0.25, 3.0, 3.8, 0.9, { fontSize: 13, paraSpaceAfter: 4 });
  };
  card(0.5, 'Per-user access', '', 'Add each reviewer to the groups for BigQuery, GCS and Argo.', 'Quick for two or three people', 'Every new reviewer needs data and Argo rights', false);
  card(5.2, 'Shared app', 'SUGGESTED', 'Host the tool behind company SSO (e.g. Cloud Run). One service account holds the data and Argo access.', 'Reviewers only need to log in', 'One-time setup and approval', true);
  T(s, [{ text: 'For Raz/Avi: ', options: { bold: true } }, { text: 'which option fits our policy, who approves it, and how long approval takes.' }], 0.5, 4.4, 9, 0.5, { fontSize: 14 });
}

// UI frame helper
const frame = (s, badge) => {
  R(s, 0.5, 1.3, 9, 3.95, { fill: WHITE, line: BORDER, r: 0.05 });
  T(s, 'Season Intelligence QC', 0.7, 1.4, 3, 0.3, { fontSize: 12, bold: true, valign: 'middle' });
  R(s, 6.85, 1.42, 2.5, 0.26, { fill: AMBERT, line: AMBERT, r: 0.13 });
  T(s, badge, 6.85, 1.42, 2.5, 0.26, { fontSize: 9, bold: true, color: AMBER, align: 'center', valign: 'middle' });
  s.addShape(pres.shapes.LINE, { x: 0.5, y: 1.8, w: 9, h: 0, line: { color: BORDER, width: 1 } });
};
const lab = (s, text, x, y, w, color = MUTED) => T(s, text, x, y, w, 0.2, { fontSize: 9, bold: true, color, charSpacing: 1 });

// 6. Review screen wireframe
{
  const s = slide();
  title(s, 'Suggested UI: work queue on the left, review and correction on the right');
  frame(s, 'Prototype · nothing is sent');
  s.addShape(pres.shapes.RECTANGLE, { x: 0.51, y: 1.81, w: 2.4, h: 3.43, fill: { color: PANEL }, line: { color: PANEL } });
  lab(s, 'WORK QUEUE', 0.65, 1.92, 2);
  T(s, '2 to review · 1 submitted', 0.65, 2.14, 2.2, 0.22, { fontSize: 9, color: MUTED });
  const q = [['Field 1312696', 'To review', 'Summary · Wording check', true], ['Order 875737', 'Submitted', 'Recommendation · Keyword check', false], ['Field 1314055', 'To review', 'Summary · Data consistency', false]];
  q.forEach(([id, st, sub, on], i) => {
    const y = 2.45 + i * 0.88;
    R(s, 0.65, y, 2.12, 0.76, { fill: WHITE, line: on ? GREEN : BORDER, lw: on ? 1.75 : 1 });
    T(s, id, 0.75, y + 0.1, 1.2, 0.22, { fontSize: 10, bold: true, fontFace: MONO });
    T(s, st, 1.85, y + 0.1, 0.85, 0.22, { fontSize: 8, bold: true, color: st === 'Submitted' ? DKGREEN : AMBER, align: 'right' });
    T(s, sub, 0.75, y + 0.4, 1.95, 0.3, { fontSize: 9, color: MUTED });
  });
  const card = (x, y, head, body, o = {}) => {
    R(s, x, y, 3.05, 1.1, { fill: WHITE, line: o.line || BORDER, lw: o.lw || 1 });
    lab(s, head, x + 0.12, y + 0.1, 2.0, o.color || MUTED);
    if (o.tag) T(s, o.tag, x + 2.15, y + 0.08, 0.8, 0.22, { fontSize: 8, bold: true, color: RED, align: 'right' });
    T(s, body, x + 0.12, y + 0.36, 2.8, 0.7, { fontSize: 10, color: INK });
  };
  card(3.05, 1.95, 'JUDGE', 'Check name and explanation\nfrom metadata.judge', { tag: 'FAILED' });
  card(3.05, 3.15, 'INPUT DATA', 'Rows from the GCS input files\nthat the judge checked');
  card(6.25, 1.95, 'CURRENT TEXT', 'Latest summary or recommendation,\nre-checked right before submit');
  card(6.25, 3.15, 'YOUR CORRECTION', 'Editable text box, prefilled\nwith the current text', { line: GREEN, lw: 1.75, color: GREEN });
  const btn = (x, w, text, o = {}) => { R(s, x, 4.45, w, 0.4, { fill: o.fill || WHITE, line: o.line || BORDER, r: 0.08 }); T(s, text, x, 4.45, w, 0.4, { fontSize: 10, bold: true, color: o.color || INK, align: 'center', valign: 'middle' }); };
  btn(3.05, 2.3, 'Judge was wrong · no change', { color: PURPLE, line: 'B9B3D9' });
  btn(5.65, 1.0, 'Skip');
  btn(6.95, 2.35, 'Judge was right · review fix', { fill: GREEN, line: GREEN, color: WHITE });
  s.addNotes('Clickable version: the UI POC canvas in Claude. Queue is built from judge results, no QC sheet. Status is saved per case so two reviewers never pick the same case.');
}

// 7. Confirm screen wireframe
{
  const s = slide();
  title(s, 'Every fix gets a before/after check, with dry run on by default');
  frame(s, 'Prototype · nothing is sent');
  T(s, 'Confirm the fix before it goes to Argo', 0.7, 1.92, 6, 0.3, { fontSize: 13, bold: true });
  R(s, 0.7, 2.3, 4.2, 0.95, { fill: REDT, line: REDT });
  lab(s, 'BEFORE', 0.82, 2.38, 2, RED);
  T(s, '…with unresolved Japanese activity at the final assessment.', 0.82, 2.62, 3.95, 0.55, { fontSize: 10 });
  R(s, 5.1, 2.3, 4.2, 0.95, { fill: TINT, line: TINT });
  lab(s, 'AFTER', 5.22, 2.38, 2, DKGREEN);
  T(s, '…with unresolved Japanese beetle activity at the final assessment.', 5.22, 2.62, 3.95, 0.55, { fontSize: 10 });
  lab(s, 'WHAT WILL BE SENT', 0.7, 3.38, 3);
  const rows = [['Workflow template', 'production / ag-assistant-season-reco-override-by-agronomist', true], ['Target', 'Field 1312696 · Summary', true], ['Parameters', '[parameter names: confirm with AJ]', false]];
  rows.forEach(([k, v, mono], i) => {
    const y = 3.62 + i * 0.25;
    T(s, k, 0.7, y, 1.8, 0.22, { fontSize: 10, color: MUTED });
    T(s, v, 2.5, y, 6.8, 0.22, { fontSize: 10, fontFace: mono ? MONO : F, color: mono ? INK : AMBER });
  });
  R(s, 0.7, 4.5, 1.5, 0.4, { r: 0.08 });
  T(s, '← Back to edit', 0.7, 4.5, 1.5, 0.4, { fontSize: 10, bold: true, align: 'center', valign: 'middle' });
  s.addShape(pres.shapes.RECTANGLE, { x: 5.45, y: 4.6, w: 0.2, h: 0.2, fill: { color: GREEN }, line: { color: GREEN } });
  T(s, '✓', 5.45, 4.6, 0.2, 0.2, { fontSize: 9, bold: true, color: WHITE, align: 'center', valign: 'middle' });
  T(s, 'Dry run (don\'t submit)', 5.75, 4.58, 1.8, 0.25, { fontSize: 10, valign: 'middle' });
  R(s, 7.7, 4.5, 1.6, 0.4, { fill: GREEN, line: GREEN, r: 0.08 });
  T(s, 'Run dry run', 7.7, 4.5, 1.6, 0.4, { fontSize: 10, bold: true, color: WHITE, align: 'center', valign: 'middle' });
  s.addNotes('Example text adapted from field 1312696 (Ezer, Sep 1). Unticking dry run changes the button to Submit to Argo. Every submit is logged with reviewer, before/after text, workflow name and status.');
}

// 8. Questions for AJ
{
  const s = slide();
  title(s, 'Four answers from AJ decide where the tool reads the latest text');
  const qs = [
    'Does the override workflow update the row in ag_assistant_results, or add a new row and hide the old one?',
    'Do edits made in the webapp write to the same table, or somewhere else?',
    'Does anything else change the text after the judge runs, such as retries or the "advisor reviewed" status?',
    'What are the template\'s parameters, and is there a staging version to test against first?'
  ];
  qs.forEach((q, i) => {
    const y = 1.5 + i * 0.85;
    circle(s, 0.5, y, 0.45, i + 1);
    T(s, q, 1.2, y + 0.02, 8.3, 0.65, { fontSize: 16, valign: 'middle' });
  });
}

// 9. Next steps timeline
{
  const s = slide();
  title(s, 'UI sign-off by Oct 22 keeps the working tool on track for Nov 30');
  const x0 = 0.8, x1 = 9.2, ly = 2.75, days = 56;
  const X = d => x0 + (d / days) * (x1 - x0);
  s.addShape(pres.shapes.LINE, { x: x0, y: ly, w: x1 - x0, h: 0, line: { color: MUTED, width: 1.5 } });
  const ms = [
    [2, 'Oct 7', 'Send access requests and AJ questions', 'up', false, 1.6],
    [8, 'Oct 13', 'Review round 1 with QC reviewers', 'down', false, 1.4],
    [15, 'Oct 20', 'Review round 2 with AJ and manager', 'up', false, 1.6],
    [17, 'Oct 22', 'Gate: UI signed off', 'down', true, 1.4],
    [38, 'Nov 12', 'Working tool, 5 real cases end to end', 'up', false, 1.7],
    [45, 'Nov 19', 'Pilot done, code freeze', 'down', false, 1.5],
    [56, 'Nov 30', 'POC complete and handed off', 'up', true, 1.6]
  ];
  ms.forEach(([d, date, text, side, key, w]) => {
    const cx = X(d), dd = key ? 0.24 : 0.18;
    s.addShape(pres.shapes.OVAL, { x: cx - dd / 2, y: ly - dd / 2, w: dd, h: dd, fill: { color: key ? GREEN : WHITE }, line: { color: key ? GREEN : MUTED, width: 1.5 } });
    let lx = cx - w / 2, align = 'center';
    if (lx + w > 9.5) { lx = 9.5 - w; align = 'right'; }
    if (lx < 0.4) { lx = 0.4; align = 'left'; }
    const y = side === 'up' ? ly - 0.95 : ly + 0.25;
    T(s, [{ text: date, options: { bold: true, breakLine: true, color: key ? DKGREEN : INK } }, { text, options: { color: MUTED } }], lx, y, w, 0.7, { fontSize: 12, align, valign: side === 'up' ? 'bottom' : 'top' });
  });
  T(s, [{ text: 'This week: ', options: { bold: true } }, { text: 'send the access request to Raz/Avi and the questions to AJ, and export 5–10 judge-flagged cases for the prototype.' }], 0.5, 4.35, 9, 0.6, { fontSize: 14 });
}

pres.writeFile({ fileName: 'qc_poc_deck.pptx' }).then(() => console.log('written'));
