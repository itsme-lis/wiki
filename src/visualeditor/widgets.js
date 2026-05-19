(function () {
    window.VE = window.VE || {};

    function getWidgetAlign(widget) {
        return window.VE.serialize.widgetAlign(widget);
    }

    function updateAlignButtonIcon(widget) {
        if (!widget) return;
        var img = widget.querySelector('[data-widget-action="toggle-align"] img');
        if (!img) return;
        var side = getWidgetAlign(widget);
        // The icon shows the direction the button will move TO, so it's
        // the opposite of the current side.
        img.setAttribute("src", side === "left" ? "assets/images/icons/right.png" : "assets/images/icons/left.png");
    }

    // Combined per-widget refresh: alignment classes, align-button icon, and
    // showing/hiding move-up/down based on whether a neighbor exists.
    function syncWidgetState(canvas) {
        if (!canvas) return;
        canvas.querySelectorAll(".vewidget").forEach(function (widget) {
            widget.classList.remove("vealignleft", "vealignright");
            var media = widget.querySelector(".embed");
            if (media) {
                if (media.classList.contains("embedleft")) widget.classList.add("vealignleft");
                if (media.classList.contains("embedright")) widget.classList.add("vealignright");
            } else if ((widget.getAttribute("data-ve-align") || "right") === "left") {
                widget.classList.add("vealignleft");
            }
            updateAlignButtonIcon(widget);

            // Hide arrows that wouldn't do anything (no neighbor on that side,
            // or the only neighbor is the non-editable references block).
            var prev = widget.previousElementSibling;
            var next = widget.nextElementSibling;
            var hasPrev = !!prev && !prev.classList.contains("vereferences");
            var hasNext = !!next && !next.classList.contains("vereferences");
            var up = widget.querySelector('[data-widget-action="move-up"]');
            var down = widget.querySelector('[data-widget-action="move-down"]');
            if (up) up.style.visibility = hasPrev ? "" : "hidden";
            if (down) down.style.visibility = hasNext ? "" : "hidden";
        });
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

    function applyWidgetImagePath(widget, pathField) {
        if (!widget || !pathField) return;
        var img = widget.querySelector(".vewidgetimagepreview, .vewidgetmediapreview");
        if (!img) return;
        var value = String(pathField.value || "").trim();
        if (!value) return;
        img.setAttribute("data-image-src", value);
        img.setAttribute("src", value);
        img.onerror = function () { img.setAttribute("src", "assets/images/badpath.png"); };
        img.onload = function () { img.onerror = null; };
    }

    function updateMsgIcon(widget) {
        if (!widget) return;
        var strong = widget.querySelector(".msglabel strong");
        var icon = widget.querySelector(".msgicon");
        if (!strong || !icon) return;
        var kind = String(strong.textContent || "").replace(":", "").trim().toLowerCase() || "hello";
        kind = kind.replace(/[^a-z0-9_-]/g, "");
        var next = "assets/images/msg/" + kind + ".png";
        if (kind === "hello" || kind === "message") next = "assets/images/msg/welcome.gif";
        icon.setAttribute("src", next);
        icon.onerror = function () { icon.setAttribute("src", "assets/images/msg/badpath.png"); };
    }

    /*//////////////////////////////////////////////////////////////////////*/
    // Citations & references block

    function getNextCitationId(canvas) {
        var used = {};
        if (!canvas) return 1;
        canvas.querySelectorAll("[data-veciteid]").forEach(function (el) {
            var n = Number(el.getAttribute("data-veciteid"));
            if (!isNaN(n)) used[n] = true;
        });
        for (var i = 1; i < 10000; i++) if (!used[i]) return i;
        return 1;
    }

    function normalizeInlineCodeNodes(canvas) {
        if (!canvas) return;
        canvas.querySelectorAll("code").forEach(function (node) {
            if (node.closest("pre")) {
                var blockValue = (node.textContent || "").replace(/​/g, "");
                if (!blockValue.length) node.textContent = "​";
                return;
            }
            var value = (node.textContent || "").replace(/​/g, "");
            if (!value.length) node.textContent = "​";
        });
    }

    function cleanupCitations(canvas) {
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

    // Make sure the references block exists (when it should), and that the
    // canvas ends with an editable trailing paragraph so the user can always
    // place the caret past contenteditable=false blocks (widgets, references)
    // and reach earlier content with Backspace/Delete.
    function ensureReferences(canvas, forceCreate) {
        if (!canvas) return;
        var refs = canvas.querySelector(".vereferences");
        var hasEntries = canvas.querySelectorAll(".veciteentry").length > 0;
        if (!forceCreate && !hasEntries) {
            if (refs) refs.remove();
            refs = null;
        } else if (!refs) {
            refs = document.createElement("section");
            refs.className = "vereferences";
            refs.setAttribute("contenteditable", "false");
            refs.innerHTML = '<h2 contenteditable="false">References</h2><ol></ol>';
            canvas.appendChild(refs);
        }

        // Always ensure a usable trailing <p> so the caret can sit past any
        // non-editable terminal block. Without this, a cite placed in the
        // last paragraph becomes unreachable for Backspace once the
        // references block lands behind it.
        var last = canvas.lastElementChild;
        var needsTrailer = !last
            || last.classList.contains("vewidget")
            || last.classList.contains("vereferences")
            || (last.getAttribute && last.getAttribute("contenteditable") === "false");
        if (needsTrailer) {
            var trailer = document.createElement("p");
            trailer.innerHTML = "<br>";
            canvas.appendChild(trailer);
        }
    }

    window.VE.widgets = {
        getWidgetAlign: getWidgetAlign,
        updateAlignButtonIcon: updateAlignButtonIcon,
        syncWidgetState: syncWidgetState,
        addInfoboxRow: addInfoboxRow,
        applyWidgetImagePath: applyWidgetImagePath,
        updateMsgIcon: updateMsgIcon,
        getNextCitationId: getNextCitationId,
        normalizeInlineCodeNodes: normalizeInlineCodeNodes,
        cleanupCitations: cleanupCitations,
        ensureReferences: ensureReferences
    };
})();
