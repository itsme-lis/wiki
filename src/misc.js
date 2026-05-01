(function () {
    var treeapiurl = "https://api.github.com/repos/CtRHome/wiki/git/trees/main?recursive=1";
    var allpagestitlescache = null;
    var allpagestitlespending = null;

    function fetchallpagestitles(tonormalwidth) {
        if (allpagestitlescache) return Promise.resolve(allpagestitlescache);
        if (allpagestitlespending) return allpagestitlespending;
        allpagestitlespending = fetch(treeapiurl, {
            headers: {
                "Accept": "application/vnd.github+json",
                "User-Agent": "Om Nom"
            }
        }).then(function (response) {
            if (!response.ok) throw new Error("github tree api returned " + response.status);
            return response.json();
        }).then(function (data) {
            var tree = Array.isArray(data && data.tree) ? data.tree : [];
            var seen = {};
            var titles = [];

            tree.forEach(function (entry) {
                if (!entry || entry.type !== "blob" || typeof entry.path !== "string") return;
                if (!/^articles\/.+\.md$/i.test(entry.path)) return;

                var title = "";
                var pref = entry.path.match(/^articles\/~([^/]+)\/(.+)\.md$/i);
                if (pref) {
                    var prefname = tonormalwidth(pref[1] || "").trim();
                    var page = tonormalwidth(pref[2] || "").replace(/_/g, " ").replace(/\s+/g, " ").trim();
                    if (prefname && page) title = prefname + ":" + page;
                } else {
                    var plain = entry.path.match(/^articles\/(.+)\.md$/i);
                    if (plain) {
                        title = tonormalwidth(plain[1] || "").replace(/_/g, " ").replace(/\s+/g, " ").trim();
                    }
                }
                if (!title) return;

                var key = title.toLowerCase();
                if (seen[key]) return;
                seen[key] = 1;
                titles.push(title);
            });

            titles.sort(function (a, b) {
                return a.localeCompare(b, undefined, { sensitivity: "base" });
            });
            allpagestitlescache = titles;
            allpagestitlespending = null;
            return titles;
        }).catch(function (err) {
            allpagestitlespending = null;
            throw err;
        });
        return allpagestitlespending;
    }

    function renderallpagescontent(titles, helpers) {
        var grouped = {};
        titles.forEach(function (title) {
            var first = String(title || "").trim().charAt(0);
            if (!first) return;
            var key = helpers.tonormalwidth(first).toUpperCase();
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(title);
        });

        var groupkeys = Object.keys(grouped).sort(function (a, b) {
            return a.localeCompare(b, undefined, { sensitivity: "base" });
        });
        if (!groupkeys.length) {
            return '<p class="paragraph">No pages were found in the article index.</p>';
        }

        return groupkeys.map(function (groupkey) {
            var listitems = grouped[groupkey].map(function (title) {
                return '<li><a href="' + helpers.escapeattr(helpers.wikilinktohash(title)) + '">' + helpers.escapehtml(title) + "</a></li>";
            }).join("");
            return (
                '<section class="allpagesgroup">' +
                "<h3>" + helpers.escapehtml(groupkey) + "</h3>" +
                '<ul class="articlelist allpageslist" style="column-count:3;column-gap:2em;">' + listitems + "</ul>" +
                "</section>"
            );
        }).join("");
    }

    async function renderspecialallpages(ctx) {
        var titles = await fetchallpagestitles(ctx.tonormalwidth);
        ctx.contentroot.innerHTML =
            ctx.maintitle.replace("$TITLE$", "Special:All Pages") +
            '<p class="paragraph smalltext">All indexed article pages, grouped by starting character.</p>' +
            renderallpagescontent(titles, ctx);
    }

    window.WikiMisc = {
        renderSpecialAllPages: renderspecialallpages
    };
})();
