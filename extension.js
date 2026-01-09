const vscode = require("vscode");

const { buildStandardModel } = require("./src/model.js");
const { renderToSnippet } = require("./src/template.js");

let isApplying = false;

async function activate(context) {
    await resolveHideSuggestCommandId();
    context.subscriptions.push(
        vscode.commands.registerCommand("type", async (args) => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                await vscode.commands.executeCommand("default:type", args);
                return;
            }

            const cfg = vscode.workspace.getConfiguration();
            const enabled = cfg.get("customJsDoc.enable", false);
            if (!enabled) {
                await vscode.commands.executeCommand("default:type", args);
                return;
            }

            const doc = editor.document;
            if (!isJsDocument(doc)) {
                await vscode.commands.executeCommand("default:type", args);
                return;
            }

            if (isApplying) {
                await vscode.commands.executeCommand("default:type", args);
                return;
            }

            // Only Enter
            const isEnter = args && (args.text === "\n" || args.text === "\r\n");

            // before Enter
            const posBefore = editor.selection.active;
            const lineBefore = doc.lineAt(posBefore.line).text;

            const idx = lineBefore.lastIndexOf("/**", posBefore.character);
            const hasSlashStarStar = idx >= 0;
            const prefix = hasSlashStarStar ? lineBefore.slice(0, idx) : "";
            const between = hasSlashStarStar ? lineBefore.slice(idx + 3, posBefore.character) : "";

            const shouldTrigger =
                isEnter &&
                hasSlashStarStar &&
                prefix.trim().length === 0 && // only indent
                between.trim().length === 0; // no word after "/**"

            await vscode.commands.executeCommand("default:type", args);

            // hide suggest widget for 2 sec
            startSuppressIfJustCompletedJsDoc(editor);

            if (!shouldTrigger) {
                return;
            }

            await delay(0);

            const startLine = posBefore.line;
            const indent = prefix;
            const startPos = new vscode.Position(startLine, 0);

            const slashPos = new vscode.Position(startLine, idx);
            const triggerOffset = doc.offsetAt(slashPos);

            const endPos = findBlockCommentEndPosition(doc, startLine, 80) || editor.selection.active;
            const range = new vscode.Range(startPos, endPos);

            const model = buildStandardModel(doc, triggerOffset, cfg, { indent });

            const snippetText = renderToSnippet(model, cfg, { includeFirstIndent: true });

            isApplying = true;
            try {
                await editor.insertSnippet(new vscode.SnippetString(snippetText), range);
            } finally {
                isApplying = false;
            }
        })
    );
}

function deactivate() {}

/**
 * Check if the document is a Javasript or Javascriptreact
 * 
 * @param {*} doc 
 * @returns true: if the document is a Javascript or Javascriptreact
 */
function isJsDocument(doc) {
    if (doc.languageId === "javascript") {
        return true;
    }
    if (doc.languageId === "javascriptreact") {
        return true;
    }
    return false;
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function findBlockCommentEndPosition(doc, fromLine, maxDonwLines) {
    for (let j = 0; j <= maxDonwLines; j++) {
        const lineNo = fromLine + j;
        if (lineNo >= doc.lineCount) {
            break;
        }
        const text = doc.lineAt(lineNo).text;
        const idx = text.indexOf("*/");
        if (idx >= 0) {
            return new vscode.Position(lineNo, idx + 2);
        }
    }
    return null;
}

// ================================================
// START: hide or close suggest widget function
// ================================================
let hideSuggestCommandId = null;
let suppressTimer = null;
let suppressUntil = 0;

async function resolveHideSuggestCommandId() {
    const cmds = await vscode.commands.getCommands(true);

    const candidates = [
        "hideSuggestWidget",
        "closeSuggestWidget",
        "editor.action.hideSuggestWidget",
        "editor.action.closeSuggestWidget"
    ];

    for (const c of candidates) {
        if (cmds.includes(c)) {
            hideSuggestCommandId = c;
            return;
        }
    }
}

function startSuppressSuggest(ms) {
    suppressUntil = Date.now() + ms;

    if (suppressTimer) {
        return;
    }

    suppressTimer = setInterval(() => {
        if (Date.now() > suppressUntil) {
            clearInterval(suppressTimer);
            suppressTimer = null;
            return;
        }

        if (hideSuggestCommandId) {
            vscode.commands.executeCommand(hideSuggestCommandId);
        }
    }, 10);
}

function startSuppressIfJustCompletedJsDoc(editor) {
    const doc = editor.document;
    const pos = editor.selection.active;
    const line = doc.lineAt(pos.line).text;

    const before = line.slice(0, pos.character);

    if (before.endsWith("/**")) {
        if (hideSuggestCommandId) {
            vscode.commands.executeCommand(hideSuggestCommandId);
        }
        startSuppressSuggest(2000);
    }
}
// ================================================
// E N D: hide or close suggest widget function
// ================================================

module.exports = { activate, deactivate };