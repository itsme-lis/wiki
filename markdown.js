// markdown parser
// (this is completely different from s.soggy.cat/info, so no sog nabbing this time)

(function () {
    var contentroot = document.querySelector(".content");
    var maintitle = '<h1 class="title">$TITLE$</h1>';

    var hostwhitelist = [
        window.location.hostname,
        "github.com",
        "raw.githubusercontent.com",
        "files.catbox.moe",
        "imgur.com",
        "i.imgur.com",
        "drive.google.com",
        "gyazo.com", //
        "prnt.sc", // if you use these you're a boomer man i'm sorry
        "postimg.cc", //
        "ibb.co"
    ];
    var blockedext = {
        svg: true, svgz: true,
        html: true, htm: true, xml: true,
        js: true, mjs: true, cjs: true,
        vbs: true, wasm: true
    };
    var reservedprefixes = ["special", "wiki"];
    var localdebug = /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname);
    var treeapiurl = "https://api.github.com/repos/CtRHome/wiki/git/trees/main?recursive=1";

    var externallink = "assets/images/icons/linkbluesmall.png";
    var activecitationrenderer = null;
    var pendingredirectnotice = null;
    var imageoverlay = null;
    var imageoverlaylink = null;
    var imageoverlayimg = null;

    /*//////////////////////////////////////////////////////////////////////*/

    // since nobody can really create filenames with special characters, we're pulling the yt-dlp method babye
    function tonormalwidth(val) {
        var s = String(val || "");
        try {return s.normalize("NFKC")} catch (_err) {return s}
    }
    function tofullwidthfilename(val) {
        var s = String(val || "");
        var map = {
            "<": "＜", ">": "＞",
            ":": "：", "\"": "＂",
            "/": "／", "\\": "＼",
            "|": "｜", "?": "？",
            "*": "＊"
        };
        return s.replace(/[<>:"/\\|?*]/g, function (ch) {return map[ch] || ch;});
    }
    function parsedhash() {
        var raw = window.location.hash ? window.location.hash.slice(1) : "";
        var decoded = "";
        try {decoded = decodeURIComponent(raw || "")} catch (_err) {decoded = String(raw || "")}
        decoded = decoded.trim();

        var splitidx = decoded.indexOf("&");
        if (splitidx === -1) splitidx = decoded.indexOf("?");
        var articlepart = splitidx === -1 ? decoded : decoded.slice(0, splitidx);
        var query = splitidx === -1 ? "" : decoded.slice(splitidx + 1);

        var article = tonormalwidth(articlepart.trim()).replace(/_/g, " ");
        return { raw: raw, article: article, query: query };
    }
    function maybeNormalizeVisibleHash(parts) {
        var article = parts.article || "";
        if (!article) article = "Main Page";
        var underscored = tonormalwidth(article).trim().replace(/\s+/g, " ").replace(/ /g, "_");
        var rebuilt = underscored + (parts.query ? ("&" + parts.query) : "");
        var encoded = "#" + encodeURIComponent(rebuilt);
        if (window.location.hash !== encoded) {
            try {history.replaceState(null, "", encoded)} catch (_err) {}
        }
    }
    function getqueryparam(query, key) {
        var q = String(query || "").trim();
        if (!q) return "";
        var chunks = q.split("&");
        for (var i = 0; i < chunks.length; i++) {
            var kv = chunks[i].split("=");
            var k = (kv[0] || "").trim();
            if (k !== key) continue;
            var v = kv.slice(1).join("=");
            try {return decodeURIComponent(v)} catch (_err) {return v}
        }
        return "";
    }
    function setqueryparam(hasharticle, query, key, value) {
        var base = String(hasharticle || "").trim() || "Main Page";
        base = tonormalwidth(base).replace(/\s+/g, " ").replace(/ /g, "_");
        var q = String(query || "").trim();
        var entries = [];
        if (q) {
            q.split("&").forEach(function (chunk) {
                if (!chunk) return;
                var idx = chunk.indexOf("=");
                var k = idx === -1 ? chunk : chunk.slice(0, idx);
                k = String(k || "").trim();
                if (!k || k === key) return;
                entries.push(chunk);
            });
        }
        if (value !== "") entries.push(key + "=" + encodeURIComponent(value));
        var rebuilt = base + (entries.length ? ("&" + entries.join("&")) : "");
        return "#" + encodeURIComponent(rebuilt);
    }
    function slugifyheading(text) {
        var s = tonormalwidth(String(text || ""));
        s = s.replace(/<[^>]+>/g, " ");
        s = s.toLowerCase().trim();
        s = s.replace(/&[a-z0-9#]+;/gi, " ");
        s = s.replace(/['"]/g, "");
        s = s.replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
        return s || "section";
    }
    function ensureuniqueid(base, used) {
        var s = String(base || "").trim() || "section";
        if (!used[s]) {used[s] = 1; return s}
        used[s] += 1;
        return s + "-" + used[s];
    }

    function escapehtml(val) {
        return String(val || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }
    function escapeattr(val) {
        return escapehtml(val).replace(/"/g, "&quot;");
    }
    function isexternalhref(href) {
        try {
            var parsed = new URL(href, window.location.href);
            return parsed.origin !== window.location.origin;
        } catch (_err) {
            return false;
        }
    }
    function makewikihref(target) {
        return wikilinktohash(target);
    }
    function normalizewikikey(target) {
        var raw = String(target || "").trim();
        if (!raw) return "";
        var parts = raw.split(":");
        var hasprefix = parts.length > 1;
        var prefix = hasprefix ? parts[0].trim() : "";
        var body = hasprefix ? parts.slice(1).join(":").trim() : raw;
        var page = body.replace(/_/g, " ").replace(/\s+/g, " ").trim();
        if (!page) return "";
        return hasprefix ? (prefix.toLowerCase() + ":" + page) : page;
    }
    function getarticlecandidatesfromtarget(target) {
        var raw = String(target || "").trim();
        var parts = raw.split(":");
        var hasprefix = parts.length > 1;
        var prefix = hasprefix ? parts[0].trim() : "";
        var body = hasprefix ? parts.slice(1).join(":").trim() : raw;
        var spaced = body.replace(/_/g, " ").replace(/\s+/g, " ").trim();
        if (!spaced) return [];
        return hasprefix
            ? [
                "articles/~" + prefix + "/" + spaced + ".md",
                "articles/~" + prefix.toLowerCase() + "/" + spaced + ".md"
            ]
            : [
                "articles/" + spaced + ".md"
            ];
    }
    function isallowedhost(hostname) {
        var lower = String(hostname || "").toLowerCase();
        return hostwhitelist.some(function (host) {
            var allowed = String(host || "").toLowerCase();
            return lower === allowed || lower.endsWith("." + allowed);
        });
    }
    function normalizemediaurl(rawurl) {
        var raw = String(rawurl || "").trim();
        if (!raw) return { ok: false, reason: "No media URL was provided." };
        if (/^\s*javascript:/i.test(raw) || /^\s*data:/i.test(raw)) {
            return { ok: false, reason: "This URL scheme is not allowed..." };
        }

        // chunk below's for unique errors
        var parsed;
        try {parsed = new URL(raw, window.location.href)} 
        catch (_err) {return {ok: false, reason: "The URL for this file was invalid."}}

        var islocal = !parsed.host || parsed.origin === window.location.origin;
        if (!islocal && !isallowedhost(parsed.hostname)) {
            return {ok: false, reason: "This host is not whitelisted."};
        }

        var pathname = parsed.pathname || "";
        var extmatch = pathname.toLowerCase().match(/\.([a-z0-9]+)$/);
        var ext = extmatch ? extmatch[1] : "";
        if (ext && blockedext[ext]) {
            return {ok: false, reason: "." + ext + " files are blocked for safety."};
        }

        return {ok: true, url: parsed.href, ext: ext};
    }
    function getdecodedfilenamefromurl(url) {
        try {
            var parsed = new URL(url, window.location.href);
            var parts = (parsed.pathname || "").split("/").filter(Boolean);
            var rawname = parts.length ? parts[parts.length - 1] : "media";
            return decodeURIComponent(rawname);
        } catch (_err) {
            return "media";
        }
    }
    function maybeprependlocalimagepath(rawurl) {
        var val = String(rawurl || "").trim();
        if (!val) return val;
        if (/^(https?:|data:|javascript:|\/\/|\/|#|\.\/|\.\.\/)/i.test(val)) return val;
        if (/^articles\/media\//i.test(val)) return val;
        return "articles/Media/" + val;
    }
    function sanitizehref(rawhref) {
        var href = String(rawhref || "").trim();
        if (!href) return "#";
        if (href[0] === "#" || href[0] === "/") return escapeattr(href);
        if (href.startsWith("./") || href.startsWith("../")) return escapeattr(href);

        var parsed;
        try {parsed = new URL(href, window.location.href)}
        catch (_err) {return "#"}

        var pathname = parsed.pathname || "";
        var localmd = pathname.match(/\/articles\/(?:~([^/]+)\/)?(.+)\.md$/i);
        if (localmd) {
            var prefix = localmd[1] ? (localmd[1] + ":") : "";
            var page = decodeURIComponent(localmd[2] || "").replace(/_/g, " ").replace(/\s+/g, " ").trim();
            if (page) return escapeattr(makewikihref(prefix + page));
        }

        var protocol = parsed.protocol.toLowerCase();
        if (protocol === "http:" || protocol === "https:" || protocol === "mailto:") {
            return escapeattr(parsed.href);
        }
        return "#";
    }
    function resolvecardlink(rawlink) {
        var val = String(rawlink || "").trim();
        if (!val) return "#";
        if (/^(https?:|mailto:|#|\/|\.\/|\.\.\/)/i.test(val)) return sanitizehref(val);
        return escapeattr(makewikihref(val));
    }
    function appendexternalicon(html) {
        return '<span class="externallinkwrap">' + html + '<img class="externalicon" src="' + escapeattr(externallink) + '" aria-hidden="true"></span>';
    }
    function buildlinkhtml(labelhtml, href) {
        var safehref = sanitizehref(href);
        var isexternal = isexternalhref(safehref);
        var base = '<a href="' + safehref + '"' + (isexternal ? ' rel="noopener noreferrer nofollow" target="_blank"' : "") + ">" + labelhtml + "</a>";
        return isexternal ? appendexternalicon(base) : base;
    }

    /*//////////////////////////////////////////////////////////////////////*/
    
    function hideimageoverlay() {
        if (!imageoverlay) return;
        imageoverlay.classList.remove("active");
    }
    function ensureimageoverlay() {
        if (imageoverlay) return;

        imageoverlay = document.createElement("div");
        imageoverlay.className = "imageoverlay";
        imageoverlaylink = document.createElement("a");
        imageoverlaylink.className = "imageoverlaylink";
        imageoverlaylink.target = "_blank";
        imageoverlaylink.rel = "noopener noreferrer";
        imageoverlayimg = document.createElement("img");

        imageoverlaylink.appendChild(imageoverlayimg);
        imageoverlay.appendChild(imageoverlaylink);
        document.body.appendChild(imageoverlay);

        imageoverlay.addEventListener("click", function (e) {
            if (e.target === imageoverlay) hideimageoverlay();
        });
        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape") hideimageoverlay();
        });
    }
    function bindexpandableimages(scope) {
        ensureimageoverlay();
        var images = scope.querySelectorAll(".infobox img, .embed img");
        images.forEach(function (img) {
            if (img.dataset.expandbound === "1") return;
            img.dataset.expandbound = "1";
            img.classList.add("expandableimage");
            img.addEventListener("click", function () {
                imageoverlayimg.src = img.currentSrc || img.src;
                imageoverlayimg.alt = img.alt || "";
                imageoverlaylink.href = img.currentSrc || img.src;
                imageoverlay.classList.add("active");
            });
        });
    }

    /*//////////////////////////////////////////////////////////////////////*/

    function normalizehash() {
        var parts = parsedhash();
        var article = parts.article || "Main Page";
        maybeNormalizeVisibleHash(parts);
        return article;
    }
    function displaytitlefrompagename(pagename) {
        return tonormalwidth(pagename).replace(/_/g, " ").trim() || "Untitled";
    }
    function wikilinktohash(target) {
        var cleaned = tonormalwidth(String(target || "").trim());
        return "#" + encodeURIComponent(cleaned);
    }

    /*//////////////////////////////////////////////////////////////////////*/

    function parseinline(txt, opts) {
        opts = opts || {};
        try {
            var rendercitationref = typeof opts.rendercitationref === "function"
                ? opts.rendercitationref
                : (typeof activecitationrenderer === "function" ? activecitationrenderer : null);
            var escapes = [];
            var neutralized = String(txt || "").replace(/\\([\\`*_~\[\]\(\)-])/g, function (_, ch) {
                var token = "%%esc" + escapes.length + "%%";
                escapes.push(ch);
                return token;
            });

        // REALLY overkill logic to try and ignore markdown inside code blocks/monospace text.
        // that's how the table in Special:Test doesn't crumble from the pipes and squared brackets
        // ..this took a ton of testing..
        var codespans = [];
        (function () {
            var out = "";
            var s = String(neutralized || "");
            var i = 0;
            while (i < s.length) {
                var ch = s[i];
                if (ch !== "`") {out += ch; i++; continue}

                var run = 1;
                while (i + run < s.length && s[i + run] === "`") run++;
                var delim = s.slice(i, i + run);
                var start = i + run;
                var end = s.indexOf(delim, start);
                if (end === -1) {out += ch; i++; continue}

                var content = s.slice(start, end);
                var token = "%%code" + codespans.length + "%%";
                codespans.push(content);
                out += token;
                i = end + run;
            }
            neutralized = out;
        })();

        var safe = escapehtml(neutralized);
        safe = safe.replace(/&lt;\s*br\s*\/?\s*&gt;/gi, "<br>");
        safe = safe.split("\n").map(function (line) {
            if (/^\s*-#\s+/.test(line)) {
                return '<span class="sizetextsmall">' + line.replace(/^\s*-#\s+/, "") + "</span>";
            }
            if (/^\s*#\s+/.test(line)) {
                return '<span class="sizetextbig">' + line.replace(/^\s*#\s+/, "") + "</span>";
            }
            return line;
        }).join("\n");

        safe = safe
            // bold
            .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
            // italic
            .replace(/\*([^*]+)\*/g, "<em>$1</em>")
            // underline
            .replace(/__([^_]+)__/g, "<u>$1</u>")
            .replace(/_([^_]+)_/g, "<u>$1</u>")
            // strikethrough
            .replace(/~~([^~]+)~~/g, "<del>$1</del>")
            .replace(/~([^~]+)~/g, "<del>$1</del>")
            // article links with a custom label
            .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, function (_, t, l) {
                var key = normalizewikikey(t);
                return '<a class="articlelink" data-wikilink-target="' + escapeattr(t) + '" data-wikilink-key="' + escapeattr(key) + '" href="' + escapeattr(makewikihref(t)) + '">' + l + "</a>";
            })
            // article links
            .replace(/\[\[([^\]]+)\]\]/g, function (_, t) {
                var key = normalizewikikey(t);
                return '<a class="articlelink" data-wikilink-target="' + escapeattr(t) + '" data-wikilink-key="' + escapeattr(key) + '" href="' + escapeattr(makewikihref(t)) + '">' + t.replace(/_/g, " ") + "</a>";
            })
            // external links
            .replace(/\[([^\]]+)\]\(((?:[^()\s]+|\([^()]*\))+)\)/g, function (_, label, href) {
                return buildlinkhtml(label, href);
            })
            // cite references like [^id] and cite needed like [^?]
            .replace(/\[\^([^\]]+)\]/g, function (_, id) {
                var key = String(id || "").trim();
                if (key === "?") {
                    return '<sup class="citationneeded"><a href="' + escapeattr(makewikihref("Wiki:Provide sources to big claims")) + '"><em>(source?)</em></a></sup>';
                }
                if (!key) return "";
                if (rendercitationref) return rendercitationref(key);
                return '<sup class="citeref">[?]</sup>';
            });

        safe = safe.replace(/ - /g, " — ");
        safe = safe.replace(/\n/g, "<br>");

        escapes.forEach(function (ch, idx) {
            safe = safe.replace(new RegExp("%%esc" + idx + "%%", "g"), escapehtml(ch));
        });

        codespans.forEach(function (content, idx) {
            var html = "<code>" + escapehtml(content) + "</code>";
            safe = safe.replace(new RegExp("%%code" + idx + "%%", "g"), html);
        });
            return safe;
        } catch (_err) {
            return escapehtml(String(txt || "")).replace(/\n/g, "<br>");
        }
    }

    // if it's not here, it won't play! no auto guessing types, sorry, have these long hardcoded lists
    function guessmediatype(ext) {
        var image = {png: 1, jpg: 1, jpeg: 1, webp: 1, gif: 1, bmp: 1, ico: 1, avif: 1};
        var audio = {mp3: 1, wav: 1, ogg: 1, m4a: 1, aac: 1, flac: 1, opus: 1};
        var video = {mp4: 1, webm: 1, ogv: 1, mov: 1, m4v: 1};
        if (image[ext]) return "image";
        if (audio[ext]) return "audio";
        if (video[ext]) return "video";
        return "unknown";
    }
    function mediarenderhtml(url, mediatype, attrs) {
        var safeurl = escapeattr(url);
        var attrhtml = attrs ? (" " + attrs) : "";
        if (mediatype === "image") return '<img loading="lazy" src="' + safeurl + '"' + attrhtml + ">";
        if (mediatype === "audio") return '<audio controls preload="metadata" src="' + safeurl + '"' + attrhtml + "></audio>";
        if (mediatype === "video") return '<video controls preload="metadata" src="' + safeurl + '"' + attrhtml + "></video>";
        var filename = escapehtml(getdecodedfilenamefromurl(url));
        return '<p class="paragraph"><a href="' + safeurl + '">' + filename + "</a></p>";
    }
    function buildmediafallback(rawurl) {
        var val = String(rawurl || "").trim();
        if (!val) return "";
        if (/^(https?:|data:|javascript:|\/\/|#)/i.test(val)) return "";
        if (/^articles\/media\//i.test(val)) return "";
        return "articles/Media/" + val.replace(/^\.?\//, "");
    }
    function bindmediafallbacks(scope) {
        if (!scope) return;
        var mediaels = scope.querySelectorAll(".embed img, .embed audio, .embed video");
        mediaels.forEach(function (el) {
            if (el.dataset.fallbackBound === "1") return;
            el.dataset.fallbackBound = "1";
            var originalsrc = el.getAttribute("src") || "";
            var explicitfallback = el.getAttribute("data-fallback-src") || "";
            var fallbacksrc = explicitfallback || buildmediafallback(originalsrc);
            var figure = el.closest("figure.embed");

            el.addEventListener("error", function () {
                if (!el.dataset.fallbackTried && fallbacksrc) {
                    el.dataset.fallbackTried = "1";
                    el.src = fallbacksrc;
                    if (typeof el.load === "function") el.load();
                    return;
                }
                if (!figure) return;
                var secondmsg = "Could not load media from `" + (fallbacksrc || originalsrc) + "`... (Fallback link didn\'t work either!)";
                figure.outerHTML = renderdangercard("Media failed to load", secondmsg);
            });
        });
    }
    function renderdangercard(title, text) {
        return (
            '<section class="card carddanger">' +
            '<h3><img class="cardicon" src="assets/images/icons/danger.png"> ' + parseinline(title || "Danger") + "</h3>" +
            "<p>" + parseinline(text || "") + "</p>" +
            "</section>"
        );
    }

    function parsedirectiveblock(name, args, lines) {
        var data = {};
        var rowsource = [];
        var lastkey = "";
        lines.forEach(function (line) {
            var idx = line.indexOf(":");
            var looksproperty = idx > 0 && line.slice(0, idx).trim() !== "";

            if (looksproperty) {
                var rawkey = line.slice(0, idx).trim();
                var key = rawkey.toLowerCase();
                var val = line.slice(idx + 1).trim();
                if (key) {
                    data[key] = val;
                    rowsource.push({ rawkey: rawkey, key: key, value: val });
                    lastkey = key;
                }
                return;
            }

            if (lastkey) {
                var cont = line.trim();
                data[lastkey] += "\n" + cont;
                for (var r = rowsource.length - 1; r >= 0; r--) {
                    if (rowsource[r].key === lastkey) {
                        rowsource[r].value = data[lastkey]; break;
                    }
                }
            }
        });

        // ::infobox
        if (name === "infobox") {
            var imagehtml = "";
            if (data.image) {
                var infoboximage = maybeprependlocalimagepath(data.image);
                var img = normalizemediaurl(infoboximage);
                if (img.ok && guessmediatype(img.ext) === "image") {
                    imagehtml = '<img src="' + escapeattr(img.url) + '">';
                } else if (!img.ok) {
                    imagehtml = '<p class="paragraph infoboxwarning">' + parseinline(img.reason) + "</p>";
                }
            }

            var rows = rowsource
                .filter(function (r) { return r.key !== "title" && r.key !== "image"; })
                .map(function (r) {
                    return "<tr><th>" + parseinline(r.rawkey) + "</th><td>" + parseinline(r.value) + "</td></tr>";
                }).join("");

            return (
                '<aside class="infobox">' +
                (data.title ? "<h3>" + parseinline(data.title) + "</h3>" : "") +
                imagehtml +
                "<table>" + rows + "</table>" +
                "</aside>"
            );
        }

        // ::media / ::video / ::image
        if (name === "video" || name === "image" || name === "media") {
            var rawmediaurl = data.url || "";
            var alignment = args[0] === "left" || args[0] === "right" ? args[0] : "";
            var chosenmediatype = name === "video" ? "video" : (name === "image" ? "image" : "");
            if (name === "media" || chosenmediatype === "image") rawmediaurl = maybeprependlocalimagepath(rawmediaurl);

            var media = normalizemediaurl(rawmediaurl);
            if (!media.ok) {
                return renderdangercard("Blocked media", media.reason);
            }

            var mediatype = chosenmediatype || guessmediatype(media.ext);
            var alignclass = alignment ? " embed" + alignment : "";
            var fallbacksrc = buildmediafallback(rawmediaurl);
            var mediaattrs = fallbacksrc ? ('data-fallback-src="' + escapeattr(fallbacksrc) + '"') : "";

            return (
                '<figure class="embed' + alignclass + '">' +
                mediarenderhtml(media.url, mediatype, mediaattrs) +
                (data.caption ? "<figcaption>" + parseinline(data.caption) + "</figcaption>" : "") +
                "</figure>"
            );
        }

        // ::card (info, warning, danger)
        if (name === "card") {
            var cardtype = (args[0] || "info").toLowerCase();
            if (cardtype !== "warning" && cardtype !== "danger" && cardtype !== "info") cardtype = "info";
            var icon = cardtype === "danger"
                ? "assets/images/icons/danger.png"
                : (cardtype === "warning" ? "assets/images/icons/warning.png" : "assets/images/icons/info.png");

            return (
                '<section class="card card' + cardtype + '">' +
                (data.title ? '<h3><img class="cardicon" src="' + escapeattr(icon) + '"> ' + parseinline(data.title) + "</h3>" : "") +
                (data.text ? "<p>" + parseinline(data.text) + "</p>" : "") +
                (data.link ? '<p>' + buildlinkhtml("Read more", resolvecardlink(data.link)) + "</p>" : "") +
                "</section>"
            );
        }

        // ::msg
        if (name === "msg") {
            var msgkindraw = String(data.kind || "message").trim().toLowerCase();
            var msgkind = msgkindraw.replace(/[^a-z0-9_-]/g, "") || "message";
            var msglabel = msgkind.charAt(0).toUpperCase() + msgkind.slice(1) + ":";
            var msgicon = "assets/images/msg/" + msgkind + ".png";
            var msgbody = data.message ? parseinline(data.message) : "";
            return (
                '<section class="msg msg-' + escapeattr(msgkind) + '">' +
                '<img class="msgicon" src="' + escapeattr(msgicon) + '" alt="">' +
                '<div class="msgcontent">' +
                '<p class="msglabel"><strong>' + escapehtml(msglabel) + "</strong></p>" +
                (msgbody ? '<p class="msgtext">' + msgbody + "</p>" : "") +
                "</div>" +
                "</section>"
            );
        }
        return "";
    }

    /*//////////////////////////////////////////////////////////////////////*/

    // big chunk to check for existence of articles. 
    /* do note that it too is also subject to the localdebug thing so 
       you'll need to click to request github (to prevent spam on live preview again) */
    var articleindexcache = null;
    var articleindexpending = null;
    var linkstatusbykey = {};
    var linkstatusinitbound = false;

    async function fetcharticleindex() {
        if (articleindexcache) return articleindexcache;
        if (articleindexpending) return articleindexpending;
        articleindexpending = fetch(treeapiurl, {
            headers: {
                "Accept": "application/vnd.github+json",
                "User-Agent": "Om Nom"
            }
        }).then(function (response) {
            if (!response.ok) throw new Error("github tree api returned " + response.status);
            return response.json();
        }).then(function (data) {
            var tree = Array.isArray(data && data.tree) ? data.tree : [];
            var set = new Set();
            tree.forEach(function (entry) {
                if (!entry || entry.type !== "blob" || typeof entry.path !== "string") return;
                if (!/^articles\/.+\.md$/i.test(entry.path)) return;

                var matchpref = entry.path.match(/^articles\/~([^/]+)\/(.+)\.md$/i);
                if (matchpref) {
                    var key = matchpref[1].toLowerCase() + ":" + matchpref[2].replace(/_/g, " ").replace(/\s+/g, " ").trim();
                    if (key) set.add(key);
                    return;
                }
                var matchplain = entry.path.match(/^articles\/(.+)\.md$/i);
                if (matchplain) {
                    var plainkey = matchplain[1].replace(/_/g, " ").replace(/\s+/g, " ").trim();
                    if (plainkey) set.add(plainkey);
                }
            });
            articleindexcache = set;
            articleindexpending = null;
            return set;
        }).catch(function (err) {
            articleindexpending = null;
            throw err;
        });
        return articleindexpending;
    }

    async function resolvewikilinkstatus(target, key) {
        var cachekey = String(key || "");
        if (cachekey && linkstatusbykey[cachekey]) return linkstatusbykey[cachekey];

        var candidates = getarticlecandidatesfromtarget(target);
        if (!candidates.length) return "missing";

        try {
            var index = await fetcharticleindex();
            var exists = candidates.some(function (path) {
                var pref = path.match(/^articles\/~([^/]+)\/(.+)\.md$/i);
                if (pref) {
                    var prefkey = pref[1].toLowerCase() + ":" + pref[2].replace(/_/g, " ").replace(/\s+/g, " ").trim();
                    return index.has(prefkey);
                }
                var plain = path.match(/^articles\/(.+)\.md$/i);
                if (!plain) return false;
                var plainkey = plain[1].replace(/_/g, " ").replace(/\s+/g, " ").trim();
                return index.has(plainkey);
            });
            var status = exists ? "exists" : "missing";
            if (cachekey) linkstatusbykey[cachekey] = status;
            return status;
        } catch (_err) {
            return "";
        }
    }
    function applywikilinkstatus(link, status) {
        link.classList.remove("articlelinkexists", "articlelinkmissing");
        if (status === "exists") link.classList.add("articlelinkexists");
        if (status === "missing") link.classList.add("articlelinkmissing");
    }

    async function updateallarticlelinkstates(scope) {
        var links = scope.querySelectorAll("a.articlelink[data-wikilink-target]");
        for (var i = 0; i < links.length; i++) {
            var link = links[i];
            var target = link.dataset.wikilinkTarget || "";
            var key = link.dataset.wikilinkKey || normalizewikikey(target);
            if (!target) continue;
            var status = await resolvewikilinkstatus(target, key);
            if (status) applywikilinkstatus(link, status);
        }
    }

    function bindlocaldebuglinktrigger(scope) {
        if (!localdebug || linkstatusinitbound) return;
        if (!scope) return;
        linkstatusinitbound = true;
        var trigger = function () {
            updateallarticlelinkstates(scope);
            scope.removeEventListener("click", trigger);
        }; scope.addEventListener("click", trigger);
    }

    /*//////////////////////////////////////////////////////////////////////*/

    function markdowntohtml(md) {
        activecitationrenderer = null;
        var cleanmd = String(md || "")
            .replace(/\r\n/g, "\n")
            .replace(/<!--[\s\S]*?-->/g, "");
        var lines = cleanmd.split("\n");
        var html = []; var inlist = false;
        var intable = false; var currenttable = null;
        var inblockquote = false;
        var citationsbyid = {}; var citationorder = [];
        var citationdefs = {};

        function escid(id) {
            return String(id || "").replace(/[^a-z0-9_-]/gi, "-");
        }
        function parsecitationlinks(raw) {
            var source = String(raw || "").trim();
            if (!source) return [];
            return source
                .split(/\s+/)
                .map(function (chunk) { return chunk.trim(); })
                .filter(function (chunk) { return /^(https?:\/\/|mailto:)/i.test(chunk); });
        }
        function parsecitationdefinition(raw) {
            var val = String(raw || "").trim();
            if (!val) return { desc: "", links: [] };
            var pipe = val.indexOf("|");
            if (pipe !== -1) {
                return {
                    desc: val.slice(0, pipe).trim(),
                    links: parsecitationlinks(val.slice(pipe + 1))
                };
            }
            if (/^(https?:\/\/|mailto:)/i.test(val)) {
                return { desc: "", links: parsecitationlinks(val) };
            }
            return { desc: val, links: [] };
        }
        function extractinlinedefinition(line) {
            var source = String(line || "");
            function isinsideinlinecode(text, pos) {
                var incode = false; var codedelim = 0;
                for (var i = 0; i < pos; i++) {
                    if (text[i] !== "`") continue;
                    if (i > 0 && text[i - 1] === "\\") continue;
                    var run = 1;
                    while (i + run < pos && text[i + run] === "`") run++;
                    if (!incode) {
                        incode = true;
                        codedelim = run;
                    } else if (run >= codedelim) {
                        incode = false;
                        codedelim = 0;
                    }
                    i += run - 1;
                }
                return incode;
            }
            var start = 0;
            while (true) {
                var idx = source.indexOf("[^", start);
                if (idx === -1) return { text: source, id: "", def: "" };
                if (idx > 0 && source[idx - 1] === "\\") {
                    start = idx + 2;
                    continue;
                }
                if (isinsideinlinecode(source, idx)) {
                    start = idx + 2;
                    continue;
                }
                var tail = source.slice(idx);
                var m = tail.match(/^\[\^([^\]]+)\]:\s*(.*)$/);
                if (!m) {
                    start = idx + 2;
                    continue;
                }
                return { text: source.slice(0, idx), id: String(m[1] || "").trim(), def: String(m[2] || "") };
            }
        }
        function registercitationref(id) {
            if (!citationsbyid[id]) {
                citationsbyid[id] = citationorder.length + 1;
                citationorder.push(id);
            }
            var idx = citationsbyid[id];
            return '<sup class="citeref"><a id="citeref' + idx + '" href="#" data-cite-target="cite' + idx + '">[' + idx + "]</a></sup>";
        }
        function inlinewithcites(text) {
            return parseinline(text, { rendercitationref: registercitationref });
        }
        activecitationrenderer = registercitationref;

        function closelist() {
            if (inlist) {
                html.push("</ul>");
                inlist = false;
            }
        }
        function closequote() {
            if (inblockquote) {
                html.push("</blockquote>");
                inblockquote = false;
            }
        }
        function splitrowcells(line, maxcells) {
            var trimmed = String(line || "").trim();
            if (!trimmed) return [];
            var row = trimmed;
            if (row[0] === "|") row = row.slice(1);
            if (row[row.length - 1] === "|") row = row.slice(0, -1);
            var cells = []; var current = "";
            var incode = false; var codedelim = 0;
            for (var i = 0; i < row.length; i++) {
                var ch = row[i];
                // allow escaping | in table cells!
                if (ch === "\\" && row[i + 1] === "|") {
                    current += "|"; i++; continue;
                }
                if (ch === "`") {
                    var run = 1;
                    while (i + run < row.length && row[i + run] === "`") run++;
                    if (!incode) {
                        incode = true;
                        codedelim = run;
                    } else if (run >= codedelim) {
                        incode = false;
                        codedelim = 0;
                    }
                    current += row.slice(i, i + run);
                    i += run - 1;
                    continue;
                }
                var cansplit = !maxcells || cells.length < (maxcells - 1);
                if (ch === "|" && !incode && cansplit) {
                    cells.push(current.trim());
                    current = "";
                    continue;
                }
                current += ch;
            }
            cells.push(current.trim());
            return cells;
        }
        function alignfromcell(cell) {
            var source = String(cell || "").trim();
            if (!/^:?-{3,}:?$/.test(source)) return "";
            var starts = source[0] === ":";
            var ends = source[source.length - 1] === ":";
            if (starts && ends) return "center";
            if (ends) return "right";
            if (starts) return "left";
            return "";
        }
        function closetable() {
            if (!intable || !currenttable) return;
            var head = "<thead><tr>" + currenttable.headers.map(function (cell, idx) {
                var align = currenttable.aligns[idx] ? ' style="text-align:' + currenttable.aligns[idx] + '"' : "";
                return "<th" + align + ">" + inlinewithcites(cell) + "</th>";
            }).join("") + "</tr></thead>";
            var body = "<tbody>" + currenttable.rows.map(function (row) {
                return "<tr>" + row.map(function (cell, idx) {
                    var align = currenttable.aligns[idx] ? ' style="text-align:' + currenttable.aligns[idx] + '"' : "";
                    return "<td" + align + ">" + inlinewithcites(cell) + "</td>";
                }).join("") + "</tr>";
            }).join("") + "</tbody>";
            html.push('<table class="markdowntable">' + head + body + "</table>");
            intable = false;
            currenttable = null;
        }

        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            var inlinedef = extractinlinedefinition(line);
            if (inlinedef.id) {
                citationdefs[inlinedef.id] = parsecitationdefinition(inlinedef.def || "");
                line = inlinedef.text;
            }
            var trimmed = line.trim();

            if (!trimmed) {
                closelist(); closequote(); closetable();
                // html.push('<p class="paragraph"><br></p>');
                continue;
            }

            var citedef = trimmed.match(/^\[\^([^\]]+)\]:\s*(.*)$/);
            if (citedef) {
                closetable();
                var citeid = String(citedef[1] || "").trim();
                if (citeid) citationdefs[citeid] = parsecitationdefinition(citedef[2] || "");
                continue;
            }

            // code blocks like 
            // ```lang 
            // code
            // ```
            if (/^```/.test(trimmed)) {
                closelist(); closequote(); closetable();

                var lang = (trimmed.slice(3).trim().toLowerCase() || "txt").replace(/[^a-z0-9_-]/g, "");
                var codelines = [];
                i++;
                while (i < lines.length && !/^```/.test(lines[i].trim())) {
                    codelines.push(lines[i]);
                    i++;
                }
                html.push(
                    '<pre class="codeblock"><code class="language-' + escapeattr(lang || "txt") + '">' +
                    escapehtml(codelines.join("\n")) +
                    "</code></pre>"
                );
                continue;
            }

            // ::infobox / ::media / ::card
            if (/^:+\s*[a-z]/i.test(trimmed)) {
                closelist(); closequote(); closetable();

                var directiveheader = trimmed.replace(/^:+\s*/, "").trim().toLowerCase();
                var parts = directiveheader.split(/\s+/).filter(Boolean);
                var dir = parts[0] || "";
                if (!dir) {
                    html.push('<p class="paragraph">' + inlinewithcites(trimmed) + "</p>");
                    continue;
                }
                var args = parts.slice(1);
                var block = []; i++;
                while (i < lines.length && !/^::+\s*$/.test(lines[i].trim())) block.push(lines[i++]);
                html.push(parsedirectiveblock(dir, args, block));
                continue;
            }

            // headings
            var heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
            if (heading) {
                closelist(); closequote(); closetable();
                var lvl = heading[1].length;
                html.push("<h" + lvl + " data-heading-source=\"" + escapeattr(heading[2]) + "\">" + inlinewithcites(heading[2]) + "</h" + lvl + ">");
                continue;
            }

            // separators
            if (/^---+$/.test(trimmed)) {
                closelist(); closequote(); closetable();
                html.push("<hr>");
                continue;
            }

            if (trimmed.indexOf("|") !== -1) {
                var nextline = i + 1 < lines.length ? lines[i + 1].trim() : "";
                if (!intable && nextline.indexOf("|") !== -1) {
                    var headercells = splitrowcells(trimmed);
                    var separatorcells = splitrowcells(nextline);
                    var canstarttable = headercells.length > 0 &&
                        separatorcells.length === headercells.length &&
                        separatorcells.every(function (cell) { return /^:?-{3,}:?$/.test(cell); });
                    if (canstarttable) {
                        closelist(); closequote();
                        closetable();
                        intable = true;
                        currenttable = {
                            headers: headercells,
                            aligns: separatorcells.map(alignfromcell),
                            rows: []
                        }; i++; continue;
                    }
                } else if (intable) {
                    var datacells = splitrowcells(trimmed, currenttable.headers.length);
                    if (datacells.length !== currenttable.headers.length) {
                        if (datacells.length > currenttable.headers.length) {
                            var kept = datacells.slice(0, currenttable.headers.length - 1);
                            var tail = datacells.slice(currenttable.headers.length - 1).join(" | ");
                            kept.push(tail);
                            datacells = kept;
                        } else {
                            while (datacells.length < currenttable.headers.length) datacells.push("");
                        }
                    }
                    currenttable.rows.push(datacells);
                    continue;
                }
            } else if (intable) {closetable()}

            // bullet point list
            if (/^[-*]\s+/.test(trimmed)) {
                closequote(); closetable();
                if (!inlist) {
                    html.push('<ul class="articlelist">');
                    inlist = true;
                }
                html.push("<li>" + inlinewithcites(trimmed.replace(/^[-*]\s+/, "")) + "</li>");
                continue;
            }

            // quotes
            var quote = trimmed.match(/^>\s?(.*)$/);
            if (quote) {
                closelist();
                closetable();
                if (!inblockquote) {
                    html.push('<blockquote class="quote">');
                    inblockquote = true;
                }
                html.push("<p>" + inlinewithcites(quote[1]) + "</p>");
                continue;
            }

            // small text
            if (/^-#\s+/.test(trimmed)) {
                closelist();
                closequote();
                closetable();
                html.push('<p class="paragraph smalltext">' + inlinewithcites(trimmed.replace(/^-#\s+/, "")) + "</p>");
                continue;
            }
            closelist(); closequote(); closetable();
            html.push('<p class="paragraph">' + inlinewithcites(trimmed) + "</p>");
        }
        closelist(); closequote(); closetable();
        if (citationorder.length) {
            var refs = citationorder.map(function (id) {
                var def = citationdefs[id] || { desc: "", links: [] };
                var idx = citationsbyid[id];
                var chunks = [];
                if (def.desc) chunks.push(inlinewithcites(def.desc));
                if (def.links && def.links.length) {
                    var linkhtml = def.links.map(function (rawlink, linkidx) {
                        var safelink = sanitizehref(rawlink);
                        var linklabel;
                        if (def.desc) {
                            linklabel = def.links.length > 1 ? "Source " + (linkidx + 1) : "Source link";
                        } else {
                            linklabel = rawlink;
                        }
                        return buildlinkhtml(escapehtml(linklabel), safelink);
                    }).join(" ");
                    chunks.push(linkhtml);
                }
                if (!chunks.length) chunks.push('<span class="infoboxwarning">(no citation details, this is likely a mistake)</span>');
                return '<li id="cite' + idx + '">' + chunks.join(" ") + ' <a class="citeback" href="#" data-cite-target="citeref' + idx + '">↑</a></li>';
            }).join("");
            html.push('<section class="citations"><h2>References</h2><ol>' + refs + "</ol></section>");
        }
        activecitationrenderer = null;
        return html.join("\n");
    }

    function getarticlecandidates(hashval) {
        var parts = hashval.split(":");
        var hasprefix = parts.length > 1;
        var prefix = hasprefix ? parts[0].trim() : "";
        var raw = hasprefix ? parts.slice(1).join(":").trim() : hashval.trim();
        var pagename = raw.replace(/_/g, " ").replace(/\s+/g, " ").trim();
        var title = displaytitlefrompagename(pagename);
        var spaced = pagename;
        var hashtitle = hasprefix ? (prefix + ":" + spaced) : spaced;

        var diskprefix = tofullwidthfilename(prefix);
        var diskname = tofullwidthfilename(spaced);
        var candidates = hasprefix
            ? [
                "articles/~" + diskprefix + "/" + diskname + ".md",
                "articles/~" + diskprefix.toLowerCase() + "/" + diskname + ".md"
            ]
            : [
                "articles/" + diskname + ".md"
            ];

        return { title: title, hashtitle: hashtitle, candidates: candidates };
    }
    function hasblockededitprefix(hashval) {
        var parts = String(hashval || "").split(":");
        if (parts.length < 2) return false;
        var prefix = String(parts[0] || "").trim().toLowerCase();
        return reservedprefixes.indexOf(prefix) !== -1;
    }
    function hasreservedprefix(hashval) {
        return hasblockededitprefix(hashval);
    }
    async function fetchfirstexisting(paths) {
        for (var i = 0; i < paths.length; i++) {
            var resp = await fetch(paths[i]);
            if (resp.ok) return { path: paths[i], markdown: await resp.text() };
        }
        return null;
    }

    /*//////////////////////////////////////////////////////////////////////*/

    function parseredirect(markdown) {
        var lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
        for (var i = 0; i < lines.length; i++) {
            var trimmed = lines[i].trim();
            if (!trimmed) continue;
            var m = trimmed.match(/^#redirect\s+\[\[([^\]]+)\]\]$/i);
            if (m) {
                return { target: String(m[1] || "").trim(), externalurl: "" };
            }
            var ext = trimmed.match(/^#redirect\s+(https:\/\/\S+)$/i);
            if (ext) {
                return { target: "", externalurl: String(ext[1] || "").trim() };
            }
            break;
        }
        return null;
    }
    function normalizedtargethash(target) {
        return "#" + String(target || "").trim();
    }
    function redirectnotice(fromname) {
        var safe = escapehtml(String(fromname || "").replace(/_/g, " "));
        var href = escapeattr("#" + String(fromname || "").trim());
        return '<p class="paragraph smalltext redirectnote">(Redirected from <a href="' + href + '">' + safe + "</a>)</p>";
    }
    function setpagetitle(hashtitle) {
        document.title = hashtitle + " - Cut the Rope Modding Wiki!";
    }
    function enhanceheadings(scope) {
        if (!scope) return;
        var used = {};
        var pageparts = parsedhash();
        var article = pageparts.article || "Main Page";
        var headings = scope.querySelectorAll("h1:not(.title), h2");
        headings.forEach(function (h) {
            if (h.dataset.headingEnhanced === "1") return;
            h.dataset.headingEnhanced = "1";

            var source = h.getAttribute("data-heading-source") || h.textContent || "";
            var slug = ensureuniqueid(slugifyheading(source), used);
            h.id = slug;

            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "copyheadinglink";
            btn.setAttribute("aria-label", "Copy link to this section");

            var img = document.createElement("img");
            img.src = "assets/images/icons/copylink.png";
            btn.appendChild(img);

            btn.addEventListener("click", function (e) {
                e.preventDefault(); e.stopPropagation();
                var newhash = setqueryparam(article, pageparts.query, "h", slug);
                try {history.replaceState(null, "", newhash)} catch (_err) {window.location.hash = newhash}
                var url = window.location.origin + window.location.pathname + newhash;
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(url).catch(function () {});
                }
            }); h.appendChild(btn);
        });
    }
    function scrolltoheadingfromhash(scope) {
        var parts = parsedhash();
        var target = getqueryparam(parts.query, "h");
        if (!target) return;
        var el = document.getElementById(target);
        if (!el && scope) el = scope.querySelector("#" + CSS.escape(target));
        if (!el) return;
        try {el.scrollIntoView({ behavior: "smooth", block: "start" })} catch (_err) {el.scrollIntoView()}
    }
    function renderarticle(title, markdown, options) {
        options = options || {};
        var redirectedfrom = options.redirectedfrom || "";
        if (!contentroot) return;
        contentroot.innerHTML =
            maintitle.replace("$TITLE$", escapehtml(title)) +
            (redirectedfrom ? redirectnotice(redirectedfrom) : "") +
            markdowntohtml(markdown);
        if (window.Prism && typeof window.Prism.highlightAllUnder === "function") {
            window.Prism.highlightAllUnder(contentroot);
        }
        enhanceheadings(contentroot); bindexpandableimages(contentroot);
        bindmediafallbacks(contentroot); bindlocaldebuglinktrigger(contentroot);
        if (!localdebug) {updateallarticlelinkstates(contentroot)}
        var citeanchors = contentroot.querySelectorAll("[data-cite-target]");
        citeanchors.forEach(function (anchor) {
            anchor.addEventListener("click", function (e) {
                e.preventDefault();
                var targetid = anchor.getAttribute("data-cite-target");
                if (!targetid) return;
                var target = document.getElementById(targetid);
                if (!target) return;
                target.scrollIntoView({ behavior: "smooth", block: "center" });
            });
        });
    }
    async function loadarticlefromhash() {
        if (!contentroot) return;

        var parts = parsedhash();
        var hashval = parts.article || "Main Page";
        maybeNormalizeVisibleHash(parts);
        var normalizedhash = tonormalwidth(String(hashval || "")).replace(/_/g, " ").replace(/\s+/g, " ").trim();
        if (normalizedhash.toLowerCase() === "special:all pages") {
            setpagetitle("Special:All Pages");
            try {
                await window.WikiMisc.renderSpecialAllPages({
                    contentroot: contentroot,
                    maintitle: maintitle,
                    tonormalwidth: tonormalwidth,
                    escapehtml: escapehtml,
                    escapeattr: escapeattr,
                    wikilinktohash: wikilinktohash
                });
            } catch (_err) {
                contentroot.innerHTML =
                    maintitle.replace("$TITLE$", "Special:All Pages") +
                    '<p class="paragraph">Failed to load the full page list from GitHub right now. Please try again.</p>';
            }
            document.dispatchEvent(new CustomEvent("wiki:article-rendered", { detail: { hash: hashval } }));
            return;
        }
        var inheritedredirectfrom = "";
        if (pendingredirectnotice && pendingredirectnotice.target === hashval) {
            inheritedredirectfrom = pendingredirectnotice.from || "";
            pendingredirectnotice = null;
        }
        var art = getarticlecandidates(hashval);
        var res = await fetchfirstexisting(art.candidates);
        setpagetitle(art.hashtitle);

        // 404 text (not 404.html, just for nonexistent articles), feel free to adjust
        if (!res) {
            var isreservedmissing = hasreservedprefix(hashval);
            var missingtext = isreservedmissing
                ? '<p class="paragraph">There is currently no text in this page. <br>' +
                  'Please note that since this is a <b>reserved namespace</b> your edits won\'t be accepted unless you are a repository collaborator!'
                
                : '<p class="paragraph">There is currently no text in this page. ' +
                  'You can contribute by <a href="https://github.com/CtRHome/wiki/new/main/articles?filename=' + escapeattr(art.title) + '.md">creating it</a>!</p>';
            contentroot.innerHTML = maintitle.replace("$TITLE$", escapehtml(art.hashtitle)) + missingtext;
            document.dispatchEvent(new CustomEvent("wiki:article-rendered", { detail: { hash: hashval } }));
            return;
        }

        var redirectfrom = inheritedredirectfrom; var seen = {}; var maxredirects = 8;
        var currenthash = hashval; var currentarticle = art;
        var currentres = res;
        for (var r = 0; r < maxredirects; r++) {
            var redirect = parseredirect(currentres.markdown);
            if (!redirect) break;
            if (redirect.externalurl) {
                window.location.replace(redirect.externalurl);
                return;
            }
            if (!redirect.target) break;
            if (!redirectfrom) redirectfrom = currenthash;
            var targethash = String(redirect.target).replace(/_/g, " ").replace(/\s+/g, " ").trim();
            if (!targethash || seen[targethash]) break;
            seen[targethash] = true;
            pendingredirectnotice = {target: targethash, from: redirectfrom};

            currenthash = targethash;
            currentarticle = getarticlecandidates(currenthash);
            setpagetitle(currentarticle.hashtitle);
            window.location.replace("#" + encodeURIComponent(tonormalwidth(targethash)));
            var targetres = await fetchfirstexisting(currentarticle.candidates);
            if (!targetres) break;
            currentres = targetres;
        }
        renderarticle(currentarticle.hashtitle, currentres.markdown, { redirectedfrom: redirectfrom });
        scrolltoheadingfromhash(contentroot);
        document.dispatchEvent(new CustomEvent("wiki:article-rendered", { detail: { hash: currenthash } }));
    }

    window.WikiMarkdown = {
        markdowntohtml: markdowntohtml, renderarticle: renderarticle,
        normalizehash: normalizehash, displaytitlefrompagename: displaytitlefrompagename,
        getarticlecandidates: getarticlecandidates, fetchfirstexisting: fetchfirstexisting,
        loadarticlefromhash: loadarticlefromhash, hasblockededitprefix: hasblockededitprefix
    };

    window.addEventListener("hashchange", loadarticlefromhash);
    document.addEventListener("DOMContentLoaded", loadarticlefromhash);
})();