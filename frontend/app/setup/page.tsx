"use client";

import { useState } from "react";
import Link from "next/link";
import { Database, Copy, Check, ChevronRight, ExternalLink, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const CODE_GS = `/**
 * SchemaShift — Google Sheets Add-on
 * Analyze schemas, detect drift, and track data quality
 * without leaving your spreadsheet.
 */

const API_BASE = 'https://schemashift-api.vercel.app/api/v1';

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('SchemaShift')
    .addItem('Analyze Sheet', 'showSidebar')
    .addSeparator()
    .addItem('About', 'showAbout')
    .toMenu();
}

function onInstall(e) {
  onOpen(e);
}

function showSidebar() {
  var html = HtmlService.createHtmlOutputFromFile('Sidebar')
    .setTitle('SchemaShift')
    .setWidth(360);
  SpreadsheetApp.getUi().showSidebar(html);
}

function showAbout() {
  var html = HtmlService.createHtmlOutput(
    '<div style="font-family:sans-serif;padding:16px;">' +
    '<h2>SchemaShift</h2>' +
    '<p>Intelligent schema drift detection.</p>' +
    '<p><a href="https://schemashift.vercel.app" target="_blank">schemashift.vercel.app</a></p>' +
    '</div>'
  ).setWidth(300).setHeight(150);
  SpreadsheetApp.getUi().showModalDialog(html, 'About SchemaShift');
}

function getSheetData() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var range = sheet.getDataRange();
  var values = range.getValues();
  if (values.length < 2) return { error: 'Need at least a header row and one data row.' };
  var headers = values[0].map(String);
  var dataRows = values.slice(1);
  var columns = [];
  var maxCols = Math.min(headers.length, 20);
  var maxRows = Math.min(dataRows.length, 100);
  for (var c = 0; c < maxCols; c++) {
    var samples = [], nullCount = 0;
    for (var r = 0; r < maxRows; r++) {
      var val = dataRows[r][c];
      if (val === '' || val === null || val === undefined) nullCount++;
      else samples.push(String(val));
    }
    columns.push({ name: headers[c] || 'column_' + c, samples: samples.slice(0, 10), nullCount: nullCount, totalRows: maxRows });
  }
  return {
    spreadsheetId: SpreadsheetApp.getActiveSpreadsheet().getId(),
    spreadsheetName: SpreadsheetApp.getActiveSpreadsheet().getName(),
    sheetName: sheet.getName(),
    rowCount: dataRows.length,
    columnCount: headers.length,
    columns: columns,
    headers: headers.slice(0, maxCols),
  };
}

function analyzeWithApi(sessionId) {
  var sheet = SpreadsheetApp.getActiveSheet();
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return { error: 'Need at least a header and one data row.' };
  var maxRows = Math.min(values.length, 501);
  var csvLines = [];
  for (var r = 0; r < maxRows; r++) {
    csvLines.push(values[r].map(function(cell) {
      var s = String(cell);
      return (s.indexOf(',') >= 0 || s.indexOf('"') >= 0) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(','));
  }
  var csv = csvLines.join('\\n');
  var fileName = SpreadsheetApp.getActiveSpreadsheet().getName() + '.csv';
  try {
    var boundary = 'SchemaBoundary' + Date.now();
    var response = UrlFetchApp.fetch(API_BASE + '/scan', {
      method: 'post',
      contentType: 'multipart/form-data; boundary=' + boundary,
      payload: '--' + boundary + '\\r\\nContent-Disposition: form-data; name="file"; filename="' + fileName + '"\\r\\nContent-Type: text/csv\\r\\n\\r\\n' + csv + '\\r\\n--' + boundary + '--\\r\\n',
      headers: { 'X-Session-ID': sessionId || 'sheets-addon' },
      muteHttpExceptions: true,
    });
    return response.getResponseCode() < 300 ? JSON.parse(response.getContentText()) : { error: 'API error ' + response.getResponseCode() };
  } catch (e) { return { error: e.message }; }
}

function getOrCreateSession() {
  var props = PropertiesService.getUserProperties();
  var sid = props.getProperty('schemashift_session_id');
  if (sid) return sid;
  try {
    var r = UrlFetchApp.fetch(API_BASE + '/session', { muteHttpExceptions: true });
    if (r.getResponseCode() === 200) { var d = JSON.parse(r.getContentText()); sid = d.id || d.session_id; }
  } catch(e) {}
  if (!sid) sid = Utilities.getUuid();
  props.setProperty('schemashift_session_id', sid);
  return sid;
}`;

const STEPS = [
  {
    num: 1,
    title: "Open any Google Sheet",
    description: "Open a spreadsheet that has data you want to analyze. Make sure row 1 contains column headers.",
    visual: "sheets",
  },
  {
    num: 2,
    title: "Open Apps Script editor",
    description: 'Go to Extensions > Apps Script. This opens the script editor for your spreadsheet.',
    visual: "extensions",
  },
  {
    num: 3,
    title: "Paste the SchemaShift code",
    description: "Delete any existing code in Code.gs, then paste the SchemaShift code (use the copy button below). Then create a new HTML file called 'Sidebar' and paste the sidebar code.",
    visual: "paste",
  },
  {
    num: 4,
    title: "Save and refresh your sheet",
    description: "Save the script (Ctrl+S), close the editor, and refresh your Google Sheet. You'll see a new SchemaShift menu in the toolbar.",
    visual: "menu",
  },
  {
    num: 5,
    title: "Click SchemaShift > Analyze Sheet",
    description: "The sidebar opens and instantly analyzes your data — detecting column types, scoring quality, and tracking drift. No uploads needed.",
    visual: "sidebar",
  },
];

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium hover:bg-emerald-500/15 transition-colors"
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? "Copied!" : label}
    </button>
  );
}

function StepVisual({ type }: { type: string }) {
  if (type === "sheets") {
    return (
      <div className="bg-[#0f0f1a] rounded-lg border border-zinc-800 p-4">
        <div className="flex items-center gap-2 mb-3 text-xs text-zinc-500">
          <svg className="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="currentColor"><path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2"/></svg>
          My Data Export Q1 2024
        </div>
        <div className="grid grid-cols-4 gap-px bg-zinc-800 rounded overflow-hidden text-[10px]">
          {["order_id", "email", "total", "date"].map((h) => (
            <div key={h} className="bg-[#1e1e32] px-2 py-1 font-semibold text-zinc-300">{h}</div>
          ))}
          {["10421", "jane@co.io", "$142", "Mar 5"].map((v) => (
            <div key={v} className="bg-[#0a0a14] px-2 py-1 text-zinc-400">{v}</div>
          ))}
          {["10422", "bob@ex.co", "$89", "Mar 5"].map((v) => (
            <div key={v} className="bg-[#0a0a14] px-2 py-1 text-zinc-400">{v}</div>
          ))}
        </div>
      </div>
    );
  }
  if (type === "extensions") {
    return (
      <div className="bg-[#0f0f1a] rounded-lg border border-zinc-800 p-4">
        <div className="flex gap-1 text-[11px] text-zinc-400 mb-2">
          <span className="px-2 py-0.5 rounded bg-zinc-800/50">File</span>
          <span className="px-2 py-0.5 rounded bg-zinc-800/50">Edit</span>
          <span className="px-2 py-0.5 rounded bg-zinc-800/50">View</span>
          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Extensions</span>
        </div>
        <div className="bg-zinc-900 rounded border border-zinc-700 p-1 ml-12 w-48 text-[11px]">
          <div className="px-3 py-1.5 text-zinc-300 hover:bg-zinc-800 rounded cursor-default flex items-center justify-between">
            Apps Script <ChevronRight className="h-3 w-3 text-zinc-500" />
          </div>
          <div className="px-3 py-1.5 text-zinc-500">Add-ons</div>
          <div className="px-3 py-1.5 text-zinc-500">Macros</div>
        </div>
      </div>
    );
  }
  if (type === "paste") {
    return (
      <div className="bg-[#0f0f1a] rounded-lg border border-zinc-800 p-4">
        <div className="flex items-center gap-2 mb-2 text-[11px] text-zinc-500">
          <div className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">Code.gs</div>
          <div className="px-2 py-0.5 rounded bg-zinc-800/50 text-zinc-500">Sidebar.html</div>
        </div>
        <div className="font-mono text-[10px] text-zinc-400 leading-relaxed">
          <div><span className="text-purple-400">function</span> <span className="text-emerald-400">onOpen</span>() {"{"}</div>
          <div className="pl-4">SpreadsheetApp.<span className="text-cyan-400">getUi</span>()</div>
          <div className="pl-6">.<span className="text-cyan-400">createMenu</span>(<span className="text-amber-400">&apos;SchemaShift&apos;</span>)</div>
          <div className="pl-6">.<span className="text-cyan-400">addItem</span>(<span className="text-amber-400">&apos;Analyze&apos;</span>, ...)</div>
          <div>{"}"}</div>
        </div>
      </div>
    );
  }
  if (type === "menu") {
    return (
      <div className="bg-[#0f0f1a] rounded-lg border border-zinc-800 p-4">
        <div className="flex gap-1 text-[11px] text-zinc-400 mb-2">
          <span className="px-2 py-0.5 rounded bg-zinc-800/50">File</span>
          <span className="px-2 py-0.5 rounded bg-zinc-800/50">Edit</span>
          <span className="px-2 py-0.5 rounded bg-zinc-800/50">Data</span>
          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium">SchemaShift</span>
          <span className="px-2 py-0.5 rounded bg-zinc-800/50">Help</span>
        </div>
        <div className="bg-zinc-900 rounded border border-zinc-700 p-1 ml-16 w-44 text-[11px]">
          <div className="px-3 py-1.5 text-emerald-400 bg-emerald-500/10 rounded cursor-default">Analyze Sheet</div>
          <div className="border-t border-zinc-800 my-0.5" />
          <div className="px-3 py-1.5 text-zinc-500">About</div>
        </div>
      </div>
    );
  }
  if (type === "sidebar") {
    return (
      <div className="bg-[#0f0f1a] rounded-lg border border-zinc-800 p-4 flex gap-3">
        <div className="flex-1 opacity-40">
          <div className="grid grid-cols-3 gap-px bg-zinc-800 rounded overflow-hidden text-[9px]">
            {["id", "email", "total"].map((h) => (
              <div key={h} className="bg-[#1e1e32] px-1.5 py-0.5 text-zinc-300">{h}</div>
            ))}
            {["1", "a@b.co", "$50"].map((v) => (
              <div key={v} className="bg-[#0a0a14] px-1.5 py-0.5 text-zinc-500">{v}</div>
            ))}
          </div>
        </div>
        <div className="w-[140px] bg-[#09090b] rounded border border-zinc-700 p-2 text-[9px]">
          <div className="flex items-center gap-1 mb-1.5">
            <div className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/30" />
            <span className="font-semibold text-zinc-200">SchemaShift</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between"><span className="text-zinc-400">id</span><span className="text-purple-400 text-[8px] px-1 bg-purple-500/10 rounded">int</span></div>
            <div className="flex justify-between"><span className="text-zinc-400">email</span><span className="text-emerald-400 text-[8px] px-1 bg-emerald-500/10 rounded">email</span></div>
            <div className="flex justify-between"><span className="text-zinc-400">total</span><span className="text-emerald-400 text-[8px] px-1 bg-emerald-500/10 rounded">currency</span></div>
          </div>
          <div className="mt-1.5 pt-1.5 border-t border-zinc-800 text-emerald-400 flex items-center gap-0.5">
            <Check className="w-2.5 h-2.5" /> No drift
          </div>
        </div>
      </div>
    );
  }
  return null;
}

export default function SetupPage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 group-hover:border-emerald-500/40 transition-colors">
              <Database className="h-4 w-4 text-emerald-400" />
            </div>
            <span className="text-lg font-bold text-zinc-100">SchemaShift</span>
          </Link>
          <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16">
        {/* Page title */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs font-medium">
            5-minute setup
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-zinc-100 tracking-tight">
            Install SchemaShift for{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Google Sheets
            </span>
          </h1>
          <p className="mt-4 text-lg text-zinc-400 max-w-xl mx-auto">
            Add schema analysis, drift detection, and quality tracking directly
            inside your spreadsheet. No downloads, no extensions — just Apps Script.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-12">
          {STEPS.map((step) => (
            <div key={step.num} className="flex gap-6 items-start">
              {/* Step number */}
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-lg">
                {step.num}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-semibold text-zinc-100 mb-2">{step.title}</h3>
                <p className="text-zinc-400 mb-4">{step.description}</p>
                <StepVisual type={step.visual} />
              </div>
            </div>
          ))}
        </div>

        {/* Code copy section */}
        <div className="mt-16 pt-16 border-t border-zinc-800">
          <h2 className="text-2xl font-bold text-zinc-100 mb-2">Copy the code</h2>
          <p className="text-zinc-400 mb-6">
            You need two files. Copy each one into your Apps Script editor.
          </p>

          <div className="space-y-6">
            {/* Code.gs */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-zinc-300 font-mono">Code.gs</span>
                <CopyButton text={CODE_GS} label="Copy Code.gs" />
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 max-h-48 overflow-y-auto">
                <pre className="text-[11px] text-zinc-400 font-mono whitespace-pre-wrap leading-relaxed">{CODE_GS.slice(0, 600)}...</pre>
              </div>
            </div>

            {/* Sidebar.html */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-zinc-300 font-mono">Sidebar.html</span>
                <a
                  href="https://github.com/soccerdude1812/schemashift/blob/main/google-sheets-addon/Sidebar.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm font-medium hover:bg-zinc-700 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  View on GitHub
                </a>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                <p className="text-[11px] text-zinc-500 font-mono">
                  The sidebar HTML is ~400 lines. Copy it from the GitHub link above,
                  or from the <code className="text-emerald-400">google-sheets-addon/Sidebar.html</code> file in the repo.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* What happens next */}
        <div className="mt-16 pt-16 border-t border-zinc-800">
          <h2 className="text-2xl font-bold text-zinc-100 mb-6">What you get</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
              <div className="text-2xl mb-2">🔍</div>
              <h3 className="font-semibold text-zinc-100 mb-1">Type Detection</h3>
              <p className="text-sm text-zinc-400">
                12 classifiers detect emails, dates, currencies, UUIDs, IPs, and more.
              </p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
              <div className="text-2xl mb-2">📊</div>
              <h3 className="font-semibold text-zinc-100 mb-1">Quality Score</h3>
              <p className="text-sm text-zinc-400">
                Instant data completeness scoring across all columns.
              </p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
              <div className="text-2xl mb-2">🔄</div>
              <h3 className="font-semibold text-zinc-100 mb-1">Drift Tracking</h3>
              <p className="text-sm text-zinc-400">
                Detects added, removed, or changed columns between analyses.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <Button asChild size="lg" className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold px-8 py-6 text-base rounded-xl">
            <Link href="/dashboard">
              Open Dashboard
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
