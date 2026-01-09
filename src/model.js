const { parseSource, findNextCallable, extractParams, hasReturnValue } = require("./parser.js");

function buildStandardModel(document, triggerOffset, cfg, opt) {
    const indent = (opt && typeof opt.indent === "string") ? opt.indent : "";

    const text = document.getText();
    const sourceFile = parseSource(text ,document.fileName);

    const next = findNextCallable(sourceFile, triggerOffset);

    const params = next ? extractParams(sourceFile, next.node) : [];
    const returnsExists = next ? hasReturnValue(sourceFile, next.node) : false;

    // Snippet placeholders:
    // 1: summary, 2..: param desc, then returns desc
    let ph = 1;
    const summary = "${" + ph + "}";
    ph += 1;

    const paramTags = [];
    for (const p of params) {
        const desc = "${" + ph + "}";
        ph += 1;

        paramTags.push({
            tag: "param",
            name: p.name,
            type: inferParamType(p), // any/array/...
            text: desc
        });
    }

    let returnTag = null;
    if (returnsExists) {
        const desc = "${" + ph + "}";
        ph += 1;
        
        returnTag = {
            tag: "returns",
            type: "*",
            text: desc
        };
    }

    // Option tag: author/version/since/customTags (do not display if value is empty)
    const metaTags = [];
    const customTagsOnly = [];

    const author = String(cfg.get("customJsDoc.author", "") || "").trim();
    if (author.length > 0) {
        metaTags.push({ tag: "author", text: author });
    }
    
    const version = String(cfg.get("customJsDoc.version", "") || "").trim();
    if (version.length > 0) {
        metaTags.push({ tag: "version", text: version });
    }

    const sinceFormat = String(cfg.get("customJsDoc.sinceFormat", "") || "").trim();
    if (sinceFormat.length > 0) {
        metaTags.push({ tag: "since", text: formatDate(new Date(), sinceFormat) });
    }

    const customTags = cfg.get("customJsDoc.customTags", []);
    if (Array.isArray(customTags)) {
        for (const t of customTags) {
            const tagName = (t && t.tag) ? String(t.tag).trim() : "";
            if (tagName.length < 1) {
                continue;
            }

            const type = (t && t.type) ? String(t.type).trim() : "";
            const text = (t && t.text) ? String(t.text) : "";

            const desc = "${" + ph + ":" + text + "}";
            ph += 1;

            customTagsOnly.push({
                tag: tagName,
                type,
                text: desc
            });
        }
    }

    const model = {
        kind: next ? next.info.kind : "unknown",
        name: next ? next.info.name : "",
        summary,
        paramTags,
        returnTag,
        metaTags,
        customTags: customTagsOnly,
        hasMainTags: (paramTags.length > 0) || !!returnTag,
        hasAnyTags: (paramTags.length > 0) || !!returnTag || (metaTags.length > 0) || (customTagsOnly.length > 0),
        indent,
        meta: {
            languageId: document.languageId,
            fileName: document.fileName
        }
    };

    return model;
}

function inferParamType(p) {
    if (p.rest) {
        return "any[]";
    }

    const name = String(p.name || "").toLowerCase();
    const init = String(p.initializerText || "").trim();

    // 1) infer param type based on default value
    if (init.length > 0) {
        if (/^[-]?\d+(\.\d+)?$/.test(init)) {
            return "number";
        }
        if (init === "true" || init === "false") {
            return "boolean";
        }
        if ((init.startsWith("'") && init.endsWith("'")) || (init.startsWith("\"") && init.endsWith("\""))) {
            return "string";
        }
        if (init.startsWith("[") && init.endsWith("]")) {
            return "any[]";
        }
        if (init.startsWith("{") && init.endsWith("}")) {
            return "object";
        }
        if (init === "null") {
            return "*";
        }
    }

    // 2) infer param type based on naming rule
    if (name.startsWith("is") || name.startsWith("has") || name.startsWith("use") || name.startsWith("can")) {
        return "boolean";
    }
    if (name.toLowerCase().endsWith("id") || name.toLowerCase().endsWith("no") || name.toLowerCase().endsWith("num")
        || name.toLowerCase().endsWith("count") || name.toLowerCase().endsWith("size")
        || name.toLowerCase().endsWith("length") || name.toLowerCase().endsWith("age")) {
        return "number";
    }
    if (name.toLowerCase().endsWith("name") || name.toLowerCase().endsWith("title") || name.toLowerCase().endsWith("type")
        || name.toLowerCase().endsWith("code") || name.toLowerCase().endsWith("key") || name.toLowerCase().endsWith("path")
        || name.toLowerCase().endsWith("url")) {
        return "string";
    }
    if (name.toLowerCase().endsWith("list") || name.toLowerCase().endsWith("array") || name.toLowerCase().endsWith("items")) {
        return "any[]";
    }
    if (name.toLowerCase().endsWith("map") || name.toLowerCase().endsWith("obj")
        || name.toLowerCase().endsWith("data") || name.toLowerCase().endsWith("params")) {
        return "object";
    }

    return "*";
}

// yyyy / MM / dd formats supported
function formatDate(d, fmt) {
    const yyyy = String(d.getFullYear());
    const MM = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");

    return fmt
        .replace(/yyyy/g, yyyy)
        .replace(/MM/g, MM)
        .replace(/dd/g, dd);
}

module.exports = { buildStandardModel };