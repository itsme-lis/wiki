(function () {
    var T = window.VE.templates;
    var S = window.VE.serialize;
    var W = window.VE.widgets;
    var esc = window.VE.util.escapeHtml;

    var previewhash = "Special:Preview";
    var titlekey = "visualeditortitle";
    var bodykey = "visualeditorhtml";
    var submittab = null;
    var isactive = false;
    var root = null;
    var titleheading = null;
    var canvas = null;
    var syncTimer = 0;
    var activeHeading = "text";
    var viewMode = "edit";
    var savedRange = null;
    var modeTabs = { edit: null, preview: null, raw: null };

    /*//////////////////////////////////////////////////////////////////////*/
    // Storage + URL helpers

    function normalizehash() {
        var raw = window.location.hash ? window.location.hash.slice(1) : "Main_Page";
        try { return decodeURIComponent(raw || "Main_Page"); } catch (_err) { return raw || "Main_Page"; }
    }
    function ispreviewhash() {
        return normalizehash().replace(/_/g, " ").replace(/\s+/g, " ").trim().toLowerCase() === previewhash.toLowerCase();
    }
    function gettitle() {
        return localStorage.getItem(titlekey) || "Edit Me!";
    }
    function settitle(value) {
        localStorage.setItem(titlekey, String(value || "Edit Me!").trim() || "Edit Me!");
    }
    function getstoredhtml() {
        return localStorage.getItem(bodykey) || "<p>Hello world!</p>";
    }
    function setstoredhtml(value) {
        localStorage.setItem(bodykey, value || "<p></p>");
    }
    function getsuggestedfilename() {
        var title = String(gettitle() || "New Article");
        return title.replace(/[<>:"/\\|?*]+/g, "").replace(/\s+/g, " ").trim() || "New Article";
    }

    /*//////////////////////////////////////////////////////////////////////*/
    // Toolbar tabs (Submit, Edit/Preview/Raw/Reset) live in the outer page
    // chrome, not inside the editor markup.

    function ensureSubmitTab() {
        var tabs = document.querySelector(".tabs");
        if (!tabs) return;
        submittab = document.querySelector("a.submittab");
        if (!submittab) {
            var li = document.createElement("li");
            submittab = document.createElement("a");
            submittab.className = "tab submittab";
            submittab.textContent = "Submit";
            submittab.target = "_blank";
            submittab.rel = "noopener noreferrer";
            li.appendChild(submittab);
            tabs.appendChild(li);
        }
    }
    function ensureModeTabs() {
        var tabs = document.querySelector(".tabs");
        if (!tabs) return;
        function ensureTab(key, label) {
            var a = tabs.querySelector('a[data-ve-mode="' + key + '"]');
            if (!a) {
                var li = document.createElement("li");
                a = document.createElement("a");
                a.className = "tab vemodetabtop";
                a.setAttribute("href", "#");
                a.setAttribute("data-ve-mode", key);
                a.textContent = label;
                li.appendChild(a);
                tabs.appendChild(li);
            }
            modeTabs[key] = a;
        }
        ensureTab("edit", "Edit");
        ensureTab("preview", "Preview");
        ensureTab("raw", "View Raw");
        // Remove the old "Reset" mode tab if it exists from a previous build.
        var staleReset = tabs.querySelector('a[data-ve-mode="reset"]');
        if (staleReset) {
            var staleLi = staleReset.closest("li");
            if (staleLi) staleLi.remove();
            else staleReset.remove();
        }
    }
    function setModeTabsVisible(active) {
        ["edit", "preview", "raw"].forEach(function (k) {
            var a = modeTabs[k];
            if (!a) return;
            var li = a.closest("li") || a;
            li.style.display = active ? "" : "none";
        });
    }
    function ensureToolbarState(active) {
        var discussion = document.querySelector("a.discussion");
        var edit = document.querySelector("a.edit");
        var history = document.querySelector("a.viewhistory");
        var search = document.querySelector(".toolbar .search");
        var pagetab = document.querySelector("a.pagetab");
        ensureSubmitTab();
        ensureModeTabs();
        [discussion, edit, history, search].forEach(function (el) {
            if (!el) return;
            var host = el.tagName === "INPUT" ? el : (el.closest("li") || el);
            host.style.display = active ? "none" : "";
        });
        if (submittab) {
            var submithost = submittab.closest("li") || submittab;
            submithost.style.display = active ? "" : "none";
        }
        if (pagetab) {
            pagetab.textContent = active ? "Edit" : "Page";
            var pagehost = pagetab.closest("li") || pagetab;
            pagehost.style.display = active ? "none" : "";
        }
        var lastedit = document.querySelector(".lastedit");
        if (lastedit) lastedit.style.display = active ? "none" : "";
        setModeTabsVisible(active);
    }

    /*//////////////////////////////////////////////////////////////////////*/
    // Selection / range helpers

    function closeDropdowns() {
        if (!root) return;
        root.querySelectorAll(".vedropdown.open").forEach(function (el) { el.classList.remove("open"); });
    }
    function getRange() {
        var sel = window.getSelection();
        if (!sel || !sel.rangeCount) return null;
        return sel.getRangeAt(0);
    }
    function saveSelectionRange() {
        var r = getRange();
        if (!r || !canvas) return;
        if (!canvas.contains(r.commonAncestorContainer)) return;
        savedRange = r.cloneRange();
    }
    function restoreSelectionRange() {
        if (!savedRange) return false;
        var sel = window.getSelection();
        if (!sel) return false;
        try {
            sel.removeAllRanges();
            sel.addRange(savedRange);
            return true;
        } catch (_err) {
            return false;
        }
    }

    /*//////////////////////////////////////////////////////////////////////*/
    // Sync pipeline (DOM cleanup + alt views + persistence)

    function scheduleSync() {
        if (syncTimer) window.clearTimeout(syncTimer);
        syncTimer = window.setTimeout(function () {
            if (!canvas) return;
            W.normalizeInlineCodeNodes(canvas);
            W.cleanupCitations(canvas);
            W.ensureReferences(canvas);
            W.syncWidgetState(canvas);
            updateAltViews();
            setstoredhtml(canvas.innerHTML);
            updateSubmitHref();
        }, 90);
    }

    function updateSubmitHref() {
        ensureSubmitTab();
        if (!submittab || !canvas) return;
        var text = "# " + gettitle() + "\n\n" + S.canvasToMarkdown(canvas);
        var filename = getsuggestedfilename() + ".md";
        submittab.href = "https://github.com/CtRHome/wiki/new/main/articles?filename=" +
            encodeURIComponent(filename) + "&value=" + encodeURIComponent(text);
    }

    function updateAltViews() {
        if (!root || !canvas) return;
        var preview = root.querySelector(".vepreviewpanel");
        var raw = root.querySelector(".verawpanel code");
        if (preview && window.WikiMarkdown && typeof window.WikiMarkdown.markdowntohtml === "function") {
            preview.innerHTML = window.WikiMarkdown.markdowntohtml(S.canvasToMarkdown(canvas));
            applyPreviewImageFallback(preview);
        }
        if (raw) raw.textContent = S.canvasToMarkdown(canvas);
    }
    function applyPreviewImageFallback(previewRoot) {
        if (!previewRoot) return;
        previewRoot.querySelectorAll("img").forEach(function (img) {
            if (img.dataset.veFallbackBound === "1") return;
            img.dataset.veFallbackBound = "1";
            img.addEventListener("error", function () {
                var src = String(img.getAttribute("src") || "");
                var isMsg = /\/msg\//i.test(src);
                img.setAttribute("src", isMsg ? "assets/images/msg/badpath.png" : "assets/images/badpath.png");
            });
        });
    }

    /*//////////////////////////////////////////////////////////////////////*/
    // Inline edit operations

    function applyInlineStyle(command) {
        if (!canvas) return;
        canvas.focus();
        restoreSelectionRange();
        document.execCommand(command, false, null);
        saveSelectionRange();
        refreshToolbarState();
        scheduleSync();
    }
    function insertAtCursor(html) {
        if (!canvas) return;
        canvas.focus();
        restoreSelectionRange();
        document.execCommand("insertHTML", false, html);
        saveSelectionRange();
        scheduleSync();
    }
    function insertWidgetAtCursor(html) {
        if (!canvas) return;
        canvas.focus();
        restoreSelectionRange();

        var r = getRange();
        var host = null;
        if (r) host = r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentElement;
        var widget = host ? host.closest(".vewidget") : null;

        if (widget && canvas.contains(widget)) {
            widget.insertAdjacentHTML("afterend", html);
            try {
                var sel = window.getSelection();
                if (sel) {
                    var after = widget.nextElementSibling;
                    var rr = document.createRange();
                    if (after) rr.setStartAfter(after);
                    else rr.setStartAfter(widget);
                    rr.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(rr);
                    saveSelectionRange();
                }
            } catch (_err) {}
            scheduleSync();
            return;
        }

        insertAtCursor(html);
    }
    function clearBlockFormatting() {
        var range = getRange();
        if (!range) return;
        var el = range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentElement;
        if (!el) return;
        var block = el.closest("h1,h2,h3,h4,h5,h6,p,blockquote,pre");
        if (!block || !canvas.contains(block)) return;
        if (block.tagName.toLowerCase() === "p") return;
        var p = document.createElement("p");
        p.innerHTML = block.innerHTML;
        block.replaceWith(p);
    }
    function applyHeading(level) {
        if (!canvas) return;
        canvas.focus();
        // Clicking the already-active heading button reverts to plain text,
        // so the same button works as both apply and remove.
        if (level === activeHeading && level !== "text") level = "text";
        clearBlockFormatting();
        if (level === "text") {
            activeHeading = "text";
            var r0 = getRange();
            if (r0) {
                var e0 = r0.startContainer.nodeType === 1 ? r0.startContainer : r0.startContainer.parentElement;
                var p0 = e0 ? e0.closest("p.smalltext") : null;
                if (p0) p0.classList.remove("smalltext");
            }
            refreshToolbarState();
            scheduleSync();
            return;
        }
        if (level === "tiny") {
            document.execCommand("formatBlock", false, "p");
            var r = getRange();
            if (r) {
                var n = r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentElement;
                var p = n ? n.closest("p") : null;
                if (p) p.classList.add("smalltext");
            }
            activeHeading = "tiny";
            refreshToolbarState();
            scheduleSync();
            return;
        }
        document.execCommand("formatBlock", false, level);
        var r1 = getRange();
        if (r1) {
            var e1 = r1.startContainer.nodeType === 1 ? r1.startContainer : r1.startContainer.parentElement;
            var p1 = e1 ? e1.closest("p.smalltext") : null;
            if (p1) p1.classList.remove("smalltext");
        }
        activeHeading = level;
        refreshToolbarState();
        scheduleSync();
    }
    function resetEditorFormattingState() {
        if (!canvas) return;
        canvas.focus();
        try { document.execCommand("removeFormat", false, null); } catch (_err) {}
        try { document.execCommand("formatBlock", false, "p"); } catch (_err) {}
        try { document.execCommand("unlink", false, null); } catch (_err) {}
        var r = getRange();
        if (r) {
            var el = r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentElement;
            var p = el ? el.closest("p") : null;
            if (p) p.classList.remove("smalltext");
        }
        activeHeading = "text";
        refreshToolbarState();
    }
    function findAdjacentInlineCode(range) {
        // Returns a <code> element the caret sits inside (or whose contents
        // the selection spans/touches), so a second monospace press unwraps
        // it. Checks start, end, and common ancestor of the range, plus
        // immediate siblings when the range is collapsed.
        function ancestorCode(node) {
            if (!node) return null;
            var el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
            if (!el) return null;
            var code = el.closest("code");
            return (code && !code.closest("pre")) ? code : null;
        }
        var hit = ancestorCode(range.startContainer)
            || ancestorCode(range.endContainer)
            || ancestorCode(range.commonAncestorContainer);
        if (hit) return hit;

        if (!range.collapsed) return null;
        var c = range.startContainer;
        var off = range.startOffset;
        var probes = [];
        if (c.nodeType === Node.ELEMENT_NODE) {
            probes.push(c.childNodes[off - 1]);
            probes.push(c.childNodes[off]);
        } else if (c.nodeType === Node.TEXT_NODE) {
            if (off === 0) probes.push(c.previousSibling);
            if (off === (c.nodeValue || "").length) probes.push(c.nextSibling);
        }
        for (var i = 0; i < probes.length; i++) {
            var p = probes[i];
            if (p && p.nodeType === Node.ELEMENT_NODE && p.tagName && p.tagName.toLowerCase() === "code" && !p.closest("pre")) return p;
        }
        return null;
    }
    function insertInlineCode() {
        if (!canvas) return;
        canvas.focus();
        restoreSelectionRange();
        var range = getRange();
        var existing = range ? findAdjacentInlineCode(range) : null;
        if (existing) {
            var textNode = document.createTextNode((existing.textContent || "").replace(/​/g, ""));
            existing.replaceWith(textNode);
            var sel0 = window.getSelection();
            if (sel0) {
                var r0 = document.createRange();
                r0.setStartAfter(textNode);
                r0.collapse(true);
                sel0.removeAllRanges();
                sel0.addRange(r0);
                saveSelectionRange();
            }
            scheduleSync();
            return;
        }
        var sel = window.getSelection();
        var selected = sel ? sel.toString() : "";
        var codeEl = document.createElement("code");
        codeEl.textContent = selected || "​";
        if (!selected) codeEl.setAttribute("data-vefresh", "1");
        if (selected && range && !range.collapsed) {
            range.deleteContents();
            range.insertNode(codeEl);
        } else if (range) {
            range.insertNode(codeEl);
        } else {
            canvas.appendChild(codeEl);
        }
        // Park the caret inside the new code so the very next press unwraps it.
        var sel2 = window.getSelection();
        if (sel2) {
            var r2 = document.createRange();
            r2.selectNodeContents(codeEl);
            r2.collapse(false);
            sel2.removeAllRanges();
            sel2.addRange(r2);
            saveSelectionRange();
        }
        scheduleSync();
    }
    // 20 common Prism languages presented in the per-block language picker.
    var CODE_LANGS = [
        ["txt", "Plain text"],
        ["js", "JavaScript"],
        ["ts", "TypeScript"],
        ["html", "HTML"],
        ["css", "CSS"],
        ["json", "JSON"],
        ["md", "Markdown"],
        ["py", "Python"],
        ["java", "Java"],
        ["c", "C"],
        ["cpp", "C++"],
        ["csharp", "C#"],
        ["php", "PHP"],
        ["ruby", "Ruby"],
        ["go", "Go"],
        ["rust", "Rust"],
        ["lua", "Lua"],
        ["bash", "Bash"],
        ["sql", "SQL"],
        ["yaml", "YAML"]
    ];
    function buildLangBarHtml(currentLang) {
        var opts = CODE_LANGS.map(function (pair) {
            var s = pair[0] === currentLang ? " selected" : "";
            return '<option value="' + esc(pair[0]) + '"' + s + '>' + esc(pair[1]) + '</option>';
        }).join("");
        return '<span class="vecodelangbar" contenteditable="false">' +
            '<select class="vecodelangselect">' + opts + '</select>' +
            '<small class="vecodehint">Ctrl+Enter to exit</small>' +
            '</span>';
    }
    function insertCodeBlock() {
        if (!canvas) return;
        canvas.focus();
        restoreSelectionRange();
        var lang = "txt";
        var sel = window.getSelection();
        var selected = sel ? (sel.toString() || "") : "";
        var content = selected ? esc(selected) : "​";
        // Use a marker id so we can locate the just-inserted block reliably
        // and place the caret inside its <code>. execCommand(insertHTML) routes
        // through the browser's undo stack so Ctrl+Z works on this insertion.
        var markerId = "veCodeBlock_" + Date.now() + "_" + Math.floor(Math.random() * 1e6);
        var html = '<pre id="' + markerId + '" class="codeblock language-' + lang + '" data-code-lang="' + lang + '">' +
            buildLangBarHtml(lang) +
            '<code class="language-' + lang + '">' + content + '</code>' +
            '</pre><p><br></p>';
        document.execCommand("insertHTML", false, html);
        var pre = document.getElementById(markerId);
        if (pre) {
            pre.removeAttribute("id");
            var code = pre.querySelector("code");
            if (code && sel) {
                var r = document.createRange();
                r.selectNodeContents(code);
                r.collapse(false);
                sel.removeAllRanges();
                sel.addRange(r);
                saveSelectionRange();
            }
        }
        scheduleSync();
    }
    // Ctrl+Enter inside a code block moves the caret to the next paragraph
    // (creating one if needed), per the hint shown next to the language picker.
    function handleCodeBlockExit(e) {
        if (e.key !== "Enter" || !(e.ctrlKey || e.metaKey)) return;
        var sel = window.getSelection();
        if (!sel || !sel.rangeCount) return;
        var n = sel.getRangeAt(0).startContainer;
        var el = n.nodeType === Node.ELEMENT_NODE ? n : n.parentElement;
        var pre = el ? el.closest("pre.codeblock") : null;
        if (!pre || !canvas.contains(pre)) return;
        e.preventDefault();
        var next = pre.nextElementSibling;
        if (!next || next.tagName.toLowerCase() !== "p") {
            next = document.createElement("p");
            next.innerHTML = "<br>";
            pre.parentNode.insertBefore(next, pre.nextSibling);
        }
        var r = document.createRange();
        r.setStart(next, 0);
        r.collapse(true);
        sel.removeAllRanges();
        sel.addRange(r);
        saveSelectionRange();
        scheduleSync();
    }
    // Backspace at the very start of an (effectively empty) code block deletes
    // the whole block. Once there's real content, Backspace works normally.
    function handleCodeBlockBackspace(e) {
        if (e.key !== "Backspace") return;
        var sel = window.getSelection();
        if (!sel || !sel.rangeCount) return;
        var r = sel.getRangeAt(0);
        if (!r.collapsed || r.startOffset !== 0) return;
        var n = r.startContainer;
        var el = n.nodeType === Node.ELEMENT_NODE ? n : n.parentElement;
        var code = el ? el.closest("pre.codeblock > code") : null;
        if (!code || !canvas.contains(code)) return;
        var pre = code.parentNode;
        var raw = (code.textContent || "").replace(/​/g, "");
        if (raw.length > 0) return;  // there's content - let default delete handle it
        var replacement = document.createElement("p");
        replacement.innerHTML = "<br>";
        pre.parentNode.replaceChild(replacement, pre);
        var rr = document.createRange();
        rr.setStart(replacement, 0);
        rr.collapse(true);
        sel.removeAllRanges();
        sel.addRange(rr);
        saveSelectionRange();
        e.preventDefault();
        scheduleSync();
    }
    // Change handler for the per-block language picker (delegated on canvas).
    function handleCodeBlockLangChange(e) {
        var picker = e.target && e.target.closest && e.target.closest(".vecodelangselect");
        if (!picker) return;
        var pre = picker.closest("pre.codeblock");
        if (!pre) return;
        var lang = picker.value || "txt";
        pre.setAttribute("data-code-lang", lang);
        pre.className = "codeblock language-" + lang;
        var code = pre.querySelector("code");
        if (code) code.className = "language-" + lang;
        scheduleSync();
    }
    function toggleList() {
        if (!canvas) return;
        canvas.focus();
        restoreSelectionRange();
        document.execCommand("insertUnorderedList", false, null);
        // execCommand creates a plain <ul>; tag it with .articlelist so the
        // wiki's custom-bullet styling (bullet.png) applies inside the canvas
        // exactly like in the rendered article.
        var r = getRange();
        if (r) {
            var n = r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentElement;
            var ul = n ? n.closest("ul") : null;
            if (ul && !ul.classList.contains("articlelist")) ul.classList.add("articlelist");
        }
        saveSelectionRange();
        scheduleSync();
    }
    // Backspace at the very start of a <li>: first press outdents that one
    // line into a <p>, leaving the rest of the list intact. The <p> takes
    // the li's position (above the list if it was the first item, after if
    // last, or splitting the list in two for items in the middle), so the
    // caret stays on the same visual row instead of jumping above the list.
    function handleListOutdent(e) {
        if (e.key !== "Backspace") return;
        var sel = window.getSelection();
        if (!sel || !sel.rangeCount) return;
        var r = sel.getRangeAt(0);
        if (!r.collapsed || r.startOffset !== 0) return;
        var c = r.startContainer;
        var ref = c.nodeType === Node.ELEMENT_NODE ? c : c.parentElement;
        var li = ref ? ref.closest("li") : null;
        if (!li || !canvas.contains(li)) return;
        // Must actually be at the start of the li (not mid-content).
        var first = li;
        while (first.firstChild) first = first.firstChild;
        if (c !== first && !(c === li && r.startOffset === 0)) return;
        var ul = li.parentNode;
        if (!ul || (ul.tagName !== "UL" && ul.tagName !== "OL")) return;

        var parent = ul.parentNode;
        var siblings = Array.prototype.slice.call(ul.children);
        var idx = siblings.indexOf(li);
        var prevLis = siblings.slice(0, idx);
        var nextLis = siblings.slice(idx + 1);

        var p = document.createElement("p");
        while (li.firstChild) p.appendChild(li.firstChild);
        if (!p.firstChild) p.appendChild(document.createElement("br"));

        if (prevLis.length === 0 && nextLis.length === 0) {
            parent.replaceChild(p, ul);
        } else if (prevLis.length === 0) {
            // First item: <p> goes above the (now shorter) list.
            parent.insertBefore(p, ul);
            li.remove();
        } else if (nextLis.length === 0) {
            // Last item: <p> goes below the list.
            parent.insertBefore(p, ul.nextSibling);
            li.remove();
        } else {
            // Middle item: split the <ul> into two, <p> sits between them.
            var ulAfter = document.createElement(ul.tagName.toLowerCase());
            if (ul.className) ulAfter.className = ul.className;
            nextLis.forEach(function (n) { ulAfter.appendChild(n); });
            parent.insertBefore(p, ul.nextSibling);
            parent.insertBefore(ulAfter, p.nextSibling);
            li.remove();
        }

        var newRange = document.createRange();
        newRange.setStart(p.firstChild || p, 0);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
        saveSelectionRange();
        e.preventDefault();
        scheduleSync();
    }

    /*//////////////////////////////////////////////////////////////////////*/
    // Citation insertion (lives here because it needs selection state)

    function citationInsertionRange() {
        // Use whatever the user has selected as the insertion point, but
        // collapsed to the END of the selection so existing text is never
        // replaced. Falls back to the end of the canvas when no caret is set.
        var range = getRange();
        if (range && canvas.contains(range.commonAncestorContainer)) {
            var clone = range.cloneRange();
            clone.collapse(false);
            return clone;
        }
        var fallback = document.createRange();
        if (canvas.lastChild) {
            fallback.selectNodeContents(canvas.lastChild);
        } else {
            fallback.selectNodeContents(canvas);
        }
        fallback.collapse(false);
        return fallback;
    }
    function placeCaretAfter(node) {
        var sel = window.getSelection();
        if (!sel) return;
        var r = document.createRange();
        r.setStartAfter(node);
        r.collapse(true);
        sel.removeAllRanges();
        sel.addRange(r);
        saveSelectionRange();
    }
    function addCitation(kind) {
        if (!canvas) return;
        canvas.focus();
        restoreSelectionRange();

        // Build the inline marker first as a real DOM node so the browser
        // can't quietly wrap it in a new block via execCommand.
        var sup;
        if (kind === "needed") {
            sup = document.createElement("sup");
            sup.className = "citationneeded";
            sup.setAttribute("data-veciteneeded", "1");
            sup.setAttribute("contenteditable", "false");
            sup.innerHTML = "<em>(source?)</em>";
        } else {
            // Make sure the references block exists BEFORE we compute the next
            // citation id so the id space stays consistent.
            W.ensureReferences(canvas, true);
            var id = W.getNextCitationId(canvas);
            sup = document.createElement("sup");
            sup.className = "citeref";
            sup.setAttribute("data-veciteid", String(id));
            sup.setAttribute("contenteditable", "false");
            sup.textContent = "[^" + id + "]";

            var list = canvas.querySelector(".vereferences ol");
            if (list) {
                var li = document.createElement("li");
                li.className = "veciteentry";
                li.setAttribute("data-veciteid", String(id));
                var desc = (kind === "link") ? "" : "description";
                var link = (kind === "desc") ? "" : "https://example.com";
                li.innerHTML =
                    '<span class="veciteindex">[' + id + "]</span> " +
                    '<span class="vecitedesc" contenteditable="true">' + esc(desc) + "</span>" +
                    '<span class="vecitesep"> | </span>' +
                    '<span class="vecitelink" contenteditable="true">' + esc(link) + "</span>";
                list.appendChild(li);
            }
        }

        var target = citationInsertionRange();
        try {
            target.insertNode(sup);
        } catch (_err) {
            // Range can become invalid (e.g., if its startContainer was
            // removed by ensureReferences). Land in the last paragraph or
            // append directly to the canvas as a last resort.
            var fallback = canvas.querySelector("p:not(.vereferences p):last-of-type") || canvas;
            fallback.appendChild(sup);
        }
        placeCaretAfter(sup);
        scheduleSync();
    }

    /*//////////////////////////////////////////////////////////////////////*/
    // Link panel

    function openLinkPanel(mode, existingLink) {
        var panel = root.querySelector(".velinkpanel");
        if (!panel) return;
        var display = panel.querySelector(".velink-display");
        var href = panel.querySelector(".velink-href");
        panel.setAttribute("data-link-mode", mode || "article");
        var selected = (window.getSelection && window.getSelection().toString()) || "";
        display.value = existingLink ? (existingLink.textContent || "") : selected;
        href.value = existingLink ? (existingLink.getAttribute("href") || "") : (mode === "article" ? "Main Page" : "https://example.com");
        panel._existingLink = existingLink || null;
        var anchorNode = existingLink;
        if (!anchorNode) {
            var r = getRange();
            if (r) {
                anchorNode = r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentElement;
            }
        }
        panel.classList.remove("inline");
        if (anchorNode && canvas.contains(anchorNode)) {
            // Prefer the actual caret rect when the anchor is the paragraph
            // itself (no DOM node we can measure to inline-precision). Falls
            // back to the bounding rect of the closest meaningful element.
            var targetRect = null;
            var r = getRange();
            if (r && (!r.collapsed || anchorNode.nodeType !== Node.ELEMENT_NODE)) {
                var rects = r.getClientRects ? r.getClientRects() : null;
                if (rects && rects.length) targetRect = rects[rects.length - 1];
                else if (r.getBoundingClientRect) targetRect = r.getBoundingClientRect();
            }
            if (!targetRect || (targetRect.width === 0 && targetRect.height === 0)) {
                targetRect = anchorNode.getBoundingClientRect ? anchorNode.getBoundingClientRect() : null;
            }
            // Compute offsets relative to the .visualeditor root so they line
            // up with the panel's positioned-parent (the root is position:
            // relative via CSS). Previously this was measured against the
            // canvas while positioned against the page, which is why it
            // appeared up near the site header.
            var rootRect = root.getBoundingClientRect();
            if (targetRect) {
                var left = Math.max(0, targetRect.left - rootRect.left);
                var top = Math.max(0, targetRect.bottom - rootRect.top + 8);
                panel.style.left = left + "px";
                panel.style.top = top + "px";
                panel.classList.add("inline");
            }
        }
        panel.classList.add("open");
    }
    function applyLinkPanel() {
        var panel = root.querySelector(".velinkpanel");
        if (!panel) return;
        var mode = panel.getAttribute("data-link-mode") || "article";
        var text = panel.querySelector(".velink-display").value.trim() || "link";
        var hrefRaw = panel.querySelector(".velink-href").value.trim();
        var href = mode === "article" ? "#" + hrefRaw.replace(/^#/, "").replace(/\s+/g, "_") : hrefRaw;
        var existing = panel._existingLink;
        if (existing && canvas.contains(existing)) {
            existing.textContent = text;
            existing.setAttribute("href", href || "#");
        } else {
            insertAtCursor('<a href="' + esc(href || "#") + '">' + esc(text) + "</a>");
        }
        panel.classList.remove("open");
        panel.classList.remove("inline");
        panel._existingLink = null;
        scheduleSync();
    }

    /*//////////////////////////////////////////////////////////////////////*/
    // Toolbar state, clipboard, mode switching, reset

    function detectActiveHeading() {
        if (!canvas) return "text";
        var r = getRange();
        if (!r) return activeHeading;
        var c = r.startContainer;
        if (!canvas.contains(c)) return activeHeading;
        var node = c.nodeType === Node.ELEMENT_NODE ? c : c.parentElement;
        if (!node) return "text";
        var block = node.closest("h1,h2,h3,h4,h5,h6,p,blockquote,pre");
        if (!block || !canvas.contains(block)) return "text";
        var tag = block.tagName.toLowerCase();
        if (/^h[1-6]$/.test(tag)) return tag;
        if (tag === "p") return block.classList.contains("smalltext") ? "tiny" : "text";
        return "text";
    }
    function refreshToolbarState() {
        if (!root) return;
        var stateMap = [
            ["bold", "bold"],
            ["italic", "italic"],
            ["underline", "underline"],
            ["strike", "strikeThrough"]
        ];
        stateMap.forEach(function (pair) {
            var btn = root.querySelector('.veaction[data-action="' + pair[0] + '"]');
            if (!btn) return;
            var isOn = false;
            try { isOn = document.queryCommandState(pair[1]); } catch (_err) {}
            btn.classList.toggle("isactive", !!isOn);
        });
        // Reflect the actual block under the caret on the heading buttons.
        activeHeading = detectActiveHeading();
        root.querySelectorAll(".veheading-option").forEach(function (b) { b.classList.remove("isactive"); });
        var active = root.querySelector('.veheading-option[data-heading="' + activeHeading + '"]');
        if (active) active.classList.add("isactive");
    }

    function insertPlainTextAtCursor(text) {
        if (!canvas) return;
        canvas.focus();
        restoreSelectionRange();
        try {
            document.execCommand("insertText", false, text);
        } catch (_err) {
            insertAtCursor(esc(text).replace(/\n/g, "<br>"));
        }
        saveSelectionRange();
        scheduleSync();
    }
    function parseClipboardLinks(html) {
        var doc = null;
        try { doc = new DOMParser().parseFromString(html, "text/html"); } catch (_err) { return null; }
        if (!doc || !doc.body) return null;
        var out = [];
        function walk(node) {
            if (!node) return;
            if (node.nodeType === Node.TEXT_NODE) { out.push({ t: "text", v: node.nodeValue || "" }); return; }
            if (node.nodeType !== Node.ELEMENT_NODE) return;
            var tag = node.tagName.toLowerCase();
            if (tag === "a") {
                var href = node.getAttribute("href") || "";
                var text = node.textContent || href || "link";
                out.push({ t: "link", href: href, text: text });
                return;
            }
            if (tag === "br") { out.push({ t: "text", v: "\n" }); return; }
            if (tag === "p" || tag === "div" || tag === "li" || tag === "tr") {
                for (var i = 0; i < node.childNodes.length; i++) walk(node.childNodes[i]);
                out.push({ t: "text", v: "\n" });
                return;
            }
            for (var j = 0; j < node.childNodes.length; j++) walk(node.childNodes[j]);
        }
        walk(doc.body);
        var hasLink = out.some(function (x) { return x.t === "link"; });
        return hasLink ? out : null;
    }

    function setViewMode(next) {
        if (!root) return;
        viewMode = next;
        root.classList.remove("vemode-edit", "vemode-preview", "vemode-raw");
        root.classList.add("vemode-" + next);
        Object.keys(modeTabs).forEach(function (key) {
            var btn = modeTabs[key];
            if (!btn) return;
            btn.classList.toggle("active", key === next);
        });
        if (next !== "edit") updateAltViews();
    }
    function confirmHardReset() {
        localStorage.removeItem(bodykey);
        localStorage.removeItem(titlekey);
        titleheading.textContent = "Edit Me!";
        canvas.innerHTML = "<p>Hello world!</p>";
        savedRange = null;
        activeHeading = "text";
        setViewMode("edit");
        scheduleSync();
        refreshToolbarState();
    }
    function openResetConfirm() {
        if (!root) return;
        var panel = root.querySelector(".veresetconfirm");
        if (!panel) return;
        var anchor = root.querySelector(".vetoolbarreset");
        if (anchor && anchor.getBoundingClientRect) {
            var rect = anchor.getBoundingClientRect();
            // Anchor confirm to the right of the new toolbar Reset button.
            panel.style.left = Math.round(rect.right - 240) + "px";
            panel.style.top = Math.round(rect.bottom + 6) + "px";
            panel.style.position = "fixed";
        }
        panel.classList.add("open");
    }
    function closeResetConfirm() {
        if (!root) return;
        var panel = root.querySelector(".veresetconfirm");
        if (!panel) return;
        panel.classList.remove("open");
    }

    /*//////////////////////////////////////////////////////////////////////*/
    // Cite-delete handler: find the citation marker that Backspace/Delete
    // would target and remove it (plus its references entry). This is needed
    // because the markers are contenteditable=false, so the browser's
    // default delete behavior doesn't always remove them, and the cursor
    // can land in a text-node-adjacent position the previous handler missed.

    function isSkippableNeighbor(node) {
        if (!node) return false;
        if (node.nodeType === Node.TEXT_NODE) return !(node.nodeValue || "").trim();
        if (node.nodeType === Node.ELEMENT_NODE) return node.tagName.toLowerCase() === "br";
        return false;
    }
    function isCiteNode(node) {
        return !!(node && node.nodeType === Node.ELEMENT_NODE && node.matches &&
            node.matches('sup.citeref[data-veciteid], sup.citationneeded'));
    }
    function citeDeletionTarget(range, isBackspace) {
        var c = range.startContainer;
        var off = range.startOffset;
        var target = null;
        if (c.nodeType === Node.ELEMENT_NODE) {
            target = c.childNodes[isBackspace ? off - 1 : off] || null;
        } else if (c.nodeType === Node.TEXT_NODE) {
            if (isBackspace && off === 0) target = c.previousSibling;
            else if (!isBackspace && off === (c.nodeValue || "").length) target = c.nextSibling;
        }
        // Walk past empty whitespace / <br> placeholders the browser may have
        // inserted between the caret and a contenteditable=false cite marker.
        while (target && isSkippableNeighbor(target)) {
            target = isBackspace ? target.previousSibling : target.nextSibling;
        }
        if (isCiteNode(target)) return target;
        // Fallback: when caret is at the very end (or start) of the enclosing
        // paragraph, ascend and check the paragraph's adjacent sibling — covers
        // the case where the cite sits as the last child and the caret ended
        // up in a position that doesn't directly neighbor it.
        if (!target && c.nodeType === Node.ELEMENT_NODE && isBackspace) {
            var last = c.lastChild;
            while (last && isSkippableNeighbor(last)) last = last.previousSibling;
            if (isCiteNode(last)) return last;
        }
        return null;
    }
    function handleCiteDeleteKey(e) {
        if (e.key !== "Backspace" && e.key !== "Delete") return;
        var sel = window.getSelection();
        if (!sel || !sel.rangeCount) return;
        var r = sel.getRangeAt(0);
        if (!r.collapsed) return;
        var cite = citeDeletionTarget(r, e.key === "Backspace");
        if (!cite) return;
        var id = cite.getAttribute("data-veciteid");
        cite.remove();
        if (id) {
            var entry = canvas.querySelector('.veciteentry[data-veciteid="' + id + '"]');
            if (entry) entry.remove();
        }
        e.preventDefault();
        scheduleSync();
    }

    /*//////////////////////////////////////////////////////////////////////*/
    // Lifecycle

    function bindControls() {
        titleheading = root.querySelector(".vetitleheading");
        canvas = root.querySelector(".vecanvas");
        titleheading.textContent = gettitle();
        canvas.innerHTML = getstoredhtml();
        W.normalizeInlineCodeNodes(canvas);
        W.cleanupCitations(canvas);
        W.ensureReferences(canvas);

        titleheading.addEventListener("input", function () {
            settitle(titleheading.textContent);
            updateSubmitHref();
            // When the title is fully emptied, contenteditable headings can
            // collapse to zero height in some browsers and stop accepting
            // further keystrokes - keep a placeholder so it stays usable.
            if (!titleheading.textContent && !titleheading.querySelector("br")) {
                titleheading.innerHTML = "<br>";
                var sel = window.getSelection();
                if (sel) {
                    var r = document.createRange();
                    r.selectNodeContents(titleheading);
                    r.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(r);
                }
            }
        });
        // Defensive: clicking back into the title should always make it
        // editable. If something elsewhere (a stale render, the IDE, etc.)
        // ever flips contenteditable off, restore it on focus.
        titleheading.addEventListener("focus", function () {
            if (titleheading.getAttribute("contenteditable") !== "true") {
                titleheading.setAttribute("contenteditable", "true");
            }
        });
        canvas.addEventListener("click", function (e) {
            var anchor = e.target.closest("a");
            if (anchor && canvas.contains(anchor)) {
                e.preventDefault();
                openLinkPanel((anchor.getAttribute("href") || "").startsWith("#") ? "article" : "external", anchor);
            }
        });
        canvas.addEventListener("mouseup", saveSelectionRange);
        canvas.addEventListener("keyup", saveSelectionRange);
        canvas.addEventListener("input", function () {
            W.normalizeInlineCodeNodes(canvas);
            scheduleSync();
        });
        canvas.addEventListener("paste", function (e) {
            if (!e || !e.clipboardData || !canvas) return;
            e.preventDefault();
            var html = e.clipboardData.getData("text/html") || "";
            var text = e.clipboardData.getData("text/plain") || "";
            var linkParts = html ? parseClipboardLinks(html) : null;
            if (linkParts && linkParts.length) {
                var htmlOut = "";
                linkParts.forEach(function (p) {
                    if (p.t === "text") htmlOut += esc(p.v);
                    else if (p.t === "link") htmlOut += '<a href="' + esc(p.href || "#") + '">' + esc(p.text || p.href || "link") + "</a>";
                });
                insertAtCursor(htmlOut);
                return;
            }
            insertPlainTextAtCursor(text || "");
        });
        canvas.addEventListener("keydown", handleCiteDeleteKey);
        canvas.addEventListener("keydown", handleListOutdent);
        canvas.addEventListener("keydown", handleCodeBlockExit);
        canvas.addEventListener("keydown", handleCodeBlockBackspace);
        canvas.addEventListener("change", handleCodeBlockLangChange);
        document.addEventListener("selectionchange", function () {
            if (!isactive || !root) return;
            refreshToolbarState();
        });

        root.addEventListener("click", function (e) {
            var actionbtn = e.target.closest("[data-widget-action]");
            if (actionbtn) {
                var action = actionbtn.getAttribute("data-widget-action");
                var widget = actionbtn.closest(".vewidget");
                if (widget) {
                    if (action === "delete-widget") widget.remove();
                    if (action === "add-row") W.addInfoboxRow(widget.querySelector(".veiboxrows"));
                    if (action === "toggle-align") {
                        var media = widget.querySelector(".embed");
                        if (media) {
                            var toLeft = !media.classList.contains("embedleft");
                            media.classList.toggle("embedleft", toLeft);
                            media.classList.toggle("embedright", !toLeft);
                        } else {
                            var current = (widget.getAttribute("data-ve-align") || "right") === "left" ? "left" : "right";
                            widget.setAttribute("data-ve-align", current === "left" ? "right" : "left");
                        }
                        W.syncWidgetState(canvas);
                    }
                    if (action === "move-up" || action === "move-down") {
                        var sib = action === "move-up" ? widget.previousElementSibling : widget.nextElementSibling;
                        if (sib && !sib.classList.contains("vereferences")) {
                            if (action === "move-up") widget.parentNode.insertBefore(widget, sib);
                            else widget.parentNode.insertBefore(sib, widget);
                        }
                    }
                    if (action === "remove-row") {
                        var row = actionbtn.closest(".veiboxrow");
                        if (row) row.remove();
                    }
                    scheduleSync();
                }
                return;
            }
        });
        root.addEventListener("blur", function (e) {
            var pathField = e.target.closest(".veimagepathinput");
            if (pathField) {
                W.applyWidgetImagePath(pathField.closest(".vewidget"), pathField);
                scheduleSync();
                return;
            }
            var msgStrong = e.target.closest(".vewidgetmsg .msglabel strong");
            if (msgStrong) {
                W.updateMsgIcon(msgStrong.closest(".vewidget"));
                scheduleSync();
            }
        }, true);
        root.addEventListener("keydown", function (e) {
            var pathField = e.target.closest(".veimagepathinput");
            if (!pathField) return;
            if (e.key === "Enter") {
                e.preventDefault();
                pathField.blur();
            }
        });

        root.querySelectorAll(".veaction").forEach(function (button) {
            button.addEventListener("click", function () {
                var action = button.getAttribute("data-action") || "";
                if (action === "bold") applyInlineStyle("bold");
                if (action === "italic") applyInlineStyle("italic");
                if (action === "underline") applyInlineStyle("underline");
                if (action === "strike") applyInlineStyle("strikeThrough");
                if (action === "list") toggleList();
                if (action === "monospace") insertInlineCode();
                if (action === "codeblock") insertCodeBlock();
                if (action === "infobox") insertWidgetAtCursor(T.widget("infobox"));
                if (action === "media") insertWidgetAtCursor(T.widget("media"));
                if (action === "msg") insertWidgetAtCursor(T.widget("msg"));
                if (action === "info") insertWidgetAtCursor(T.widget("info"));
                if (action === "warning") insertWidgetAtCursor(T.widget("warning"));
                if (action === "danger") insertWidgetAtCursor(T.widget("danger"));
                scheduleSync();
            });
        });
        root.querySelectorAll(".veheading-option").forEach(function (btn) {
            btn.addEventListener("click", function () {
                applyHeading(btn.getAttribute("data-heading") || "text");
                closeDropdowns();
            });
        });
        root.querySelectorAll(".veciteoption").forEach(function (btn) {
            btn.addEventListener("click", function () {
                addCitation(btn.getAttribute("data-cite") || "desclink");
                closeDropdowns();
            });
        });
        root.querySelectorAll(".velink-option").forEach(function (btn) {
            btn.addEventListener("click", function () {
                openLinkPanel(btn.getAttribute("data-linktype") || "article", null);
                closeDropdowns();
            });
        });
        root.querySelectorAll(".veaction, .veheading-option, .veciteoption, .velink-option").forEach(function (btn) {
            btn.addEventListener("mousedown", function (e) {
                e.preventDefault();
                saveSelectionRange();
            });
        });
        root.querySelectorAll(".vedropdowntoggle").forEach(function (toggle) {
            toggle.addEventListener("click", function (e) {
                e.preventDefault();
                var dropdown = toggle.closest(".vedropdown");
                var isOpen = dropdown && dropdown.classList.contains("open");
                closeDropdowns();
                if (dropdown && !isOpen) dropdown.classList.add("open");
            });
        });
        root.querySelector(".velink-apply").addEventListener("click", applyLinkPanel);
        root.querySelector(".velink-cancel").addEventListener("click", function () {
            var panel = root.querySelector(".velinkpanel");
            panel.classList.remove("open");
            panel.classList.remove("inline");
            panel._existingLink = null;
        });
        var fmtReset = root.querySelector(".vereset");
        if (fmtReset) {
            fmtReset.addEventListener("click", function () {
                resetEditorFormattingState();
                scheduleSync();
            });
        }
        var toolbarReset = root.querySelector(".vetoolbarreset");
        if (toolbarReset) {
            toolbarReset.addEventListener("click", function (e) {
                e.preventDefault();
                openResetConfirm();
            });
        }
        root.querySelector(".veresetconfirm-yes").addEventListener("click", function () {
            closeResetConfirm();
            confirmHardReset();
        });
        root.querySelector(".veresetconfirm-no").addEventListener("click", closeResetConfirm);

        Object.keys(modeTabs).forEach(function (modeKey) {
            var tab = modeTabs[modeKey];
            if (!tab || tab.dataset.veBound === "1") return;
            tab.dataset.veBound = "1";
            tab.addEventListener("click", function (e) {
                if (!isactive) return;
                e.preventDefault();
                setViewMode(modeKey);
            });
        });

        canvas.querySelectorAll(".vewidgetinfobox .veiboxrows").forEach(function (rows) {
            if (!rows.children.length) W.addInfoboxRow(rows);
        });
        canvas.querySelectorAll(".vewidgetmsg").forEach(W.updateMsgIcon);
        // Lift the Reset button out of .visualeditor so its absolute positioning
        // resolves against .content (the editor itself is position:relative for
        // the link panel, which would otherwise capture the button).
        var resetBtn = root.querySelector(".vetoolbarreset");
        if (resetBtn) {
            var contentEl = root.parentNode;
            if (contentEl) contentEl.appendChild(resetBtn);
        }
        refreshToolbarState();
        setViewMode("edit");
        W.syncWidgetState(canvas);
        updateSubmitHref();
    }

    function enterMode() {
        var content = document.querySelector(".content");
        if (!content) return Promise.resolve();
        isactive = true;
        ensureToolbarState(true);
        return T.load().then(function () {
            // Bail if the user navigated away while templates were loading.
            if (!isactive) return;
            content.innerHTML = T.editor();
            root = content.querySelector(".visualeditor");
            bindControls();
        }).catch(function (err) {
            console.error("VE: failed to load templates", err);
        });
    }
    function leaveMode() {
        isactive = false;
        root = null;
        titleheading = null;
        canvas = null;
        ensureToolbarState(false);
    }
    function syncmode() {
        var next = ispreviewhash();
        var missingRoot = !root || !document.body.contains(root);
        if (next && (!isactive || missingRoot)) {
            enterMode().then(function () {
                if (isactive) updateSubmitHref();
            });
            return;
        }
        if (!next && isactive) leaveMode();
        if (next && isactive) updateSubmitHref();
    }

    window.addEventListener("hashchange", syncmode);
    document.addEventListener("wiki:article-rendered", syncmode);
    document.addEventListener("DOMContentLoaded", syncmode);
})();
