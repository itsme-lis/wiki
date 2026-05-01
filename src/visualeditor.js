(function () {
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
    var modeTabs = { edit: null, preview: null, raw: null, reset: null };

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
        return localStorage.getItem(bodykey) || "<p>Start writing your article here...</p>";
    }
    function setstoredhtml(value) {
        localStorage.setItem(bodykey, value || "<p></p>");
    }
    function getsuggestedfilename() {
        var title = String(gettitle() || "New Article");
        return title.replace(/[<>:"/\\|?*]+/g, "").replace(/\s+/g, " ").trim() || "New Article";
    }
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
        ensureTab("reset", "Reset");
    }
    function setModeTabsVisible(active) {
        ["edit", "preview", "raw", "reset"].forEach(function (k) {
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
        setModeTabsVisible(active);
    }
    function escapeHtml(v) {
        return String(v || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
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
    function scheduleSync() {
        if (syncTimer) window.clearTimeout(syncTimer);
        syncTimer = window.setTimeout(function () {
            if (!canvas) return;
            normalizeInlineCodeNodes();
            cleanupCitations();
            syncWidgetAlignmentHints();
            ensureReferences();
            updateAltViews();
            setstoredhtml(canvas.innerHTML);
            updateSubmitHref();
        }, 90);
    }
    function syncWidgetAlignmentHints() {
        if (!canvas) return;
        canvas.querySelectorAll(".vewidget").forEach(function (widget) {
            widget.classList.remove("vealignleft", "vealignright");
            var media = widget.querySelector(".embed");
            if (!media) return;
            if (media.classList.contains("embedleft")) widget.classList.add("vealignleft");
            if (media.classList.contains("embedright")) widget.classList.add("vealignright");
        });
    }
    function updateSubmitHref() {
        ensureSubmitTab();
        if (!submittab || !canvas) return;
        var text = "# " + gettitle() + "\n\n" + canvasToMarkdown(canvas);
        var filename = getsuggestedfilename() + ".md";
        submittab.href = "https://github.com/CtRHome/wiki/new/main/articles?filename=" +
            encodeURIComponent(filename) + "&value=" + encodeURIComponent(text);
    }

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
        clearBlockFormatting();
        if (level === "text") {
            activeHeading = "text";
            // Ensure we escape out of "tiny" formatting when switching back.
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
        // execCommand is flaky across browsers; do the "belt and suspenders" reset.
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
    function insertInlineCode() {
        var sel = window.getSelection();
        var selected = sel ? sel.toString() : "";
        if (selected) {
            insertAtCursor("<code>" + escapeHtml(selected) + "</code>");
        } else {
            // Keep an editable caret position even when code has no visible chars.
            insertAtCursor("<code>\u200b</code>");
        }
    }
    function insertCodeBlock() {
        var lang = (window.prompt("Code language (e.g. js, py, txt):", "txt") || "txt").trim().toLowerCase();
        lang = lang.replace(/[^a-z0-9_+-]/g, "") || "txt";
        var sel = window.getSelection();
        var selected = sel ? (sel.toString() || "") : "";
        if (selected) {
            insertAtCursor('<pre data-code-lang="' + lang + '"><code>' + escapeHtml(selected) + '</code></pre><p><br></p>');
            return;
        }
        insertAtCursor('<pre data-code-lang="' + lang + '"><code>\u200b</code></pre><p><br></p>');
    }
    function toggleList() {
        if (!canvas) return;
        canvas.focus();
        restoreSelectionRange();
        document.execCommand("insertUnorderedList", false, null);
        saveSelectionRange();
        scheduleSync();
    }

    function buildWidgetControls(includeAddRow) {
        return '<div class="vewidgethead">' +
            '<button type="button" class="vewidgetbtn" data-widget-action="move-up" title="Move up"><img src="assets/images/icons/up.png"></button>' +
            '<button type="button" class="vewidgetbtn" data-widget-action="move-down" title="Move down"><img src="assets/images/icons/down.png"></button>' +
            '<button type="button" class="vewidgetbtn" data-widget-action="toggle-align" title="Toggle side"><img src="assets/images/icons/right.png"></button>' +
            (includeAddRow ? '<button type="button" class="vewidgetbtn" data-widget-action="add-row"><img src="assets/images/icons/plus.png"></button>' : "") +
            '<button type="button" class="vewidgetbtn" data-widget-action="delete-widget"><img src="assets/images/icons/x.png"></button>' +
            "</div>";
    }
    function buildImagePathField(defaultPath) {
        return '<input class="veimagepathinput" value="' + escapeHtml(defaultPath) + '" data-widget-action="edit-image-path">';
    }
    function buildWidget(type) {
        if (type === "infobox") {
            var defaultInfoImage = "/assets/images/examplesquare2.png";
            return (
                '<div class="vewidget vewidgetinfobox" data-vewidget="infobox" contenteditable="false">' +
                '<aside class="infobox">' +
                buildWidgetControls(true) +
                '<h3 contenteditable="true">Infobox title</h3>' +
                '<div class="veimagewrap">' +
                '<img class="vewidgetimagepreview" data-image-src="' + defaultInfoImage + '" src="' + defaultInfoImage + '">' +
                buildImagePathField(defaultInfoImage) +
                "</div>" +
                '<table><tbody class="veiboxrows"></tbody></table>' +
                "</aside>" +
                "</div><p><br></p>"
            );
        }
        if (type === "media") {
            var defaultMediaImage = "/assets/images/examplesquare2.png";
            return (
                '<div class="vewidget vewidgetmedia" data-vewidget="media" contenteditable="false">' +
                '<figure class="embed embedright">' +
                buildWidgetControls(false) +
                '<div class="veimagewrap">' +
                '<img class="vewidgetmediapreview" data-image-src="' + defaultMediaImage + '" src="' + defaultMediaImage + '">' +
                buildImagePathField(defaultMediaImage) +
                "</div>" +
                '<figcaption contenteditable="true">Caption text</figcaption>' +
                "</figure>" +
                "</div><p><br></p>"
            );
        }
        if (type === "msg") {
            return (
                '<div class="vewidget vewidgetmsg" data-vewidget="msg" contenteditable="false">' +
                '<section class="msg">' +
                buildWidgetControls(false) +
                '<img class="msgicon" src="assets/images/msg/hello.gif">' +
                '<div class="msgcontent">' +
                '<p class="msglabel"><strong contenteditable="true">Message:</strong></p>' +
                '<p class="msgtext" contenteditable="true">Message text</p>' +
                "</div></section>" +
                "</div><p><br></p>"
            );
        }
        return (
            '<div class="vewidget vewidgetcard" data-vewidget="' + type + '" contenteditable="false">' +
            '<section class="card card' + type + '">' +
            buildWidgetControls(false) +
            '<h3><img class="cardicon" src="assets/images/icons/' + type + '.png"> <span contenteditable="true">Card title</span></h3>' +
            '<p contenteditable="true">Card text</p>' +
            "</section>" +
            "</div><p><br></p>"
        );
    }
    function addInfoboxRow(rowsBody) {
        if (!rowsBody) return;
        var row = document.createElement("tr");
        row.className = "veiboxrow";
        row.innerHTML =
            '<th contenteditable="true">Label</th>' +
            '<td contenteditable="true">Value</td>' +
            '<td class="verowactions"><button type="button" class="vewidgetbtn" data-widget-action="remove-row"><img src="assets/images/icons/x.png"></button></td>';
        rowsBody.appendChild(row);
    }

    function getNextCitationId() {
        var used = {};
        if (!canvas) return 1;
        canvas.querySelectorAll("[data-veciteid]").forEach(function (el) {
            var n = Number(el.getAttribute("data-veciteid"));
            if (!isNaN(n)) used[n] = true;
        });
        for (var i = 1; i < 10000; i++) if (!used[i]) return i;
        return 1;
    }
    function normalizeInlineCodeNodes() {
        if (!canvas) return;
        canvas.querySelectorAll("code").forEach(function (node) {
            if (node.closest("pre")) {
                var blockValue = (node.textContent || "").replace(/\u200b/g, "");
                if (!blockValue.length) node.textContent = "\u200b";
                return;
            }
            var value = (node.textContent || "").replace(/\u200b/g, "");
            if (!value.length) node.textContent = "\u200b";
        });
    }
    function cleanupCitations() {
        if (!canvas) return;
        var used = {};
        canvas.querySelectorAll('sup.citeref[data-veciteid]').forEach(function (sup) {
            var id = sup.getAttribute("data-veciteid");
            if (!id) return;
            used[id] = true;
            sup.setAttribute("contenteditable", "false");
        });
        canvas.querySelectorAll(".veciteentry").forEach(function (entry) {
            var id = entry.getAttribute("data-veciteid");
            if (!id || !used[id]) entry.remove();
        });
    }
    function ensureReferences(forceCreate) {
        if (!canvas) return;
        var refs = canvas.querySelector(".vereferences");
        var hasEntries = canvas.querySelectorAll(".veciteentry").length > 0;
        if (!forceCreate && !hasEntries) {
            if (refs) refs.remove();
            return;
        }
        if (!refs) {
            refs = document.createElement("section");
            refs.className = "vereferences";
            refs.setAttribute("contenteditable", "false");
            refs.innerHTML = "<h2>References</h2><ol></ol>";
            canvas.appendChild(refs);
        } else if (canvas.lastElementChild !== refs) {
            canvas.appendChild(refs);
        }
    }
    function addCitation(kind) {
        if (!canvas) return;
        if (kind === "needed") {
            insertAtCursor('<sup class="citationneeded" data-veciteneeded="1" contenteditable="false"><em>(source?)</em></sup>');
            return;
        }
        ensureReferences(true);
        var id = getNextCitationId();
        insertAtCursor('<sup class="citeref" data-veciteid="' + id + '" contenteditable="false">[^' + id + "]</sup>");
        var list = canvas.querySelector(".vereferences ol");
        var li = document.createElement("li");
        li.className = "veciteentry";
        li.setAttribute("data-veciteid", String(id));
        var desc = kind === "link" ? "" : "description";
        var link = kind === "desc" ? "" : "https://example.com";
        li.innerHTML =
            '<span class="veciteindex">[' + id + "]</span> " +
            '<span class="vecitedesc" contenteditable="true">' + escapeHtml(desc) + "</span>" +
            '<span class="vecitesep"> | </span>' +
            '<span class="vecitelink" contenteditable="true">' + escapeHtml(link) + "</span>";
        list.appendChild(li);
        scheduleSync();
    }

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
            var targetRect = (anchorNode.getBoundingClientRect ? anchorNode.getBoundingClientRect() : null);
            var canvasRect = canvas.getBoundingClientRect();
            if (targetRect) {
                panel.style.left = Math.max(0, targetRect.left - canvasRect.left) + "px";
                panel.style.top = Math.max(0, targetRect.bottom - canvasRect.top + 8) + "px";
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
            insertAtCursor('<a href="' + escapeHtml(href || "#") + '">' + escapeHtml(text) + "</a>");
        }
        panel.classList.remove("open");
        panel.classList.remove("inline");
        panel._existingLink = null;
        scheduleSync();
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
        root.querySelectorAll(".veheading-option").forEach(function (b) { b.classList.remove("isactive"); });
        var active = root.querySelector('.veheading-option[data-heading="' + activeHeading + '"]');
        if (active) active.classList.add("isactive");
    }
    function updateAltViews() {
        if (!root || !canvas) return;
        var preview = root.querySelector(".vepreviewpanel");
        var raw = root.querySelector(".verawpanel code");
        if (preview && window.WikiMarkdown && typeof window.WikiMarkdown.markdowntohtml === "function") {
            preview.innerHTML = window.WikiMarkdown.markdowntohtml("# " + gettitle() + "\n\n" + canvasToMarkdown(canvas));
        }
        if (raw) raw.textContent = "# " + gettitle() + "\n\n" + canvasToMarkdown(canvas);
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
    function hardResetEditor() {
        openResetConfirm();
    }
    function confirmHardReset() {
        localStorage.removeItem(bodykey);
        localStorage.removeItem(titlekey);
        titleheading.textContent = "Edit Me!";
        canvas.innerHTML = "<p>Start writing your article here...</p>";
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
        var resetTab = modeTabs.reset;
        if (resetTab && resetTab.getBoundingClientRect) {
            var rect = resetTab.getBoundingClientRect();
            panel.style.left = Math.round(rect.left) + "px";
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

    function inlineToMd(node) {
        if (!node) return "";
        if (node.nodeType === Node.TEXT_NODE) return node.nodeValue || "";
        if (node.nodeType !== Node.ELEMENT_NODE) return "";
        var tag = node.tagName.toLowerCase();
        var text = "";
        for (var i = 0; i < node.childNodes.length; i++) text += inlineToMd(node.childNodes[i]);
        if (tag === "strong" || tag === "b") return "**" + text + "**";
        if (tag === "em" || tag === "i") return "*" + text + "*";
        if (tag === "u") return "__" + text + "__";
        if (tag === "del" || tag === "s") return "~~" + text + "~~";
        if (tag === "code") {
            var codeText = text.replace(/\u200b/g, "");
            return codeText.length ? ("`" + codeText + "`") : "``";
        }
        if (tag === "a") return "[" + (text || "link") + "](" + (node.getAttribute("href") || "#") + ")";
        if (node.hasAttribute("data-veciteid")) return "[^" + node.getAttribute("data-veciteid") + "]";
        if (node.getAttribute("data-veciteneeded") === "1") return "[^?]";
        return text;
    }
    function widgetToMd(widget) {
        function normalizeMediaPathForMd(pathValue) {
            var raw = String(pathValue || "").trim();
            if (!raw) return "";
            if (/^assets\//i.test(raw)) return "/" + raw;
            return raw;
        }
        var type = widget.getAttribute("data-vewidget") || "";
        if (type === "infobox") {
            var out = ["::infobox"];
            var title = widget.querySelector(".infobox h3");
            var image = widget.querySelector(".vewidgetimagepreview");
            if (title && title.textContent.trim()) out.push("title: " + title.textContent.trim());
            if (image) out.push("image: " + normalizeMediaPathForMd(image.getAttribute("data-image-src") || image.getAttribute("src") || ""));
            widget.querySelectorAll(".veiboxrow").forEach(function (row) {
                var k = (row.querySelector("th") && row.querySelector("th").textContent.trim()) || "";
                var v = (row.querySelector("td") && row.querySelector("td").textContent.trim()) || "";
                if (k || v) out.push((k || "label") + ": " + (v || "value"));
            });
            out.push("::");
            return out.join("\n");
        }
        if (type === "media") {
            var media = widget.querySelector(".vewidgetmediapreview");
            var caption = (widget.querySelector("figcaption") && widget.querySelector("figcaption").textContent.trim()) || "";
            return "::media\nurl: " + normalizeMediaPathForMd((media && (media.getAttribute("data-image-src") || media.getAttribute("src"))) || "") + "\ncaption: " + caption + "\n::";
        }
        if (type === "msg") {
            var label = (widget.querySelector(".msglabel strong") && widget.querySelector(".msglabel strong").textContent) || "message";
            var kind = label.replace(":", "").trim().toLowerCase() || "message";
            var body = (widget.querySelector(".msgtext") && widget.querySelector(".msgtext").textContent.trim()) || "";
            return "::msg\nkind: " + kind + "\nmessage: " + body + "\n::";
        }
        var ct = (widget.querySelector(".card h3 span") && widget.querySelector(".card h3 span").textContent.trim()) || "";
        var cb = (widget.querySelector(".card p") && widget.querySelector(".card p").textContent.trim()) || "";
        return "::card " + type + "\nTitle: " + ct + "\nText: " + cb + "\n::";
    }
    function appendRefsMd(lines) {
        var refs = canvas.querySelectorAll(".veciteentry");
        if (!refs.length) return;
        lines.push("## References");
        refs.forEach(function (ref) {
            var id = ref.getAttribute("data-veciteid");
            var desc = (ref.querySelector(".vecitedesc") && ref.querySelector(".vecitedesc").textContent.trim()) || "";
            var link = (ref.querySelector(".vecitelink") && ref.querySelector(".vecitelink").textContent.trim()) || "";
            if (!id) return;
            if (desc && link) lines.push("[^" + id + "]: " + desc + " | " + link);
            else if (desc) lines.push("[^" + id + "]: " + desc);
            else if (link) lines.push("[^" + id + "]: " + link);
            else lines.push("[^" + id + "]:");
        });
    }
    function canvasToMarkdown(surface) {
        var lines = [];
        Array.prototype.forEach.call(surface.childNodes, function (node) {
            if (node.nodeType === Node.TEXT_NODE) {
                var txt = (node.nodeValue || "").trim();
                if (txt) lines.push(txt);
                return;
            }
            if (node.nodeType !== Node.ELEMENT_NODE) return;
            if (node.classList.contains("vereferences")) return;
            if (node.matches(".vewidget")) {
                lines.push(widgetToMd(node));
                return;
            }
            var tag = node.tagName.toLowerCase();
            if (tag === "ul" || tag === "ol") {
                node.querySelectorAll("li").forEach(function (li) { lines.push("- " + inlineToMd(li).trim()); });
                return;
            }
            var text = inlineToMd(node).trim();
            if (!text && tag !== "hr") return;
            if (/^h[1-6]$/.test(tag)) lines.push(new Array(Number(tag[1]) + 1).join("#") + " " + text);
            else if (tag === "blockquote") lines.push("> " + text);
            else if (tag === "pre") {
                var lang = (node.getAttribute("data-code-lang") || "txt").trim();
                lines.push("```" + lang + "\n" + text.replace(/\u200b/g, "") + "\n```");
            }
            else if (tag === "hr") lines.push("---");
            else if (node.classList.contains("smalltext")) lines.push("-# " + text);
            else lines.push(text);
        });
        appendRefsMd(lines);
        return lines.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
    }

    function bindControls() {
        titleheading = root.querySelector(".vetitleheading");
        canvas = root.querySelector(".vecanvas");
        titleheading.textContent = gettitle();
        canvas.innerHTML = getstoredhtml();
        normalizeInlineCodeNodes();
        cleanupCitations();
        ensureReferences();

        titleheading.addEventListener("input", function () {
            settitle(titleheading.textContent);
            updateSubmitHref();
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
            normalizeInlineCodeNodes();
            scheduleSync();
        });
        canvas.addEventListener("keydown", function (e) {
            if ((e.key === "Backspace" || e.key === "Delete") && getRange()) {
                var sel = window.getSelection();
                if (sel && sel.rangeCount) {
                    var r = sel.getRangeAt(0);
                    if (r.collapsed) {
                        var node = r.startContainer.nodeType === 1 ? r.startContainer.childNodes[r.startOffset - (e.key === "Backspace" ? 1 : 0)] : r.startContainer.parentElement;
                        var cite = node && node.nodeType === 1 ? node.closest('sup.citeref[data-veciteid]') : null;
                        if (cite) {
                            var id = cite.getAttribute("data-veciteid");
                            cite.remove();
                            if (id) {
                                var entry = canvas.querySelector('.veciteentry[data-veciteid="' + id + '"]');
                                if (entry) entry.remove();
                            }
                            e.preventDefault();
                            scheduleSync();
                        }
                    }
                }
            }
        });
        document.addEventListener("selectionchange", function () {
            if (!isactive || !root) return;
            // Keep the toolbar in sync with whatever the caret is currently inside.
            refreshToolbarState();
        });

        root.addEventListener("click", function (e) {
            var actionbtn = e.target.closest("[data-widget-action]");
            if (actionbtn) {
                var action = actionbtn.getAttribute("data-widget-action");
                var widget = actionbtn.closest(".vewidget");
                if (widget) {
                    if (action === "delete-widget") widget.remove();
                    if (action === "add-row") addInfoboxRow(widget.querySelector(".veiboxrows"));
                    if (action === "toggle-align") {
                        var media = widget.querySelector(".embed");
                        if (media) {
                            media.classList.toggle("embedleft");
                            media.classList.toggle("embedright");
                        } else {
                            widget.classList.toggle("vealignleft");
                        }
                    }
                    if (action === "move-up" || action === "move-down") {
                        var sib = action === "move-up" ? widget.previousElementSibling : widget.nextElementSibling;
                        if (sib) {
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
        root.addEventListener("input", function (e) {
            var pathField = e.target.closest(".veimagepathinput");
            if (!pathField) return;
            var widget = pathField.closest(".vewidget");
            if (!widget) return;
            var img = widget.querySelector(".vewidgetimagepreview, .vewidgetmediapreview");
            if (!img) return;
            var value = String(pathField.value || "").trim();
            if (!value) return;
            img.setAttribute("data-image-src", value);
            img.setAttribute("src", value);
            scheduleSync();
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
                if (action === "infobox") insertAtCursor(buildWidget("infobox"));
                if (action === "media") insertAtCursor(buildWidget("media"));
                if (action === "msg") insertAtCursor(buildWidget("msg"));
                if (action === "info") insertAtCursor(buildWidget("info"));
                if (action === "warning") insertAtCursor(buildWidget("warning"));
                if (action === "danger") insertAtCursor(buildWidget("danger"));
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
        root.querySelector(".vereset").addEventListener("click", function () {
            resetEditorFormattingState();
            scheduleSync();
        });
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
                if (modeKey === "reset") openResetConfirm();
                else setViewMode(modeKey);
            });
        });

        canvas.querySelectorAll(".vewidgetinfobox .veiboxrows").forEach(function (rows) {
            if (!rows.children.length) addInfoboxRow(rows);
        });
        refreshToolbarState();
        setViewMode("edit");
        updateSubmitHref();
    }

    // main panel html!!
    function buildMarkup() {
        return `
<section class="visualeditor">
<h1 class="title vetitleheading" contenteditable="true" spellcheck="false"></h1>
<div class="vetoolbar"><div class="vemainbuttons">
<button class="veiconbtn veaction" data-action="bold" title="Bold"><img src="assets/images/icons/editor/bold.png"></button>
<button class="veiconbtn veaction" data-action="italic" title="Italic"><img src="assets/images/icons/editor/italic.png"></button>
<button class="veiconbtn veaction" data-action="underline" title="Underline"><img src="assets/images/icons/editor/underline.png"></button>
<button class="veiconbtn veaction" data-action="strike" title="Strikethrough"><img src="assets/images/icons/editor/strikethrough.png"></button>
<button class="veiconbtn veaction" data-action="list" title="List"><img src="assets/images/icons/editor/list.png"></button>
<button class="veiconbtn veaction" data-action="monospace" title="Monospace"><img src="assets/images/icons/editor/monospace.png"></button>
<button class="veiconbtn veaction" data-action="codeblock" title="Code block"><img src="assets/images/icons/editor/code.png"></button>

<div class="vedropdown"><button class="veiconbtn vedropdowntoggle" title="Text size"><img src="assets/images/icons/editor/text.png"><img class="vedown" src="assets/images/icons/down.png"></button>
<div class="vedropdownmenu">
<button class="veheading-option isactive" data-heading="text"><img src="assets/images/icons/editor/text.png"></button>
<button class="veheading-option" data-heading="h1"><img src="assets/images/icons/editor/title.png"></button>
<button class="veheading-option" data-heading="h2"><img src="assets/images/icons/editor/subtitle.png"></button>
<button class="veheading-option" data-heading="h3"><img src="assets/images/icons/editor/h3.png"></button>
<button class="veheading-option" data-heading="h4"><img src="assets/images/icons/editor/h4.png"></button>
<button class="veheading-option" data-heading="h5"><img src="assets/images/icons/editor/h5.png"></button>
<button class="veheading-option" data-heading="h6"><img src="assets/images/icons/editor/h6.png"></button>
<button class="veheading-option" data-heading="tiny"><img src="assets/images/icons/editor/tiny.png"></button>
</div></div>

<div class="vedropdown"><button class="veiconbtn vedropdowntoggle" title="Link"><img src="assets/images/icons/editor/link.png"><img class="vedown" src="assets/images/icons/down.png"></button>
<div class="vedropdownmenu">
<button class="velink-option" data-linktype="article">Article link</button>
<button class="velink-option" data-linktype="external">External link</button>
</div></div>

<button class="veiconbtn veaction" data-action="infobox" title="Infobox"><img src="assets/images/icons/editor/infobox.png"></button>
<button class="veiconbtn veaction" data-action="media" title="Media"><img src="assets/images/icons/editor/media.png"></button>
<button class="veiconbtn veaction" data-action="msg" title="Message"><img src="assets/images/icons/editor/msg.png"></button>
<button class="veiconbtn veaction" data-action="info" title="Info card"><img src="assets/images/icons/editor/info.png"></button>
<button class="veiconbtn veaction" data-action="warning" title="Warning card"><img src="assets/images/icons/editor/warning.png"></button>
<button class="veiconbtn veaction" data-action="danger" title="Danger card"><img src="assets/images/icons/editor/danger.png"></button>

<div class="vedropdown"><button class="veiconbtn vedropdowntoggle" title="Cite"><img src="assets/images/icons/editor/cite.png"><img class="vedown" src="assets/images/icons/down.png"></button>
<div class="vedropdownmenu">
<button class="veciteoption isactive" data-cite="desclink"><img src="assets/images/icons/editor/cite-desc-link-missing.png"></button>
<button class="veciteoption" data-cite="desc"><img src="assets/images/icons/editor/cite-desc-missing.png"></button>
<button class="veciteoption" data-cite="link"><img src="assets/images/icons/editor/cite-link-missing.png"></button>
<button class="veciteoption" data-cite="needed"><img src="assets/images/icons/editor/cite-needed-missing.png"></button>
</div></div>
</div></div>

<div class="velinkpanel">
<input class="velink-display" placeholder="Display text">
<input class="velink-href" placeholder="Link">
<button type="button" class="velink-apply">Apply</button>
<button type="button" class="velink-cancel">Cancel</button>
</div>
<div class="veresetconfirm">
<span>Are you sure you want to clean the Visual Editor?</span>
<button type="button" class="veresetconfirm-yes"><img src="assets/images/icons/checked.png"></button>
<button type="button" class="veresetconfirm-no"><img src="assets/images/icons/x.png"></button>
</div>

<div class="veeditorframe">
<div class="vecanvas" contenteditable="true" spellcheck="false"></div>
<div class="vepreviewpanel"></div>
<pre class="verawpanel"><code class="language-md"></code></pre>
<button type="button" class="vereset">Reset</button>
</div>
</section>
`;
    }

    function enterMode() {
        var content = document.querySelector(".content");
        if (!content) return;
        isactive = true;
        ensureToolbarState(true);
        content.innerHTML = buildMarkup();
        root = content.querySelector(".visualeditor");
        bindControls();
    }
    function leaveMode() {
        isactive = false;
        root = null;
        titleheading = null;
        canvas = null;
        ensureToolbarState(false);
    }
    function syncMode() {
        var next = ispreviewhash();
        var missingRoot = !root || !document.body.contains(root);
        if (next && (!isactive || missingRoot)) enterMode();
        if (!next && isactive) leaveMode();
        if (next && isactive) updateSubmitHref();
    }

    window.addEventListener("hashchange", syncMode);
    document.addEventListener("wiki:article-rendered", syncMode);
    document.addEventListener("DOMContentLoaded", syncMode);
})();
