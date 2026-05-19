(function () {
    window.VE = window.VE || {};

    function inlineToMd(node) {
        if (!node) return "";
        if (node.nodeType === Node.TEXT_NODE) return node.nodeValue || "";
        if (node.nodeType !== Node.ELEMENT_NODE) return "";
        var tag = node.tagName.toLowerCase();
        // Lists may end up nested inside a <p> (some browsers tuck the <ul>
        // created by execCommand("insertUnorderedList") there), so handle them
        // here too. Emit items joined by single newlines so the wiki markdown
        // parser keeps them in one <ul> (a blank line would split them).
        if (tag === "ul" || tag === "ol") {
            var items = [];
            for (var k = 0; k < node.children.length; k++) {
                var liChild = node.children[k];
                if (liChild.tagName && liChild.tagName.toLowerCase() === "li") {
                    items.push("- " + inlineToMd(liChild).trim());
                }
            }
            return items.length ? ("\n" + items.join("\n") + "\n") : "";
        }
        var text = "";
        for (var i = 0; i < node.childNodes.length; i++) text += inlineToMd(node.childNodes[i]);
        if (tag === "strong" || tag === "b") return "**" + text + "**";
        if (tag === "em" || tag === "i") return "*" + text + "*";
        if (tag === "u") return "__" + text + "__";
        if (tag === "del" || tag === "s" || tag === "strike") return "~~" + text + "~~";
        if (tag === "span") {
            // execCommand("strikeThrough") in some browsers emits a span
            // with text-decoration:line-through instead of a tag, so detect
            // that explicitly so the strike survives into raw markdown.
            var style = (node.getAttribute("style") || "").toLowerCase();
            if (style.indexOf("line-through") !== -1) return "~~" + text + "~~";
        }
        if (tag === "code") {
            var codeText = text.replace(/​/g, "");
            return codeText.length ? ("`" + codeText + "`") : "``";
        }
        if (tag === "a") return "[" + (text || "link") + "](" + (node.getAttribute("href") || "#") + ")";
        if (node.hasAttribute("data-veciteid")) return "[^" + node.getAttribute("data-veciteid") + "]";
        if (node.getAttribute("data-veciteneeded") === "1") return "[^?]";
        return text;
    }

    // Convert an editable element's children to markdown text - preserves
    // inline formatting (bold, italic, links, etc.) AND line breaks. Breaks
    // round-trip as literal <br> tokens which parseinline preserves in the
    // rendered preview/output (it un-escapes <br> after escaping the rest).
    function editableMd(el) {
        if (!el) return "";
        var s = "";
        for (var i = 0; i < el.childNodes.length; i++) {
            var child = el.childNodes[i];
            if (child.nodeType === Node.ELEMENT_NODE && child.tagName.toLowerCase() === "br") s += "<br>";
            else s += inlineToMd(child);
        }
        return s.replace(/​/g, "").replace(/\r\n/g, "\n").replace(/\n/g, "<br>").trim();
    }

    function widgetAlign(widget) {
        if (!widget) return "right";
        var media = widget.querySelector(".embed");
        if (media) return media.classList.contains("embedleft") ? "left" : "right";
        var stored = (widget.getAttribute("data-ve-align") || "right").toLowerCase();
        return stored === "left" ? "left" : "right";
    }

    function normalizeMediaPathForMd(pathValue) {
        var raw = String(pathValue || "").trim();
        if (!raw) return "";
        if (/^assets\//i.test(raw)) return "/" + raw;
        return raw;
    }

    function widgetToMd(widget) {
        var type = widget.getAttribute("data-vewidget") || "";
        if (type === "infobox") {
            var out = ["::infobox"];
            var title = editableMd(widget.querySelector(".infobox h3"));
            var image = widget.querySelector(".vewidgetimagepreview");
            if (title) out.push("title: " + title);
            if (image) out.push("image: " + normalizeMediaPathForMd(image.getAttribute("data-image-src") || image.getAttribute("src") || ""));
            widget.querySelectorAll(".veiboxrow").forEach(function (row) {
                var k = editableMd(row.querySelector("th"));
                var v = editableMd(row.querySelector("td"));
                if (k || v) out.push((k || "label") + ": " + (v || "value"));
            });
            out.push("::");
            return out.join("\n");
        }
        if (type === "media") {
            var media = widget.querySelector(".vewidgetmediapreview");
            var caption = editableMd(widget.querySelector("figcaption"));
            var side = widgetAlign(widget);
            return "::media " + side + "\nurl: " + normalizeMediaPathForMd((media && (media.getAttribute("data-image-src") || media.getAttribute("src"))) || "") + "\ncaption: " + caption + "\n::";
        }
        if (type === "msg") {
            var label = (widget.querySelector(".msglabel strong") && widget.querySelector(".msglabel strong").textContent) || "message";
            var kind = label.replace(":", "").trim().toLowerCase() || "message";
            var body = editableMd(widget.querySelector(".msgtext"));
            return "::msg\nkind: " + kind + "\nmessage: " + body + "\n::";
        }
        var ct = editableMd(widget.querySelector(".card h3 span"));
        var cb = editableMd(widget.querySelector(".card p"));
        return "::card " + type + "\nTitle: " + ct + "\nText: " + cb + "\n::";
    }

    function appendRefsMd(canvas, lines) {
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
                // Push items as ONE block joined by single \n - the outer
                // lines.join("\n\n") would otherwise put blank lines between
                // them and the wiki parser would treat each item as its own
                // single-item list.
                var items = [];
                for (var k = 0; k < node.children.length; k++) {
                    var liChild = node.children[k];
                    if (liChild.tagName && liChild.tagName.toLowerCase() === "li") {
                        items.push("- " + inlineToMd(liChild).trim());
                    }
                }
                if (items.length) lines.push(items.join("\n"));
                return;
            }
            var text = inlineToMd(node).trim();
            if (!text && tag !== "hr") return;
            if (/^h[1-6]$/.test(tag)) lines.push(new Array(Number(tag[1]) + 1).join("#") + " " + text);
            else if (tag === "blockquote") lines.push("> " + text);
            else if (tag === "pre") {
                var lang = (node.getAttribute("data-code-lang") || "txt").trim();
                // Read body from the inner <code> only so the lang picker
                // (a contenteditable=false span we inject) isn't included.
                var codeEl = node.querySelector("code");
                var codeText = codeEl ? (codeEl.textContent || "").replace(/​/g, "") : text.replace(/​/g, "");
                lines.push("```" + lang + "\n" + codeText + "\n```");
            }
            else if (tag === "hr") lines.push("---");
            else if (node.classList.contains("smalltext")) lines.push("-# " + text);
            else lines.push(text);
        });
        appendRefsMd(surface, lines);
        return lines.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
    }

    window.VE.serialize = {
        canvasToMarkdown: canvasToMarkdown,
        inlineToMd: inlineToMd,
        editableMd: editableMd,
        widgetAlign: widgetAlign,
        widgetToMd: widgetToMd
    };
})();
