(() => {
  const catalog = window.RESUME_VIEW_CATALOG;
  const errorEl = document.getElementById("error");
  const emptyEl = document.getElementById("empty");
  const sheetEl = document.getElementById("sheet");
  const fileEl = document.getElementById("file");

  const FONT_STACK = {
    sans: 'Helvetica, Arial, "Segoe UI", sans-serif',
    serif: '"Times New Roman", Times, Georgia, serif',
    mono: '"Courier New", Courier, monospace',
  };

  const MAX_FILE_BYTES = 10 * 1024 * 1024;
  const MAX_JSON_CHARS = 2 * 1024 * 1024;
  const MAX_HASH_CHARS = 8000;
  let objectUrl = "";

  function clearObjectUrl() {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = "";
  }

  function fail(message) {
    clearObjectUrl();
    errorEl.hidden = false;
    errorEl.textContent = message;
    sheetEl.hidden = true;
    emptyEl.hidden = false;
  }

  function text(el, value) {
    el.textContent = value || "";
  }

  function el(tag, className) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }

  function fromBase64Url(raw) {
    const pad = raw.length % 4 === 0 ? "" : "=".repeat(4 - (raw.length % 4));
    const b64 = raw.replace(/-/g, "+").replace(/_/g, "/") + pad;
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  function parseJsonText(text) {
    if (typeof text !== "string" || text.length > MAX_JSON_CHARS) {
      throw new Error("View file is too large.");
    }
    const raw = JSON.parse(text);
    if (!isRecord(raw)) throw new Error("Bad view payload.");
    if ("__proto__" in raw || "constructor" in raw) throw new Error("Bad view payload.");
    return raw;
  }

  async function decodeHash(hash) {
    const value = hash.replace(/^#/, "");
    if (value.length > MAX_HASH_CHARS) throw new Error("View link is too large.");
    if (value.startsWith("v1z.")) {
      const bytes = fromBase64Url(value.slice(4));
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
      const json = await new Response(stream).text();
      if (json.length > MAX_JSON_CHARS) throw new Error("View link is too large.");
      return parseJsonText(json);
    }
    if (value.startsWith("v1.")) {
      const bytes = fromBase64Url(value.slice(3));
      const text = new TextDecoder().decode(bytes);
      if (text.length > MAX_JSON_CHARS) throw new Error("View link is too large.");
      return parseJsonText(text);
    }
    throw new Error("Unknown view format.");
  }

  function isRecord(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function asString(value, max) {
    return typeof value === "string" ? value.slice(0, max) : "";
  }

  function asJobs(value) {
    if (!Array.isArray(value) || value.length > 40) return null;
    const out = [];
    for (const item of value) {
      if (!isRecord(item) || !Array.isArray(item.highlights) || item.highlights.length > 12) return null;
      out.push({
        position: asString(item.position, 200),
        company: asString(item.company, 200),
        location: asString(item.location, 120),
        startDate: asString(item.startDate, 40),
        endDate: asString(item.endDate, 40),
        highlights: item.highlights.filter((line) => typeof line === "string").map((line) => line.slice(0, 400)),
      });
    }
    return out;
  }

  function parsePayload(raw) {
    if (!isRecord(raw) || raw.v !== 1) throw new Error("Bad view payload.");
    if (!catalog.templates[raw.template] || !catalog.looks[raw.look] || !catalog.fonts[raw.font]) {
      throw new Error("Unknown template, look, or font.");
    }
    if (!isRecord(raw.resume) || !isRecord(raw.resume.basics)) throw new Error("Bad resume.");
    const jobs = asJobs(raw.resume.work);
    const volunteer = asJobs(raw.resume.volunteer || []);
    if (!jobs || !volunteer) throw new Error("Bad work history.");
    return {
      template: raw.template,
      look: raw.look,
      font: raw.font,
      resume: {
        basics: {
          name: asString(raw.resume.basics.name, 120),
          label: asString(raw.resume.basics.label, 160),
          email: asString(raw.resume.basics.email, 120),
          phone: asString(raw.resume.basics.phone, 40),
          url: asString(raw.resume.basics.url, 200),
          location: asString(raw.resume.basics.location, 120),
          summary: asString(raw.resume.basics.summary, 1600),
          summaryHeading: asString(raw.resume.basics.summaryHeading, 80),
        },
        work: jobs,
        volunteer,
        education: Array.isArray(raw.resume.education) ? raw.resume.education.slice(0, 20) : [],
        skills: Array.isArray(raw.resume.skills) ? raw.resume.skills.slice(0, 40).map((s) => asString(s, 80)) : [],
        certificates: Array.isArray(raw.resume.certificates) ? raw.resume.certificates.slice(0, 30) : [],
        languages: Array.isArray(raw.resume.languages) ? raw.resume.languages.slice(0, 20) : [],
        projects: Array.isArray(raw.resume.projects) ? raw.resume.projects.slice(0, 20) : [],
        publications: Array.isArray(raw.resume.publications) ? raw.resume.publications.slice(0, 40) : [],
        referencesNote: asString(raw.resume.referencesNote, 200),
      },
    };
  }

  function heading(template, section, resume) {
    if (section === "summary" && resume?.basics?.summaryHeading) {
      return resume.basics.summaryHeading;
    }
    return (catalog.extraHeadings[template] && catalog.extraHeadings[template][section]) || catalog.headings[section];
  }

  function dates(start, end) {
    return [start, end].filter(Boolean).join(" – ");
  }

  function addJobs(parent, items, title) {
    if (!items.length) return;
    const section = el("section");
    const h = el("h3");
    text(h, title);
    section.appendChild(h);
    for (const job of items) {
      const article = el("article", "job");
      const header = el("header");
      const strong = el("strong");
      text(strong, job.position);
      const span = el("span", "dates");
      text(span, dates(job.startDate, job.endDate));
      header.appendChild(strong);
      header.appendChild(span);
      article.appendChild(header);
      const company = el("div", "company");
      text(company, [job.company, job.location].filter(Boolean).join(" · "));
      article.appendChild(company);
      if (job.highlights && job.highlights.length) {
        const ul = el("ul");
        for (const line of job.highlights) {
          const li = el("li");
          text(li, line);
          ul.appendChild(li);
        }
        article.appendChild(ul);
      }
      section.appendChild(article);
    }
    parent.appendChild(section);
  }

  function render(payload) {
    const look = catalog.looks[payload.look];
    const [ink, muted, accent, rule, headingStyle, nameCase, align, density] = look;
    const track = look[8];
    clearObjectUrl();
    sheetEl.replaceChildren();
    sheetEl.className = `sheet ${density}`;
    sheetEl.style.color = ink;
    sheetEl.style.fontFamily = FONT_STACK[catalog.fonts[payload.font]] || FONT_STACK.sans;

    const head = el("header", `sheet-head ${rule} ${align}`);
    head.style.borderBottomColor = rule === "accent" || rule === "double" ? accent : ink;
    const name = el("h1", nameCase === "upper" ? "upper" : "");
    name.style.color = accent;
    name.style.letterSpacing = `${track}px`;
    text(name, payload.resume.basics.name || "Resume");
    head.appendChild(name);
    if (payload.resume.basics.label) {
      const label = el("p", "label");
      label.style.color = muted;
      text(label, payload.resume.basics.label);
      head.appendChild(label);
    }
    const contact = [payload.resume.basics.location, payload.resume.basics.email, payload.resume.basics.phone, payload.resume.basics.url]
      .filter(Boolean)
      .join("  ·  ");
    if (contact) {
      const line = el("p", "contact");
      line.style.color = muted;
      text(line, contact);
      head.appendChild(line);
    }
    sheetEl.appendChild(head);

    const resume = payload.resume;
    for (const section of catalog.templates[payload.template]) {
      const title = heading(payload.template, section, resume);
      if (section === "summary" && resume.basics.summary) {
        const wrap = el("section");
        const h = el("h3", headingStyle === "plain" ? "" : headingStyle);
        h.style.color = accent;
        text(h, title);
        const p = el("p");
        text(p, resume.basics.summary);
        wrap.appendChild(h);
        wrap.appendChild(p);
        sheetEl.appendChild(wrap);
      } else if (section === "skills" && resume.skills.length) {
        const wrap = el("section");
        const h = el("h3", headingStyle === "plain" ? "" : headingStyle);
        h.style.color = accent;
        text(h, title);
        const p = el("p");
        text(p, resume.skills.join("  ·  "));
        wrap.appendChild(h);
        wrap.appendChild(p);
        sheetEl.appendChild(wrap);
      } else if (section === "experience") addJobs(sheetEl, resume.work, title);
      else if (section === "volunteer") addJobs(sheetEl, resume.volunteer, title);
      else if (section === "education" && resume.education.length) {
        const wrap = el("section");
        const h = el("h3", headingStyle === "plain" ? "" : headingStyle);
        h.style.color = accent;
        text(h, title);
        wrap.appendChild(h);
        for (const item of resume.education) {
          if (!isRecord(item)) continue;
          const article = el("article", "job");
          const header = el("header");
          const strong = el("strong");
          const label = [item.studyType, item.area].filter(Boolean).join(" · ") || asString(item.institution, 200);
          const rest = item.institution && label !== item.institution ? ` — ${item.institution}` : "";
          text(strong, `${label}${rest}`);
          const span = el("span", "dates");
          text(span, dates(asString(item.startDate, 40), asString(item.endDate, 40)));
          header.appendChild(strong);
          header.appendChild(span);
          article.appendChild(header);
          wrap.appendChild(article);
        }
        sheetEl.appendChild(wrap);
      } else if (section === "certs" && resume.certificates.length) {
        const wrap = el("section");
        const h = el("h3", headingStyle === "plain" ? "" : headingStyle);
        h.style.color = accent;
        text(h, title);
        const ul = el("ul");
        for (const item of resume.certificates) {
          if (!isRecord(item)) continue;
          const li = el("li");
          text(li, [item.name, item.issuer, item.date].filter(Boolean).join(" · "));
          ul.appendChild(li);
        }
        wrap.appendChild(h);
        wrap.appendChild(ul);
        sheetEl.appendChild(wrap);
      } else if (section === "languages" && resume.languages.length) {
        const wrap = el("section");
        const h = el("h3", headingStyle === "plain" ? "" : headingStyle);
        h.style.color = accent;
        text(h, title);
        const p = el("p");
        text(
          p,
          resume.languages
            .filter(isRecord)
            .map((item) => [item.language, item.fluency].filter(Boolean).join(" — "))
            .join("  ·  "),
        );
        wrap.appendChild(h);
        wrap.appendChild(p);
        sheetEl.appendChild(wrap);
      } else if (section === "projects" && resume.projects.length) {
        addJobs(
          sheetEl,
          resume.projects.filter(isRecord).map((item) => ({
            position: asString(item.name, 200),
            company: "",
            location: "",
            startDate: asString(item.date, 40),
            endDate: "",
            highlights: Array.isArray(item.highlights) ? item.highlights.filter((line) => typeof line === "string") : [],
          })),
          title,
        );
      } else if (section === "publications" && resume.publications.length) {
        const wrap = el("section");
        const h = el("h3", headingStyle === "plain" ? "" : headingStyle);
        h.style.color = accent;
        text(h, title);
        const ul = el("ul");
        for (const item of resume.publications) {
          if (!isRecord(item)) continue;
          const li = el("li");
          text(li, [item.title, item.venue, item.date].filter(Boolean).join(". "));
          ul.appendChild(li);
        }
        wrap.appendChild(h);
        wrap.appendChild(ul);
        sheetEl.appendChild(wrap);
      } else if (section === "references" && resume.referencesNote) {
        const wrap = el("section");
        const h = el("h3", headingStyle === "plain" ? "" : headingStyle);
        h.style.color = accent;
        text(h, title);
        const p = el("p");
        text(p, resume.referencesNote);
        wrap.appendChild(h);
        wrap.appendChild(p);
        sheetEl.appendChild(wrap);
      }
    }

    errorEl.hidden = true;
    emptyEl.hidden = true;
    sheetEl.hidden = false;
  }

  async function show(raw) {
    try {
      render(parsePayload(raw));
    } catch (err) {
      fail(err instanceof Error ? err.message : "Could not display that view.");
    }
  }

  async function fromLocation() {
    if (!location.hash || location.hash === "#") return;
    try {
      await show(await decodeHash(location.hash));
    } catch (err) {
      fail(err instanceof Error ? err.message : "Could not read the view link.");
    }
  }

  function sniff(bytes, name) {
    const lower = name.toLowerCase();
    if (lower.endsWith(".pdf") || (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46)) {
      return "pdf";
    }
    if (
      (bytes[0] === 0xff && bytes[1] === 0xd8) ||
      (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) ||
      (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) ||
      lower.endsWith(".png") ||
      lower.endsWith(".jpg") ||
      lower.endsWith(".jpeg") ||
      lower.endsWith(".webp")
    ) {
      return "image";
    }
    if (
      lower.endsWith(".doc") ||
      lower.endsWith(".docx") ||
      lower.endsWith(".xls") ||
      lower.endsWith(".xlsx") ||
      (bytes[0] === 0x50 && bytes[1] === 0x4b)
    ) {
      return "office";
    }
    return "json";
  }

  function showBlob(file, kind) {
    clearObjectUrl();
    objectUrl = URL.createObjectURL(file);
    sheetEl.replaceChildren();
    sheetEl.className = "sheet file-echo";
    if (kind === "pdf") {
      const frame = el("iframe", "file-frame");
      frame.title = "PDF";
      frame.setAttribute("sandbox", "allow-same-origin");
      frame.referrerPolicy = "no-referrer";
      frame.src = `${objectUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`;
      sheetEl.appendChild(frame);
    } else {
      const img = el("img", "file-image");
      img.alt = "Resume scan";
      img.referrerPolicy = "no-referrer";
      img.src = objectUrl;
      sheetEl.appendChild(img);
    }
    errorEl.hidden = true;
    emptyEl.hidden = true;
    sheetEl.hidden = false;
  }

  fileEl.addEventListener("change", async () => {
    const file = fileEl.files && fileEl.files[0];
    fileEl.value = "";
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      fail("That file is larger than 10 MB. Typical resumes are under 5 MB.");
      return;
    }
    try {
      const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
      const kind = sniff(head, file.name);
      if (kind === "pdf" || kind === "image") {
        showBlob(file, kind);
        return;
      }
      if (kind === "office") {
        fail("Word and Excel are not opened on this public viewer. In Resume Update Free on your PC, export a PDF or copy a public view link.");
        return;
      }
      const text = await file.text();
      await show(parseJsonText(text));
    } catch {
      fail("That file is not a valid view JSON or PDF.");
    }
  });

  window.addEventListener("hashchange", fromLocation);
  fromLocation();
})();
