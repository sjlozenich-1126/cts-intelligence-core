/* ============================================================
   CTS Intelligence Core — Application Logic
   ============================================================ */

// ── View metadata ──────────────────────────────────────────────
const viewMeta = {
  dashboard:  { title: "Command Dashboard",       eyebrow: "Phase I Prototype" },
  intake:     { title: "Intelligence Intake",      eyebrow: "IINP" },
  ledger:     { title: "Provenance Ledger",        eyebrow: "G-PCL" },
  sacs:       { title: "SACS Compiler",            eyebrow: "S-SIE" },
  fusion:     { title: "Threat Fusion Cell",       eyebrow: "MV-TFC" },
  risk:       { title: "Systemic Risk",            eyebrow: "SRPE" },
  briefs:     { title: "Briefing Matrix",          eyebrow: "IBMx" },
  zerotrust:  { title: "Zero-Trust Monitor",       eyebrow: "CL-ZTIM" },
  identity:   { title: "Identity Shield",          eyebrow: "BIV / PPIS" },
  roadmap:    { title: "Deployment Roadmap",       eyebrow: "12-36 Month Build" }
};

// ── Mock data ──────────────────────────────────────────────────
const ledgerEntries = [
  ["2026-06-24T12:44:02Z", "Document", "CTS-GOV-AUTH-RESP-C2-FM-GAP", "9d71c0...b42e", "Anchored"],
  ["2026-06-24T12:31:19Z", "Incident", "CTS-CYB-EXT-VERIFY-C3-FM-DELAY", "a8f20b...19ac", "Review"],
  ["2026-06-24T11:58:48Z", "Brief", "CTS-GOV-CUST-ESCAL-C2-FM-GAP", "2c60fe...840a", "Published"],
  ["2026-06-24T11:22:04Z", "Incident", "CTS-EMR-EXT-ROUTE-C3-FM-NONE", "ef0221...77d0", "Anchored"],
  ["2026-06-24T10:17:31Z", "Document", "CTS-IDV-CUST-VERIFY-C1-FM-NONE", "7f9a10...381b", "Anchored"],
  ["2026-06-23T22:08:55Z", "Brief", "CTS-GOV-AUTH-ESCAL-C4-FM-DENY", "431fab...e190", "Director Review"]
];

const alerts = [
  { level: "High", text: "Repeated authority-stratum gap across related case packets" },
  { level: "Moderate", text: "Cyber vector score rose after new device log intake" },
  { level: "High", text: "Institutional compression factor exceeds mock watch threshold" }
];

const riskPatterns = [
  { title: "Authority Misuse Pattern", level: "High", body: "Three C-risk nodes appear across a single procedural chain." },
  { title: "Evidence Memory Gap", level: "Moderate", body: "Ledger references exist without corresponding narrative detail." },
  { title: "Cross-Case Delay Cluster", level: "High", body: "Repeated response delays linked by shared role and function codes." },
  { title: "Identity Context Mismatch", level: "Moderate", body: "Identity token posture changed outside the expected access window." },
  { title: "Convergence Drift", level: "Low", body: "Threat-vector weights changed but stayed inside the mock baseline." },
  { title: "Briefing Lag", level: "Moderate", body: "Two matrix drafts have not advanced to action directives." }
];

const briefs = [
  {
    title: "Institutional Response Anomaly",
    status: "Director review",
    nut: "A linked set of dummy case events shows delayed response patterns and missing procedural memory.",
    judgments: [
      "Risk appears procedural rather than isolated.",
      "SACS failure mode FM-GAP is the dominant signal.",
      "Recommended action is governance validation before escalation."
    ],
    directives: [
      "Open CGPD review lane.",
      "Request corroborating ledger anchors.",
      "Publish watch summary to Protective Intelligence."
    ]
  },
  {
    title: "Cyber-Institutional Convergence Watch",
    status: "Draft",
    nut: "Mock device logs and institutional timestamps suggest a convergence profile worth analyst review.",
    judgments: [
      "Cyber score is elevated but not independently critical.",
      "Institutional vector increases priority.",
      "Zero-trust loop remains balanced."
    ],
    directives: [
      "Hold at analyst level.",
      "Run follow-up intake if new telemetry appears.",
      "Attach to weekly warning packet."
    ]
  },
  {
    title: "Protected-Person Shield Posture",
    status: "Pending action",
    nut: "Identity-continuum controls remain stable while monitoring posture stays elevated.",
    judgments: [
      "No live identity verification is occurring.",
      "Dummy shield posture is driven by institutional signal weight.",
      "Emergency lockdown remains a rehearsal-only function."
    ],
    directives: [
      "Keep token state simulated.",
      "Review device watch queue.",
      "Log tabletop exercise outcome."
    ]
  }
];

const loopEvents = [
  { title: "Continuous verification", detail: "All mock sessions refreshed within policy window." },
  { title: "Micro-segmentation", detail: "No lateral movement path detected in dummy topology." },
  { title: "Context authentication", detail: "One analyst role requires revalidation." },
  { title: "Contour delta", detail: "Loop imbalance remains below alert threshold." }
];

const activityLog = [
  { text: "Ledger anchor created for document packet", time: "2m ago" },
  { text: "SACS code compiled: CTS-GOV-AUTH-RESP-C2", time: "8m ago" },
  { text: "Fusion cell recalculation complete", time: "14m ago" },
  { text: "New intake from external agency report", time: "22m ago" },
  { text: "Zero-trust loop balanced", time: "31m ago" },
  { text: "Briefing matrix draft published", time: "45m ago" }
];

// ── DOM references ─────────────────────────────────────────────
const $title = document.querySelector("#view-title");
const $eyebrow = document.querySelector("#view-eyebrow");
const $navItems = [...document.querySelectorAll(".nav-item")];
const $views = [...document.querySelectorAll(".view")];

// ── Navigation ─────────────────────────────────────────────────
function showView(id) {
  $navItems.forEach(item => item.classList.toggle("active", item.dataset.view === id));
  $views.forEach(view => view.classList.toggle("active", view.id === id));
  const meta = viewMeta[id];
  if (meta) {
    $title.textContent = meta.title;
    $eyebrow.textContent = meta.eyebrow;
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

$navItems.forEach(item => item.addEventListener("click", () => showView(item.dataset.view)));
document.querySelectorAll("[data-view-jump]").forEach(btn => {
  btn.addEventListener("click", () => showView(btn.dataset.viewJump));
});

// ── Render: Alerts ─────────────────────────────────────────────
function renderAlerts() {
  const list = document.querySelector("#dashboardAlerts");
  list.innerHTML = alerts.map(a => `
    <li class="${a.level === 'High' ? 'high' : ''}">
      <div>
        <strong>${a.level} Priority</strong>
        <span>${a.text}</span>
      </div>
    </li>
  `).join("");
}

// ── Render: Activity Feed ──────────────────────────────────────
function renderActivity() {
  const feed = document.querySelector("#activityFeed");
  feed.innerHTML = activityLog.map(a => `
    <div class="activity-item">
      <div class="activity-dot"></div>
      <span>${a.text}</span>
      <time>${a.time}</time>
    </div>
  `).join("");
}

// ── Render: Ledger ─────────────────────────────────────────────
function renderLedger(filter = "all") {
  const rows = ledgerEntries
    .filter(e => filter === "all" || e[1] === filter)
    .map(e => `
      <tr>
        <td style="font-family:var(--font-mono);font-size:12px">${e[0]}</td>
        <td>${e[1]}</td>
        <td><span class="pill">${e[2]}</span></td>
        <td style="font-family:var(--font-mono);font-size:12px">${e[3]}</td>
        <td>${e[4]}</td>
      </tr>
    `).join("");
  document.querySelector("#ledgerRows").innerHTML = rows || `<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:24px">No records match this filter.</td></tr>`;
}

document.querySelectorAll("[data-ledger-filter]").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("[data-ledger-filter]").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    renderLedger(btn.dataset.ledgerFilter);
  });
});

// ── Render: Risk Board ─────────────────────────────────────────
function renderRisks() {
  const highOnly = document.querySelector("#highOnly").checked;
  document.querySelector("#riskBoard").innerHTML = riskPatterns
    .filter(item => !highOnly || item.level === "High")
    .map(item => `
      <article class="risk-card" data-level="${item.level}">
        <strong>${item.title}</strong>
        <span class="pill" style="${item.level === 'High' ? 'background:var(--red-soft);color:var(--red)' : item.level === 'Low' ? 'background:var(--green-soft);color:var(--green)' : ''}">${item.level}</span>
        <span>${item.body}</span>
      </article>
    `).join("");
}

document.querySelector("#highOnly").addEventListener("change", renderRisks);

// ── Render: Briefs ─────────────────────────────────────────────
function renderBriefs() {
  const list = document.querySelector("#briefList");
  list.innerHTML = briefs.map((b, i) => `
    <button class="brief-item" data-brief="${i}">
      <strong>${b.title}</strong>
      <span>${b.status}</span>
    </button>
  `).join("");
  list.querySelectorAll(".brief-item").forEach(btn => {
    btn.addEventListener("click", () => selectBrief(Number(btn.dataset.brief)));
  });
}

function selectBrief(index) {
  const b = briefs[index];
  document.querySelectorAll(".brief-item").forEach((item, i) => {
    item.classList.toggle("active", i === index);
  });
  document.querySelector("#briefTitle").textContent = b.title;
  document.querySelector("#briefPreview").innerHTML = `
    <h3>Nut Graf</h3>
    <p>${b.nut}</p>
    <h3>Key Judgments</h3>
    <ul>${b.judgments.map(j => `<li>${j}</li>`).join("")}</ul>
    <h3>Action Directives</h3>
    <ul>${b.directives.map(d => `<li>${d}</li>`).join("")}</ul>
  `;
}

// ── Render: Loop Events ────────────────────────────────────────
function renderLoopEvents() {
  document.querySelector("#loopEvents").innerHTML = loopEvents.map(e => `
    <div class="loop-event">
      <strong>${e.title}</strong>
      <span>${e.detail}</span>
    </div>
  `).join("");
}

// ── Helpers ────────────────────────────────────────────────────
function fakeHash() {
  const alphabet = "abcdef0123456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `${out.slice(0, 6)}...${out.slice(6)}`;
}

// ── SACS Compiler ──────────────────────────────────────────────
function compileSacsCode() {
  const ids = ["sacsSystem", "sacsDomain", "sacsRole", "sacsFunction", "sacsRisk", "sacsFailure"];
  const values = ids.map(id => document.querySelector(`#${id}`).value);
  const code = values.join("-");
  document.querySelector("#sacsOutput").textContent = code;

  // Update segment display
  const segIds = ["segSystem", "segDomain", "segRole", "segFunction", "segRisk", "segFailure"];
  segIds.forEach((segId, i) => {
    document.querySelector(`#${segId}`).textContent = values[i];
  });

  // Routing logic
  const risk = document.querySelector("#sacsRisk").value;
  const route = risk === "C4"
    ? "Director escalation, SRPE watchlist, Zero-Trust review"
    : risk === "C3"
      ? "Threat Fusion queue, analyst review"
      : "Custodial Governance review, SRPE watchlist";
  document.querySelector("#sacsRoute").textContent = route;
}

document.querySelector("#compileSacs").addEventListener("click", compileSacsCode);

// ── Intake Form ────────────────────────────────────────────────
document.querySelector("#intakeForm").addEventListener("submit", event => {
  event.preventDefault();
  const source = document.querySelector("#sourceType").value;
  const subject = document.querySelector("#subject").value.trim() || "Untitled packet";
  const vector = document.querySelector("#vector").value;
  const risk = document.querySelector("#riskLevel").value;

  const riskCode = risk === "Critical" ? "C4" : risk === "High" ? "C3" : risk === "Low" ? "C1" : "C2";
  const code = `CTS-${vector.slice(0, 3).toUpperCase()}-EXT-ROUTE-${riskCode}-FM-GAP`;
  const hash = fakeHash();
  const marker = new Date().toISOString().replace(/\.\d+Z$/, "Z");

  // Add to ledger
  ledgerEntries.unshift([marker, source.includes("document") ? "Document" : "Incident", code, hash, "Anchored"]);
  renderLedger();

  // Update counter
  const $count = document.querySelector("#ledgerCount");
  $count.textContent = String(Number($count.textContent) + 1);

  // Show packet result
  document.querySelector("#packetResult").innerHTML = `
    <div class="packet-row"><span>Subject</span><strong>${subject}</strong></div>
    <div class="packet-row"><span>Source</span><strong>${source}</strong></div>
    <div class="packet-row"><span>SHA-256 Anchor</span><strong>${hash}</strong></div>
    <div class="packet-row"><span>SACS Code</span><strong style="color:var(--accent)">${code}</strong></div>
    <div class="packet-row"><span>Ledger Marker</span><strong>${marker}</strong></div>
    <div class="packet-row"><span>Route</span><strong>${risk === "Critical" ? "Director escalation" : "Fusion cell analyst queue"}</strong></div>
  `;
});

// ── Simulate Telemetry ─────────────────────────────────────────
document.querySelector("#simulateBtn").addEventListener("click", () => {
  const $alertCount = document.querySelector("#alertCount");
  $alertCount.textContent = String(Number($alertCount.textContent) + 1);

  const next = (Math.random() * 0.035).toFixed(3);
  document.querySelector("#loopScore").textContent = next;
  document.querySelector("#loopVisualScore").textContent = next;

  alerts.unshift({ level: "Moderate", text: "New dummy telemetry packet entered the fusion queue" });
  renderAlerts();

  activityLog.unshift({ text: "New telemetry simulation triggered", time: "now" });
  renderActivity();
});

// ── Fusion Recalculate ─────────────────────────────────────────
document.querySelector("#recalcFusion").addEventListener("click", () => {
  const nodes = [...document.querySelectorAll(".fusion-node")];
  const scores = nodes.map(node => {
    const value = Math.floor(38 + Math.random() * 55);
    node.dataset.score = value;
    node.querySelector(".fusion-score").textContent = value;
    node.querySelector(".fusion-fill").style.width = value + "%";
    return [node.querySelector(".fusion-header strong").textContent, value];
  }).sort((a, b) => b[1] - a[1]);
  document.querySelector("#fusionSummary").textContent =
    `${scores[0][0]} and ${scores[1][0]} vectors are currently driving the highest mock convergence score.`;
});

// ── Balance Loop ───────────────────────────────────────────────
document.querySelector("#balanceLoop").addEventListener("click", () => {
  const score = (Math.random() * 0.012).toFixed(3);
  document.querySelector("#loopScore").textContent = score;
  document.querySelector("#loopVisualScore").textContent = score;
});

// ── New Intake Dialog ──────────────────────────────────────────
document.querySelector("#newIntakeBtn").addEventListener("click", () => {
  document.querySelector("#intakeDialog").showModal();
});

document.querySelector("#intakeDialog").addEventListener("close", event => {
  if (event.target.returnValue === "confirm") showView("intake");
});

// ── Global Search ──────────────────────────────────────────────
document.querySelector("#globalSearch").addEventListener("input", event => {
  const value = event.target.value.trim().toLowerCase();
  if (!value) {
    renderLedger(document.querySelector("[data-ledger-filter].active").dataset.ledgerFilter);
    return;
  }
  const rows = ledgerEntries
    .filter(e => e.join(" ").toLowerCase().includes(value))
    .map(e => `
      <tr>
        <td style="font-family:var(--font-mono);font-size:12px">${e[0]}</td>
        <td>${e[1]}</td>
        <td><span class="pill">${e[2]}</span></td>
        <td style="font-family:var(--font-mono);font-size:12px">${e[3]}</td>
        <td>${e[4]}</td>
      </tr>
    `).join("");
  document.querySelector("#ledgerRows").innerHTML = rows || `<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:24px">No records match "${value}".</td></tr>`;
});

// ── Protection Buttons ─────────────────────────────────────────
document.querySelectorAll(".protection").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".protection").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  });
});

// ── Initialize ─────────────────────────────────────────────────
renderAlerts();
renderActivity();
renderLedger();
renderRisks();
renderBriefs();
renderLoopEvents();
