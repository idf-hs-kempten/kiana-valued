// Page logic in plain JavaScript (no jQuery), next to bulma-carousel.
// Everything is loaded from this site only, see the Content-Security-Policy in index.html.

var COLORS = {
  teal: "#3babb9", petrol: "#0b5b5d", deep: "#0f3433", ink: "#140f07",
  soft: "#9fd9df", line: "#d5e3e4", muted: "#5d6b6c",
};
var SVG_NS = "http://www.w3.org/2000/svg";

function $(selector, root) { return (root || document).querySelector(selector); }
function $$(selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); }

function el(tag, attrs, html) {
  var node = document.createElement(tag);
  Object.keys(attrs || {}).forEach(function (k) { node.setAttribute(k, attrs[k]); });
  if (html !== undefined) node.innerHTML = html;
  return node;
}

function svgEl(name, attrs, text) {
  var node = document.createElementNS(SVG_NS, name);
  Object.keys(attrs || {}).forEach(function (k) { node.setAttribute(k, attrs[k]); });
  if (text !== undefined) node.textContent = text;
  return node;
}

function picture(src, alt) {
  return el("img", { src: src, alt: alt, loading: "lazy" });
}

function getJSON(url) {
  return fetch(url).then(function (r) {
    if (!r.ok) throw new Error(url + ": " + r.status);
    return r.json();
  });
}

// ------------------------------------------------------------------ hero
// Every hero element is optional: a block that is commented out in index.html is simply skipped.
function setHTML(selector, html) { var node = $(selector); if (node) node.innerHTML = html; }
function setText(selector, text) { var node = $(selector); if (node) node.textContent = text; }

function renderHero() {
  var site = window.SITE;
  document.body.classList.toggle("show-todo", site.showTodo);
  var banner = $("#placeholder-banner");
  if (banner) banner.hidden = !site.showTodo;

  if (site.anonymous || !site.authors.length) {
    setHTML("#authors", '<span class="author-block">Anonymous Authors</span>');
    setHTML("#affiliations", "");
    setText("#venue", "Paper in der Begutachtung (doppelt blind)");
  } else {
    setHTML("#authors", site.authors.map(function (a) {
      var name = a.url ? '<a href="' + a.url + '">' + a.name + "</a>" : a.name;
      var sup = (a.affiliations || []).join(",") + (a.equal ? "*" : "");
      return '<span class="author-block">' + name + (sup ? "<sup>" + sup + "</sup>" : "") + "</span>";
    }).join(", "));
    setHTML("#affiliations", site.affiliations.map(function (aff, i) {
      return '<span class="author-block"><sup>' + (i + 1) + "</sup>" + aff + "</span>";
    }).join(" "));
    setText("#venue", site.venue);
  }

  $$("[data-link]").forEach(function (a) {
    var url = site.anonymous ? "" : site.links[a.dataset.link];
    if (url) {
      a.href = url;
    } else {
      a.classList.add("is-disabled");
      a.setAttribute("aria-disabled", "true");
      a.setAttribute("tabindex", "-1");
    }
  });

  setText("#bibtex-text", site.bibtex);
  var copy = $("#copy-bibtex");
  if (copy) {
    copy.addEventListener("click", function () {
      var label = copy.querySelector("span:last-child");
      navigator.clipboard.writeText(site.bibtex).then(function () {
        label.textContent = "Kopiert";
        setTimeout(function () { label.textContent = "Kopieren"; }, 1500);
      });
    });
  }
}

// ------------------------------------------------------------------ key numbers
function renderKeyNumbers(results) {
  $("#key-numbers").innerHTML = results.key_numbers.map(function (k) {
    return '<div class="column"><div class="key-number"><span class="big">' + k.value +
      '</span><span class="small">' + k.label + "</span></div></div>";
  }).join("");
}

// ------------------------------------------------------------------ ladder chart
function axisTitle(xPos, yPos, text) {
  return svgEl("text", { x: xPos, y: yPos, transform: "rotate(-90 " + xPos + " " + yPos + ")",
                         "text-anchor": "middle", class: "axis-title" }, text);
}

function niceStep(rough) {
  var p = Math.pow(10, Math.floor(Math.log10(rough))), f = rough / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
}

// Short names under the bars, two lines each, so the chart reads without the method section.
var SHORT = {
  "1": ["STEP-Text"], "1.1": ["Zeichnung"], "2": ["STEP-Text", "+ Metadaten"], "2.1": ["Zeichnung", "+ Metadaten"],
  "3": ["STEP-Text", "+ GEPA"], "3.1": ["Zeichnung", "+ GEPA"], "4": ["Agent"], "5": ["Agent", "+ Referenzen"],
  "5.1": ["wie 5,", "Qwen3.8"],
};

function renderLadder(results, metric) {
  var host = $("#ladder-chart");
  host.innerHTML = "";
  var exps = results.experiments;
  var W = 860, H = 372, left = 74, right = 20, top = 16, bottom = 76;
  // the human reference is drawn only where the data carries it (APE; the AE depends on the price level)
  var human = typeof results.human[metric] === "number" ? results.human[metric] : null;
  var raw = Math.max.apply(null, exps.map(function (e) { return e[metric]; }).concat(human === null ? [] : [human])) * 1.08;
  var step = niceStep(raw / 4), max = step * 4;
  var y = function (v) { return top + (H - top - bottom) * (1 - v / max); };
  var slot = (W - left - right) / exps.length;
  var svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Median-" + metric + " je Experiment" });

  for (var t = 0; t <= 4; t++) {
    var v = step * t;
    svg.appendChild(svgEl("line", { x1: left, x2: W - right, y1: y(v), y2: y(v), class: "grid" }));
    svg.appendChild(svgEl("text", { x: left - 8, y: y(v) + 4, "text-anchor": "end", class: "tick" }, +v.toFixed(2)));
  }
  // the human reference sits behind the bars and their labels
  if (human !== null) svg.appendChild(svgEl("line", { x1: left, x2: W - right, y1: y(human), y2: y(human), class: "human" }));
  var legend = $(".legend-human");
  if (legend) legend.hidden = human === null;
  exps.forEach(function (e, i) {
    var x = left + i * slot + slot * 0.18, w = slot * 0.64;
    var fill = e.group === "fewshot" ? COLORS.petrol : e.group === "agent" ? COLORS.teal : COLORS.soft;
    var bar = svgEl("rect", { x: x, width: w, y: y(e[metric]), height: y(0) - y(e[metric]), rx: 4, fill: fill, class: "bar" });
    bar.appendChild(svgEl("title", {}, e.label + ": " + e[metric] + " (" + e.n + " Teile" +
      (typeof e.prices === "number" ? ", " + e.prices + " Stückpreise" : "") + ")"));
    svg.appendChild(bar);
    svg.appendChild(svgEl("text", { x: x + w / 2, y: y(e[metric]) - 6, "text-anchor": "middle", class: "value-label" }, Math.round(e[metric])));
    svg.appendChild(svgEl("text", { x: x + w / 2, y: H - bottom + 20, "text-anchor": "middle", class: "bar-label" }, e.id));
    (SHORT[e.id] || []).forEach(function (line, k) {
      svg.appendChild(svgEl("text", { x: x + w / 2, y: H - bottom + 37 + k * 14, "text-anchor": "middle", class: "short-label" }, line));
    });
    svg.appendChild(svgEl("text", { x: x + w / 2, y: H - bottom + 69, "text-anchor": "middle", class: "tick" }, "n = " + e.n));
  });
  svg.appendChild(svgEl("line", { x1: left, x2: W - right, y1: y(0), y2: y(0), class: "axis" }));
  svg.appendChild(axisTitle(18, (top + y(0)) / 2, metric === "AE" ? "Median-AE (€)" : "Median-APE (%)"));
  host.appendChild(svg);

  var unit = { APE: "Median-APE in %", AE: "Median-AE in €" }[metric];
  $("#ladder-caption").textContent = unit + ", alle gültigen Stückpreise je Experiment";
}

// The sentences under the experiment chart that depend on the data: lot sizes per part and the calculators' sample.
function renderLadderNote(results) {
  var de = function (v) { return v.toLocaleString("de-DE", { maximumFractionDigits: 1 }); };
  var l = results.lots;
  if (l) {
    $("#lots-note").textContent = " Ein Teil kann mit mehreren Losgrößen eingehen: Über die " + l.parts +
      " Teile von Experiment " + l.experiment + " sind es im Mittel " + l.mean.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " und im Median " + de(l.median) +
      " Stückpreise je Teil, höchstens " + l.max + "; " + de(l.share_multi) + "\u00a0% der Teile haben mehr als eine" +
      " Losgröße (" + l.prices + " Stückpreise insgesamt).";
  }
  var h = results.human;
  if (h && typeof h.n === "number") {
    $("#human-count").textContent = h.n + " anderen Teilen" + (typeof h.prices === "number" ? " (" + h.prices + " Stückpreise)" : "");
  }
}

function setupMetricToggle(results) {
  var buttons = $$("#metric-toggle .button");
  buttons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      buttons.forEach(function (b) {
        b.classList.remove("is-selected");
        b.setAttribute("aria-selected", "false");
      });
      btn.classList.add("is-selected");
      btn.setAttribute("aria-selected", "true");
      renderLadder(results, btn.dataset.metric);
    });
  });
}

// ------------------------------------------------------------------ CDF + companies
// Line styles of the compared experiments, kept here and not in the data: emphasise the few-shot agent,
// show the zero-shot agent in teal, push the two prompt baselines back into clearly different warm greys
// (the VLM one also dashed), so they stay apart in lightness and pattern, also in black-and-white print.
var COMPARE_STYLE = {
  "1":   { color: "#aaa69f", width: 2.2 },
  "1.1": { color: "#5f5b55", width: 2.2, dash: "6 4" },
  "4":   { color: COLORS.teal, width: 2.6 },
  "5.1": { color: COLORS.petrol, width: 3.8 },
};

function styleOf(item) {
  return COMPARE_STYLE[item.experiment] || { color: item.color || COLORS.soft, width: 2.6 };
}

function renderCdf(results) {
  var host = $("#cdf-chart");
  var W = 560, H = 320, left = 64, right = 128, top = 16, bottom = 48, xmax = results.cdf.x_max;
  var x = function (v) { return left + (W - left - right) * v / xmax; };
  var y = function (v) { return top + (H - top - bottom) * (1 - v); };
  var svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Kumulierte Verteilung des prozentualen Fehlers je Stückpreis" });
  [0, 0.25, 0.5, 0.75, 1].forEach(function (v) {
    svg.appendChild(svgEl("line", { x1: left, x2: W - right, y1: y(v), y2: y(v), class: "grid" }));
    svg.appendChild(svgEl("text", { x: left - 8, y: y(v) + 4, "text-anchor": "end", class: "tick" }, Math.round(v * 100) + "\u00a0%"));
  });
  svg.appendChild(svgEl("line", { x1: left, x2: W - right, y1: y(0), y2: y(0), class: "axis" }));
  svg.appendChild(svgEl("line", { x1: left, x2: left, y1: y(0), y2: y(1), class: "axis" }));
  for (var t = 0; t <= xmax; t += 50) {
    svg.appendChild(svgEl("text", { x: x(t), y: y(0) + 16, "text-anchor": "middle", class: "tick" }, t + "\u00a0%"));
  }
  svg.appendChild(svgEl("text", { x: (left + W - right) / 2, y: H - 12, "text-anchor": "middle", class: "axis-title" }, results.cdf.x_label));
  svg.appendChild(axisTitle(16, (top + y(0)) / 2, "Anteil der Stückpreise"));

  // the emphasised line is drawn last, so it lies on top
  var series = results.cdf.series.slice().sort(function (a, b) { return styleOf(a).width - styleOf(b).width; });
  series.forEach(function (s) {
    var st = styleOf(s);
    var d = s.points.map(function (p, i) { return (i ? "L" : "M") + x(p[0]).toFixed(1) + " " + y(p[1]).toFixed(1); }).join(" ");
    var path = svgEl("path", { d: d, fill: "none", stroke: st.color, "stroke-width": st.width, "stroke-linejoin": "round" });
    if (st.dash) path.setAttribute("stroke-dasharray", st.dash);
    path.appendChild(svgEl("title", {}, s.label + (typeof s.n === "number" ? ", n = " + s.n : "")));
    svg.appendChild(path);
  });

  // direct labels at the line ends instead of a legend, pushed apart where lines end close together
  var gap = 15, floor = y(0) - 4;
  var labels = results.cdf.series.map(function (s) {
    return { s: s, target: y(s.points[s.points.length - 1][1]) + 4 };
  }).sort(function (a, b) { return a.target - b.target; });
  labels.forEach(function (l, i) { l.pos = Math.max(l.target, i ? labels[i - 1].pos + gap : top + 4); });
  for (var i = labels.length - 1; i >= 0; i--) {          // keep them above the x axis
    var limit = i === labels.length - 1 ? floor : labels[i + 1].pos - gap;
    labels[i].pos = Math.min(labels[i].pos, limit);
  }
  labels.forEach(function (l) {
    var st = styleOf(l.s), xEnd = x(xmax);
    svg.appendChild(svgEl("line", { x1: xEnd + 3, x2: xEnd + 10, y1: l.target - 4, y2: l.pos - 4, stroke: st.color, "stroke-width": 1 }));
    var text = svgEl("text", { x: xEnd + 13, y: l.pos, class: "tick legend-text" }, l.s.label);
    text.setAttribute("fill", st.width > 3 ? COLORS.petrol : COLORS.ink);
    if (st.width > 3) text.setAttribute("font-weight", "700");
    svg.appendChild(text);
  });
  host.appendChild(svg);

  var fmt = function (v) { return Math.round(v).toLocaleString("de-DE") + "\u00a0%"; };
  $("#company-cards").innerHTML = '<p class="company-caption">Median-APE je Firma · kürzer ist besser</p>' +
    results.companies.map(function (c) {
      return '<div class="company-card"><h4>' + c.name + "</h4>" + c.bars.map(function (b) {
        var value = typeof b.ape === "number" ? fmt(b.ape) : "";
        return '<div class="company-bar"><em>' + b.label + '</em><span class="track"><span class="fill" style="width:' +
          (b.value * 100) + "%;background:" + styleOf(b).color + '"></span></span><b>' + value + "</b></div>";
      }).join("") + "</div>";
    }).join("");
}

// ------------------------------------------------------------------ agent run
// data/run.json comes from scripts/export_run.py. Code, markdown and outputs arrive as escaped,
// pre-rendered HTML; names and labels from the run are set as text.
// The agent's price next to the real price, at the end of the agent run. Written for readers without
// background: one plain sentence as heading, a simple bar chart (scripts/github_page/make_result_chart.py), one note.
function runResult(run, euroCents) {
  var qs = Object.keys(run.estimates).map(Number).sort(function (a, b) { return a - b; });
  var box = el("figure", { class: "run-result", id: "run-result", "aria-labelledby": "run-result-h" });
  box.appendChild(el("p", { class: "kicker" })).textContent = "Ergebnis des Laufs";
  box.appendChild(el("h3", { class: "title is-5", id: "run-result-h" })).textContent =
    "Fast genau getroffen: Die Schätzung des Agenten liegt sehr nah am echten Preis";
  var chart = box.appendChild(el("div", { class: "rr-chart" }));
  chart.appendChild(el("img", { class: "rr-img", src: "./static/images/run/result_chart.svg", loading: "lazy",
    alt: "Balkendiagramm, Stückpreis des Agenten neben dem echten Preis: " + qs.map(function (q) {
      return q + " Stück: Agent " + euroCents(run.estimates[q]) + ", echter Preis " + euroCents(run.actual[q]);
    }).join("; ") }));
  box.appendChild(el("figcaption", { class: "chart-note" })).textContent =
    "Stückpreise für dieses eine Beispielteil. Ein einzelnes Teil sagt noch nichts über die Genauigkeit im Allgemeinen; " +
    "die Auswertung über alle Teile steht weiter oben unter „Ergebnisse“.";
  return box;
}

// A bracket with two arrowheads on the left of the two swapped phase groups. It is measured from the
// rendered headers (centre of "Phase N" to the outer card edge), so it sits exactly at any zoom and
// redraws whenever a group opens, closes or the width changes.
function swapArrow(pair) {
  var svg = svgEl("svg", { class: "run-swap-arrow", "aria-hidden": "true" });
  var path = svg.appendChild(svgEl("path", { class: "run-swap-line" }));
  var heads = [svg.appendChild(svgEl("path", { class: "run-swap-head" })), svg.appendChild(svgEl("path", { class: "run-swap-head" }))];
  pair.appendChild(svg);
  function draw() {
    var groups = $$(":scope > .run-phase", pair);
    if (groups.length < 2 || !pair.offsetParent) return;
    var box = pair.getBoundingClientRect();
    var mid = function (g) { var r = $("summary b", g).getBoundingClientRect(); return Math.round(r.top + r.height / 2 - box.top); };
    var edge = Math.round(groups[0].getBoundingClientRect().left - box.left);  // outer left edge of the cards
    var y1 = mid(groups[0]), y2 = mid(groups[groups.length - 1]);
    var tip = 8, half = 5, x0 = Math.max(3, Math.round(edge * 0.3));
    var rad = Math.max(0, Math.min(12, (y2 - y1) / 2, edge - tip - x0));
    svg.setAttribute("width", edge);
    svg.setAttribute("height", Math.ceil(box.height));
    path.setAttribute("d", "M" + (edge - tip) + " " + y1 + "H" + (x0 + rad) + "Q" + x0 + " " + y1 + " " + x0 + " " + (y1 + rad) +
      "V" + (y2 - rad) + "Q" + x0 + " " + y2 + " " + (x0 + rad) + " " + y2 + "H" + (edge - tip));
    [y1, y2].forEach(function (y, i) {
      heads[i].setAttribute("d", "M" + (edge - tip - 0.5) + " " + (y - half) + "L" + edge + " " + y + "L" + (edge - tip - 0.5) + " " + (y + half) + "Z");
    });
  }
  if (window.ResizeObserver) new ResizeObserver(draw).observe(pair);
  window.addEventListener("resize", draw);
  pair.addEventListener("toggle", draw, true);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
  requestAnimationFrame(draw);
}

function setupRun(run) {
  var nf = function (v, d) { return v.toLocaleString("de-DE", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); };
  var euroCents = function (v) { return nf(v, 2) + "\u00a0€"; };
  var qty = Object.keys(run.estimates);
  var stats = [
    [run.minutes + " min", "Laufzeit"],
    [run.tool_calls, "Werkzeugaufrufe"],
    [run.llm_calls, "Modellaufrufe"],
    [nf(run.tokens_in / 1e6, 1) + " Mio.", "Tokens gelesen (Kontext je Aufruf summiert)"],
    [nf(run.tokens_out / 1e3) + " Tsd.", "Tokens geschrieben"],
    [qty.map(function (q) { return euroCents(run.estimates[q]); }).join(" · "),
     "Stückpreis bei " + qty.join(" / ") + " Stück · Vergleich mit Ist-Preis ↓"],
  ];
  var statBox = $("#run-stats");
  stats.forEach(function (s, i) {
    var last = i === stats.length - 1;
    // the result card jumps to the comparison chart at the end of the steps
    var card = last ? el("a", { class: "run-stat is-result", href: "#run-result" }) : el("div", { class: "run-stat" });
    if (last) card.addEventListener("click", function () { selectTab(0); });
    card.appendChild(el("b")).textContent = s[0];
    card.appendChild(el("span")).textContent = s[1];
    statBox.appendChild(card);
  });
  var model = el("p", { class: "run-model" });
  model.textContent = "Modell: " + run.model + (run.reasoning ? ", Reasoning " + run.reasoning : "") +
    " · größter Kontext " + nf(run.max_context / 1e3) + " Tsd. Tokens";
  statBox.after(model);

  // phase groups with their steps
  var stepsBox = $("#run-steps"), bar = $("#run-phasebar"), total = run.phases[run.phases.length - 1].end;
  // a phase that comes before a lower-numbered one was pulled forward by the agent; the next one was done later
  var pulled = run.phases.map(function (g, i) { var n = run.phases[i + 1]; return !!n && g.phase > n.phase; });
  var swapBox = null, pairBox = null;
  run.phases.forEach(function (g, gi) {
    var mins = (g.end - g.start) / 60;
    var early = pulled[gi], late = gi > 0 && pulled[gi - 1];
    var group = el("details", { class: "run-phase", id: "run-phase-" + g.phase });
    if (gi === 0) group.open = true;
    var sum = el("summary");
    sum.appendChild(el("b")).textContent = "Phase " + g.phase;
    sum.appendChild(el("span", { class: "run-phase-name" })).textContent = g.name;
    if (early || late) {
      var pill = sum.appendChild(el("span", { class: "run-phase-swap" }));
      pill.textContent = early ? "vorgezogen" : "nachgeholt";
      if (early && run.order_note) pill.title = run.order_note;
    }
    sum.appendChild(el("span", { class: "run-phase-meta" })).textContent =
      g.steps.length + (g.steps.length === 1 ? " Schritt" : " Schritte") + " · " + nf(mins, 1) + " min";
    group.appendChild(sum);
    if (PHASES[g.phase]) group.appendChild(el("p", { class: "run-phase-desc" })).textContent = PHASES[g.phase][1];
    var list = el("ol", { class: "run-steplist" });
    g.steps.forEach(function (s) {
      var item = el("li");
      var step = el("details", { class: "run-step" + (s.failed ? " is-failed" : "") });
      var head = el("summary");
      head.appendChild(el("span", { class: "run-time" })).textContent = s.time;
      head.appendChild(el("span", { class: "run-tool tool-" + s.tool })).textContent = s.label;
      head.appendChild(el("code", { class: "run-sum" }, s.summary));
      if (s.failed) head.appendChild(el("span", { class: "run-flag" })).textContent = "Fehler";
      if (s.thumb) head.appendChild(el("img", { class: "run-thumb", src: s.thumb, alt: "", loading: "lazy" }));
      step.appendChild(head);
      var body = el("div", { class: "run-body" });
      if (s.thought) {
        var t = el("details", { class: "run-thought" });
        t.open = s.thought.length < 900;
        t.appendChild(el("summary")).textContent = "Überlegung des Agenten";
        t.appendChild(el("div", {}, s.thought));
        body.appendChild(t);
      }
      body.appendChild(el("div", {}, s.body));
      step.appendChild(body);
      item.appendChild(step);
      list.appendChild(item);
    });
    group.appendChild(list);
    if (g.closing) {
      var close = el("div", { class: "run-closing" });
      close.appendChild(el("p", { class: "run-label" })).textContent = "Abschlussnachricht des Agenten";
      close.appendChild(el("div", {}, g.closing));
      group.appendChild(close);
    }
    // the two swapped groups share a wrapper; CSS draws a bracket with arrowheads between their headers
    if (early) {
      pairBox = el("div", { class: "run-swap-pair", role: "group",
        "aria-label": "Phase " + g.phase + " und " + run.phases[gi + 1].phase + ", vom Agenten getauscht" });
      stepsBox.appendChild(pairBox);
      swapArrow(pairBox);
    }
    (early || late ? pairBox : stepsBox).appendChild(group);

    var grow = Math.max(g.end - g.start, total * 0.012);
    var swapText = early ? ", vom Agenten vor Phase " + run.phases[gi + 1].phase + " gezogen"
                 : late ? ", vom Agenten erst nach Phase " + run.phases[gi - 1].phase + " bearbeitet" : "";
    var seg = el("button", { class: "run-seg phase-" + g.phase + (early || late ? " is-swapped" : ""), type: "button",
      style: "flex-grow:" + grow.toFixed(1),
      title: "Phase " + g.phase + " · " + g.name + " · " + nf(mins, 1) + " min" + swapText,
      "aria-label": "Phase " + g.phase + ", " + g.name + ", " + nf(mins, 1) + " Minuten" + swapText + ": im Ablauf öffnen" });
    seg.textContent = g.phase;
    seg.addEventListener("click", function () {
      selectTab(0);
      group.open = true;
      group.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    // the two swapped segments share one wrapper with a bracket and a short note below
    if (early) {
      swapBox = el("span", { class: "run-swap", style: "flex-grow:" + (grow + Math.max(run.phases[gi + 1].end - run.phases[gi + 1].start, total * 0.012)).toFixed(1) });
      swapBox.appendChild(el("span", { class: "run-swap-note", "aria-hidden": "true" })).textContent = "⇄ getauscht";
      bar.appendChild(swapBox);
    }
    (early || late ? swapBox : bar).appendChild(seg);
  });
  if (run.actual) stepsBox.appendChild(runResult(run, euroCents));

  // files: list on the left, the selected file on the right
  var filesBox = $("#run-files"), fileNav = el("div", { class: "run-filelist" }), fileView = el("div", { class: "run-fileview" });
  // one fixed-height frame: header with the file name, one scroll area for every file type
  var fileHead = el("div", { class: "run-filehead", "aria-live": "polite" });
  var fileBody = el("div", { class: "run-filebody", tabindex: "0", role: "region" });
  fileView.appendChild(fileHead);
  fileView.appendChild(fileBody);
  run.files.forEach(function (f, i) {
    var b = el("button", { class: "run-filebtn", type: "button" });
    b.appendChild(el("span")).textContent = f.name;
    b.appendChild(el("small")).textContent = f.lines + " Zeilen";
    b.addEventListener("click", function () { showFile(i); });
    fileNav.appendChild(b);
  });
  function showFile(i) {
    $$(".run-filebtn", fileNav).forEach(function (b, k) {
      b.classList.toggle("is-active", k === i);
      b.setAttribute("aria-pressed", k === i ? "true" : "false");
    });
    var f = run.files[i];
    fileHead.innerHTML = "";
    fileHead.appendChild(el("code")).textContent = f.name;
    fileHead.appendChild(el("small")).textContent = "Endstand · " + f.lines + " Zeilen";
    fileBody.className = "run-filebody" + (/\.md$/i.test(f.name) ? "" : " is-code");
    fileBody.setAttribute("aria-label", "Inhalt von " + f.name);
    fileBody.innerHTML = "";
    fileBody.appendChild(el("div", {}, f.html));
    fileBody.scrollTop = 0;
    fileBody.scrollLeft = 0;
  }
  filesBox.appendChild(fileNav);
  filesBox.appendChild(fileView);
  showFile(0);

  // images the agent looked at, in order
  var grid = el("div", { class: "run-gallery" });
  run.images.forEach(function (img) {
    var a = el("a", { class: "run-shot", href: img.src, target: "_blank", rel: "noopener" });
    a.appendChild(el("img", { src: img.src, alt: img.name + ", vom Agenten angesehen", loading: "lazy" }));
    a.appendChild(el("span")).textContent = img.name + " · " + img.time + " · Schritt " + img.step;
    grid.appendChild(a);
  });
  $("#run-images").appendChild(grid);

  // tabs
  var tabs = $$("#run-tabs [role=tab]");
  function selectTab(i) {
    tabs.forEach(function (t, k) {
      t.classList.toggle("is-selected", k === i);
      t.setAttribute("aria-selected", k === i ? "true" : "false");
      t.setAttribute("tabindex", k === i ? "0" : "-1");
      document.getElementById(t.getAttribute("aria-controls")).hidden = k !== i;
    });
  }
  tabs.forEach(function (t, i) { t.addEventListener("click", function () { selectTab(i); }); });
  $("#run-tabs").addEventListener("keydown", function (e) {
    var k = tabs.indexOf(document.activeElement), n = tabs.length;
    var next = { ArrowRight: (k + 1) % n, ArrowLeft: (k + n - 1) % n }[e.key];
    if (k < 0 || next === undefined) return;
    selectTab(next);
    tabs[next].focus();
    e.preventDefault();
  });
}

// ------------------------------------------------------------------ part explorer
// static/images/renderings/examples_topk.json: { "<name>": [["<neighbour name>", cosine], ...] },
// each name has its render at static/images/renderings/<name>.png.
var RENDERINGS = "./static/images/renderings/";
var SIMILARITY_THRESHOLD = 0.8;   // same cut-off as the few-shot retrieval (experiment 5)

function setupParts(topk) {
  var carousel = $("#parts-carousel");
  var names = Object.keys(topk);
  var render = function (name) { return RENDERINGS + name + ".png"; };
  names.forEach(function (name, i) {
    var btn = el("button", { class: "part-thumb", type: "button", "aria-label": "Teil " + name, "data-index": i });
    btn.appendChild(picture(render(name), ""));
    btn.appendChild(el("span", {}, name));
    var item = el("div", { class: "item" });
    item.appendChild(btn);
    carousel.appendChild(item);
  });

  function show(i) {
    var name = names[i];
    $$(".part-thumb").forEach(function (b) { b.setAttribute("aria-selected", b.dataset.index === String(i) ? "true" : "false"); });
    $("#part-render").innerHTML = '<img src="' + render(name) + '" alt="Rendering von Teil ' + name + '">';
    $("#part-name").textContent = name;
    var refs = $("#part-refs");
    refs.innerHTML = "";
    topk[name].forEach(function (r) {
      var card = el("div", { class: "ref-card" + (r[1] < SIMILARITY_THRESHOLD ? " weak" : "") });
      card.appendChild(picture(render(r[0]), "Ähnliches Teil " + r[0]));
      card.appendChild(el("span", { class: "ref-name" }, r[0]));
      card.appendChild(el("span", {}, "cos " + r[1].toFixed(2).replace(".", ",")));
      refs.appendChild(card);
    });
  }
  carousel.addEventListener("click", function (e) {
    var btn = e.target.closest(".part-thumb");
    if (btn) show(+btn.dataset.index);
  });

  bulmaCarousel.attach("#parts-carousel", {
    // loop: both arrows stay visible and the last page wraps to the first, so the strip never gets stuck at an end
    slidesToScroll: 2, slidesToShow: 6, loop: true, infinite: false, pagination: false,
    breakpoints: [{ changePoint: 480, slidesToShow: 2, slidesToScroll: 2 },
                  { changePoint: 768, slidesToShow: 4, slidesToScroll: 2 }],
  });
  // The arrows live inside the clipped slider and would cover the first and last thumbnail.
  // Moved into the outer element they sit in their own gutters; their click handlers move with them.
  $$(".slider-navigation-previous, .slider-navigation-next", carousel).forEach(function (nav) {
    nav.setAttribute("role", "button");
    nav.setAttribute("tabindex", "0");
    nav.setAttribute("aria-label", nav.classList.contains("slider-navigation-next") ? "Nächste Teile" : "Vorherige Teile");
    nav.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); nav.click(); }
    });
    carousel.appendChild(nav);
  });
  show(0);
}

// ------------------------------------------------------------------ method (b): phases
var PHASES = [
  ["Initialisierung", "Sieht sich den Eingabeordner an, hält Plan und Vorgaben fest und macht aus der Vorlage einen eigenen Plan für dieses Teil."],
  ["Sichtung", "Rendert Übersichtsbilder der STEP-Datei und sieht sich jedes an: Bauteilklasse, Features, Aufspannungen auf einer 3- und einer 5-Achs-Maschine."],
  ["Technische Zeichnung", "Rendert die PDF-Seiten und liest Maß-, Form- und Lagetoleranzen sowie Oberflächengüte, jeweils mit einer Konfidenz."],
  ["Geometrie-Extraktion", "Vermisst die B-Rep mit step_2_aag, berechnet eigene Kennzahlen und hält die Werte fest."],
  ["Fertigungsbewertung", "Wählt Maschinen, Aufspannungen und Strategie, benennt die Risiken und bewertet die Gesamtkomplexität von 0 bis 10."],
  ["Referenzbeispiele", "Öffnet erst jetzt die fünf Referenzteile: führt jede Kalkulation aus, vermisst jedes Teil mit demselben Geometrie-Code und hält fest, was sich auf das eigene Teil übertragen lässt, bis zu Minuten je Prozess und einem Preisband."],
  ["Kalkulation", "Berechnet die Kosten je angefragter Menge, ausgehend von der übertragenen Prozesskette; Rüsten zählt als Fixkosten je Los."],
  ["Gesamtlauf", "Führt die ganze Analyse einmal am Stück durch, von der Geometrie bis zum Preis."],
  ["Validierung", "Liest die eigenen Dateien erneut und prüft jede Menge: Die Preise liegen im Band aus Phase 5, oder die Abweichung ist begründet."],
  ["Abschluss", "Gibt genau einmal das Ergebnis ab: einen Stückpreis je angefragter Menge."],
];

// One tab pattern for (a) and (b): a row of buttons, one description box, roving tabindex,
// arrow keys wrap around, Home and End jump to the ends. The box carries a notch that points at the
// selected button, so it reads as belonging to the row above it.
function setupTabs(row, buttons, titleEl, textEl, describe, start, interval) {
  var box = titleEl.closest(".phase-detail"), current = start;
  function placeNotch() {
    var b = buttons[current].getBoundingClientRect(), r = box.getBoundingClientRect();
    box.style.setProperty("--notch-x", Math.round(b.left + b.width / 2 - r.left) + "px");
  }
  function show(i) {
    current = i;
    buttons.forEach(function (b, k) {
      b.setAttribute("aria-selected", k === i ? "true" : "false");
      b.setAttribute("tabindex", k === i ? "0" : "-1");
    });
    var d = describe(i);
    titleEl.textContent = d[0];
    textEl.textContent = d[1];
    placeNotch();
  }
  row.addEventListener("click", function (e) {
    var k = buttons.indexOf(e.target.closest("[role=tab]"));
    if (k >= 0) show(k);
  });
  row.addEventListener("keydown", function (e) {
    var k = buttons.indexOf(e.target.closest("[role=tab]")), n = buttons.length;
    var next = { ArrowRight: (k + 1) % n, ArrowLeft: (k + n - 1) % n, Home: 0, End: n - 1 }[e.key];
    if (k < 0 || next === undefined) return;
    show(next);
    buttons[next].focus();
    e.preventDefault();
  });
  window.addEventListener("resize", placeNotch);
  show(start);
  autoplay(row, buttons, show, function () { return current; }, interval);
}

// Auto-advance, so the row reads as something to click and readers who never click still see every step.
// Rows start at the first step and advance once they are mostly in view, one step per `interval` ms, with a
// progress bar under the active button. Row out of view: pause, then it goes on. Click, keyboard or the pause
// button: it stops and stays there until the visitor presses play. No pause on hover: after scrolling with
// the wheel the pointer usually rests on the panel, and the row would never move.
// It also runs with prefers-reduced-motion (decided by Tim); the pause button is the way to stop it.
function autoplay(row, buttons, show, current, interval) {
  if (!("IntersectionObserver" in window)) return;
  var hint = row.closest(".panel-lite").querySelector(".tab-hint");
  var playing = true, visible = false, timer = null, ticking = null;
  var toggle = el("button", { class: "autoplay-toggle", type: "button" });
  hint.parentNode.insertBefore(toggle, hint);

  function target(i) { return buttons[i].querySelector("b") || buttons[i]; }
  function halt() {
    clearTimeout(timer);
    if (ticking) ticking.classList.remove("is-ticking");
    ticking = null;
  }
  function run() {
    halt();
    toggle.innerHTML = playing ? '<i class="fas fa-pause" aria-hidden="true"></i> Pause'
                               : '<i class="fas fa-play" aria-hidden="true"></i> Abspielen';
    toggle.setAttribute("aria-label", playing ? "Automatisches Weiterschalten anhalten" : "Automatisch weiterschalten");
    if (!playing || !visible) return;
    ticking = target(current());
    ticking.style.setProperty("--tick", interval + "ms");
    ticking.classList.add("is-ticking");
    timer = setTimeout(function () { show((current() + 1) % buttons.length); run(); }, interval);
  }
  function stop() { playing = false; run(); }

  toggle.addEventListener("click", function () { playing = !playing; run(); });
  row.addEventListener("click", stop);
  row.addEventListener("keydown", stop);
  new IntersectionObserver(function (entries) {
    visible = entries[0].isIntersecting;
    run();
  }, { threshold: 0.6 }).observe(row);
  run();
}

function setupPhases() {
  var row = $("#phase-row");
  PHASES.forEach(function (p, i) {
    var btn = el("button", {
      class: "phase-btn" + (i === 5 ? " is-key" : ""), type: "button", role: "tab",
      "aria-label": "Phase " + i + ": " + p[0], "aria-controls": "phase-detail",
    });
    btn.textContent = i;
    row.appendChild(btn);
  });
  setupTabs(row, $$(".phase-btn", row), $("#phase-title"), $("#phase-text"), function (i) {
    return ["Phase " + i + " · " + PHASES[i][0], PHASES[i][1]];
  }, 0, 5000);
}

// ------------------------------------------------------------------ method (a): experiment matrix
// Inputs per experiment, numbered as in the repo and in MLflow. Rows are ordered by the experiment that
// first uses them, so the "first use" markers run down the diagonal: STEP as text (pasted into the prompt),
// drawing, metadata, GEPA-optimised prompt, STEP via code (the agent opens the same file and analyses and
// renders it with OCP code), few-shot references, Qwen3.8 27B. 2.1 and 3.1 add nothing that is new
// overall (they are the drawing counterparts of 2 and 3), so they carry no marker.
var LADDER = [
  { id: "1", title: "STEP-Text", inputs: [1, 0, 0, 0, 0, 0, 0], first: 0,
    text: "Die rohe STEP-Datei als Text in einem einzigen Prompt, ohne weiteren Kontext." },
  { id: "1.1", title: "Zeichnung", inputs: [0, 1, 0, 0, 0, 0, 0], first: 1,
    text: "Nur die technische Zeichnung als Seitenbilder, ohne weiteren Kontext." },
  { id: "2", title: "STEP-Text + Metadaten", inputs: [1, 0, 1, 0, 0, 0, 0], first: 2,
    text: "Wie 1, dazu Werkstoff, die Prozesse der Firma mit Stundensätzen und der Freitext-Hinweis aus dem Angebot." },
  { id: "2.1", title: "Zeichnung + Metadaten", inputs: [0, 1, 1, 0, 0, 0, 0], first: -1,
    text: "Wie 1.1, dazu dieselben Metadaten wie in 2." },
  { id: "3", title: "Prompt-Optimierung (GEPA)", inputs: [1, 0, 1, 1, 0, 0, 0], first: 3,
    text: "Wie 2, aber mit einem System-Prompt, den GEPA automatisch optimiert hat: Das Verfahren verbessert den Prompt schrittweise anhand der eigenen Fehler." },
  { id: "3.1", title: "Prompt-Optimierung (GEPA), Zeichnung", inputs: [0, 1, 1, 1, 0, 0, 0], first: -1,
    text: "Wie 2.1, mit einem per GEPA optimierten System-Prompt." },
  { id: "4", title: "Sandbox-Agent", inputs: [0, 1, 1, 0, 1, 0, 0], first: 4,
    text: "Ein Agent in einer Sandbox bekommt dieselbe STEP-Datei, öffnet sie aber selbst: Er analysiert und rendert sie mit OCP-Code, liest die Zeichnung und bekommt die Metadaten. Noch ohne Referenzteile (Zero-Shot)." },
  { id: "5", title: "Few-Shot-Agent", inputs: [0, 1, 1, 0, 1, 1, 0], first: 5,
    text: "Wie 4, dazu die fünf geometrisch ähnlichsten Teile, die die Firma bereits kalkuliert hat, jedes mit seiner Kalkulation. Modell: Qwen3.6 27B." },
  { id: "5.1", title: "Stärkeres Modell", inputs: [0, 1, 1, 0, 1, 1, 1], first: 6,
    text: "Wie 5, mit Qwen3.8 27B statt Qwen3.6 27B." },
];
var LADDER_INPUTS = ["STEP-Datei als Text", "Zeichnung", "Metadaten", "per GEPA optimierter Prompt",
                     "STEP-Datei per OCP-Code analysiert", "Few-Shot-Referenzteile", "Qwen3.8 27B"];

function setupLadder() {
  var row = $("#ladder-row");
  if (!row) return;
  LADDER.forEach(function (x) {
    var used = LADDER_INPUTS.map(function (name, r) { return x.inputs[r] ? name + (r === x.first ? " (erstmals)" : "") : ""; })
      .filter(Boolean).join(", ");
    var btn = el("button", {
      class: "ladder-col", type: "button", role: "tab", "aria-controls": "ladder-detail",
      "aria-label": "Experiment " + x.id + ": " + used,
    });
    btn.appendChild(el("b", {}, x.id));
    x.inputs.forEach(function (on, r) {
      btn.appendChild(el("i", { class: "dot " + (on ? (r === x.first ? "is-new" : "is-used") : "is-off") }));
    });
    row.appendChild(btn);
  });
  setupTabs(row, $$(".ladder-col", row), $("#ladder-title"), $("#ladder-text"), function (i) {
    return ["Experiment " + LADDER[i].id + " · " + LADDER[i].title, LADDER[i].text];
  }, 0, 3500);
}

// ------------------------------------------------------------------ optional images
// Images marked data-optional (the funding logos) disappear instead of showing a broken icon while the
// file is missing; a block whose images are all missing disappears with them.
function hideMissing(img) {
  img.hidden = true;
  var group = img.parentElement;
  if (group && !$$("img[data-optional]", group).some(function (i) { return !i.hidden; })) group.hidden = true;
}

function setupOptionalImages() {
  $$("img[data-optional]").forEach(function (img) {
    if (img.complete && img.naturalWidth === 0) hideMissing(img);
    else img.addEventListener("error", function () { hideMissing(img); });
  });
}

// ------------------------------------------------------------------ navigation
function setupNav() {
  var burger = $(".navbar-burger"), menu = $("#site-menu");
  if (!burger || !menu) return;
  var setOpen = function (open) {
    burger.classList.toggle("is-active", open);
    menu.classList.toggle("is-active", open);
    burger.setAttribute("aria-expanded", open ? "true" : "false");
  };
  burger.addEventListener("click", function () { setOpen(!menu.classList.contains("is-active")); });
  var links = $$(".navbar-menu a[href^='#']");
  links.forEach(function (a) { a.addEventListener("click", function () { setOpen(false); }); });

  if (!("IntersectionObserver" in window)) return;
  var byId = {};
  links.forEach(function (a) { byId[a.getAttribute("href").slice(1)] = a; });
  // "Ergebnisse" stays highlighted for both results sections
  var owner = function (id) { return id === "verteilung" ? "ergebnisse" : id; };
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      links.forEach(function (a) { a.classList.remove("is-current"); a.removeAttribute("aria-current"); });
      var link = byId[owner(entry.target.id)];
      if (link) { link.classList.add("is-current"); link.setAttribute("aria-current", "true"); }
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  $$("section[id]").forEach(function (sec) { observer.observe(sec); });
}

// ------------------------------------------------------------------ show more
// A button that shows or hides the elements named in aria-controls, so hidden panels stay in their grid.
// Hidden tab rows have no size, so a resize event lets them place their notch once they appear.
function setupMoreToggles() {
  $$(".more-toggle").forEach(function (btn) {
    var targets = btn.getAttribute("aria-controls").split(" ").map(function (id) { return document.getElementById(id); });
    btn.addEventListener("click", function () {
      var open = btn.getAttribute("aria-expanded") !== "true";
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      targets.forEach(function (t) { t.hidden = !open; });
      window.dispatchEvent(new Event("resize"));
    });
  });
}

// ------------------------------------------------------------------ boot
document.addEventListener("DOMContentLoaded", function () {
  setupOptionalImages();
  setupNav();
  renderHero();
  setupPhases();
  setupLadder();
  setupMoreToggles();

  Promise.all([getJSON("./data/results.json"), getJSON("./data/run.json"), getJSON(RENDERINGS + "examples_topk.json")])
    .then(function (data) {
      var results = data[0];
      renderKeyNumbers(results);
      renderLadder(results, "APE");
      renderLadderNote(results);
      setupMetricToggle(results);
      renderCdf(results);
      setupRun(data[1]);
      setupParts(data[2]);
    })
    .catch(function () {
      $("#ladder-chart").innerHTML = '<p class="muted">data/*.json konnte nicht geladen werden. Den Ordner über HTTP ausliefern, z. B. mit <code>python -m http.server</code>.</p>';
    });

});
