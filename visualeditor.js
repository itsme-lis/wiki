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
    function ensuresubmittab() {
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
    function ensuretoolbarstate(active) {
        var discussion = document.querySelector("a.discussion");
        var edit = document.querySelector("a.edit");
        var history = document.querySelector("a.viewhistory");
        var search = document.querySelector(".toolbar .search");
        var pagetab = document.querySelector("a.pagetab");
        ensuresubmittab();
        [discussion, edit, history, search].forEach(function (el) {
            if (!el) return;
            var host = el.tagName === "INPUT" ? el : (el.closest("li") || el);
            host.style.display = active ? "none" : "";
        });
        if (submittab) {
            var submithost = submittab.closest("li") || submittab;
            submithost.style.display = active ? "" : "none";
        }
        if (pagetab) pagetab.textContent = "Page";
    }
    function scheduleSync() {
        if (syncTimer) window.clearTimeout(syncTimer);
        syncTimer = window.setTimeout(function () {
            if (!canvas) return;
            setstoredhtml(canvas.innerHTML);
            updatesubmithref();
        }, 100);
    }
    function updatesubmithref() {
        ensuresubmittab();
        if (!submittab || !canvas) return;
        var text = "# " + gettitle() + "\n\n" + canvasToMarkdown(canvas);
        var filename = getsuggestedfilename() + ".md";
        submittab.href =
            "https://github.com/CtRHome/wiki/new/main/articles?filename=" +
            encodeURIComponent(filename) +
            "&value=" +
            encodeURIComponent(text);
    }
    function format(command) {
        if (!canvas) return;
        canvas.focus();
        document.execCommand(command, false, null);
        scheduleSync();
    }
    function insertHtml(html) {
        if (!canvas) return;
        canvas.focus();
        document.execCommand("insertHTML", false, html);
        scheduleSync();
    }
    function insertLink(isWiki) {
        if (!canvas) return;
        var href = isWiki ? "#Main_Page" : (window.prompt("Link URL:", "https://example.com") || "").trim();
        if (!href) return;
        var label = (window.getSelection && window.getSelection().toString()) || (isWiki ? "Main Page" : "link");
        insertHtml('<a href="' + href.replace(/"/g, "&quot;") + '">' + label + "</a>");
    }
    function addInfoboxRow(container) {
        if (!container) return;
        var row = document.createElement("tr");
        row.className = "veiboxrow";
        row.innerHTML =
            '<th contenteditable="true">Label</th>' +
            '<td contenteditable="true">Value</td>' +
            '<td class="verowactions">' +
            '<button type="button" class="vewidgetbtn" datawidget-action="removerow"><img src="assets/images/icons/x.png"></button>' +
            "</td>";
        container.appendChild(row);
    }
    function widgetBlock(type) {
        if (type === "infobox") {
            return (
                '<div class="vewidget vewidget-infobox" datavewidget="infobox" contenteditable="false">' +
                '<div class="vewidget-head">' +
                '<button type="button" class="vewidgetbtn" datawidget-action="addrow"><img src="assets/images/icons/plus.png"></button>' +
                '<button type="button" class="vewidgetbtn" datawidget-action="delete-widget"><img src="assets/images/icons/x.png"></button></div>' +
                '<aside class="infobox">' +
                '<h3 contenteditable="true">Infobox title</h3>' +
                '<img class="vewidget-image-preview" src="assets/images/examplesquare2.png">' +
                '<p class="smalltext vemediahint" contenteditable="true">image: image.png</p>' +
                '<table><tbody class="veiboxrows"></tbody></table>' +
                "</aside>" +
                "</div><p><br></p>"
            );
        }
        if (type === "media") {
            return (
                '<div class="vewidget vewidget-media" datavewidget="media" contenteditable="false">' +
                '<div class="vewidget-head">' +
                '<button type="button" class="vewidgetbtn" datawidget-action="delete-widget"><img src="assets/images/icons/x.png"></button></div>' +
                '<figure class="embed">' +
                '<img class="vewidget-media-preview" src="assets/images/examplesquare2.png">' +
                '<figcaption contenteditable="true">Caption text</figcaption>' +
                "</figure>" +
                '<p class="smalltext vemediahint" contenteditable="true">url: image.png</p>' +
                "</div><p><br></p>"
            );
        }
        if (type === "msg") {
            return (
                '<div class="vewidget vewidget-msg" datavewidget="msg" contenteditable="false">' +
                '<div class="vewidget-head">' +
                '<button type="button" class="vewidgetbtn" datawidget-action="delete-widget"><img src="assets/images/icons/x.png"></button></div>' +
                '<section class="msg">' +
                '<img class="msgicon" src="assets/images/msg/message.png">' +
                '<div class="msgcontent">' +
                '<p class="msglabel"><strong contenteditable="true">Message:</strong></p>' +
                '<p class="msgtext" contenteditable="true">Message text</p>' +
                "</div></section>" +
                "</div><p><br></p>"
            );
        }
        return (
            '<div class="vewidget vewidget-card" datavewidget="' + type + '" contenteditable="false">' +
            '<div class="vewidget-head">' +
            '<button type="button" class="vewidgetbtn" datawidget-action="delete-widget"><img src="assets/images/icons/x.png"></button></div>' +
            '<section class="card card' + type + '">' +
            '<h3 contenteditable="true">Card title</h3>' +
            '<p contenteditable="true">Card text</p>' +
            "</section>" +
            "</div><p><br></p>"
        );
    }
    function heading(level) {
        if (!canvas) return;
        canvas.focus();
        if (level === "tiny") {
            insertHtml('<p class="smalltext">Tiny text</p>');
        } else {
            document.execCommand("formatBlock", false, level);
        }
        scheduleSync();
    }
    function citeChoice(kind) {
        if (kind === "desclink") insertHtml('<span datavecite="desclink">[^id]</span> ');
        if (kind === "desc") insertHtml('<span datavecite="desc">[^id]</span> ');
        if (kind === "link") insertHtml('<span datavecite="link">[^id]</span> ');
        if (kind === "needed") insertHtml('<sup datavecite="needed">[^?]</sup> ');
    }
    function inlineMarkdown(node) {
        if (!node) return "";
        if (node.nodeType === Node.TEXT_NODE) return node.nodeValue || "";
        if (node.nodeType !== Node.ELEMENT_NODE) return "";
        var tag = node.tagName.toLowerCase();
        var text = "";
        for (var i = 0; i < node.childNodes.length; i++) text += inlineMarkdown(node.childNodes[i]);
        if (tag === "strong" || tag === "b") return "**" + text + "**";
        if (tag === "em" || tag === "i") return "*" + text + "*";
        if (tag === "u") return "__" + text + "__";
        if (tag === "del" || tag === "s") return "~~" + text + "~~";
        if (tag === "code") return "`" + text + "`";
        if (tag === "a") return "[" + (text || "link") + "](" + (node.getAttribute("href") || "#") + ")";
        if (node.getAttribute("datavecite") === "needed") return "[^?]";
        if (node.getAttribute("datavecite")) return "[^id]";
        return text;
    }
    function widgetToMarkdown(widget) {
        var type = widget.getAttribute("datavewidget") || "";
        if (type === "infobox") {
            var out = ["::infobox"];
            var title = widget.querySelector(".infobox h3");
            var imagehint = widget.querySelector(".vemediahint");
            if (title && title.textContent.trim()) out.push("title: " + title.textContent.trim());
            if (imagehint && imagehint.textContent.trim()) {
                var imageLine = imagehint.textContent.trim().replace(/^image:\s*/i, "");
                out.push("image: " + imageLine);
            }
            widget.querySelectorAll(".veiboxrow").forEach(function (row) {
                var k = row.querySelector("th");
                var v = row.querySelector("td");
                if (!k || !v) return;
                var key = (k.textContent || "").trim();
                var val = (v.textContent || "").trim();
                if (!key && !val) return;
                out.push((key || "label") + ": " + (val || "value"));
            });
            out.push("::");
            return out.join("\n");
        }
        if (type === "media") {
            var urlhint = widget.querySelector(".vemediahint");
            var cap = widget.querySelector("figcaption");
            var urltext = urlhint ? urlhint.textContent.trim().replace(/^url:\s*/i, "") : "";
            var caption = cap ? cap.textContent.trim() : "";
            return "::media\nurl: " + urltext + "\ncaption: " + caption + "\n::";
        }
        if (type === "msg") {
            var label = widget.querySelector(".msglabel strong");
            var msg = widget.querySelector(".msgtext");
            var kind = (label ? label.textContent : "message").replace(":", "").trim().toLowerCase() || "message";
            var body = msg ? msg.textContent.trim() : "";
            return "::msg\nkind: " + kind + "\nmessage: " + body + "\n::";
        }
        var cardTitle = widget.querySelector(".card h3");
        var cardText = widget.querySelector(".card p");
        return "::card " + type + "\nTitle: " + ((cardTitle && cardTitle.textContent.trim()) || "") + "\nText: " + ((cardText && cardText.textContent.trim()) || "") + "\n::";
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
            if (node.matches(".vewidget")) {
                lines.push(widgetToMarkdown(node));
                return;
            }
            var tag = node.tagName.toLowerCase();
            if (tag === "ul" || tag === "ol") {
                node.querySelectorAll("li").forEach(function (li) {
                    lines.push("- " + inlineMarkdown(li).trim());
                });
                return;
            }
            var text = inlineMarkdown(node).trim();
            if (!text && tag !== "hr") return;
            if (/^h[1-6]$/.test(tag)) {
                var depth = Number(tag.charAt(1));
                lines.push(new Array(depth + 1).join("#") + " " + text);
            } else if (tag === "blockquote") {
                lines.push("> " + text);
            } else if (tag === "pre") {
                lines.push("```txt\n" + text + "\n```");
            } else if (tag === "hr") {
                lines.push("---");
            } else if (node.classList.contains("smalltext")) {
                lines.push("-# " + text);
            } else {
                lines.push(text);
            }
        });
        return lines.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
    }
    function bindcontrols() {
        if (!root) return;
        titleheading = root.querySelector(".vetitleheading");
        canvas = root.querySelector(".vecanvas");
        titleheading.textContent = gettitle();
        canvas.innerHTML = getstoredhtml();

        titleheading.addEventListener("input", function () {
            settitle(titleheading.textContent);
            updatesubmithref();
        });
        canvas.addEventListener("input", scheduleSync);
        canvas.addEventListener("input", function (e) {
            var target = e.target;
            if (!target || !target.classList) return;
            if (target.classList.contains("vemediahint")) {
                var widget = target.closest(".vewidget");
                if (!widget) return;
                var value = target.textContent.trim();
                var path = value.replace(/^(url|image):\s*/i, "");
                if (!path) return;
                var img = widget.querySelector(".vewidget-image-preview, .vewidget-media-preview");
                if (img) img.src = path;
            }
        });

        root.querySelectorAll(".veaction").forEach(function (button) {
            button.addEventListener("click", function () {
                var action = button.getAttribute("dataaction") || "";
                if (action === "bold") format("bold");
                if (action === "italic") format("italic");
                if (action === "underline") format("underline");
                if (action === "strike") format("strikeThrough");
                if (action === "list") format("insertUnorderedList");
                if (action === "link") insertLink(false);
                if (action === "wikilink") insertLink(true);
                if (action === "external") insertLink(false);
                if (action === "code") insertHtml("<pre><code>code</code></pre>");
                if (action === "infobox") insertHtml(widgetBlock("infobox"));
                if (action === "media") insertHtml(widgetBlock("media"));
                if (action === "msg") insertHtml(widgetBlock("msg"));
                if (action === "info") insertHtml(widgetBlock("info"));
                if (action === "warning") insertHtml(widgetBlock("warning"));
                if (action === "danger") insertHtml(widgetBlock("danger"));
            });
        });
        root.querySelectorAll(".vecitechoice").forEach(function (button) {
            button.addEventListener("click", function () {
                citeChoice(button.getAttribute("datacite") || "");
            });
        });
        root.querySelectorAll(".vedropdowntoggle").forEach(function (toggle) {
            toggle.addEventListener("click", function (e) {
                e.preventDefault();
                var dropdown = toggle.closest(".vedropdown");
                var isopen = dropdown && dropdown.classList.contains("open");
                root.querySelectorAll(".vedropdown.open").forEach(function (menu) { menu.classList.remove("open"); });
                if (dropdown && !isopen) dropdown.classList.add("open");
            });
        });
        root.querySelectorAll(".veheading-option").forEach(function (button) {
            button.addEventListener("click", function () {
                var target = button.getAttribute("dataheading") || "h2";
                heading(target);
                root.querySelectorAll(".vedropdown.open").forEach(function (menu) { menu.classList.remove("open"); });
            });
        });
        root.addEventListener("click", function (e) {
            var actionbtn = e.target.closest("[datawidget-action]");
            if (!actionbtn) return;
            var widget = actionbtn.closest(".vewidget");
            if (!widget) return;
            var action = actionbtn.getAttribute("datawidget-action");
            if (action === "delete-widget") widget.remove();
            if (action === "addrow") {
                var rows = widget.querySelector(".veiboxrows");
                addInfoboxRow(rows);
            }
            if (action === "removerow") {
                var row = actionbtn.closest(".veiboxrow");
                if (row) row.remove();
            }
            scheduleSync();
        });
        canvas.querySelectorAll(".vewidget-infobox .veiboxrows").forEach(function (rows) {
            if (!rows.children.length) addInfoboxRow(rows);
        });
        updatesubmithref();
    }
    function buildmarkup() {
        return (
            '<section class="visualeditor">' +
            '<h1 class="title vetitleheading" contenteditable="true" spellcheck="false"></h1>' +
            '<div class="vetoolbar">' +
            '<div class="vemainbuttons">' +
            '<div class="vedropdown">' +
            '<button class="veiconbtn vedropdowntoggle" title="Headings and tiny text"><img src="assets/images/icons/editor/title.png"><img class="vedown" src="assets/images/icons/down.png"></button>' +
            '<div class="vedropdownmenu">' +
            '<button class="veheading-option" dataheading="h1"><img src="assets/images/icons/editor/title.png"></button>' +
            '<button class="veheading-option" dataheading="h2"><img src="assets/images/icons/editor/subtitle.png"></button>' +
            '<button class="veheading-option" dataheading="h3"><img src="assets/images/icons/editor/h3.png"></button>' +
            '<button class="veheading-option" dataheading="h4"><img src="assets/images/icons/editor/h4.png"></button>' +
            '<button class="veheading-option" dataheading="h5"><img src="assets/images/icons/editor/h5.png"></button>' +
            '<button class="veheading-option" dataheading="h6"><img src="assets/images/icons/editor/h6.png"></button>' +
            '<button class="veheading-option" dataheading="tiny"><img src="assets/images/icons/editor/tiny.png"></button>' +
            "</div></div>" +
            '<button class="veiconbtn veaction" dataaction="bold" title="Bold"><img src="assets/images/icons/editor/bold.png"></button>' +
            '<button class="veiconbtn veaction" dataaction="italic" title="Italic"><img src="assets/images/icons/editor/italic.png"></button>' +
            '<button class="veiconbtn veaction" dataaction="underline" title="Underline"><img src="assets/images/icons/editor/underline.png"></button>' +
            '<button class="veiconbtn veaction" dataaction="strike" title="Strikethrough"><img src="assets/images/icons/editor/strikethrough.png"></button>' +
            '<button class="veiconbtn veaction" dataaction="list" title="Bullet list"><img src="assets/images/icons/editor/list.png"></button>' +
            '<button class="veiconbtn veaction" dataaction="wikilink" title="Article link"><img src="assets/images/icons/editor/link.png"></button>' +
            '<button class="veiconbtn veaction" dataaction="external" title="External link"><img src="assets/images/icons/editor/external.png"></button>' +
            '<button class="veiconbtn veaction" dataaction="code" title="Code block"><img src="assets/images/icons/editor/code.png"></button>' +
            '<button class="veiconbtn veaction" dataaction="infobox" title="Infobox"><img src="assets/images/icons/editor/infobox.png"></button>' +
            '<button class="veiconbtn veaction" dataaction="media" title="Media"><img src="assets/images/icons/editor/media.png"></button>' +
            '<button class="veiconbtn veaction" dataaction="msg" title="Message"><img src="assets/images/icons/editor/msg.png"></button>' +
            '<button class="veiconbtn veaction" dataaction="info" title="Info card"><img src="assets/images/icons/editor/info.png"></button>' +
            '<button class="veiconbtn veaction" dataaction="warning" title="Warning card"><img src="assets/images/icons/editor/warning.png"></button>' +
            '<button class="veiconbtn veaction" dataaction="danger" title="Danger card"><img src="assets/images/icons/editor/danger.png"></button>' +
            "</div>" +
            '<div class="vecitewrap">' +
            '<button class="veiconbtn" title="Citations"><img src="assets/images/icons/editor/cite.png"></button>' +
            '<div class="vecitechoices">' +
            '<button class="vecitechoice" datacite="desclink">description+link</button>' +
            '<button class="vecitechoice" datacite="desc">description</button>' +
            '<button class="vecitechoice" datacite="link">link</button>' +
            '<button class="vecitechoice" datacite="needed">source needed</button>' +
            "</div></div></div>" +
            '<div class="veeditorframe"><div class="vecanvas" contenteditable="true" spellcheck="false"></div></div>' +
            "</section>"
        );
    }
    function entermode() {
        var content = document.querySelector(".content");
        if (!content) return;
        isactive = true;
        ensuretoolbarstate(true);
        content.innerHTML = buildmarkup();
        root = content.querySelector(".visualeditor");
        bindcontrols();
    }
    function leavemode() {
        isactive = false;
        root = null;
        titleheading = null;
        canvas = null;
        ensuretoolbarstate(false);
    }
    function syncmode() {
        var next = ispreviewhash();
        var missingroot = !root || !document.body.contains(root);
        if (next && (!isactive || missingroot)) entermode();
        if (!next && isactive) leavemode();
        if (next && isactive) updatesubmithref();
    }

    window.addEventListener("hashchange", syncmode);
    document.addEventListener("wiki:article-rendered", syncmode);
    document.addEventListener("DOMContentLoaded", syncmode);
})();
