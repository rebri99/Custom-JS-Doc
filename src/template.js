const Handlebars = require("handlebars");

function renderToSnippet(model, cfg, opt) {
    const includeFirstIndent = Boolean(opt && opt.includeFirstIndent);

    const templateText =
        "/**\n" +
        " * {{summary}}\n" +
        "{{#if hasAnyTags}}\n" +
        " * \n" +
        "{{/if}}" +
        "{{#each paramTags}}" +
        " * {{renderTag this}}\n" +
        "{{/each}}" +
        "{{#if returnTag}}" +
        " * \n" +
        " * {{renderTag returnTag}}\n" +
        "{{/if}}" +
        "{{#if metaTags.length}}" +
        "{{#if hasMainTags}}" +
        " * \n" +
        "{{/if}}" +
        "{{#each metaTags}}" +
        " * {{renderTag this}}\n" +
        "{{/each}}" +
        "{{/if}}" +
        "{{#if customTags.length}}" +
        " * \n" +
        "{{#each customTags}}" +
        " * {{renderTag this}}\n" +
        "{{/each}}" +
        "{{/if}}" +
        " */";

    const hb = Handlebars.create();

    hb.registerHelper("renderTag", (t) => {
        const tag = (t && t.tag) ? String(t.tag) : "tag";
        const type = (t && t.type) ? String(t.type) : "";
        const name = (t && t.name) ? String(t.name) : "";
        const text = (t && t.text) ? String(t.text) : "";

        if (tag === "param") {
            return `@param {${type || "*"}} ${name} ${text}`.trim();
        }
        if (tag === "returns") {
            return `@returns {${type || "*"}} ${text}`.trim();
        }
        if (tag === "author" || tag === "version" || tag === "since") {
            return `@${tag} ${text}`.trim();
        }

        // custom tag
        if (type && type.length > 0) {
            return `@${tag} {${type}} ${text}`.trim();
        }
        return `@${tag} ${text}`.trim();
    });

    const compiled = hb.compile(templateText, { noEscape: true });
    const raw0 = compiled(model);
    const raw = normalizedBlankLines(raw0);

    // indentation rules
    // - auto replace mode: indent all lines except the first line
    // - command mode: indent all lines including the first line
    const lines = raw.split("\n");
    const out = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (i === 0) {
            if (includeFirstIndent) {
                out.push(model.indent + line);
            } else {
                out.push(line);
            }
        } else {
            out.push(model.indent + line);
        }
    }

    // Put a line break after the comment to naturally move to the next line
    return out.join("\n");
}

function normalizedBlankLines(raw) {
    const lines = raw.split("\n");
    const out = [];

    let blankRun = 0;
    for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        const isBlankStar = /^\s*\*\s*$/.test(line); // like " *"

        // protect summary line
        if (isBlankStar) {
            blankRun += 1;
            if (blankRun >= 2) {
                continue;
            }
        } else {
            blankRun = 0;
        }
        out.push(line);
    }

    // remove line if remain last blank line ("*/" right above)
    while (out.length >= 2) {
        const last = out[out.length - 1];
        const prev = out[out.length - 2];
        if (last.trim() === "*/" && /^\s*\*\s*$/.test(prev)) {
            out.splice(out.length - 2, 1);
            continue;
        }
        break;
    }

    return out.join("\n");
}

module.exports = { renderToSnippet };