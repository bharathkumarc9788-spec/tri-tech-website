/* =========================================================
   TRI TECH — Auth Scripts
   Login • Client Portal • Developer Console
   Innovation • Technology • Tomorrow
   ========================================================= */
(function () {
  "use strict";

  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Strict email validation — only valid email addresses pass.
  // Requires: local@domain.tld with a 2+ letter top-level domain, no leading/
  // trailing/consecutive dots, reasonable length.
  const EMAIL_RE = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
  function isValidEmail(email) {
    if (typeof email !== "string") return false;
    const s = email.trim();
    if (s.length < 6 || s.length > 254) return false;
    if (!EMAIL_RE.test(s)) return false;
    const parts = s.split("@");
    if (parts.length !== 2) return false;
    const local = parts[0];
    const domain = parts[1];
    if (!local || !domain) return false;
    if (local.length > 64) return false;
    if (local.startsWith(".") || local.endsWith(".") || local.includes("..")) return false;
    if (domain.startsWith(".") || domain.endsWith(".") || domain.includes("..")) return false;
    return true;
  }

  /* Role labels for the Developer Console */
  const DASH_ROLES = {
    admin: { label: "Full Access · Edit Everything", short: "Edit Everything" },
    editor: { label: "Editor", short: "Editor" },
    deploy: { label: "Deployer", short: "Deployer" },
    viewer: { label: "Read Only", short: "Read Only" }
  };

  /* ---------------------------------------------------------
     Email notifications to the TRI TECH team
     Uses FormSubmit (free form-to-email, no backend needed).
     --------------------------------------------------------- */
  const NOTIFY_EMAIL = "tritechglobalsolutions3@gmail.com";
  async function notifyTritech(payload) {
    try {
      const body = Object.assign({ _captcha: "false" }, payload);
      const response = await fetch("https://formsubmit.co/ajax/" + NOTIFY_EMAIL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body)
      });
      if (!response.ok) return false;
      const result = await response.json();
      return result.success === true || result.success === "true";
    } catch (e) { return false; }
  }

  /* ---------------------------------------------------------
     Shared approval store (kvdb.io — free, no signup)
     Holds approved emails + pending client access requests so
     approvals work across different devices/browsers.
     --------------------------------------------------------- */
  const KVDB_BUCKET = "SbmH9MGMJUno6rGGhboHJ7";
  const KVDB = "https://kvdb.io/" + KVDB_BUCKET;

  async function kvGet(key) {
    try {
      const res = await fetch(KVDB + "/" + key, { headers: { Accept: "text/plain" } });
      if (!res.ok) return null;
      const text = await res.text();
      try { return JSON.parse(text); } catch (e) { return null; }
    } catch (e) { return null; }
  }
  async function kvSet(key, value) {
    try {
      const res = await fetch(KVDB + "/" + key, { method: "PUT", body: JSON.stringify(value) });
      return res.ok;
    } catch (e) { return false; }
  }

  async function submitAccessRequest(email, mobile, details) {
    let stored = false;
    try {
      const requests = await kvGet("requests");
      const list = Array.isArray(requests) ? requests : [];
      list.push({ email, mobile, details, ts: Date.now(), status: "pending" });
      stored = await kvSet("requests", list);
    } catch (e) { /* email delivery is handled separately */ }

    const emailed = await notifyTritech({
      _subject: "TRI TECH — New Client Access Request",
      "Email": email,
      "Mobile Number": mobile,
      "Details": details,
      "Time": new Date().toLocaleString()
    });
    return { stored, emailed };
  }

  /* ---------------------------------------------------------
     Password visibility toggle
     --------------------------------------------------------- */
  $$(".pass-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = $("#" + btn.getAttribute("data-target"));
      if (!input) return;
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.classList.toggle("visible", show);
      btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
      input.focus({ preventScroll: true });
    });
  });

  /* ---------------------------------------------------------
     Remembered email prefill
     --------------------------------------------------------- */
  try {
    const remembered = localStorage.getItem("tritech.remembered");
    if (remembered) {
      $$("input[data-remembered]").forEach((input) => {
        if (!input.value) input.value = remembered;
      });
    }
  } catch (e) { /* storage unavailable — ignore */ }

  $$('form[data-auth]').forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const note = $("#" + form.getAttribute("data-note"));
      if (!note) return;
      note.classList.add("error");
      note.textContent = "Secure sign-in is not configured yet. No credentials were sent or saved. Please contact TRI TECH for access.";
    });
  });

  /* ---------------------------------------------------------
     Client Access Request modal (login page)
     --------------------------------------------------------- */
  let openAccessRequestModal = null;
  const accessModal = $("#access-modal");
  if (accessModal) {
    const trigger = $("[data-open-access]");
    const closeBtn = $("#access-close");
    const cancelBtn = $("#access-cancel");
    const form = $("#access-request-form");
    const note = $("#access-note");
    const emailField = $("#access-email");
    const mobileField = $("#access-mobile");
    const detailsField = $("#access-details");

    function openModal() {
      accessModal.classList.add("open");
      accessModal.setAttribute("aria-hidden", "false");
      document.body.classList.add("menu-locked");
      const loginEmail = $("#login-email");
      if (loginEmail && emailField && loginEmail.value && !emailField.value) {
        emailField.value = loginEmail.value;
      }
      setTimeout(() => { if (emailField) emailField.focus(); }, 120);
    }
    openAccessRequestModal = openModal;
    function closeModal() {
      accessModal.classList.remove("open");
      accessModal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("menu-locked");
    }

    if (trigger) trigger.addEventListener("click", (e) => { e.preventDefault(); openModal(); });
    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    if (cancelBtn) cancelBtn.addEventListener("click", closeModal);
    accessModal.addEventListener("click", (e) => {
      if (e.target === accessModal) closeModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && accessModal.classList.contains("open")) closeModal();
    });

    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        note.classList.remove("error");
        note.textContent = "";

        const email = emailField.value.trim();
        const mobile = mobileField.value.trim();
        const details = detailsField.value.trim();

        if (!isValidEmail(email)) {
          note.classList.add("error");
          note.textContent = "Please enter a valid email address.";
          return;
        }
        if (!/^(\+?91[\s-]?)?[6-9]\d{9}$/.test(mobile.replace(/[\s-]/g, ""))) {
          note.classList.add("error");
          note.textContent = "Please enter a valid mobile number.";
          return;
        }
        if (details.length < 10) {
          note.classList.add("error");
          note.textContent = "Please share a few more details (min 10 characters).";
          return;
        }

        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = "Submitting…";

        const result = await submitAccessRequest(email, mobile, details);

        form.reset();
        emailField.value = email;
        note.textContent = result.emailed
          ? "✓ Request sent to TRI TECH. You can log in once your access is approved."
          : "Request saved, but the email could not be sent. Please try again later or contact us directly.";
        note.classList.toggle("error", !result.emailed);
        btn.textContent = result.emailed ? "✓ Request Sent" : "Try Again";
        btn.disabled = false;
        if (result.emailed) setTimeout(closeModal, 2400);
        setTimeout(() => {
          note.textContent = "";
          btn.textContent = "Submit Request →";
        }, 4000);
      });
    }
  }

  const standaloneAccessForm = $("#standalone-access-form");
  if (standaloneAccessForm) {
    const emailField = $("#access-email");
    const mobileField = $("#access-mobile");
    const detailsField = $("#access-details");
    const note = $("#access-note");
    const button = standaloneAccessForm.querySelector('button[type="submit"]');
    const rememberedEmail = localStorage.getItem("tritech.access-email");
    if (rememberedEmail && emailField) emailField.value = rememberedEmail;

    standaloneAccessForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      note.classList.remove("error");
      note.textContent = "";
      const email = emailField.value.trim();
      const mobile = mobileField.value.trim();
      const details = detailsField.value.trim();

      if (!isValidEmail(email)) {
        note.classList.add("error");
        note.textContent = "Please enter a valid email address.";
        return;
      }
      if (!/^(\+?91[\s-]?)?[6-9]\d{9}$/.test(mobile.replace(/[\s-]/g, ""))) {
        note.classList.add("error");
        note.textContent = "Please enter a valid Indian mobile number.";
        return;
      }
      if (details.length < 10) {
        note.classList.add("error");
        note.textContent = "Please share a few more details (at least 10 characters).";
        return;
      }

      button.disabled = true;
      button.textContent = "Sending…";
      const result = await submitAccessRequest(email, mobile, details);
      if (result.emailed) {
        note.textContent = "Your access request was emailed to TRI TECH. We’ll contact you after reviewing it.";
        standaloneAccessForm.reset();
        try { localStorage.setItem("tritech.access-email", email); } catch (e) { /* storage optional */ }
        button.textContent = "Request Sent";
      } else {
        note.classList.add("error");
        note.textContent = result.stored
          ? "We saved your request, but email delivery failed. Please try again later."
          : "We couldn’t submit the request. Check your connection and try again.";
        button.textContent = "Try Again";
      }
      button.disabled = false;
    });
  }

  /* ---------------------------------------------------------
     Terminal typewriter (Developer Console)
     --------------------------------------------------------- */
  const termLine = $("[data-type]");
  if (termLine) {
    const text = termLine.getAttribute("data-type");
    const cursor = termLine.querySelector(".term-cursor");
    if (reduceMotion) {
      termLine.textContent = text;
    } else {
      termLine.textContent = "";
      let i = 0;
      (function type() {
        if (i > text.length) return;
        termLine.textContent = text.slice(0, i) + " ";
        if (cursor) termLine.appendChild(cursor);
        if (i < text.length) setTimeout(type, 34, ++i);
      })();
    }
  }

  /* ---------------------------------------------------------
     Dashboard — permission management (Developer Console)
     --------------------------------------------------------- */
  const dashRoleBadge = $("#dash-role");
  if (dashRoleBadge) {
    let session = null;
    try {
      session = JSON.parse(localStorage.getItem("tritech.session") || "null");
    } catch (e) { /* ignore */ }

    // No valid dev session → send back to the console login
    if (!session || session.portal !== "dev") {
      window.location.replace("developer-console.html");
      return;
    }

    const role = (session.permission && session.permission.role) || "admin";
    const roleLabel = DASH_ROLES[role] ? DASH_ROLES[role].label : DASH_ROLES.admin.label;

    const emailEl = $("#dash-email");
    if (emailEl) emailEl.textContent = session.email || "developer@tritech.dev";
    dashRoleBadge.textContent = roleLabel;

    const master = $("#perm-master");
    const toggleIds = ["perm-code", "perm-deploy", "perm-keys", "perm-team", "perm-logs"];
    const toggles = toggleIds.map((id) => document.getElementById(id)).filter(Boolean);
    const dashNote = $("#dash-note");

    /* Pre-set toggles from the granted role */
    const PERM_PRESETS = {
      admin: { master: true, code: true, deploy: true, keys: true, team: true, logs: true },
      editor: { master: false, code: true, deploy: true, keys: false, team: false, logs: true },
      deploy: { master: false, code: false, deploy: true, keys: false, team: false, logs: true },
      viewer: { master: false, code: false, deploy: false, keys: false, team: false, logs: true }
    };
    const preset = PERM_PRESETS[role] || PERM_PRESETS.admin;
    Object.keys(preset).forEach((key) => {
      const el = document.getElementById("perm-" + key);
      if (el) el.checked = preset[key];
    });
    if (master) {
      toggles.forEach((t) => { t.disabled = master.checked; });
      const owner = $("[data-owner]");
      if (owner) owner.value = role;
    }

    /* Master "Edit Everything" switch */
    if (master) {
      master.addEventListener("change", () => {
        toggles.forEach((t) => { t.checked = master.checked; t.disabled = master.checked; });
      });
    }

    /* Apply permission changes */
    const saveBtn = $("[data-save-perms]");
    if (saveBtn) {
      saveBtn.addEventListener("click", () => {
        const editEverything = master ? master.checked : true;
        const perms = {
          editEverything,
          code: !!$("#perm-code") && $("#perm-code").checked,
          deploy: !!$("#perm-deploy") && $("#perm-deploy").checked,
          keys: !!$("#perm-keys") && $("#perm-keys").checked,
          team: !!$("#perm-team") && $("#perm-team").checked,
          logs: !!$("#perm-logs") && $("#perm-logs").checked
        };
        const team = Array.from($$(".member")).map((row) => ({
          name: row.querySelector(".member-info strong") ? row.querySelector(".member-info strong").textContent : "Member",
          role: row.querySelector("select") ? row.querySelector("select").value : "viewer"
        }));
        try {
          localStorage.setItem("tritech.permissions", JSON.stringify({ perms, team, updatedAt: Date.now() }));
        } catch (err) { /* ignore */ }

        if (dashNote) {
          dashNote.classList.remove("error");
          dashNote.textContent = editEverything
            ? "✓ Permissions saved — Edit Everything is ON for this workspace."
            : "✓ Permissions saved — fine-grained access applied.";
        }
        saveBtn.textContent = "✓ Permissions Applied";
        setTimeout(() => { saveBtn.textContent = "Apply Permission Changes"; }, 3000);
      });
    }

    /* Sign out */
    const signOut = $("[data-signout]");
    if (signOut) {
      signOut.addEventListener("click", (e) => {
        e.preventDefault();
        localStorage.removeItem("tritech.session");
        window.location.href = "developer-console.html";
      });
    }
  }

  /* ---------------------------------------------------------
     Website Editor — edit website content (Developer only)
     --------------------------------------------------------- */
  const editorPanel = $("#website-editor-panel");
  if (editorPanel) {
    let session = null;
    try { session = JSON.parse(localStorage.getItem("tritech.session") || "null"); } catch (e) { /* ignore */ }

    // Developer-only — redirect everyone else away
    if (!session || session.portal !== "dev") {
      window.location.replace("developer-console.html");
      return;
    }

    const emailEl = $("#edit-email");
    if (emailEl) emailEl.textContent = session.email || "developer@tritech.dev";
    const roleEl = $("#edit-role");
    if (roleEl) {
      const role = (session.permission && session.permission.role) || "admin";
      roleEl.textContent = DASH_ROLES[role] ? DASH_ROLES[role].label : DASH_ROLES.admin.label;
    }

    /* Editable fields — map data-edit keys to form inputs */
    const KEY_FIELDS = {
      "stat-projects": $("#edit-stat-projects"),
      "stat-experts": $("#edit-stat-experts"),
      "stat-industries": $("#edit-stat-industries"),
      "stat-satisfaction": $("#edit-stat-satisfaction"),
      "hero-title-1": $("#edit-hero-title-1"),
      "hero-title-2": $("#edit-hero-title-2"),
      "hero-title-3": $("#edit-hero-title-3"),
      "hero-sub": $("#edit-hero-sub"),
      "contact-email": $("#edit-contact-email"),
      "contact-phone": $("#edit-contact-phone")
    };

    let savedContent = {};
    try { savedContent = JSON.parse(localStorage.getItem("tritech.content") || "{}"); } catch (e) { savedContent = {}; }
    Object.keys(KEY_FIELDS).forEach((key) => {
      const el = KEY_FIELDS[key];
      if (!el) return;
      el.value = savedContent[key] != null && savedContent[key] !== "" ? savedContent[key] : (el.dataset.default || "");
    });

    const saveBtn = $("[data-save-content]");
    const note = $("#edit-note");
    if (saveBtn && note) {
      saveBtn.addEventListener("click", () => {
        note.classList.remove("error");
        note.textContent = "";

        const content = {};
        Object.keys(KEY_FIELDS).forEach((key) => {
          const el = KEY_FIELDS[key];
          if (el) content[key] = el.value.trim();
        });

        let statsOk = true;
        ["stat-projects", "stat-experts", "stat-industries", "stat-satisfaction"].forEach((k) => {
          if (content[k] !== "" && !/^[0-9]+$/.test(content[k])) statsOk = false;
        });
        if (!statsOk) {
          note.classList.add("error");
          note.textContent = "Stat values must be numbers only.";
          return;
        }
        if (content["contact-email"] && !isValidEmail(content["contact-email"])) {
          note.classList.add("error");
          note.textContent = "Please enter a valid contact email.";
          return;
        }

        try { localStorage.setItem("tritech.content", JSON.stringify(content)); } catch (e) { /* ignore */ }

        note.textContent = "✓ Website content saved! It applies on the homepage instantly.";
        saveBtn.textContent = "✓ Changes Saved";
        setTimeout(() => { saveBtn.textContent = "Save Website Changes"; }, 3000);
      });
    }

    const signOut = $("[data-signout]");
    if (signOut) {
      signOut.addEventListener("click", (e) => {
        e.preventDefault();
        localStorage.removeItem("tritech.session");
        window.location.href = "developer-console.html";
      });
    }
  }

  /* ---------------------------------------------------------
     Admin — Client Access Approvals (Developer only)
     --------------------------------------------------------- */
  const approvalsPanel = $("#approvals-panel");
  if (approvalsPanel) {
    let session = null;
    try { session = JSON.parse(localStorage.getItem("tritech.session") || "null"); } catch (e) { /* ignore */ }
    if (!session || session.portal !== "dev") {
      window.location.replace("developer-console.html");
      return;
    }

    const emailEl = $("#ap-email");
    if (emailEl) emailEl.textContent = session.email || "developer@tritech.dev";

    function esc(s) {
      return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    }

    let approved = [];
    let requests = [];

    async function load() {
      const a = await kvGet("approved");
      if (Array.isArray(a)) approved = a;
      const r = await kvGet("requests");
      if (Array.isArray(r)) requests = r;
      render();
    }

    function render() {
      const pendingWrap = $("#ap-pending");
      const approvedWrap = $("#ap-approved");
      if (!pendingWrap || !approvedWrap) return;

      const pending = requests.filter((x) => x && x.status !== "rejected");
      pendingWrap.innerHTML = pending.length
        ? ""
        : '<p class="ap-empty">No pending access requests.</p>';
      pending.forEach((req) => {
        const row = document.createElement("div");
        row.className = "member";
        row.innerHTML =
          '<span class="member-avatar">' + esc((req.email || "?").slice(0, 2).toUpperCase()) + "</span>" +
          '<span class="member-info"><strong>' + esc(req.email) + "</strong>" +
          "<small>" + esc(req.mobile || "") + " · " + esc(req.details || "") + " · " + new Date(req.ts).toLocaleString() + "</small></span>" +
          '<span class="ap-actions">' +
          '<button class="btn btn-primary btn-sm" data-approve="' + encodeURIComponent(req.email) + '">Approve ✓</button>' +
          '<button class="btn btn-ghost btn-sm" data-reject="' + encodeURIComponent(req.email) + '">Reject</button>' +
          "</span>";
        pendingWrap.appendChild(row);
      });

      approvedWrap.innerHTML = approved.length
        ? ""
        : '<p class="ap-empty">No approved emails yet.</p>';
      approved.forEach((em) => {
        const row = document.createElement("div");
        row.className = "member";
        row.innerHTML =
          '<span class="member-avatar">' + esc(em.slice(0, 2).toUpperCase()) + "</span>" +
          '<span class="member-info"><strong>' + esc(em) + "</strong><small>Approved — can log in</small></span>" +
          '<button class="btn btn-ghost btn-sm" data-revoke="' + encodeURIComponent(em) + '">Revoke</button>';
        approvedWrap.appendChild(row);
      });

      pendingWrap.querySelectorAll("[data-approve]").forEach((b) => {
        b.addEventListener("click", () => setStatus(decodeURIComponent(b.getAttribute("data-approve")), "approved"));
      });
      pendingWrap.querySelectorAll("[data-reject]").forEach((b) => {
        b.addEventListener("click", () => setStatus(decodeURIComponent(b.getAttribute("data-reject")), "rejected"));
      });
      approvedWrap.querySelectorAll("[data-revoke]").forEach((b) => {
        b.addEventListener("click", () => revoke(decodeURIComponent(b.getAttribute("data-revoke"))));
      });
    }

    async function save() {
      const okA = await kvSet("approved", approved);
      const okR = await kvSet("requests", requests);
      const note = $("#ap-note");
      if (note) {
        note.classList.toggle("error", !(okA && okR));
        note.textContent = okA && okR
          ? "✓ Changes saved — approvals synced. Clients can now log in."
          : "⚠️ Approvals could not be synced. Please activate the approval service (kvdb.io) in your email and try again.";
      }
      render();
    }

    async function setStatus(email, status) {
      requests = requests.map((r) =>
        String(r.email).toLowerCase() === email.toLowerCase() ? Object.assign({}, r, { status }) : r
      );
      if (status === "approved" && !approved.some((e) => e.toLowerCase() === email.toLowerCase())) {
        approved.push(email);
      }
      await save();
    }

    async function revoke(email) {
      approved = approved.filter((e) => e.toLowerCase() !== email.toLowerCase());
      await save();
    }

    const addBtn = $("#ap-add");
    const addInput = $("#ap-add-email");
    if (addBtn && addInput) {
      addBtn.addEventListener("click", async () => {
        const em = addInput.value.trim().toLowerCase();
        const note = $("#ap-note");
        if (!isValidEmail(em)) {
          if (note) { note.classList.add("error"); note.textContent = "Please enter a valid email address."; }
          return;
        }
        if (!approved.some((e) => e.toLowerCase() === em)) approved.push(em);
        addInput.value = "";
        await save();
      });
    }

    const signOut = $("[data-signout]");
    if (signOut) {
      signOut.addEventListener("click", (e) => {
        e.preventDefault();
        localStorage.removeItem("tritech.session");
        window.location.href = "developer-console.html";
      });
    }

    load();
  }
})();