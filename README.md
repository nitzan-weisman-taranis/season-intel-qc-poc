# Season Intelligence QC Automation: POC assets

Owner: Nitzan Weisman · Saved 2026-10-26 (design version 39) · POC deadline 2026-11-30

## Links (claude.ai, private until shared from each page's Share menu)

| What | Link |
|---|---|
| UI POC (clickable design, review screen v4) | https://claude.ai/artifact/E93uskkqzAx9QcV14PJUr4 |
| Project plan (Claude Doc) | https://claude.ai/artifact/f53101ac-1738-4139-9f9e-3baa7336a4e2 |
| QA failures overview | https://claude.ai/artifact/73Rttc2Vr1r8n6F9fsCvCk |

## Folder contents

- `ui-poc/Review.dc.html`, `ui-poc/canvas.json`: the current review screen, the same files as the published design.
- `ui-poc/generators/`: the scripts that build it.
  - `build_input.py` turns the QA export into the per-pass input tables and chart series.
  - `build_v4.py` assembles `Review.dc.html` from `v4_markup.html` and `v4_logic.js`.
  - To rebuild, run from a folder holding `qa.json`, `bq/case.json` and `gen/` (paths are relative):
    1. `python3 build_input.py qa.json > input.json`
    2. `python3 build_v4.py`
- `ui-poc/archive/`: the earlier v3 screen and the three graph options (A sparkline column, B row as chart, C chart band). C was chosen.
- `data/qa_export_2026-09-01.json`: the QA export (46 failed summary cases, 61 failed recommendation cases).
- `data/bq_*`: the two rows from `taranis-bi.BI_POSTGRES.mavrx_ag_assistant_results` for field 1321763 / cycle 5321127. They hold the summary and recommendation text and the full judge metadata.
- `judge/judge_checks_191.txt`: the production judge catalogue (191 checks: 66 analysis, 82 summary, 43 recommendation).
- `deck/`: the 9-slide connectivity and UI deck (pptx, pdf, and the build script).

## What the POC screen does

1. **Judge findings on top:** one card per failed check, with:
   - critical flag, review type and score;
   - an Analysis · Summary · Recommendation trail from the real judge scores;
   - a resolution (Open / Fixed in edit / Judge false claim / Question for team) and a note.
2. **Split view** (clicking a section in the Analysis, Summary or Recommendation scrolls the others to the same threat and switches the input tab):
   - **Left:** the Summary, with the Recommendation below it (Analysis on a second tab). Both are editable.
   - **Right:** the final-pass yield loss against the judge threshold, and the input data per pass. Each threat has its own tab, chart (log scale) and table.
3. **Rule re-check:** for each failed check, the tool repeats the check's rule on the text and the input, and marks what it finds. This is the tool's own code following the check description, not the judge's saved evidence.
4. **Submit:** a dry run that shows the resolutions and what would be sent to the Argo override workflow.

## Key facts learned

- **One source for everything:** `ag_assistant_results.metadata` holds every check score for all three stages (`judge`, `judge_analysis`), the auto-fixed checks (`judge_corrections`) and `judge_stats`. That is enough to drop the QC sheet; the BigQuery copy is `BI_POSTGRES.mavrx_ag_assistant_results`.
- **What the judge saves:** all 191 checks are rule-based (no model call), but they save only a score of 0 or 10, not what they matched. Asking the developers to save the matched span or value per failed check would make highlighting exact.
- **Auto-fixes:** 63 checks auto-fix on failure, and a fix is kept only if the check passes on re-judging. Analysis corrections are switched off.
- **Yield-impact threshold in the judge:** corn 3 bu/ac, soy 1 bu/ac (checks 115 and 116). The POC uses 3.
- **Example case, field 1321763:**
  - **Summary:** 3 failed: STAGE_CITED_NOT_RECORDED (critical), CONCLUSION_YIELD_IMPACT_COVERAGE, WEED_TREND_REACHES_FINAL_MISSION.
  - **Recommendation:** all 45 checks passed; 3 auto-fixed.
  - **Analysis:** INSECT_STAGE_ATTRIBUTION_2 failed.
  - **Weed-trend finding:** the final-pass weed pressure is "mild", which agrees with the text, so this is a possible judge false claim.

## Open items

- **Argo:** the parameters of `production/ag-assistant-season-reco-override-by-agronomist` (AJ).
- **Permissions:** multipool access (Avi / Raz).
- **BigQuery for Claude:** `roles/mcp.toolUser`, `roles/bigquery.jobUser` and `roles/bigquery.dataViewer` on `taranis-bi`.
- **Resolution rule:** should "Fixed in edit" require an actual text change?
- **Data issue:** P2's weather list duplicates P1's in field 1321763 (flag to AJ).
