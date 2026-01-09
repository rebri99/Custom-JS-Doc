const ts = require("typescript");

function parseSource(text, fileName) {
    return ts.createSourceFile(
        fileName || "file.js",
        text,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.JS
    );
}

function findNextCallable(sourceFile, offset) {
    let best = null;

    function consider(node, name, kind) {
        const start = node.getStart(sourceFile, false);
        if (start < offset) {
            return;
        }
        if (!best || start < best.start) {
            best = { node, start, info: { kind, name } };
        }
    }

    function visit(node) {
        // function foo() {}
        if (ts.isFunctionDeclaration(node) && node.name) {
            consider(node, node.name.getText(sourceFile), "function");
        }

        // class A { m() {} }
        if (ts.isMethodDeclaration(node) && node.name) {
            consider(node, node.name.getText(sourceFile), "method");
        }

        // const foo = () => {} / const foo = function() {}
        if (ts.isVariableDeclaration(node) && node.name && node.initializer) {
            const init = node.initializer;
            if (ts.isArrowFunction(init)) {
                consider(init, node.name.getText(sourceFile), "arrowFunction");
            }
            if (ts.isFunctionExpression(init)) {
                consider(init, node.name.getText(sourceFile), "functionExpression");
            }
        }

        // AngularJS support: $scope.foo = function() {}
        if (ts.isBinaryExpression(node) && node.operatorToken && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
            const right = node.right;
            const leftText = node.left.getText(sourceFile);

            if (ts.isArrowFunction(right)) {
                consider(right, leftText, "assignmentArrowFunction");
            }
            if (ts.isFunctionExpression(right)) {
                consider(right, leftText, "assignmentFunctionExpression");
            }
        }
        
        ts.forEachChild(node, visit);
    }

    visit(sourceFile);

    return best;
}

function extractParams(sourceFile, callableNode) {
    const params = [];

    const list = callableNode.parameters || [];
    for (const p of list) {
        const name = p.name.getText(sourceFile);
        const optional = Boolean(p.questionToken) || Boolean(p.initializer);
        const rest = Boolean(p.dotDotDotToken);

        // default value text: 123, "x", true, [], {}, null
        const initializerText = p.initializer ? p.initializer.getText(sourceFile) : "";

        params.push({
            name,
            optional,
            rest,
            initializerText
        });
    }

    return params;
}

function hasReturnValue(sourceFile, callableNode) {
    // ArrowFunction with expression body: (a) => a
    if (ts.isArrowFunction(callableNode) && callableNode.body && !ts.isBlock(callableNode.body)) {
        return true;
    }

    const body = callableNode.body;
    if (!body || !ts.isBlock(body)) {
        return false;
    }

    let found = false;

    function scan(node) {
        if (found) {
            return;
        }
        // return expr;
        if (ts.isReturnStatement(node) && node.expression) {
            found = true;
            return;
        }
        ts.forEachChild(node, scan);
    }

    scan(body);
    return found;
}

module.exports = {
    parseSource,
    findNextCallable,
    extractParams,
    hasReturnValue
};