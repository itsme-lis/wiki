(function () {
    window.VE = window.VE || {};

    function escapeHtml(v) {
        return String(v || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    // Each entry is fetched once at startup; later renders read from cache.
    // The HTML files use {{name}} placeholders that aren't strictly valid HTML
    // but get replaced before the markup ever reaches the DOM.
    var TEMPLATE_DIR = "src/visualeditor/templates/";
    var TEMPLATE_NAMES = ["editor", "infobox", "media", "msg", "card"];
    var cache = {};
    var loadPromise = null;

    // Cache-buster regenerated on every page load so iterating on the editor
    // markup doesn't get stuck on a stale template the browser cached.
    var bust = "?v=" + Date.now();
    function load() {
        if (loadPromise) return loadPromise;
        loadPromise = Promise.all(TEMPLATE_NAMES.map(function (name) {
            return fetch(TEMPLATE_DIR + name + ".html" + bust, { cache: "no-store" }).then(function (r) {
                if (!r.ok) throw new Error("Failed to load template: " + name);
                return r.text();
            }).then(function (txt) {
                cache[name] = txt;
            });
        }));
        return loadPromise;
    }

    function render(name, vars) {
        var tmpl = cache[name];
        if (typeof tmpl !== "string") {
            console.warn("VE template not loaded:", name);
            return "";
        }
        if (!vars) return tmpl;
        return tmpl.replace(/\{\{(\w+)\}\}/g, function (_m, key) {
            return Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : "";
        });
    }

    function editorMarkup() {
        return render("editor");
    }

    function buildWidget(type) {
        var defaultImage = "/assets/images/examplesquare2.png";
        if (type === "infobox") return render("infobox", { defaultImage: escapeHtml(defaultImage) });
        if (type === "media") return render("media", { defaultImage: escapeHtml(defaultImage) });
        if (type === "msg") return render("msg");
        // info / warning / danger cards share one template, parameterised by type.
        return render("card", { type: escapeHtml(type) });
    }

    // Kick off the fetches immediately so the cache is usually warm by the
    // time the user enters preview mode.
    load();

    window.VE.util = { escapeHtml: escapeHtml };
    window.VE.templates = {
        load: load,
        editor: editorMarkup,
        widget: buildWidget,
        render: render
    };
})();
