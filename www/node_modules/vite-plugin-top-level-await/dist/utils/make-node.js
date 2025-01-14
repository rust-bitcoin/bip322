"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeIdentifier = makeIdentifier;
exports.makeVariablesDeclaration = makeVariablesDeclaration;
exports.makeVariableInitDeclaration = makeVariableInitDeclaration;
exports.makeStatement = makeStatement;
exports.makeAssignmentExpression = makeAssignmentExpression;
exports.makeAssignmentStatement = makeAssignmentStatement;
exports.makeImportSpecifier = makeImportSpecifier;
exports.makeArrayExpression = makeArrayExpression;
exports.makeTryCatchStatement = makeTryCatchStatement;
exports.makeArrowFunction = makeArrowFunction;
exports.makeParenthesisExpression = makeParenthesisExpression;
exports.makeCallExpression = makeCallExpression;
exports.makeReturnStatement = makeReturnStatement;
exports.makeMemberExpression = makeMemberExpression;
exports.makeExportListDeclaration = makeExportListDeclaration;
exports.makeAwaitExpression = makeAwaitExpression;
exports.makeImportDeclaration = makeImportDeclaration;
function span() {
    return { start: 0, end: 0, ctxt: 0 };
}
function makeIdentifier(name) {
    return {
        type: "Identifier",
        span: span(),
        // @ts-ignore SWC is missing the "ctxt" property's
        ctxt: 0,
        value: name,
        optional: false
    };
}
function makeVariablesDeclaration(names) {
    if (names.length === 0)
        return null;
    return {
        type: "VariableDeclaration",
        span: span(),
        // @ts-ignore SWC is missing the "ctxt" property's
        ctxt: 0,
        kind: "let",
        declare: false,
        declarations: names.map(name => ({
            type: "VariableDeclarator",
            span: span(),
            id: makeIdentifier(name),
            init: null,
            definite: false
        }))
    };
}
function makeVariableInitDeclaration(name, value) {
    return {
        type: "VariableDeclaration",
        span: span(),
        // @ts-ignore SWC is missing the "ctxt" property's
        ctxt: 0,
        kind: "let",
        declare: false,
        declarations: [
            {
                type: "VariableDeclarator",
                span: span(),
                id: makeIdentifier(name),
                init: value,
                definite: false
            }
        ]
    };
}
function makeStatement(expression) {
    return {
        type: "ExpressionStatement",
        span: span(),
        expression
    };
}
function makeAssignmentExpression(left, right) {
    return {
        type: "AssignmentExpression",
        span: span(),
        operator: "=",
        left,
        right
    };
}
function makeAssignmentStatement(left, right) {
    const assignmentExpression = makeAssignmentExpression(left, right);
    return makeStatement(left.type === "ObjectPattern" ? makeParenthesisExpression(assignmentExpression) : assignmentExpression);
}
function makeImportSpecifier(name, as) {
    return {
        type: "ImportSpecifier",
        span: span(),
        local: makeIdentifier(as),
        imported: as === name ? /* istanbul ignore next */ null : makeIdentifier(name),
        isTypeOnly: false
    };
}
function makeArrayExpression(items) {
    return {
        type: "ArrayExpression",
        span: span(),
        elements: items.map(item => ({
            spread: null,
            expression: item
        }))
    };
}
function makeTryCatchStatement(tryStatements, catchStatements) {
    return {
        type: "TryStatement",
        span: span(),
        block: {
            type: "BlockStatement",
            span: span(),
            // @ts-ignore SWC is missing the "ctxt" property's
            ctxt: 0,
            stmts: tryStatements
        },
        handler: {
            type: "CatchClause",
            span: span(),
            param: null,
            body: {
                type: "BlockStatement",
                span: span(),
                // @ts-ignore SWC is missing the "ctxt" property's
                ctxt: 0,
                stmts: catchStatements
            }
        },
        finalizer: null
    };
}
function makeArrowFunction(args, statements, async) {
    return {
        type: "ArrowFunctionExpression",
        span: span(),
        ctxt: 0,
        params: args.map(arg => ({
            type: "Identifier",
            span: span(),
            ctxt: 0,
            value: arg,
            optional: false
        })),
        body: {
            type: "BlockStatement",
            span: span(),
            // @ts-ignore SWC is missing the "ctxt" property's
            ctxt: 0,
            stmts: statements
        },
        async: !!async,
        generator: false,
        typeParameters: null,
        returnType: null
    };
}
function makeParenthesisExpression(expression) {
    return {
        type: "ParenthesisExpression",
        span: span(),
        expression
    };
}
function makeCallExpression(functionExpression, args) {
    return {
        type: "CallExpression",
        span: span(),
        // @ts-ignore SWC is missing the "ctxt" property's
        ctxt: 0,
        // Put IIFE's function expression in (parenthesis)
        callee: functionExpression.type === "FunctionExpression" || functionExpression.type === "ArrowFunctionExpression"
            ? makeParenthesisExpression(functionExpression)
            : functionExpression,
        arguments: (args !== null && args !== void 0 ? args : []).map(arg => ({
            spread: null,
            expression: arg
        })),
        typeArguments: null
    };
}
function makeReturnStatement(expression) {
    return {
        type: "ReturnStatement",
        span: span(),
        argument: expression
    };
}
function makeMemberExpression(object, member) {
    return {
        type: "MemberExpression",
        span: span(),
        object: typeof object === "string" ? makeIdentifier(object) : object,
        property: makeIdentifier(member)
    };
}
function makeExportListDeclaration(map) {
    return {
        type: "ExportNamedDeclaration",
        span: span(),
        specifiers: map.map(([exportName, identifier]) => ({
            type: "ExportSpecifier",
            span: span(),
            orig: makeIdentifier(identifier),
            exported: identifier === exportName ? null : makeIdentifier(exportName),
            isTypeOnly: false
        })),
        source: null,
        // @ts-ignore
        typeOnly: false,
        // @ts-ignore
        assets: null
    };
}
function makeAwaitExpression(expression) {
    return {
        type: "AwaitExpression",
        span: span(),
        argument: expression
    };
}
function makeImportDeclaration(source) {
    const importDeclaration = {
        type: "ImportDeclaration",
        specifiers: [],
        source,
        span: span(),
        typeOnly: false
    };
    return importDeclaration;
}
