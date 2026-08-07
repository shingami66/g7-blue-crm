import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import ts from "typescript";

const REPO_ROOT = join(import.meta.dirname, "../../..");
const INVOICE_PDF = join(
  REPO_ROOT,
  "src/app/(dashboard)/invoices/[id]/pdf/page.tsx",
);
const INVOICE_TYPES = join(REPO_ROOT, "src/lib/invoices/types.ts");
const QUOTATION_TYPES = join(REPO_ROOT, "src/lib/quotations/types.ts");
const INVOICE_SNAPSHOTS = join(REPO_ROOT, "src/lib/invoices/snapshots.ts");
const GLOBAL_CSS = join(REPO_ROOT, "src/app/globals.css");

const FORBIDDEN_FIELD_NAMES = new Set([
  "details",
  "snapshot_document_rules",
  "notes",
  "terms",
]);
const FORBIDDEN_DISCLOSURE_PATTERNS = [
  "prepared by",
  "system generated",
  "system generated document",
  "generated document disclosure",
] as const;
const INTERNAL_IDENTITY = /^(?:currentUser|auth|clerkClient|clerk|creator|createdBy|created_by|preparedBy|prepared_by|internalUserId|internal_user_id|internalAccount|accountUser|employee(?:Id)?|userId)$/i;

function read(path: string) {
  return readFileSync(path, "utf8");
}

function getInvoiceTemplate(source: string) {
  const start = source.lastIndexOf("return (");
  assert.notEqual(start, -1, "Invoice PDF return block must exist");
  return source.slice(start);
}

function sourceLocation(source: ts.SourceFile, node: ts.Node) {
  const { line, character } = source.getLineAndCharacterOfPosition(node.getStart(source));
  return `${line + 1}:${character + 1}`;
}

function normalizeCustomerVisibleText(text: string) {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\p{P}\p{S}\s]+/gu, " ")
    .trim();
}

function protectedDisclosure(text: string) {
  const normalized = normalizeCustomerVisibleText(text);
  return FORBIDDEN_DISCLOSURE_PATTERNS.find((pattern) => normalized.includes(pattern)) ?? null;
}

type StaticKey = string | number;

type LexicalBinding = {
  declaration: ts.VariableDeclaration;
  isConst: boolean;
};

function isFunctionLikeScope(node: ts.Node): node is ts.FunctionLikeDeclaration {
  return ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node) || ts.isMethodDeclaration(node) || ts.isConstructorDeclaration(node) || ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node);
}

function isLexicalScope(node: ts.Node) {
  return ts.isSourceFile(node) || ts.isBlock(node) || ts.isCaseBlock(node) || ts.isCatchClause(node) || ts.isForStatement(node) || ts.isForInStatement(node) || ts.isForOfStatement(node) || isFunctionLikeScope(node);
}

function variableDeclarationList(node: ts.VariableDeclaration) {
  return ts.isVariableDeclarationList(node.parent) ? node.parent : null;
}

function isConstDeclaration(node: ts.VariableDeclaration) {
  const list = variableDeclarationList(node);
  return Boolean(list && (list.flags & ts.NodeFlags.Const) !== 0);
}

function isBlockScopedDeclaration(node: ts.VariableDeclaration) {
  const list = variableDeclarationList(node);
  return Boolean(list && (list.flags & (ts.NodeFlags.Const | ts.NodeFlags.Let)) !== 0);
}

function declarationScope(node: ts.VariableDeclaration): ts.Node | null {
  for (let parent: ts.Node | undefined = node.parent; parent; parent = parent.parent) {
    if (isFunctionLikeScope(parent) || ts.isSourceFile(parent)) {
      return parent;
    }

    if (isBlockScopedDeclaration(node) && (ts.isBlock(parent) || ts.isCaseBlock(parent) || ts.isCatchClause(parent) || ts.isForStatement(parent) || ts.isForInStatement(parent) || ts.isForOfStatement(parent))) {
      return parent;
    }
  }

  return null;
}

function scopeBindings(scope: ts.Node, name: string): LexicalBinding[] {
  const bindings: LexicalBinding[] = [];

  if (isFunctionLikeScope(scope)) {
    for (const parameter of scope.parameters) {
      if (ts.isIdentifier(parameter.name) && parameter.name.text === name) {
        bindings.push({ declaration: parameter as unknown as ts.VariableDeclaration, isConst: false });
      }
    }
  }

  if (ts.isCatchClause(scope) && scope.variableDeclaration && ts.isIdentifier(scope.variableDeclaration.name) && scope.variableDeclaration.name.text === name) {
    bindings.push({ declaration: scope.variableDeclaration as unknown as ts.VariableDeclaration, isConst: false });
  }

  const visit = (node: ts.Node): void => {
    if (node !== scope && isFunctionLikeScope(node)) {
      return;
    }

    if (node !== scope && isLexicalScope(node) && !ts.isSourceFile(scope) && !isFunctionLikeScope(scope)) {
      return;
    }

    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name && declarationScope(node) === scope) {
      bindings.push({ declaration: node, isConst: isConstDeclaration(node) });
    }

    ts.forEachChild(node, visit);
  };

  visit(scope);
  return bindings;
}

function visibleConstBinding(node: ts.Identifier): ts.VariableDeclaration | null {
  for (let parent: ts.Node | undefined = node; parent; parent = parent.parent) {
    if (!isLexicalScope(parent)) {
      continue;
    }

    const bindings = scopeBindings(parent, node.text);
    if (bindings.length === 0) {
      continue;
    }

    if (bindings.length !== 1) {
      return null;
    }

    const binding = bindings[0];
    if (!binding.isConst || !binding.declaration.initializer || binding.declaration.getStart() >= node.getStart()) {
      return null;
    }

    return binding.declaration;
  }

  return null;
}

function resolveStaticKey(node: ts.Expression, resolving = new Set<ts.VariableDeclaration>()): StaticKey | null {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }

  if (ts.isNumericLiteral(node)) {
    return Number(node.text);
  }

  if (ts.isIdentifier(node)) {
    const binding = visibleConstBinding(node);
    if (!binding || resolving.has(binding)) {
      return null;
    }

    resolving.add(binding);
    const value = resolveStaticKey(binding.initializer!, resolving);
    resolving.delete(binding);
    return value;
  }

  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isTypeAssertionExpression(node) || ts.isSatisfiesExpression(node)) {
    return resolveStaticKey(node.expression, resolving);
  }

  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const left = resolveStaticKey(node.left, resolving);
    const right = resolveStaticKey(node.right, resolving);
    return typeof left === "string" && typeof right === "string" ? `${left}${right}` : null;
  }

  return null;
}

function propertyName(node: ts.PropertyName) {
  if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }

  return null;
}
function hasOnlySafeStaticCalls(
  source: ts.SourceFile,
  functionName: string,
  parameterIndex: number,
) {
  let calls = 0;
  let allCallsAreSafe = true;

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === functionName) {
      calls += 1;
      const key = node.arguments[parameterIndex] && resolveStaticKey(node.arguments[parameterIndex]);
      if (typeof key !== "string" || FORBIDDEN_FIELD_NAMES.has(key)) {
        allCallsAreSafe = false;
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(source);
  return calls > 0 && allCallsAreSafe;
}

function isSafeStaticParameterAccess(
  source: ts.SourceFile,
  node: ts.ElementAccessExpression,
) {
  const argument = node.argumentExpression;
  if (!argument || !ts.isIdentifier(argument)) {
    return false;
  }

  let parent: ts.Node | undefined = node.parent;
  while (parent && !ts.isFunctionDeclaration(parent)) {
    parent = parent.parent;
  }

  if (!parent?.name) {
    return false;
  }

  const parameterIndex = parent.parameters.findIndex(
    (parameter) => ts.isIdentifier(parameter.name) && parameter.name.text === argument.text,
  );
  return parameterIndex >= 0 && hasOnlySafeStaticCalls(source, parent.name.text, parameterIndex);
}

function literalText(node: ts.Node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isJsxText(node)) {
    return node.text;
  }

  if (ts.isTemplateExpression(node)) {
    return [node.head.text, ...node.templateSpans.map((span) => span.literal.text)].join(" ");
  }

  return null;
}

function findForbiddenCustomerOutput(sourceText: string) {
  const source = ts.createSourceFile(
    "invoice-pdf-page.tsx",
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const parseDiagnostics = (source as ts.SourceFile & {
    parseDiagnostics: readonly ts.DiagnosticWithLocation[];
  }).parseDiagnostics;
  if (parseDiagnostics.length > 0) {
    const diagnostics = parseDiagnostics.map((diagnostic) => {
      const { line, character } = source.getLineAndCharacterOfPosition(diagnostic.start ?? 0);
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
      return `TS${diagnostic.code} at ${line + 1}:${character + 1}: ${message}`;
    });
    throw new Error(`Invoice PDF source could not be parsed:\n${diagnostics.join("\n")}`);
  }

  const findings: string[] = [];
  const report = (node: ts.Node, message: string) => {
    findings.push(`${message} at ${sourceLocation(source, node)}`);
  };

  const visit = (node: ts.Node): void => {
    if (ts.isPropertyAccessExpression(node)) {
      const name = node.name.text;
      if (FORBIDDEN_FIELD_NAMES.has(name)) {
        report(node, `forbidden field access: ${name}`);
      }
    }

    if (ts.isElementAccessExpression(node) && node.argumentExpression) {
      const key = resolveStaticKey(node.argumentExpression);
      if (typeof key === "string" && FORBIDDEN_FIELD_NAMES.has(key)) {
        report(node, `forbidden bracket access: ${key}`);
      } else if (key === null && !isSafeStaticParameterAccess(source, node)) {
        report(node, "unresolved computed property access");
      }
    }

    if (ts.isBindingElement(node)) {
      const name = node.propertyName ? propertyName(node.propertyName) : node.name.getText(source);
      if (name && FORBIDDEN_FIELD_NAMES.has(name)) {
        report(node, `forbidden destructured field: ${name}`);
      }
    }

    if (ts.isIdentifier(node) && INTERNAL_IDENTITY.test(node.text)) {
      report(node, `forbidden internal identity access: ${node.text}`);
    }

    const text = literalText(node);
    const disclosure = text && protectedDisclosure(text);
    if (disclosure) {
      report(node, `forbidden system disclosure: ${disclosure}`);
    }

    ts.forEachChild(node, visit);
  };

  visit(source);
  return findings;
}

function assertNoForbiddenCustomerOutput(sourceText: string) {
  assert.deepEqual(
    findForbiddenCustomerOutput(sourceText),
    [],
    "Invoice PDF must not access internal fields or render internal system disclosures",
  );
}

type SummaryConcept =
  | "approvedQuotationTotal"
  | "previousInvoices"
  | "depositAmount"
  | "finalAmountDue"
  | "totalAmount"
  | "taxVat"
  | "amountPaid"
  | "balanceDue";

type SummaryRegion = {
  location: string;
  concepts: Set<SummaryConcept>;
};

type LocalCallable = ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction;

type LocalSymbols = {
  callables: Map<string, LocalCallable | null>;
  aliases: Map<string, string>;
  names: Set<string>;
};

const SYNTHETIC_TYPE_DECLARATIONS = `
declare namespace JSX {
  interface Element {}
  interface IntrinsicElements { [elementName: string]: unknown }
}
interface PromiseLike<T> { then<TResult>(onfulfilled: (value: T) => TResult | PromiseLike<TResult>): PromiseLike<TResult> }
interface Promise<T> extends PromiseLike<T> {}
type ReactNode = object | string | number | bigint | boolean | null | undefined;
`;

function parseTsx(sourceText: string, fileName: string) {
  const parsed = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const parseDiagnostics = (parsed as ts.SourceFile & {
    parseDiagnostics: readonly ts.DiagnosticWithLocation[];
  }).parseDiagnostics;
  if (parseDiagnostics.length > 0) {
    const diagnostics = parseDiagnostics.map((diagnostic) => {
      const { line, character } = parsed.getLineAndCharacterOfPosition(diagnostic.start ?? 0);
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
      return `TS${diagnostic.code} at ${line + 1}:${character + 1}: ${message}`;
    });
    throw new Error(`${fileName} could not be parsed:\n${diagnostics.join("\n")}`);
  }

  const checkerFileName = fileName === INVOICE_PDF
    ? INVOICE_PDF
    : join(REPO_ROOT, "__invoice-pdf-contract-fixture.tsx");
  const checkerText = fileName === INVOICE_PDF
    ? sourceText
    : `${sourceText}\n${SYNTHETIC_TYPE_DECLARATIONS}`;
  const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.Preserve,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.ReactJSX,
    strict: true,
    skipLibCheck: true,
    noEmit: true,
    baseUrl: REPO_ROOT,
    paths: { "@/*": ["src/*"] },
  };
  const host = ts.createCompilerHost(compilerOptions, true);
  const defaultReadFile = host.readFile.bind(host);
  const defaultFileExists = host.fileExists.bind(host);
  const defaultGetSourceFile = host.getSourceFile.bind(host);
  const isCheckerFile = (candidate: string) =>
    ts.sys.resolvePath(candidate).replace(/\\/g, "/").toLowerCase() ===
    ts.sys.resolvePath(checkerFileName).replace(/\\/g, "/").toLowerCase();
  host.readFile = (candidate) => isCheckerFile(candidate) ? checkerText : defaultReadFile(candidate);
  host.fileExists = (candidate) => isCheckerFile(candidate) || defaultFileExists(candidate);
  host.getSourceFile = (candidate, languageVersion, onError, shouldCreateNewSourceFile) =>
    isCheckerFile(candidate)
      ? ts.createSourceFile(candidate, checkerText, languageVersion, true, ts.ScriptKind.TSX)
      : defaultGetSourceFile(candidate, languageVersion, onError, shouldCreateNewSourceFile);
  const program = ts.createProgram({ rootNames: [checkerFileName], options: compilerOptions, host });
  const source = program.getSourceFile(checkerFileName) ?? program.getSourceFiles().find(
    (candidate) => isCheckerFile(candidate.fileName),
  );
  assert.ok(source, `TypeScript checker could not load ${fileName}`);
  return { source, checker: program.getTypeChecker() };
}

function unwrapExpression(node: ts.Expression): ts.Expression {
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isTypeAssertionExpression(node) || ts.isSatisfiesExpression(node) || ts.isNonNullExpression(node)) {
    return unwrapExpression(node.expression);
  }

  return node;
}

function buildLocalSymbols(source: ts.SourceFile): LocalSymbols {
  const callables = new Map<string, LocalCallable | null>();
  const aliases = new Map<string, string>();
  const names = new Set<string>();

  const add = (name: string, callable: LocalCallable | null, alias?: string) => {
    if (names.has(name)) {
      callables.set(name, null);
      aliases.delete(name);
      return;
    }
    names.add(name);
    callables.set(name, callable);
    if (alias) {
      aliases.set(name, alias);
    }
  };

  const visit = (node: ts.Node): void => {
    if (ts.isFunctionDeclaration(node) && node.name) {
      add(node.name.text, node);
    }

    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      const initializer = node.initializer ? unwrapExpression(node.initializer) : null;
      add(
        node.name.text,
        initializer && (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer))
          ? initializer
          : null,
        initializer && ts.isIdentifier(initializer) ? initializer.text : undefined,
      );
    }

    ts.forEachChild(node, visit);
  };

  visit(source);
  return { callables, aliases, names };
}

function returnExpressions(callable: LocalCallable) {
  if (ts.isArrowFunction(callable) && !ts.isBlock(callable.body)) {
    return [callable.body];
  }

  const expressions: ts.Expression[] = [];
  if (!callable.body) {
    return expressions;
  }
  const visit = (node: ts.Node): void => {
    if (node !== callable && isFunctionLikeScope(node)) {
      return;
    }

    if (ts.isReturnStatement(node) && node.expression) {
      expressions.push(node.expression);
      return;
    }

    ts.forEachChild(node, visit);
  };

  visit(callable.body);
  return expressions;
}

function findInvoiceRenderEntry(source: ts.SourceFile, symbols: LocalSymbols) {
  const preferred = symbols.callables.get("InvoicePdfPage") ?? symbols.callables.get("Page");
  if (preferred) {
    return preferred;
  }

  for (const callable of symbols.callables.values()) {
    if (callable && returnExpressions(callable).some((expression) => ts.isJsxElement(expression) || ts.isJsxFragment(expression))) {
      return callable;
    }
  }

  throw new Error("Invoice PDF source must expose a local returned JSX entrypoint");
}

type RenderContext = {
  source: ts.SourceFile;
  checker: ts.TypeChecker;
  symbols: LocalSymbols;
  resolvingCallables: Set<LocalCallable>;
  resolvingNames: Set<string>;
  containers: Set<ts.JsxElement | ts.JsxFragment>;
};

function typeAt(node: ts.Node, context: RenderContext) {
  try {
    return context.checker.getTypeAtLocation(node);
  } catch {
    throw new Error(`Invoice summary detector could not inspect rendered expression type at ${sourceLocation(context.source, node)}`);
  }
}

function isTextSafePrimitiveType(type: ts.Type): boolean {
  if (type.isUnion()) {
    return type.types.length > 0 && type.types.every(isTextSafePrimitiveType);
  }

  const allowed =
    ts.TypeFlags.StringLike |
    ts.TypeFlags.NumberLike |
    ts.TypeFlags.BigIntLike |
    ts.TypeFlags.BooleanLike |
    ts.TypeFlags.Null |
    ts.TypeFlags.Undefined;
  return (type.flags & allowed) !== 0 && (type.flags & ~allowed) === 0;
}

function hasUnresolvedType(type: ts.Type) {
  return Boolean(type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown | ts.TypeFlags.TypeParameter));
}

function visibleRuntimeBinding(node: ts.Identifier) {
  for (let parent: ts.Node | undefined = node; parent; parent = parent.parent) {
    if (!isLexicalScope(parent)) {
      continue;
    }

    const bindings = scopeBindings(parent, node.text);
    if (bindings.length === 0) {
      continue;
    }

    if (bindings.length !== 1 || bindings[0].declaration.getStart() >= node.getStart()) {
      return null;
    }

    return bindings[0];
  }

  return null;
}

function isInsideNoPrint(node: ts.Node) {
  for (let parent: ts.Node | undefined = node.parent; parent; parent = parent.parent) {
    if (!ts.isJsxElement(parent)) {
      continue;
    }

    const className = parent.openingElement.attributes.properties.find(
      (attribute): attribute is ts.JsxAttribute =>
        ts.isJsxAttribute(attribute) &&
        ts.isIdentifier(attribute.name) &&
        attribute.name.text === "className",
    );
    const initializer = className?.initializer;
    const value =
      initializer && ts.isStringLiteral(initializer)
        ? initializer.text
        : initializer && ts.isJsxExpression(initializer) && initializer.expression
          ? literalText(initializer.expression)
          : null;
    if (value?.split(/\s+/).includes("no-print")) {
      return true;
    }
  }

  return false;
}

function isKnownPrimitiveParameter(binding: LexicalBinding) {
  const declaration = binding.declaration as unknown as ts.Node;
  if (!ts.isParameter(declaration)) {
    return false;
  }

  const callback = declaration.parent;
  const call = callback.parent;
  if (
    (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback)) &&
    ts.isCallExpression(call) &&
    ts.isPropertyAccessExpression(call.expression) &&
    (call.expression.name.text === "map" || call.expression.name.text === "flatMap") &&
    callback.parameters.indexOf(declaration) === 1
  ) {
    return true;
  }

  const primitiveType = (type: ts.TypeNode): boolean => {
    if (ts.isUnionTypeNode(type)) {
      return type.types.every(primitiveType);
    }
    if (ts.isLiteralTypeNode(type)) {
      return (
        type.literal.kind === ts.SyntaxKind.NullKeyword ||
        type.literal.kind === ts.SyntaxKind.TrueKeyword ||
        type.literal.kind === ts.SyntaxKind.FalseKeyword ||
        ts.isStringLiteral(type.literal) ||
        ts.isNumericLiteral(type.literal)
      );
    }
    return [
      ts.SyntaxKind.StringKeyword,
      ts.SyntaxKind.NumberKeyword,
      ts.SyntaxKind.BooleanKeyword,
      ts.SyntaxKind.UndefinedKeyword,
    ].includes(type.kind);
  };
  return Boolean(declaration.type && primitiveType(declaration.type));
}

function hasStringTypeGuard(node: ts.Identifier) {
  let callable: ts.FunctionLikeDeclaration | null = null;
  for (let parent: ts.Node | undefined = node.parent; parent; parent = parent.parent) {
    if (isFunctionLikeScope(parent)) {
      callable = parent;
      break;
    }
  }
  if (!callable?.body) {
    return false;
  }

  let guarded = false;
  const visit = (candidate: ts.Node): void => {
    if (guarded || (candidate !== callable && isFunctionLikeScope(candidate))) {
      return;
    }
    if (
      ts.isBinaryExpression(candidate) &&
      [ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.EqualsEqualsEqualsToken].includes(candidate.operatorToken.kind)
    ) {
      const pairs = [
        [candidate.left, candidate.right],
        [candidate.right, candidate.left],
      ] as const;
      guarded = pairs.some(
        ([left, right]) =>
          ts.isTypeOfExpression(left) &&
          ts.isIdentifier(left.expression) &&
          left.expression.text === node.text &&
          ts.isStringLiteral(right) &&
          right.text === "string",
      );
    }
    ts.forEachChild(candidate, visit);
  };
  visit(callable.body);
  return guarded;
}

function isKnownPrimitiveMethodReceiver(node: ts.Expression, method: string) {
  if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "Date") {
    return method === "toLocaleDateString" || method === "toLocaleString";
  }
  if (!ts.isIdentifier(node)) {
    return false;
  }
  const binding = visibleRuntimeBinding(node);
  return Boolean(
    binding &&
    (
      isKnownPrimitiveParameter(binding) ||
      (method === "trim" && hasStringTypeGuard(node))
    ),
  );
}

function resolveLocalCallable(
  name: string,
  context: RenderContext,
  resolvingBindings: Set<ts.VariableDeclaration>,
  node: ts.Node,
): string[] {
  const fail = (message: string): never => {
    throw new Error(`${message} at ${sourceLocation(context.source, node)}`);
  };
  if (!context.symbols.names.has(name)) {
    if (isInsideNoPrint(node)) {
      return [];
    }
    return fail(`Invoice summary detector could not resolve rendered component or helper: ${name}`);
  }

  if (context.resolvingNames.has(name)) {
    return fail(`Invoice summary detector detected a local rendered-output alias cycle: ${name}`);
  }

  const alias = context.symbols.aliases.get(name);
  if (alias) {
    if (!context.symbols.names.has(alias)) {
      return fail(`Invoice summary detector could not resolve local rendered output: ${name}`);
    }
    context.resolvingNames.add(name);
    const texts = resolveLocalCallable(alias, context, resolvingBindings, node);
    context.resolvingNames.delete(name);
    return texts;
  }

  const callable = context.symbols.callables.get(name);
  if (!callable) {
    return fail(`Invoice summary detector could not resolve local rendered output: ${name}`);
  }
  if (context.resolvingCallables.has(callable)) {
    return fail(`Invoice summary detector detected a local rendered-output cycle: ${name}`);
  }

  context.resolvingCallables.add(callable);
  const texts = returnExpressions(callable).flatMap((expression) =>
    renderedStaticTexts(expression, context, resolvingBindings),
  );
  context.resolvingCallables.delete(callable);
  return texts;
}

function memberKey(node: ts.PropertyAccessExpression | ts.ElementAccessExpression): StaticKey | null {
  return ts.isPropertyAccessExpression(node)
    ? node.name.text
    : node.argumentExpression
      ? resolveStaticKey(node.argumentExpression)
      : null;
}

function objectPropertyKey(name: ts.PropertyName): StaticKey | null {
  return ts.isComputedPropertyName(name) ? resolveStaticKey(name.expression) : propertyName(name);
}

function resolveLocalObjectExpression(
  node: ts.Expression,
  context: RenderContext,
  resolvingBindings: Set<ts.VariableDeclaration>,
): ts.Expression | null {
  const expression = unwrapExpression(node);
  if (ts.isObjectLiteralExpression(expression)) {
    return expression;
  }
  if (ts.isIdentifier(expression)) {
    const binding = visibleConstBinding(expression);
    if (!binding || !binding.initializer) {
      return null;
    }
    if (resolvingBindings.has(binding)) {
      throw new Error(`Invoice summary detector detected a rendered binding cycle: ${expression.text} at ${sourceLocation(context.source, expression)}`);
    }
    resolvingBindings.add(binding);
    const resolved = resolveLocalObjectExpression(binding.initializer, context, resolvingBindings);
    resolvingBindings.delete(binding);
    return resolved;
  }
  if (ts.isPropertyAccessExpression(expression) || ts.isElementAccessExpression(expression)) {
    const member = resolveLocalMember(expression, context, resolvingBindings);
    return member ? resolveLocalObjectExpression(member, context, resolvingBindings) : null;
  }
  return null;
}

function resolveLocalMember(
  node: ts.PropertyAccessExpression | ts.ElementAccessExpression,
  context: RenderContext,
  resolvingBindings: Set<ts.VariableDeclaration>,
): ts.Expression | null {
  const key = memberKey(node);
  if (key === null) {
    return null;
  }
  const object = resolveLocalObjectExpression(node.expression, context, resolvingBindings);
  if (!object || !ts.isObjectLiteralExpression(object)) {
    return null;
  }

  const matches = object.properties.filter((property) => {
    if (ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property)) {
      return objectPropertyKey(property.name) === key;
    }
    return false;
  });
  if (matches.length !== 1) {
    if (matches.length > 1) {
      throw new Error(`Invoice summary detector could not resolve duplicate local member ${String(key)} at ${sourceLocation(context.source, node)}`);
    }
    return null;
  }

  const [property] = matches;
  if (ts.isPropertyAssignment(property)) {
    return property.initializer;
  }
  return property.name && ts.isIdentifier(property.name) ? property.name : null;
}

function renderedStaticTexts(
  node: ts.Node,
  context: RenderContext,
  resolvingBindings = new Set<ts.VariableDeclaration>(),
): string[] {
  const fail = (message: string): never => {
    throw new Error(`${message} at ${sourceLocation(context.source, node)}`);
  };
  if (ts.isTemplateExpression(node)) {
    return [
      node.head.text,
      ...node.templateSpans.flatMap((span) => [
        ...renderedStaticTexts(span.expression, context, resolvingBindings),
        span.literal.text,
      ]),
    ];
  }
  const text = literalText(node);
  if (text !== null) {
    return [text];
  }

  if (
    ts.isNumericLiteral(node) ||
    node.kind === ts.SyntaxKind.TrueKeyword ||
    node.kind === ts.SyntaxKind.FalseKeyword ||
    node.kind === ts.SyntaxKind.NullKeyword
  ) {
    return [];
  }

  if (ts.isIdentifier(node)) {
    if (node.text === "undefined") {
      return [];
    }
    const binding = visibleConstBinding(node);
    if (!binding || !binding.initializer) {
      const runtimeBinding = visibleRuntimeBinding(node);
      if (runtimeBinding && isKnownPrimitiveParameter(runtimeBinding)) {
        return [];
      }
      if (context.symbols.names.has(node.text)) {
        return resolveLocalCallable(node.text, context, resolvingBindings, node);
      }
      return fail(`Invoice summary detector could not resolve rendered identifier: ${node.text}`);
    }
    if (resolvingBindings.has(binding)) {
      return fail(`Invoice summary detector detected a rendered binding cycle: ${node.text}`);
    }
    const initializer = unwrapExpression(binding.initializer);
    resolvingBindings.add(binding);
    const texts = renderedStaticTexts(initializer, context, resolvingBindings);
    resolvingBindings.delete(binding);
    return texts;
  }

  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isTypeAssertionExpression(node) || ts.isSatisfiesExpression(node) || ts.isNonNullExpression(node)) {
    return renderedStaticTexts(node.expression, context, resolvingBindings);
  }

  if (ts.isConditionalExpression(node)) {
    return [
      ...renderedStaticTexts(node.whenTrue, context, resolvingBindings),
      ...renderedStaticTexts(node.whenFalse, context, resolvingBindings),
    ];
  }

  if (ts.isBinaryExpression(node)) {
    if (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
      return renderedStaticTexts(node.right, context, resolvingBindings);
    }

    if (
      node.operatorToken.kind !== ts.SyntaxKind.PlusToken &&
      node.operatorToken.kind !== ts.SyntaxKind.BarBarToken &&
      node.operatorToken.kind !== ts.SyntaxKind.QuestionQuestionToken
    ) {
      return fail(`Invoice summary detector encountered unsupported rendered binary expression: ${node.getText(context.source)}`);
    }

    return [
      ...renderedStaticTexts(node.left, context, resolvingBindings),
      ...renderedStaticTexts(node.right, context, resolvingBindings),
    ];
  }

  if (ts.isJsxExpression(node)) {
    return node.expression ? renderedStaticTexts(node.expression, context, resolvingBindings) : [];
  }

  if (ts.isJsxElement(node) || ts.isJsxFragment(node)) {
    context.containers.add(node);
    const children = node.children.flatMap((child) => renderedStaticTexts(child, context, resolvingBindings));
    if (ts.isJsxElement(node)) {
      const tagName = node.openingElement.tagName;
      if (ts.isIdentifier(tagName) && /^[A-Z]/.test(tagName.text)) {
        return [...resolveLocalCallable(tagName.text, context, resolvingBindings, tagName), ...children];
      }
      if (!ts.isIdentifier(tagName)) {
        return fail(`Invoice summary detector could not resolve rendered member component: ${tagName.getText(context.source)}`);
      }
    }
    return children;
  }

  if (ts.isJsxSelfClosingElement(node)) {
    if (ts.isIdentifier(node.tagName)) {
      return /^[A-Z]/.test(node.tagName.text) ? resolveLocalCallable(node.tagName.text, context, resolvingBindings, node.tagName) : [];
    }
    return fail(`Invoice summary detector could not resolve rendered member component: ${node.tagName.getText(context.source)}`);
  }

  if (ts.isArrayLiteralExpression(node)) {
    return node.elements.flatMap((element) =>
      ts.isSpreadElement(element) ? renderedStaticTexts(element.expression, context, resolvingBindings) : renderedStaticTexts(element, context, resolvingBindings),
    );
  }

  const inspectCreateElement = (call: ts.CallExpression) => {
    const target = call.arguments[0];
    if (!target) {
      return fail("Invoice summary detector could not resolve createElement target");
    }
    const children = call.arguments.slice(2).flatMap((child) =>
      renderedStaticTexts(child, context, resolvingBindings),
    );
    if (ts.isStringLiteral(target) || ts.isNoSubstitutionTemplateLiteral(target)) {
      return children;
    }
    if (ts.isIdentifier(target)) {
      if (target.text === "Fragment") {
        return children;
      }
      return [...resolveLocalCallable(target.text, context, resolvingBindings, target), ...children];
    }
    if (
      ts.isPropertyAccessExpression(target) &&
      ts.isIdentifier(target.expression) &&
      target.expression.text === "React" &&
      target.name.text === "Fragment"
    ) {
      return children;
    }
    return fail(`Invoice summary detector could not resolve createElement target: ${target.getText(context.source)}`);
  };

  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
    if (node.expression.text === "createElement") {
      return inspectCreateElement(node);
    }
    return resolveLocalCallable(node.expression.text, context, resolvingBindings, node.expression);
  }

  if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
    const method = node.expression.name.text;
    if (
      method === "createElement" &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === "React"
    ) {
      return inspectCreateElement(node);
    }
    if (method === "map" || method === "flatMap") {
      const callback = node.arguments[0];
      if (callback && (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))) {
        return returnExpressions(callback).flatMap((expression) => renderedStaticTexts(expression, context, resolvingBindings));
      }
      if (callback && ts.isIdentifier(callback)) {
        return resolveLocalCallable(callback.text, context, resolvingBindings, callback);
      }
      throw new Error("Invoice summary detector could not resolve rendered map callback");
    }

    if (
      ["toLocaleString", "toLocaleDateString", "trim"].includes(method) &&
      isKnownPrimitiveMethodReceiver(node.expression.expression, method)
    ) {
      return [];
    }

    const localMember = resolveLocalMember(node.expression, context, resolvingBindings);
    if (localMember) {
      const member = unwrapExpression(localMember);
      if (ts.isIdentifier(member)) {
        return resolveLocalCallable(member.text, context, resolvingBindings, member);
      }
      if (ts.isArrowFunction(member) || ts.isFunctionExpression(member)) {
        return returnExpressions(member).flatMap((expression) => renderedStaticTexts(expression, context, resolvingBindings));
      }
    }
    return fail(`Invoice summary detector could not resolve rendered property-access output: ${node.expression.getText(context.source)}`);
  }

  if (ts.isAwaitExpression(node)) {
    const awaited = typeAt(node, context);
    if (hasUnresolvedType(awaited)) {
      return fail(`Invoice summary detector encountered unresolved rendered await output: ${node.getText(context.source)}`);
    }
    if (isTextSafePrimitiveType(awaited)) {
      return [];
    }
    return renderedStaticTexts(node.expression, context, resolvingBindings);
  }

  if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
    const type = typeAt(node, context);
    if (hasUnresolvedType(type)) {
      return fail(`Invoice summary detector encountered unresolved rendered member output: ${node.getText(context.source)}`);
    }
    if (isTextSafePrimitiveType(type)) {
      return [];
    }
    const localMember = resolveLocalMember(node, context, resolvingBindings);
    if (localMember) {
      return renderedStaticTexts(localMember, context, resolvingBindings);
    }
    return fail(`Invoice summary detector could not resolve rendered member output: ${node.getText(context.source)}`);
  }

  if (ts.isNewExpression(node)) {
    return fail(`Invoice summary detector could not resolve rendered constructed output: ${node.getText(context.source)}`);
  }

  if (ts.isPrefixUnaryExpression(node)) {
    const type = typeAt(node, context);
    if (!hasUnresolvedType(type) && isTextSafePrimitiveType(type)) {
      return [];
    }
    return fail(`Invoice summary detector could not resolve rendered unary output: ${node.getText(context.source)}`);
  }

  return fail(`Invoice summary detector encountered unsupported rendered expression: ${node.getText(context.source)}`);
}

function conceptFromText(text: string): SummaryConcept | null {
  const normalized = normalizeCustomerVisibleText(text);
  if (normalized.includes("approved quotation total")) return "approvedQuotationTotal";
  if (normalized.includes("previous invoices deposits")) return "previousInvoices";
  if (normalized.includes("deposit amount")) return "depositAmount";
  if (normalized.includes("final amount due")) return "finalAmountDue";
  if (normalized === "total" || normalized.includes("total amount") || normalized.includes("grand total")) return "totalAmount";
  if (normalized.includes("tax vat")) return "taxVat";
  if (normalized.includes("amount paid")) return "amountPaid";
  if (normalized.includes("balance due")) return "balanceDue";
  return null;
}

function collectSummaryConcepts(node: ts.JsxElement | ts.JsxFragment, context: RenderContext) {
  const concepts = new Set<SummaryConcept>();
  for (const text of renderedStaticTexts(node, context)) {
    const concept = conceptFromText(text);
    if (concept) {
      concepts.add(concept);
    }
  }
  return concepts;
}

function isSummaryConceptCluster(concepts: Set<SummaryConcept>) {
  const hasInvoiceAmount =
    concepts.has("depositAmount") ||
    concepts.has("finalAmountDue") ||
    concepts.has("totalAmount");

  return (
    (concepts.has("approvedQuotationTotal") && hasInvoiceAmount && concepts.has("balanceDue")) ||
    (concepts.has("depositAmount") && concepts.has("taxVat") && (concepts.has("totalAmount") || concepts.has("balanceDue"))) ||
    (concepts.has("finalAmountDue") && concepts.has("previousInvoices")) ||
    (concepts.has("totalAmount") && concepts.has("amountPaid") && concepts.has("balanceDue")) ||
    (concepts.has("finalAmountDue") && concepts.has("balanceDue"))
  );
}

function findInvoiceSummaryRegions(sourceText: string, fileName = "invoice-summary-source.tsx") {
  const { source, checker } = parseTsx(sourceText, fileName);
  const symbols = buildLocalSymbols(source);
  const context: RenderContext = {
    source,
    checker,
    symbols,
    resolvingCallables: new Set(),
    resolvingNames: new Set(),
    containers: new Set(),
  };
  const entry = findInvoiceRenderEntry(source, symbols);
  for (const expression of returnExpressions(entry)) {
    renderedStaticTexts(expression, context);
  }

  const candidates = [...context.containers]
    .map((node) => ({ node, concepts: collectSummaryConcepts(node, context) }))
    .filter((candidate) => isSummaryConceptCluster(candidate.concepts));

  return candidates
    .filter((candidate) => {
      return !candidates.some((other) => {
        if (other === candidate) {
          return false;
        }
        return other.node.getStart(source) > candidate.node.getStart(source) &&
          other.node.getEnd() < candidate.node.getEnd();
      });
    })
    .map((candidate): SummaryRegion => ({
      location: sourceLocation(source, candidate.node),
      concepts: candidate.concepts,
    }));
}

function formatSummaryRegion(region: SummaryRegion) {
  return `${region.location} [${[...region.concepts].sort().join(", ")}]`;
}

function assertSingleInvoiceFinancialSummary(sourceText: string, fileName?: string) {
  const regions = findInvoiceSummaryRegions(sourceText, fileName);
  assert.equal(
    regions.length,
    1,
    `Invoice PDF must render exactly one financial summary region; found ${regions.length}: ${regions.map(formatSummaryRegion).join("; ")}`,
  );

  const concepts = regions[0].concepts;
  for (const required of [
    "approvedQuotationTotal",
    "taxVat",
    "amountPaid",
    "balanceDue",
  ] satisfies SummaryConcept[]) {
    assert.ok(
      concepts.has(required),
      `Invoice summary region must contain ${required}; found ${formatSummaryRegion(regions[0])}`,
    );
  }
  assert.ok(
    concepts.has("depositAmount") && concepts.has("finalAmountDue"),
    `Invoice summary region must retain Deposit and Final amount labels; found ${formatSummaryRegion(regions[0])}`,
  );
  assert.ok(
    concepts.has("previousInvoices"),
    `Invoice summary region must retain Previous Invoices / Deposits inside the summary; found ${formatSummaryRegion(regions[0])}`,
  );
}

type CssDeclaration = {
  property: string;
  value: string;
  important: boolean;
};

type CssRule = {
  selectors: string[];
  declarations: CssDeclaration[];
  mediaLists: string[][];
  location: number;
};

function stripCssComments(css: string) {
  let stripped = "";
  let quote: "'" | '"' | null = null;
  for (let index = 0; index < css.length; index += 1) {
    const character = css[index];
    if (quote) {
      stripped += character;
      if (character === "\\") {
        const escape = consumeCssEscape(css, index, "CSS string");
        stripped += css.slice(index + 1, escape.end);
        index = escape.end - 1;
      } else if (character === quote) {
        quote = null;
      }
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      stripped += character;
      continue;
    }
    if (character === "\\") {
      const escape = consumeCssEscape(css, index, "CSS source");
      stripped += css.slice(index, escape.end);
      index = escape.end - 1;
      continue;
    }
    if (character === "/" && css[index + 1] === "*") {
      const close = css.indexOf("*/", index + 2);
      if (close === -1) {
        throw new Error("CSS parser failed: malformed comment");
      }
      index = close + 1;
      continue;
    }
    if (character === "*" && css[index + 1] === "/") {
      throw new Error("CSS parser failed: malformed comment");
    }
    stripped += character;
  }
  if (quote) throw new Error("CSS parser failed: unbalanced quote");
  return stripped;
}

function findMatchingBrace(css: string, openIndex: number) {
  let depth = 0;
  let quote: "'" | '"' | null = null;
  for (let index = openIndex; index < css.length; index += 1) {
    const char = css[index];
    if (quote) {
      if (char === "\\") index = consumeCssEscape(css, index, "CSS block").end - 1;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === "\\") {
      index = consumeCssEscape(css, index, "CSS block").end - 1;
    } else if (char === "'" || char === '"') {
      quote = char;
    } else if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
      if (depth < 0) {
        throw new Error(`CSS parser failed: unexpected } at ${index + 1}`);
      }
    }
  }
  throw new Error(`CSS parser failed: missing closing } after ${openIndex + 1}`);
}

function consumeCssEscape(value: string, slashIndex: number, context: string) {
  if (value[slashIndex] !== "\\" || slashIndex + 1 >= value.length) {
    throw new Error(`CSS parser failed: malformed escape in ${context}`);
  }

  const first = value[slashIndex + 1];
  if (first === "\n" || first === "\r" || first === "\f") {
    throw new Error(`CSS parser failed: malformed escape in ${context}`);
  }

  if (!/[0-9a-f]/i.test(first)) {
    return { decoded: first, end: slashIndex + 2 };
  }

  let end = slashIndex + 1;
  while (end < value.length && end < slashIndex + 7 && /[0-9a-f]/i.test(value[end])) {
    end += 1;
  }
  const codePoint = Number.parseInt(value.slice(slashIndex + 1, end), 16);
  if (
    codePoint === 0 ||
    codePoint > 0x10ffff ||
    (codePoint >= 0xd800 && codePoint <= 0xdfff)
  ) {
    throw new Error(`CSS parser failed: unsupported escape in ${context}`);
  }

  if (/\s/.test(value[end] ?? "")) {
    if (value[end] === "\r" && value[end + 1] === "\n") {
      end += 2;
    } else {
      end += 1;
    }
  }

  return { decoded: String.fromCodePoint(codePoint), end };
}

function decodeCssEscapes(value: string, context: string) {
  let decoded = "";
  for (let index = 0; index < value.length;) {
    if (value[index] !== "\\") {
      decoded += value[index];
      index += 1;
      continue;
    }
    const escape = consumeCssEscape(value, index, context);
    decoded += escape.decoded;
    index = escape.end;
  }
  return decoded;
}

function splitCssList(value: string, context: string) {
  const parts: string[] = [];
  let start = 0;
  let parentheses = 0;
  let brackets = 0;
  let quote: "'" | '"' | null = null;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (quote) {
      if (character === "\\") {
        index = consumeCssEscape(value, index, context).end - 1;
      } else if (character === quote) {
        quote = null;
      }
      continue;
    }

    if (character === "\\") {
      index = consumeCssEscape(value, index, context).end - 1;
    } else if (character === "'" || character === '"') {
      quote = character;
    } else if (character === "(") {
      parentheses += 1;
    } else if (character === ")") {
      parentheses -= 1;
    } else if (character === "[") {
      brackets += 1;
    } else if (character === "]") {
      brackets -= 1;
    } else if (character === "," && parentheses === 0 && brackets === 0) {
      const part = value.slice(start, index).trim();
      if (!part) {
        throw new Error(`CSS parser failed: malformed ${context} list`);
      }
      parts.push(part);
      start = index + 1;
    }

    if (parentheses < 0 || brackets < 0) {
      throw new Error(`CSS parser failed: malformed ${context} list`);
    }
  }

  const part = value.slice(start).trim();
  if (quote || parentheses !== 0 || brackets !== 0 || !part) {
    throw new Error(`CSS parser failed: malformed ${context} list`);
  }
  parts.push(part);
  return parts;
}

function parseDeclarationImportance(value: string, selector: string) {
  let parentheses = 0;
  let brackets = 0;
  let quote: "'" | '"' | null = null;
  let importantMarker = -1;
  const fail = () => {
    throw new Error(`CSS parser failed: malformed declaration in ${selector}`);
  };

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (quote) {
      if (character === "\\") index = consumeCssEscape(value, index, `declaration in ${selector}`).end - 1;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === "\\") index = consumeCssEscape(value, index, `declaration in ${selector}`).end - 1;
    else if (character === "'" || character === '"') quote = character;
    else if (character === "(") parentheses += 1;
    else if (character === ")") parentheses -= 1;
    else if (character === "[") brackets += 1;
    else if (character === "]") brackets -= 1;
    else if (character === "!" && parentheses === 0 && brackets === 0) {
      if (importantMarker !== -1) fail();
      importantMarker = index;
    }
    if (parentheses < 0 || brackets < 0) fail();
  }
  if (quote || parentheses !== 0 || brackets !== 0) fail();

  if (importantMarker === -1) {
    return { value: value.trim(), important: false };
  }

  const declarationValue = value.slice(0, importantMarker).trim();
  const priority = value.slice(importantMarker + 1).trim();
  if (!declarationValue || !/^important$/i.test(priority)) fail();
  return { value: declarationValue, important: true };
}

function parseDeclarations(body: string, selector: string) {
  const declarations: string[] = [];
  let start = 0;
  let parentheses = 0;
  let brackets = 0;
  let quote: "'" | '"' | null = null;
  const fail = () => {
    throw new Error(`CSS parser failed: malformed declaration in ${selector}`);
  };

  for (let index = 0; index < body.length; index += 1) {
    const character = body[index];
    if (quote) {
      if (character === "\\") index = consumeCssEscape(body, index, `declaration in ${selector}`).end - 1;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === "\\") index = consumeCssEscape(body, index, `declaration in ${selector}`).end - 1;
    else if (character === "'" || character === '"') quote = character;
    else if (character === "(") parentheses += 1;
    else if (character === ")") parentheses -= 1;
    else if (character === "[") brackets += 1;
    else if (character === "]") brackets -= 1;
    else if (character === ";" && parentheses === 0 && brackets === 0) {
      const declaration = body.slice(start, index).trim();
      if (declaration) declarations.push(declaration);
      start = index + 1;
    }
    if (parentheses < 0 || brackets < 0) fail();
  }
  if (quote || parentheses !== 0 || brackets !== 0) fail();
  const trailing = body.slice(start).trim();
  if (trailing) declarations.push(trailing);

  return declarations.map((declaration): CssDeclaration => {
    let colon = -1;
    let localParentheses = 0;
    let localBrackets = 0;
    let localQuote: "'" | '"' | null = null;
    for (let index = 0; index < declaration.length; index += 1) {
      const character = declaration[index];
      if (localQuote) {
        if (character === "\\") index = consumeCssEscape(declaration, index, `declaration in ${selector}`).end - 1;
        else if (character === localQuote) localQuote = null;
      } else if (character === "\\") index = consumeCssEscape(declaration, index, `declaration in ${selector}`).end - 1;
      else if (character === "'" || character === '"') localQuote = character;
      else if (character === "(") localParentheses += 1;
      else if (character === ")") localParentheses -= 1;
      else if (character === "[") localBrackets += 1;
      else if (character === "]") localBrackets -= 1;
      else if (character === ":" && localParentheses === 0 && localBrackets === 0) {
        colon = index;
        break;
      }
    }
    const decodedProperty = decodeCssEscapes(
      declaration.slice(0, colon).trim(),
      `declaration property in ${selector}`,
    );
    const property = decodedProperty.startsWith("--") ? decodedProperty : decodedProperty.toLowerCase();
    const parsedValue = parseDeclarationImportance(declaration.slice(colon + 1), selector);
    if (colon <= 0 || !/^(?:(?:--|-?)[a-z_])[a-z0-9_-]*$/i.test(property) || !parsedValue.value) fail();
    return { property, ...parsedValue };
  });
}

function parseCssRules(cssText: string) {
  const css = stripCssComments(cssText);
  const rules: CssRule[] = [];

  const parseBlock = (body: string, offset: number, mediaLists: string[][]): void => {
    let cursor = 0;
    while (cursor < body.length) {
      const open = body.indexOf("{", cursor);
      const strayClose = body.indexOf("}", cursor);
      if (strayClose !== -1 && (open === -1 || strayClose < open)) {
        throw new Error(`CSS parser failed: unexpected } at ${offset + strayClose + 1}`);
      }
      if (open === -1) {
        if (body.slice(cursor).trim() !== "") {
          throw new Error(`CSS parser failed: trailing content at ${offset + cursor + 1}`);
        }
        break;
      }

      const prelude = body.slice(cursor, open).trim();
      if (prelude === "") {
        throw new Error(`CSS parser failed: empty selector at ${offset + open + 1}`);
      }
      const close = findMatchingBrace(body, open);
      const inner = body.slice(open + 1, close);
      const preludeOffset = offset + cursor + body.slice(cursor, open).search(/\S/);

      if (prelude.startsWith("@media")) {
        const mediaText = prelude.slice("@media".length).trim();
        parseBlock(inner, offset + open + 1, [...mediaLists, splitCssList(mediaText, "media query")]);
      } else if (prelude.startsWith("@")) {
        rules.push({
          selectors: [prelude],
          declarations: parseDeclarations(inner, prelude),
          mediaLists,
          location: preludeOffset + 1,
        });
      } else {
        const selectors = splitCssList(prelude, "selector");
        rules.push({
          selectors,
          declarations: parseDeclarations(inner, prelude),
          mediaLists,
          location: preludeOffset + 1,
        });
      }

      cursor = close + 1;
    }
  };

  parseBlock(css, 0, []);
  return rules;
}

function isPrintRule(rule: CssRule) {
  return rule.mediaLists.some((mediaList) => mediaList.some((branch) => /\bprint\b/i.test(branch)));
}

function hasInvoiceSelector(selector: string) {
  return /\.invoice-print-/.test(decodeCssEscapes(selector, "print selector").toLowerCase());
}

function hasQuotationSelector(selector: string) {
  return /\.quotation-print-/.test(decodeCssEscapes(selector, "print selector").toLowerCase());
}

function isInvoiceFooterSelector(selector: string) {
  return /\.invoice-print-footer\b/.test(decodeCssEscapes(selector, "print selector").toLowerCase());
}

function isCssIdentifierCharacter(character: string | undefined) {
  return Boolean(character && /[a-z0-9_-]/i.test(character));
}

function readCssIdentifierToken(value: string, start: number, context: string) {
  let end = start;
  let decoded = "";
  while (end < value.length) {
    if (value[end] === "\\") {
      const escape = consumeCssEscape(value, end, context);
      decoded += escape.decoded;
      end = escape.end;
      continue;
    }
    if (!isCssIdentifierCharacter(value[end])) break;
    decoded += value[end];
    end += 1;
  }
  return decoded ? { decoded, end } : null;
}

function selectorCompounds(selector: string) {
  const compounds: string[] = [];
  let start = 0;
  let parentheses = 0;
  let brackets = 0;
  let quote: "'" | '"' | null = null;
  let expectingCompound = true;
  for (let index = 0; index < selector.length; index += 1) {
    const character = selector[index];
    if (quote) {
      if (character === "\\") index = consumeCssEscape(selector, index, "print selector").end - 1;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === "\\") {
      index = consumeCssEscape(selector, index, "print selector").end - 1;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      continue;
    }
    if (character === "[") brackets += 1;
    else if (character === "]") brackets -= 1;
    else if (character === "(" && brackets === 0) parentheses += 1;
    else if (character === ")" && brackets === 0) parentheses -= 1;
    if (brackets < 0 || parentheses < 0) throw new Error("CSS parser failed: malformed print selector");
    if (brackets !== 0 || parentheses !== 0) continue;

    const combinator = character === ">" || character === "+" || character === "~" || (character === "|" && selector[index + 1] === "|");
    if (combinator || /\s/.test(character)) {
      const compound = selector.slice(start, index).trim();
      if (compound) {
        compounds.push(compound);
        expectingCompound = false;
      } else if (combinator && expectingCompound) {
        throw new Error("CSS parser failed: malformed print selector combinator");
      }
      if (combinator) {
        if (character === "|" && selector[index + 1] === "|") index += 1;
        expectingCompound = true;
      }
      start = index + 1;
    }
  }
  const trailing = selector.slice(start).trim();
  if (trailing) {
    compounds.push(trailing);
    expectingCompound = false;
  }
  if (quote || brackets !== 0 || parentheses !== 0 || expectingCompound && compounds.length > 0) {
    throw new Error("CSS parser failed: malformed print selector");
  }
  return compounds;
}

function compoundTargetsGenericRoot(compound: string, isLeadingCompound: boolean): boolean {
  const genericTypes = new Set(["html", "body"]);
  const unscopedLeadingTypes = new Set(["table", "thead", "tbody", "tr", "footer", "main", "section", "article"]);
  const genericClasses = new Set(["a4-page", "dashboard-shell", "dashboard-content", "dashboard-main", "invoice-print-document"]);
  for (let index = 0; index < compound.length;) {
    const character = compound[index];
    if (character === "[") {
      index = findMatchingCssBracket(compound, index, "print selector") + 1;
      continue;
    }
    if (character === "." || character === ":" || /[a-z_-]/i.test(character) || character === "\\") {
      const prefix = character === "." || character === ":" ? character : "";
      const token = readCssIdentifierToken(compound, index + (prefix ? 1 : 0), "print selector");
      if (!token) throw new Error("CSS parser failed: malformed print selector");
      const name = token.decoded.toLowerCase();
      if (!prefix && (genericTypes.has(name) || (isLeadingCompound && unscopedLeadingTypes.has(name)))) return true;
      if (prefix === "." && genericClasses.has(name)) return true;
      if (prefix === ":" && (name === "is" || name === "where") && compound[token.end] === "(") {
        const end = findMatchingCssParenthesis(compound, token.end, "functional selector");
        if (splitCssList(compound.slice(token.end + 1, end), "functional selector").some(isGenericPrintSelector)) return true;
        index = end + 1;
        continue;
      }
      if (prefix === ":" && compound[token.end] === "(") {
        index = findMatchingCssParenthesis(compound, token.end, "functional selector") + 1;
        continue;
      }
      index = token.end;
      continue;
    }
    index += 1;
  }
  return false;
}

function isGenericPrintSelector(selector: string) {
  return selectorCompounds(selector).some((compound, index) => compoundTargetsGenericRoot(compound, index === 0));
}

function declarationValue(value: string) {
  return value.trim().toLowerCase();
}

const GUARDED_CSS_PROPERTIES = new Set([
  "break-before",
  "break-after",
  "page-break-before",
  "page-break-after",
  "position",
  "top",
  "bottom",
  "left",
  "right",
  "height",
  "min-height",
  "transform",
  "translate",
]);

function findMatchingCssParenthesis(value: string, openIndex: number, context: string) {
  let depth = 0;
  let quote: "'" | '"' | null = null;
  for (let index = openIndex; index < value.length; index += 1) {
    const character = value[index];
    if (quote) {
      if (character === "\\") {
        index = consumeCssEscape(value, index, context).end - 1;
      } else if (character === quote) {
        quote = null;
      }
      continue;
    }
    if (character === "\\") {
      index = consumeCssEscape(value, index, context).end - 1;
    } else if (character === "'" || character === '"') {
      quote = character;
    } else if (character === "(") {
      depth += 1;
    } else if (character === ")") {
      depth -= 1;
      if (depth === 0) return index;
      if (depth < 0) break;
    }
  }
  throw new Error(`CSS parser failed: malformed ${context}`);
}

function findMatchingCssBracket(value: string, openIndex: number, context: string) {
  let quote: "'" | '"' | null = null;
  for (let index = openIndex + 1; index < value.length; index += 1) {
    const character = value[index];
    if (quote) {
      if (character === "\\") index = consumeCssEscape(value, index, context).end - 1;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === "\\") index = consumeCssEscape(value, index, context).end - 1;
    else if (character === "'" || character === '"') quote = character;
    else if (character === "]") return index;
  }
  throw new Error(`CSS parser failed: malformed ${context}`);
}

function splitCssVarArguments(value: string, context: string) {
  let parentheses = 0;
  let brackets = 0;
  let quote: "'" | '"' | null = null;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (quote) {
      if (character === "\\") {
        index = consumeCssEscape(value, index, context).end - 1;
      } else if (character === quote) {
        quote = null;
      }
      continue;
    }
    if (character === "\\") {
      index = consumeCssEscape(value, index, context).end - 1;
    } else if (character === "'" || character === '"') {
      quote = character;
    } else if (character === "(") {
      parentheses += 1;
    } else if (character === ")") {
      parentheses -= 1;
    } else if (character === "[") {
      brackets += 1;
    } else if (character === "]") {
      brackets -= 1;
    } else if (character === "," && parentheses === 0 && brackets === 0) {
      return [value.slice(0, index).trim(), value.slice(index + 1).trim()] as const;
    }
    if (parentheses < 0 || brackets < 0) {
      throw new Error(`CSS parser failed: malformed ${context}`);
    }
  }
  if (quote || parentheses !== 0 || brackets !== 0) {
    throw new Error(`CSS parser failed: malformed ${context}`);
  }
  return [value.trim(), null] as const;
}

function resolveCssVariables(
  value: string,
  customProperties: Map<string, string>,
  context: string,
  resolving = new Set<string>(),
): string {
  let resolved = "";
  for (let index = 0; index < value.length;) {
    if (value[index] === "'" || value[index] === '"') {
      const quote = value[index];
      const start = index;
      index += 1;
      while (index < value.length && value[index] !== quote) {
        if (value[index] === "\\") index = consumeCssEscape(value, index, context).end;
        else index += 1;
      }
      if (index >= value.length) throw new Error(`CSS parser failed: malformed ${context}`);
      resolved += value.slice(start, index + 1);
      index += 1;
      continue;
    }
    const token = readCssIdentifierToken(value, index, context);
    if (!token || value[token.end] !== "(" || token.decoded.toLowerCase() !== "var") {
      resolved += value[index];
      index += 1;
      continue;
    }

    const close = findMatchingCssParenthesis(value, token.end, context);
    const [rawName, fallback] = splitCssVarArguments(
      value.slice(token.end + 1, close),
      `var() in ${context}`,
    );
    const name = decodeCssEscapes(rawName, `custom property name in ${context}`);
    if (!/^--[a-z_][a-z0-9_-]*$/i.test(name)) {
      throw new Error(`CSS parser failed: malformed var() in ${context}`);
    }

    let replacement: string;
    if (customProperties.has(name)) {
      if (resolving.has(name)) {
        throw new Error(`CSS parser failed: custom property cycle in ${context}`);
      }
      resolving.add(name);
      replacement = resolveCssVariables(
        customProperties.get(name)!,
        customProperties,
        context,
        resolving,
      );
      resolving.delete(name);
    } else if (fallback !== null && fallback !== "") {
      replacement = resolveCssVariables(fallback, customProperties, context, resolving);
    } else {
      throw new Error(`CSS parser failed: unresolved custom property ${name} in ${context}`);
    }

    resolved += replacement;
    index = close + 1;
  }

  return resolved;
}

function hasCssFunction(value: string, context: string) {
  for (let index = 0; index < value.length;) {
    if (value[index] === "'" || value[index] === '"') {
      const quote = value[index];
      index += 1;
      while (index < value.length && value[index] !== quote) {
        if (value[index] === "\\") index = consumeCssEscape(value, index, context).end;
        else index += 1;
      }
      if (index >= value.length) throw new Error(`CSS parser failed: malformed ${context}`);
      index += 1;
      continue;
    }
    const token = readCssIdentifierToken(value, index, context);
    if (token && value[token.end] === "(") return true;
    index += 1;
  }
  return false;
}

function sameRuleCustomProperties(declarations: CssDeclaration[]) {
  const winners = new Map<string, CssDeclaration>();
  for (const declaration of declarations) {
    if (!declaration.property.startsWith("--")) {
      continue;
    }
    const current = winners.get(declaration.property);
    if (!current || declaration.important || !current.important) {
      winners.set(declaration.property, declaration);
    }
  }
  return new Map([...winners].map(([property, declaration]) => [property, declaration.value] as const));
}

function assertInvoicePrintCssContract(cssText: string) {
  const printRules = parseCssRules(cssText).filter(isPrintRule);
  assert.ok(printRules.length > 0, "print media rules must exist");

  for (const rule of printRules) {
    const invoiceSelector = rule.selectors.some(hasInvoiceSelector);
    const quotationSelector = rule.selectors.some(hasQuotationSelector);
    const genericSelector = rule.selectors.some(isGenericPrintSelector);
    const customProperties = sameRuleCustomProperties(rule.declarations);
    const resolvedDeclarationValue = (declaration: CssDeclaration) => {
      if (!GUARDED_CSS_PROPERTIES.has(declaration.property)) {
        return declarationValue(declaration.value);
      }
      const resolved = resolveCssVariables(
        declaration.value,
        customProperties,
        `${declaration.property} at ${rule.location}: ${rule.selectors.join(", ")}`,
      );
      if (hasCssFunction(resolved, `${declaration.property} value at ${rule.location}`)) {
        throw new Error(
          `CSS parser failed: unresolved dynamic ${declaration.property} at ${rule.location}: ${rule.selectors.join(", ")}`,
        );
      }
      return declarationValue(
        decodeCssEscapes(
          resolved,
          `${declaration.property} value at ${rule.location}`,
        ).toLowerCase(),
      );
    };

    assert.ok(
      !(invoiceSelector && quotationSelector),
      `Invoice and Quotation print selectors must not be mixed at ${rule.location}: ${rule.selectors.join(", ")}`,
    );
    assert.ok(
      !invoiceSelector || rule.selectors.every(hasInvoiceSelector),
      `Invoice print selector lists must remain isolated at ${rule.location}: ${rule.selectors.join(", ")}`,
    );

    const invoiceLikeDeclarations = rule.declarations.some((declaration) => {
      const value = resolvedDeclarationValue(declaration);
      return (
        (declaration.property === "display" && value === "table-header-group") ||
        declaration.property === "break-inside" ||
        declaration.property === "page-break-inside" ||
        declaration.property === "break-before" ||
        declaration.property === "break-after" ||
        declaration.property === "page-break-before" ||
        declaration.property === "page-break-after" ||
        declaration.property === "position"
      );
    });

    assert.ok(
      !(genericSelector && invoiceLikeDeclarations),
      `Invoice print behavior must not use an unscoped generic selector at ${rule.location}: ${rule.selectors.join(", ")}`,
    );

    if (!invoiceSelector && !genericSelector) {
      continue;
    }

    for (const declaration of rule.declarations) {
      const value = resolvedDeclarationValue(declaration);

      if (declaration.property === "break-before" || declaration.property === "break-after") {
        assert.ok(
          !/^(?:page|always|left|right|recto|verso)$/.test(value),
          `Invoice selector must not force ${declaration.property}: ${declaration.value} at ${rule.location}: ${rule.selectors.join(", ")}`,
        );
      }

      if (declaration.property === "page-break-before" || declaration.property === "page-break-after") {
        assert.ok(
          !/^(?:always|left|right|recto|verso)$/.test(value),
          `Invoice selector must not force ${declaration.property}: ${declaration.value} at ${rule.location}: ${rule.selectors.join(", ")}`,
        );
      }

      if (rule.selectors.some((selector) => /^\.invoice-print-document\b/.test(selector)) && (declaration.property === "break-inside" || declaration.property === "page-break-inside")) {
        assert.notEqual(
          value,
          "avoid",
          `Invoice root must not receive excessive anti-splitting at ${rule.location}: ${rule.selectors.join(", ")}`,
        );
      }

      if (!rule.selectors.some(isInvoiceFooterSelector)) {
        continue;
      }

      if (declaration.property === "position") {
        assert.ok(
          !/^(?:absolute|fixed|sticky)$/.test(value),
          `Invoice footer must remain in normal flow at ${rule.location}: ${rule.selectors.join(", ")}`,
        );
      }
      assert.ok(
        !["top", "bottom", "left", "right", "height", "min-height", "transform", "translate"].includes(declaration.property),
        `Invoice footer must not be pinned with ${declaration.property} at ${rule.location}: ${rule.selectors.join(", ")}`,
      );
    }
  }
}

test("Invoice customer PDF removes internal-only presentation without removing stored fields", () => {
  const source = read(INVOICE_PDF);

  assertNoForbiddenCustomerOutput(source);
  assert.match(read(QUOTATION_TYPES), /details: string \| null;/);
  assert.match(read(INVOICE_TYPES), /snapshot_document_rules: JsonValue \| null;/);
  assert.match(read(INVOICE_SNAPSHOTS), /buildDocumentRulesSnapshot/);
  assert.match(read(INVOICE_SNAPSHOTS), /terms:\s*settings\.default_terms/);
});

test("Invoice customer PDF retains snapshot-backed financial and document presentation", () => {
  const source = read(INVOICE_PDF);
  const template = getInvoiceTemplate(source);

  for (const retained of [
    "item.description",
    "invoice.invoice_number",
    "invoice.invoice_type",
    "summaryLabel",
    "invoiceAmountLabel",
    "DRAFT PREVIEW",
    "relatedQuoteNumber",
    "seller.legalNameEn",
    "buyer.name",
    "formatQuantityOrUnavailable(item.qty)",
    "formatItemAmountWithCurrency(item.unitPrice)",
    "formatItemAmountWithCurrency(item.total)",
    'invoice.vat_mode === "not_registered" ? "Not applied"',
    "formatAmountWithCurrency(invoice.subtotal)",
    "formatAmountWithCurrency(invoice.grand_total)",
    "formatAmountWithCurrency(invoice.amount_paid)",
    "formatAmountWithCurrency(invoice.balance_due)",
    "Approved Quotation Total",
    "Previous Invoices / Deposits",
    "bankDetails?.bankName",
    "bankDetails?.accountName",
    "bankDetails?.accountNo",
    "bankDetails?.iban",
    "Official Stamp",
  ]) {
    assert.ok(template.includes(retained), `Invoice PDF must retain ${retained}`);
  }

  for (const snapshotField of [
    "invoice.snapshot_seller",
    "invoice.snapshot_buyer",
    "invoice.snapshot_quotation",
    "invoice.snapshot_bank_details",
  ]) {
    assert.match(source, new RegExp(snapshotField.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(source, /invoice\.invoice_type === "deposit"/);
  assert.match(source, /"Deposit Summary"/);
  assert.match(source, /"Final Settlement Summary"/);
});

test("Invoice customer PDF presents only positively classified snapshot itemization", () => {
  const source = read(INVOICE_PDF);
  const template = getInvoiceTemplate(source);
  const css = read(GLOBAL_CSS);

  assert.match(
    source,
    /unitPrice:\s*readFiniteNumber\(item\.unit_price\)\s*\?\?\s*readFiniteNumber\(item\.unitPrice\)/,
    "snake_case snapshot unit_price must take precedence over the legacy camelCase key",
  );
  assert.match(source, /total:\s*readFiniteNumber\(item\.total\)/);
  assert.match(
    source,
    /formatItemAmountWithCurrency[\s\S]*?val === null \|\| val === undefined \? "Not available" : formatAmountWithCurrency\(val\)/,
    "only absent money values may render as unavailable; numeric zero remains valid",
  );
  assert.doesNotMatch(source, /formatMoney\(item\.(?:unitPrice|total)\)/);
  assert.doesNotMatch(source, /(?:item\.total)\s*\/\s*item\.qty/);
  assert.doesNotMatch(source, /item\.qty\s*\*\s*item\.unitPrice/);
  assert.doesNotMatch(template, />\s*Discount\s*<\/th>/);
  assert.doesNotMatch(template, /item\.discount/);

  assert.match(
    source,
    /const documentCurrency =[\s\S]*?readRecordString\(snapshotQuotationRecord, "currency"\)[\s\S]*?readNonBlankString\(seller\.currency\)/,
    "document currency must come from stored quotation then seller snapshots",
  );
  assert.match(source, /documentCurrency \? ` \$\{documentCurrency\}` : ""/);
  assert.doesNotMatch(source, /invoice\.currency/);
  assert.doesNotMatch(source, /["']SAR["']/);
  assert.match(source, /formatAmountWithCurrency/);

  assert.match(source, /readNonBlankString\(invoice\.relatedQuoteNumber\)/);
  assert.match(source, /readRecordString\(snapshotQuotationRecord, "quotation_number"\)/);
  assert.match(source, /readRecordString\(snapshotQuotationRecord, "quotationNumber"\)/);
  assert.match(template, /\{relatedQuoteNumber && \(/);
  assert.doesNotMatch(source, /invoice\.relatedQuote(?!Number)/);
  assert.doesNotMatch(source, /approved_quotation_id/);

  for (const heading of ["Approved Quotation Items", "Approved Service Scope"]) {
    assert.ok(source.includes(heading), `Invoice PDF must retain ${heading}`);
  }
  for (const heading of ["Description", "Qty", "Unit Price", "Line Total"]) {
    assert.ok(template.includes(heading), `Invoice item table must retain ${heading}`);
  }
  assert.doesNotMatch(template, /item\.vat/);
  assert.match(source, /snapshotClassification === "full_quotation" \|\| snapshotClassification === "active_scope"/);
  assert.match(source, /snapshotClassification === "active_scope"\s*\?\s*"Approved Service Scope"/);
  assert.match(source, /snapshotClassification === "full_quotation"\s*\?\s*readRecordNumber\(snapshotQuotationRecord, "grand_total"\)/);
  assert.match(source, /readRecordNumber\(finalInvoiceSettlement, "approved_quotation_total"\) \?\? fullQuotationTotal/);
  assert.match(source, /const approvedBillingScopeTotal\s*=\s*[\s\S]*?invoice\.invoice_type === "deposit"[\s\S]*?snapshotClassification === "active_scope"[\s\S]*?approvedBillingScopeAcceptedGrandTotal/);
  assert.match(source, /approvedBillingScopeTotal !== null/);
  assert.match(source, /readRecordNumber\(finalInvoiceSettlement, "service_lifetime_exposure"\) \?\?[\s\S]*?readRecordNumber\(finalInvoiceSettlement, "active_prior_invoice_total"\)/);
  assert.doesNotMatch(source, /getQuotationById|from\("quotations"\)|createAdminClient/);
  assertSingleInvoiceFinancialSummary(source, INVOICE_PDF);
  assert.match(source, /"Deposit Summary"/);
  assert.match(source, /"Final Settlement Summary"/);
  assert.match(source, /"Deposit Amount"/);
  assert.match(source, /"Final Amount Due"/);
  assert.match(template, /Approved Quotation Total/);
  assert.match(template, /Approved Billing Scope Total/);
  assert.match(template, /formatAmountWithCurrency\(approvedBillingScopeTotal\)/);
  assert.match(template, /Previous Invoices \/ Deposits/);
  assert.match(template, /formatAmountWithCurrency\(invoice\.subtotal\)/);
  assert.match(template, /formatAmountWithCurrency\(invoice\.grand_total\)/);

  assert.match(template, /invoice-print-document/);
  assert.match(css, /\.invoice-print-document/);
  assert.match(css, /\.invoice-print-item-table thead\s*\{\s*display:\s*table-header-group/);
  assert.match(css, /\.invoice-print-item-table tr\s*\{[\s\S]*?break-inside:\s*avoid/);
  assert.match(css, /\.invoice-print-footer\s*\{[\s\S]*?break-inside:\s*avoid/);
  assertInvoicePrintCssContract(css);
});

type RuntimeSnapshotClassifier = (record: Record<string, unknown> | null, invoiceType: string) => string;

function loadRuntimeSnapshotClassifier(): RuntimeSnapshotClassifier {
  const source = read(INVOICE_PDF);
  const startMarker = "/* INVOICE_PDF_SNAPSHOT_CLASSIFIER_START */";
  const endMarker = "/* INVOICE_PDF_SNAPSHOT_CLASSIFIER_END */";
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker);
  assert.ok(start >= 0 && end > start, "Invoice PDF must expose a bounded pure snapshot classifier");

  const classifierSource = source.slice(start + startMarker.length, end);
  const compiled = ts.transpileModule(
    `${classifierSource}\nmodule.exports = { classifySnapshotQuotation };`,
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText;
  const runtimeModule = { exports: {} as { classifySnapshotQuotation?: RuntimeSnapshotClassifier } };
  new Function("module", "exports", compiled)(runtimeModule, runtimeModule.exports);
  assert.ok(runtimeModule.exports.classifySnapshotQuotation, "runtime classifier must be executable without page imports");
  return runtimeModule.exports.classifySnapshotQuotation;
}

test("Invoice PDF snapshot variants execute the actual collision-safe runtime classifier", () => {
  const source = read(INVOICE_PDF);
  const classify = loadRuntimeSnapshotClassifier();
  const fullItem = { description: "Stage", details: null, qty: 1, unit_price: 0, vat: 0, total: 0 };
  const fullQuotation = {
    quotation_id: "quotation-id", quotation_number: "QT-2026-0001", service_id: "service-id", customer_id: "customer-id",
    items: [fullItem], subtotal: 0, discount: 0, vat_rate: 0, vat_amount: 0, grand_total: 0, currency: "SAR", status: "approved",
  };
  const activeScope = {
    ...fullQuotation,
    approvedBillingScopeId: "scope-id", approvedBillingScopeAcceptedGrandTotal: 100, sourceQuotationId: "quotation-id",
    items: [{ ...fullItem, description: "Accepted Service", details: "scope source", unit_price: 100, total: 100 }],
    subtotal: 100, grand_total: 100,
  };
  const synthetic = (description: "Deposit Payment" | "Final Settlement", amount: number) => ({
    ...activeScope,
    items: [{ description, details: "For services related to Quotation QT-2026-0001", qty: 1, unit_price: amount, vat: 0, total: amount }],
    subtotal: amount, vat_amount: 0, grand_total: amount,
  });

  assert.equal(classify(fullQuotation, "deposit"), "full_quotation");
  assert.equal(classify({ ...fullQuotation, items: [{ ...fullItem, description: null }] }, "deposit"), "ambiguous");
  assert.equal(classify({ ...fullQuotation, items: [{ ...fullItem, description: "" }] }, "deposit"), "ambiguous");
  assert.equal(classify({ ...fullQuotation, items: [{ ...fullItem, description: "   " }] }, "deposit"), "ambiguous");
  assert.equal(classify({ ...fullQuotation, items: [{ ...fullItem, unit_price: "not-money" }] }, "deposit"), "ambiguous");
  assert.equal(classify({ ...fullQuotation, items: [{ ...fullItem, total: -1 }] }, "deposit"), "ambiguous");
  assert.equal(classify({ ...fullQuotation, items: [{ description: "Stage", details: null, qty: "1", unitPrice: "0", vat: "0", total: "0" }] }, "deposit"), "full_quotation");
  assert.equal(classify({ ...fullQuotation, approvedBillingScopeId: "partial-marker" }, "deposit"), "ambiguous");
  assert.equal(classify(activeScope, "deposit"), "active_scope");
  assert.equal(classify({ ...activeScope, items: [{ ...activeScope.items[0], details: null }] }, "deposit"), "active_scope");
  assert.equal(classify({ ...activeScope, items: [{ ...activeScope.items[0], description: "Deposit Payment" }] }, "deposit"), "active_scope");
  assert.equal(classify({ ...activeScope, items: [{ ...activeScope.items[0], description: "Final Settlement", details: null }] }, "final"), "active_scope");
  const activeScopeWithoutDetails: Record<string, unknown> = { ...activeScope.items[0] };
  delete activeScopeWithoutDetails.details;
  assert.equal(classify({ ...activeScope, items: [activeScopeWithoutDetails] }, "deposit"), "ambiguous");
  for (const unsupportedDetails of [undefined, { internal: true }, [], 0, true, Symbol("details"), () => "details"]) {
    assert.equal(
      classify({ ...activeScope, items: [{ ...activeScope.items[0], details: unsupportedDetails }] }, "deposit"),
      "ambiguous",
    );
  }
  assert.equal(classify(synthetic("Deposit Payment", 25), "deposit"), "synthetic_deposit");
  assert.equal(classify(synthetic("Final Settlement", 75), "final"), "synthetic_final");
  assert.equal(classify(synthetic("Deposit Payment", 25), "final"), "ambiguous");
  assert.equal(classify({ ...synthetic("Deposit Payment", 25), items: [{ description: "Deposit Payment", qty: 1, unit_price: 25, vat: 0, total: 25 }] }, "deposit"), "ambiguous");
  assert.equal(classify({ ...synthetic("Final Settlement", 75), items: [{ description: "Final Settlement", qty: 1, unit_price: 75, vat: 0, total: 75 }] }, "final"), "ambiguous");
  assert.equal(classify({ ...synthetic("Deposit Payment", 25), grand_total: 26 }, "deposit"), "ambiguous");
  assert.equal(classify({ ...fullQuotation, items: [] }, "deposit"), "ambiguous");
  assert.equal(classify({ items: "not-an-array" } as unknown as Record<string, unknown>, "deposit"), "ambiguous");

  assert.match(source, /function hasSyntheticSettlementIdentity/);
  assert.match(source, /snapshotClassification === "full_quotation" \|\| snapshotClassification === "active_scope"/);
  assert.doesNotMatch(source, /getQuotationById|from\("quotations"\)|approved_quotation_id|snapshotQuotationRecord\.items\.map/);
  assert.doesNotMatch(getInvoiceTemplate(source), /Deposit Payment|Final Settlement/);
});

test("Invoice structural summary detector rejects duplicate customer financial regions", () => {
  const validSummary = `
    const invoiceAmountLabel = invoice.invoice_type === "deposit" ? "Deposit Amount" : "Final Amount Due";
    const summaryLabel = invoice.invoice_type === "deposit" ? "Deposit Summary" : "Final Settlement Summary";
    function Page() {
      return (
        <section>
          <h3>{summaryLabel}</h3>
          <div>
            <p>Approved Quotation Total</p>
            <p>Previous Invoices / Deposits</p>
            <p>Tax/VAT</p>
            <p>{invoiceAmountLabel}</p>
            <p>Amount Paid</p>
            <p>Balance Due</p>
          </div>
          <table><thead><tr><th>Line Total</th></tr></thead></table>
        </section>
      );
    }
  `;
  assertSingleInvoiceFinancialSummary(validSummary);

  for (const [name, source] of [
    [
      "two summaries with different class names",
      `
        function Page() {
          return (
            <main>
              <section className="customer-totals"><p>Total Amount</p><p>Amount Paid</p><p>Balance Due</p></section>
              <aside className="settlement-card"><p>Deposit Amount</p><p>Tax/VAT</p><p>Balance Due</p></aside>
            </main>
          );
        }
      `,
    ],
    [
      "main summary plus differently named Deposit charge box",
      `
        function Page() {
          return (
            <main>
              <section><p>Total Amount</p><p>Amount Paid</p><p>Balance Due</p></section>
              <aside><p>Deposit Amount</p><p>Tax/VAT</p><p>Total</p></aside>
            </main>
          );
        }
      `,
    ],
    [
      "main summary plus helper-returned Final settlement block",
      `
        function FinalBlock() {
          return <aside><p>Final Amount Due</p><p>Previous Invoices / Deposits</p><p>Balance Due</p></aside>;
        }
        function Page() {
          return <main><section><p>Total Amount</p><p>Amount Paid</p><p>Balance Due</p></section><FinalBlock /></main>;
        }
      `,
    ],
    [
      "duplicated Total Amount, Amount Paid, and Balance Due",
      `
        function Page() {
          return <main><section><p>Total Amount</p><p>Amount Paid</p><p>Balance Due</p></section><div><p>Total Amount</p><p>Amount Paid</p><p>Balance Due</p></div></main>;
        }
      `,
    ],
  ] as const) {
    assert.throws(
      () => assertSingleInvoiceFinancialSummary(source),
      /exactly one financial summary region/,
      `${name} must fail the structural summary detector`,
    );
  }

  assertSingleInvoiceFinancialSummary(`
    const amountLabel = invoice.invoice_type === "deposit" ? "Deposit Amount" : "Final Amount Due";
    function Page() {
      return (
        <section>
          <p>Approved Quotation Total</p>
          <p>Previous Invoices / Deposits</p>
          <p>Tax/VAT</p>
          <p>{amountLabel}</p>
          <p>Amount Paid</p>
          <p>Balance Due</p>
          <table><thead><tr><th>Line Total</th></tr></thead></table>
        </section>
      );
    }
  `);

  assertSingleInvoiceFinancialSummary(`
    const amountLabel = invoice.invoice_type === "deposit" ? "Deposit Amount" : "Final Amount Due";
    function SummaryLabels() {
      return <><p>Approved Quotation Total</p><p>Previous Invoices / Deposits</p><p>Tax/VAT</p></>;
    }
    const AmountLabel = () => <p>{amountLabel}</p>;
    const SettlementTotals = function () {
      return <><p>Amount Paid</p><p>Balance Due</p></>;
    };
    function Page() {
      return <section><SummaryLabels /><AmountLabel /><SettlementTotals /><table><thead><tr><th>Line Total</th></tr></thead></table></section>;
    }
  `);

  assert.throws(
    () => assertSingleInvoiceFinancialSummary(`
      const amountLabel = invoice.invoice_type === "deposit" ? "Deposit Amount" : "Final Amount Due";
      function OriginalSummary() {
        return <section><p>Approved Quotation Total</p><p>Previous Invoices / Deposits</p><p>Tax/VAT</p><p>{amountLabel}</p><p>Amount Paid</p><p>Balance Due</p></section>;
      }
      function DuplicateLabels() { return <><p>Approved Quotation Total</p><p>Previous Invoices / Deposits</p><p>Tax/VAT</p></>; }
      function DuplicateAmount() { return <p>{amountLabel}</p>; }
      function DuplicateTotals() { return <><p>Amount Paid</p><p>Balance Due</p></>; }
      function DuplicateSummary() { return <aside><DuplicateLabels /><DuplicateAmount /><DuplicateTotals /></aside>; }
      function Page() { return <main><OriginalSummary /><DuplicateSummary /></main>; }
    `),
    /exactly one financial summary region/,
    "a second summary split across local child components must fail",
  );

  assert.throws(
    () => assertSingleInvoiceFinancialSummary(`
      const FinancialBlock = unresolvedRenderer;
      function Page() { return <main><FinancialBlock /></main>; }
    `),
    /could not resolve local rendered output: FinancialBlock/,
    "an unresolved local financial component must fail closed",
  );

  assert.throws(
    () => assertSingleInvoiceFinancialSummary(`
      function RecursiveSummary() { return <RecursiveSummary />; }
      function Page() { return <main><RecursiveSummary /></main>; }
    `),
    /rendered-output cycle: RecursiveSummary/,
    "recursive local rendered output must fail closed",
  );

  assert.deepEqual(
    findInvoiceSummaryRegions(`
      function Page() {
        return (
          <>
            {/* Amount Paid Balance Due Deposit Amount Tax/VAT */}
            <table><thead><tr><th>Line Total</th></tr></thead><tbody><tr><td>Line Total</td></tr></tbody></table>
          </>
        );
      }
    `),
    [],
    "comments and item-table Line Total must not count as a summary region",
  );

  assert.deepEqual(
    findInvoiceSummaryRegions(`
      function Page() {
        return <section aria-label="Approved Quotation Total Previous Invoices Deposit Amount Amount Paid Balance Due" data-summary="Tax/VAT"><table><thead><tr><th>Line Total</th></tr></thead></table></section>;
      }
    `),
    [],
    "attribute-only financial labels must not count as customer-rendered summary output",
  );

  for (const [name, source] of [
    ["non-self-closing duplicate component", `
      function Summary() { return <section><p>Total Amount</p><p>Amount Paid</p><p>Balance Due</p></section>; }
      function Page() { return <main><Summary></Summary><Summary /></main>; }
    `],
    ["rendered JSX array", `
      function Summary() { return <section><p>Total Amount</p><p>Amount Paid</p><p>Balance Due</p></section>; }
      function Page() { return <main>{[<Summary />, <Summary />]}</main>; }
    `],
    ["rendered JSX array variable", `
      function Summary() { return <section><p>Total Amount</p><p>Amount Paid</p><p>Balance Due</p></section>; }
      const summaries = [<Summary />, <Summary />];
      function Page() { return <main>{summaries}</main>; }
    `],
    ["expression-bodied map", `
      const items = [1];
      function Original() { return <section><p>Total Amount</p><p>Amount Paid</p><p>Balance Due</p></section>; }
      function Duplicate() { return <aside><p>Deposit Amount</p><p>Tax/VAT</p><p>Balance Due</p></aside>; }
      function Page() { return <main><Original />{items.map(() => <Duplicate />)}</main>; }
    `],
    ["block-bodied conditional map", `
      const items = [true];
      function Original() { return <section><p>Total Amount</p><p>Amount Paid</p><p>Balance Due</p></section>; }
      function Duplicate() { return <aside><p>Deposit Amount</p><p>Tax/VAT</p><p>Balance Due</p></aside>; }
      function Page() { return <main><Original />{items.map((item) => { return item ? <Duplicate /> : null; })}</main>; }
    `],
  ] as const) {
    assert.throws(() => assertSingleInvoiceFinancialSummary(source), /exactly one financial summary region/, `${name} must detect a second summary`);
  }

  const summaryComponentSource = `
    function Original() { return <section><p>Approved Quotation Total</p><p>Previous Invoices / Deposits</p><p>Tax/VAT</p><p>Deposit Amount</p><p>Final Amount Due</p><p>Amount Paid</p><p>Balance Due</p></section>; }
    function Duplicate() { return <aside><p>Total Amount</p><p>Amount Paid</p><p>Balance Due</p></aside>; }
  `;

  for (const [name, source] of [
    ["self-closing member component", `${summaryComponentSource} const Components = { Summary: Duplicate }; function Page() { return <main><Original /><Components.Summary /></main>; }`],
    ["opening and closing member component", `${summaryComponentSource} const Components = { Summary: Duplicate }; function Page() { return <main><Original /><Components.Summary></Components.Summary></main>; }`],
    ["unresolved member component", `${summaryComponentSource} function Page() { return <main><Original /><Unknown.Summary /></main>; }`],
    ["member component alias", `${summaryComponentSource} const Components = { Summary: Duplicate }; const Alias = Components.Summary; function Page() { return <main><Original /><Alias /></main>; }`],
  ] as const) {
    assert.throws(
      () => assertSingleInvoiceFinancialSummary(source),
      /could not resolve (?:rendered member component|local rendered output: Alias)/,
      `${name} must fail closed`,
    );
  }

  assertSingleInvoiceFinancialSummary(`
    function LocalSummary() { return <section><p>Approved Quotation Total</p><p>Previous Invoices / Deposits</p><p>Tax/VAT</p></section>; }
    const Alias = LocalSummary;
    function Page() { return <main><Alias /><p>Deposit Amount</p><p>Final Amount Due</p><p>Amount Paid</p><p>Balance Due</p></main>; }
  `);

  assert.throws(
    () => assertSingleInvoiceFinancialSummary(`${summaryComponentSource} function Page() { return <main><Original />{unknownOutput}</main>; }`),
    /could not resolve rendered identifier: unknownOutput/,
    "an unresolved rendered identifier must fail closed",
  );

  for (const [name, expression] of [
    ["nullish duplicate", "null ?? <Duplicate />"],
    ["logical-and duplicate", "true && <Duplicate />"],
    ["logical-or duplicate", "false || <Duplicate />"],
    ["identifier createElement duplicate", "createElement(Duplicate, null)"],
    ["React.createElement duplicate", "React.createElement(Duplicate, null)"],
    ["nested createElement array duplicate", "[null, createElement(Duplicate, null)]"],
    ["non-null wrapped duplicate", "(<Duplicate /> as unknown)!"],
    ["satisfies wrapped duplicate", "(<Duplicate /> satisfies unknown)"],
    ["spread array duplicate", "[...blocks()]"],
  ] as const) {
    assert.throws(
      () => assertSingleInvoiceFinancialSummary(`${summaryComponentSource} function blocks() { return [<Duplicate />]; } function Page() { return <main><Original />{${expression}}</main>; }`),
      /exactly one financial summary region/,
      `${name} must detect a second summary`,
    );
  }

  assert.throws(
    () => assertSingleInvoiceFinancialSummary(`${summaryComponentSource} function Page() { return <main><Original />{createElement(ExternalSummary, null)}</main>; }`),
    /could not resolve rendered component or helper: ExternalSummary/,
    "an unresolved createElement target must fail closed",
  );

  assert.throws(
    () => assertSingleInvoiceFinancialSummary(`${summaryComponentSource} const rows = [1]; function Page() { return <main><Original />{rows.flatMap(() => rows.map(() => <Duplicate />))}</main>; }`),
    /exactly one financial summary region/,
    "nested map and flatMap callbacks must detect a second summary",
  );

  assert.throws(
    () => assertSingleInvoiceFinancialSummary(`${summaryComponentSource} function blocks() { return [<Duplicate />]; } function Page() { return <main><Original />{blocks()}</main>; }`),
    /exactly one financial summary region/,
    "an array returned from a helper must detect a second summary",
  );

  assert.throws(
    () => assertSingleInvoiceFinancialSummary(`${summaryComponentSource} function passthrough(output) { return output; } function Page() { return <main><Original />{passthrough(<Duplicate />)}</main>; }`),
    /could not resolve rendered identifier: output/,
    "a helper returning an unresolved output parameter must fail closed",
  );

  assertSingleInvoiceFinancialSummary(
    validSummary.replace(
      "</section>",
      '{createElement("span", null, null, true, 1)}</section>',
    ),
  );

  assertSingleInvoiceFinancialSummary(`
    function Page() {
      return <section><p>Approved Quotation Total</p><p>Previous Invoices / Deposits</p><p>Tax/VAT</p><p>Deposit Amount</p><p>Final Amount Due</p><p>Amount Paid</p><p>Balance Due</p>{null}{undefined}{true}{false}{1}</section>;
    }
  `);

  assert.throws(
    () => assertSingleInvoiceFinancialSummary(`
      const renderers = { summary: () => <section><p>Total Amount</p><p>Amount Paid</p><p>Balance Due</p></section> };
      function Page() { return <main>{renderers.summary()}</main>; }
    `),
    /could not resolve rendered property-access output|exactly one financial summary region/,
    "a locally-resolved rendered property-access JSX producer must not bypass duplicate-summary detection",
  );
  assert.throws(
    () => assertSingleInvoiceFinancialSummary(`
      function Page() { return <main>{helpers?.renderSummary?.()}</main>; }
    `),
    /could not resolve rendered property-access output/,
    "optional property-access JSX producers must fail closed",
  );
  assertSingleInvoiceFinancialSummary(`
    const formatter = { display: () => "unrendered" };
    const ignored = formatter.display();
    function Page() { return <section><p>Approved Quotation Total</p><p>Previous Invoices / Deposits</p><p>Tax/VAT</p><p>Deposit Amount</p><p>Final Amount Due</p><p>Amount Paid</p><p>Balance Due</p><table><tbody>{[<tr key="a"><td>Line Total</td></tr>]}</tbody></table></section>; }
  `);
});

test("Invoice rendered property, element, alias, and await output fails closed", () => {
  const original = `<section><p>Approved Quotation Total</p><p>Previous Invoices / Deposits</p><p>Tax/VAT</p><p>Deposit Amount</p><p>Final Amount Due</p><p>Amount Paid</p><p>Balance Due</p></section>`;
  const duplicate = `<section><p>Total Amount</p><p>Amount Paid</p><p>Balance Due</p></section>`;
  const rendered = (declarations: string, expression: string) => `${declarations} function Page() { return <main>${original}{${expression}}</main>; }`;
  const mustFail = (name: string, declarations: string, expression: string) => {
    assert.throws(
      () => assertSingleInvoiceFinancialSummary(rendered(declarations, expression)),
      /exactly one financial summary region|could not resolve|unresolved|cycle/,
      `${name} must fail closed`,
    );
  };

  mustFail("direct property JSX", `const registry = { summary: ${duplicate} };`, "registry.summary");
  mustFail("direct element JSX", `const registry = { summary: ${duplicate} };`, 'registry["summary"]');
  mustFail("property alias JSX", `const registry = { summary: ${duplicate} }; const alias = registry.summary;`, "alias");
  mustFail("element alias JSX", `const registry = { summary: ${duplicate} }; const alias = registry[\"summary\"];`, "alias");
  mustFail("any property", "const registry: { summary: any } = { summary: null };", "registry.summary");
  mustFail("unknown property", "const registry: { summary: unknown } = { summary: null };", "registry.summary");
  mustFail("ReactNode property", "declare const registry: { summary: ReactNode };", "registry.summary");
  mustFail("array JSX property", `const registry: { summary: JSX.Element[] } = { summary: [${duplicate}] };`, "registry.summary");
  mustFail("dynamic element output", "declare const key: string; const registry: Record<string, unknown> = {};", "registry[key]");
  mustFail("awaited JSX", `const renderer: { summary: Promise<JSX.Element> } = null as never;`, "await renderer.summary");
  mustFail("awaited property JSX", `const renderer: { summary: Promise<JSX.Element> } = null as never;`, "await renderer[\"summary\"]");
  mustFail("awaited helper summary", `async function summary() { return ${duplicate}; }`, "await summary()");
  mustFail("awaited unknown", "const renderer: { summary: Promise<unknown> } = { summary: Promise.resolve(null) };", "await renderer.summary");
  mustFail("object member alias cycle", "const first = { summary: second.summary }; const second = { summary: first.summary };", "first.summary");

  for (const [name, declaration, expression] of [
    ["string property", "const registry: { summary: string } = { summary: \"safe\" };", "registry.summary"],
    ["number property", "const registry: { summary: number } = { summary: 1 };", "registry.summary"],
    ["primitive nullable union", "const registry: { summary: string | number | null | undefined | boolean } = { summary: null };", "registry.summary"],
    ["awaited primitive", "const renderer: { summary: Promise<string | null> } = null as never;", "await renderer.summary"],
  ] as const) {
    assertSingleInvoiceFinancialSummary(rendered(declaration, expression), `invoice-property-${name}.tsx`);
  }

  assertSingleInvoiceFinancialSummary(rendered(`const registry = { summary: ${duplicate} }; const ignored = registry.summary;`, "null"));
  assertSingleInvoiceFinancialSummary(readFileSync(INVOICE_PDF, "utf8"), INVOICE_PDF);
});

test("Invoice print CSS parser enforces selector isolation, footer flow, and page-break safety", () => {
  assertInvoicePrintCssContract(`
    @media print {
      .invoice-print-document { padding: 4mm !important; }
      .invoice-print-item-table thead { display: table-header-group; }
      .invoice-print-item-table tr { break-inside: avoid; page-break-inside: avoid; }
      .invoice-print-summary { gap: 4mm; }
      .invoice-print-footer { margin-top: 2mm; break-inside: avoid; page-break-inside: avoid; }
      /* .invoice-print-footer { position: fixed; break-before: page; } */
    }
  `);

  assertInvoicePrintCssContract(`
    @media print {
      .invoice-print-summary { content: "semicolon; stays quoted"; background-image: url("data:text/plain;a;b"); width: calc(var(--document-width, 100%) - 2mm); }
      .invoice-print-item-table thead { display: table-header-group; }
    }
  `);

  for (const [name, css] of [
    ["absolute footer", "@media print { .invoice-print-footer { position: absolute; } }"],
    ["fixed footer", "@media print { .invoice-print-footer { position: fixed; } }"],
    ["root break before page", "@media print { .invoice-print-document { break-before: page; } }"],
    ["summary break after page", "@media print { .invoice-print-summary { break-after: page; } }"],
    ["legacy page break before", "@media print { .invoice-print-summary { page-break-before: always; } }"],
    ["legacy page break after", "@media print { .invoice-print-summary { page-break-after: always; } }"],
    ["important modern break", "@media print { .invoice-print-summary { break-after: page !important; } }"],
    ["screen then print media list", "@media screen, print { .invoice-print-summary { break-after: page; } }"],
    ["print then screen media list", "@media print, screen { .invoice-print-summary { break-after: page; } }"],
    ["mixed selector list", "@media print { .invoice-print-summary, .quotation-print-summary { margin-bottom: 4mm; } }"],
    ["Invoice selector with unrelated selector", "@media print { .invoice-print-summary, .neighbor { margin-bottom: 4mm; } }"],
    ["unscoped table behavior", "@media print { table { display: table-header-group; } }"],
    ["generic body Invoice behavior", "@media print { body { break-inside: avoid; } }"],
    ["A4 forced break", "@media print { .a4-page { break-after: page; } }"],
    ["recto break before", "@media print { .invoice-print-summary { break-before: recto; } }"],
    ["verso break after", "@media print { .invoice-print-summary { break-after: verso; } }"],
    ["legacy recto break", "@media print { .invoice-print-summary { page-break-before: recto !important; } }"],
    ["functional body root", "@media print { :where(body) { break-after: page; } }"],
    ["functional is body root", "@media print { :is(body) { break-after: page; } }"],
    ["functional html body root", "@media print { :where(html, body) { break-after: page; } }"],
    ["functional A4 root", "@media print { :is(.a4-page) { break-after: page; } }"],
    ["nested functional generic root", "@media print { :where(:is(body)) { break-after: page; } }"],
    ["uppercase body root", "@media print { BODY { break-after: page; } }"],
    ["mixed-case WHERE root", "@media print { :WHERE(body) { break-after: page; } }"],
    ["mixed-case Is A4 root", "@media print { :Is(.a4-page) { break-after: page; } }"],
    ["escaped body root", "@media print { b\\6f dy { break-after: page; } }"],
    ["leading escaped body root", "@media print { \\62 ody { break-after: page; } }"],
    ["escaped html root", "@media print { h\\74 ml { break-after: page; } }"],
    ["escaped A4 root", "@media print { .a4\\-page { break-after: page; } }"],
    ["nested escaped functional root", "@media print { :WHERE(:Is(b\\6f dy)) { break-after: page; } }"],
    ["malformed selector escape", "@media print { body\\{ break-after: page; } }"],
    ["custom forced page", "@media print { .invoice-print-summary { --forced: page; break-after: var(--forced); } }"],
    ["custom forced recto", "@media print { .invoice-print-summary { --forced: recto; break-before: var(--forced); } }"],
    ["nested custom forced verso", "@media print { .invoice-print-summary { --first: var(--second); --second: verso; break-after: var(--first); } }"],
    ["missing custom property", "@media print { .invoice-print-summary { break-after: var(--missing); } }"],
    ["forced fallback page", "@media print { .invoice-print-summary { break-after: var(--missing, page); } }"],
    ["custom property cycle", "@media print { .invoice-print-summary { --first: var(--second); --second: var(--first); break-after: var(--first); } }"],
    ["malformed var", "@media print { .invoice-print-summary { break-after: var(--forced; } }"],
    ["custom fixed footer", "@media print { .invoice-print-footer { --pin: fixed; position: var(--pin); } }"],
    ["custom transformed footer", "@media print { .invoice-print-footer { --move: translateY(1mm); transform: var(--move); } }"],
    ["cross-rule custom property", "@media print { .neighbor { --forced: page; } .invoice-print-summary { break-after: var(--forced); } }"],
    ["important resolved forced value", "@media print { .invoice-print-summary { --forced: page; break-after: var(--forced) !important; } }"],
    ["case-distinct custom property forced value", "@media print { .invoice-print-summary { --forced: auto; --Forced: page; break-after: var(--Forced); } }"],
    ["case-distinct missing custom property", "@media print { .invoice-print-summary { --forced: page; break-after: var(--Forced); } }"],
    ["case-distinct custom property fallback forced value", "@media print { .invoice-print-summary { --forced: auto; break-after: var(--Forced, page); } }"],
    ["case-distinct nested forced value", "@media print { .invoice-print-summary { --forced: auto; --Forced: var(--FORCED); --FORCED: page; break-after: var(--Forced); } }"],
    ["case-distinct custom property cycle", "@media print { .invoice-print-summary { --forced: var(--Forced); --Forced: var(--forced); break-after: var(--forced); } }"],
    ["case-distinct escaped custom property forced value", "@media print { .invoice-print-summary { --forced: auto; --Forced: page; break-after: \\76\\61\\72(--\\46 orced); } }"],
    ["escaped case-distinct custom property winning value", "@media print { .invoice-print-summary { --\\46 orced: auto; --Forced: page; break-after: var(--\\46 orced); } }"],
    ["important custom property wins over later normal value", "@media print { .invoice-print-summary { --forced: page !important; --forced: auto; break-after: var(--forced); } }"],
    ["later important custom property wins over normal value", "@media print { .invoice-print-summary { --forced: auto; --forced: page !important; break-after: var(--forced); } }"],
    ["later important custom property wins", "@media print { .invoice-print-summary { --forced: auto !important; --forced: page !important; break-after: var(--forced); } }"],
    ["later normal custom property wins", "@media print { .invoice-print-summary { --forced: auto; --forced: page; break-after: var(--forced); } }"],
    ["commented important custom property wins", "@media print { .invoice-print-summary { --forced: page /* lock */ !IMPORTANT; --forced: auto; break-after: var(--forced); } }"],
    ["important nested custom property wins", "@media print { .invoice-print-summary { --first: var(--second); --second: page !important; --second: auto; break-after: var(--first); } }"],
    ["important escaped custom property wins", "@media print { .invoice-print-summary { --forced: page !important; --forced: auto; break-after: \\76\\61\\72(--forced); } }"],
    ["important custom property with important guarded declaration", "@media print { .invoice-print-summary { --forced: page !important; --forced: auto; break-after: var(--forced) !important; } }"],
    ["important custom property fixes footer", "@media print { .invoice-print-footer { --pin: fixed !important; --pin: static; position: var(--pin); } }"],
    ["important custom property transforms footer", "@media print { .invoice-print-footer { --move: translateY(1mm) !important; --move: none; transform: var(--move); } }"],
    ["malformed important suffix", "@media print { .invoice-print-summary { --forced: auto !important later; break-after: var(--forced); } }"],
    ["unclosed quote", "@media print { .invoice-print-summary { content: 'broken; } }"],
    ["unclosed parenthesis", "@media print { .invoice-print-summary { width: calc(100% - 2mm; } }"],
    ["malformed declaration boundary", "@media print { .invoice-print-summary { break-after page; } }"],
    ["malformed css", "@media print { .invoice-print-summary { break-after: page; }"],
    ["malformed media list", "@media screen, { .invoice-print-summary { break-after: page; } }"],
  ] as const) {
    assert.throws(
      () => assertInvoicePrintCssContract(css),
      /Invoice|CSS parser/,
      `${name} must fail the Invoice print CSS contract`,
    );
  }

  for (const [name, selector] of [
    ["root then body", ":root > body"],
    ["universal then body", "* > body"],
    ["wrapper descendant body", ".wrapper body"],
    ["adjacent uppercase body", ".shell + BODY"],
    ["html then body", "html > body"],
    ["escaped body after combinator", ".shell > \\62 ody"],
    ["escaped html after combinator", ".shell > h\\74 ml"],
    ["escaped A4 after combinator", ".shell > .a4\\-page"],
    ["where nested body", ":where(.wrapper > body)"],
    ["is nested body", ":is(.wrapper body, .safe)"],
    ["nested functional body", ":where(:is(.shell > body))"],
    ["body not safe", "body:not(.safe)"],
  ] as const) {
    assert.throws(
      () => assertInvoicePrintCssContract(`@media print { ${selector} { break-after: page; } }`),
      /Invoice|CSS parser/,
      `${name} must detect a protected root in every compound position`,
    );
  }
  assert.throws(
    () => assertInvoicePrintCssContract("@media print { .shell > > body { break-after: page; } }"),
    /CSS parser/,
    "malformed selector combinators must fail closed",
  );
  for (const selector of ['[data-target="body"]', '[class~="body"]', ".some-body-card", ":not(body)", ":has(body)"]) {
    assertInvoicePrintCssContract(`@media print { ${selector} { break-after: page; } }`);
  }

  for (const [name, css] of [
    ["escaped var page", ".invoice-print-summary { --forced: page; break-after: \\76\\61\\72(--forced); }"],
    ["hex escaped var recto", ".invoice-print-summary { --forced: recto; break-before: \\000076 ar(--forced); }"],
    ["mixed escaped var verso", ".invoice-print-summary { --forced: verso; break-after: v\\61r(--forced); }"],
    ["uppercase escaped var", ".invoice-print-summary { --forced: page; break-after: V\\41R(--forced); }"],
    ["escaped var fixed", ".invoice-print-footer { --pin: fixed; position: \\76\\61\\72(--pin); }"],
    ["escaped var absolute", ".invoice-print-footer { --pin: absolute; position: \\76\\61\\72(--pin); }"],
    ["escaped var transform", ".invoice-print-footer { --move: translateY(1mm); transform: \\76\\61\\72(--move); }"],
    ["escaped var missing", ".invoice-print-summary { break-after: \\76\\61\\72(--missing); }"],
    ["escaped var fallback page", ".invoice-print-summary { break-after: \\76\\61\\72(--missing, page); }"],
    ["escaped env", ".invoice-print-summary { break-after: \\65 nv(safe-area-inset-top); }"],
    ["escaped attr", ".invoice-print-summary { break-after: \\61 ttr(data-break); }"],
    ["nested escaped var", ".invoice-print-summary { --first: \\76\\61\\72(--second); --second: page; break-after: \\76\\61\\72(--first); }"],
    ["cyclic escaped var", ".invoice-print-summary { --first: \\76\\61\\72(--second); --second: \\76\\61\\72(--first); break-after: \\76\\61\\72(--first); }"],
    ["cross-rule escaped var", ".neighbor { --forced: page; } .invoice-print-summary { break-after: \\76\\61\\72(--forced); }"],
    ["important escaped var", ".invoice-print-summary { --forced: page; break-after: \\76\\61\\72(--forced) !important; }"],
    ["malformed escaped function", ".invoice-print-summary { break-after: \\76\\61\\72(--forced; }"],
  ] as const) {
    assert.throws(
      () => assertInvoicePrintCssContract(`@media print { ${css} }`),
      /Invoice|CSS parser/,
      `${name} must fail the guarded print contract`,
    );
  }

  assertInvoicePrintCssContract(`
    @media print {
      .neighbor { break-after: page; }
      .quotation-print-summary { page-break-after: always; }
      .invoice-print-item-table thead { display: table-header-group; }
      .invoice-print-item-table tr { break-inside: avoid; page-break-inside: avoid; }
    }
  `);
  assertInvoicePrintCssContract("@media print { :where(.dashboard-card) { margin: 2mm; } }");
  assertInvoicePrintCssContract("@media print { .DASHBOARD-CARD { break-after: page; } }");
  assertInvoicePrintCssContract("@media print { .d\\61 shboard-card { break-after: page; } }");
  assertInvoicePrintCssContract("@media print { .invoice-print-summary { break-after: var(--missing, auto); } }");
  assertInvoicePrintCssContract("@media print { .invoice-print-summary { --unused: page; break-after: auto; } }");
  assertInvoicePrintCssContract("@media print { .invoice-print-summary { break-after: \\76\\61\\72(--missing, auto); } }");
  assertInvoicePrintCssContract("@media print { .invoice-print-summary { --Forced: auto; break-after: \\76\\61\\72(--\\46 orced); } }");
  assertInvoicePrintCssContract("@media print { .invoice-print-summary { --forced: page; --Forced: auto; break-after: var(--Forced); } }");
  assertInvoicePrintCssContract("@media print { .invoice-print-summary { break-after: var(--Forced, auto); } }");
  assertInvoicePrintCssContract("@media print { .invoice-print-summary { --forced: page; --Forced: var(--FORCED); --FORCED: auto; break-after: var(--Forced); } }");
  assertInvoicePrintCssContract("@media print { .invoice-print-summary { --forced: page; --Forced: auto; break-after: \\76\\61\\72(--\\46 orced); } }");
  assertInvoicePrintCssContract("@media print { .invoice-print-summary { --\\46 orced: page; --Forced: auto; break-after: var(--\\46 orced); } }");
  assertInvoicePrintCssContract("@media print { .invoice-print-summary { --forced: page !important; --Forced: auto; break-after: var(--Forced); } }");
  assertInvoicePrintCssContract("@media print { .invoice-print-summary { --forced: page !important; --forced: auto !important; break-after: var(--forced); } }");
  assertInvoicePrintCssContract("@media print { .invoice-print-summary { --forced: page; --forced: auto; break-after: var(--forced); } }");
  assertInvoicePrintCssContract("@media print { .invoice-print-summary { --forced: auto !important; --forced: page; break-after: var(--forced); } }");
  assertInvoicePrintCssContract("@media print { .invoice-print-summary { --forced: auto /* keep */ !IMPORTANT; --forced: page; break-after: var(--forced); } }");
  assertInvoicePrintCssContract("@media print { .invoice-print-summary { --forced: auto !/* keep */IMPORTANT; --forced: page; break-after: var(--forced); } }");
  assertInvoicePrintCssContract("@media print { .invoice-print-summary { --first: var(--second); --second: page !important; --second: auto !important; break-after: var(--first); } }");
  assertInvoicePrintCssContract("@media print { .neighbor { width: \\63 alc(100% - 2mm); } }");
});

test("Invoice customer-output detector catches field, disclosure, and identity bypasses", () => {
  const bypassCases = [
    ["direct details", 'const item = {}; <div>{item.details}</div>;'],
    ["optional details", 'const item = {}; <div>{item?.details}</div>;'],
    ["bracket details", 'const item = {}; <div>{item["details"]}</div>;'],
    ["template key details", 'const item = {}; <div>{item[`details`]}</div>;'],
    ["const key details", 'const item = {}; const detailKey = "details" as const; <div>{item[detailKey as keyof typeof item]}</div>;'],
    ["chained const key details", 'const item = {}; const firstKey = "details"; const secondKey = firstKey; <div>{item[(secondKey)]}</div>;'],
    ["concatenated key details", 'const item = {}; <div>{item["de" + "tails"]}</div>;'],
    ["destructured details", 'const item = {}; const { details: internalDetail } = item; <div>{internalDetail}</div>;'],
    ["aliased details", 'const item = {}; const internalDetail = item.details; <div>{internalDetail}</div>;'],
    ["helper details", 'function getDetail(item) { return item.details; } <div>{getDetail({})}</div>;'],
    ["document rules key", 'const invoice = {}; const rulesKey = "snapshot_document_rules"; <div>{invoice[rulesKey]}</div>;'],
    ["notes key", 'const rules = {}; const notesKey = "notes"; <div>{rules[notesKey]}</div>;'],
    ["terms key", 'const rules = {}; const termsKey = "terms"; <div>{rules[termsKey]}</div>;'],
    ["unresolved computed key", 'const item = {}; <div>{item[getKey()]}</div>;'],
    ["internal actor", 'const currentUser = auth(); <div>{currentUser}</div>;'],
  ] as const;

  for (const [name, source] of bypassCases) {
    assert.throws(
      () => assertNoForbiddenCustomerOutput(source),
      /forbidden (field access|bracket access|destructured field|system disclosure|internal identity access)|unresolved computed property access/,
      `${name} must be rejected by the Invoice PDF detector`,
    );
  }
});

test("Invoice customer-output detector normalizes protected disclosure wording", () => {
  const disclosures = [
    ["space-separated", 'const disclosure = "System Generated"; <div>{disclosure}</div>;'],
    ["ASCII hyphen", 'const disclosure = "System-generated"; <div>{disclosure}</div>;'],
    ["underscore", 'const disclosure = "system_generated"; <div>{disclosure}</div>;'],
    ["repeated spaces", 'const disclosure = "SYSTEM   GENERATED"; <div>{disclosure}</div>;'],
    ["line break", 'const disclosure = "System\\nGenerated"; <div>{disclosure}</div>;'],
    ["document phrase", 'const disclosure = "System-Generated Document"; <div>{disclosure}</div>;'],
    ["generated document hyphen", 'const disclosure = "generated-document disclosure"; <div>{disclosure}</div>;'],
    ["generated document underscore", 'const disclosure = "generated_document_disclosure"; <div>{disclosure}</div>;'],
    ["prepared by", 'const disclosure = "Prepared By"; <div>{disclosure}</div>;'],
    ["prepared by hyphen", 'const disclosure = "Prepared-by"; <div>{disclosure}</div>;'],
    ["JSX text", '<div>System-generated</div>;'],
    ["pre-return constant", 'const disclosure = "System-generated"; function Page() { return <div>{disclosure}</div>; }'],
    ["helper return", 'function disclosure() { return "System-generated"; } <div>{disclosure()}</div>;'],
    ["template literal", '<div>{`System-generated`}</div>;'],
    ["Unicode dash", 'const disclosure = "System—Generated"; <div>{disclosure}</div>;'],
  ] as const;

  for (const [name, source] of disclosures) {
    assert.throws(
      () => assertNoForbiddenCustomerOutput(source),
      /forbidden system disclosure: (prepared by|system generated|system generated document|generated document disclosure)/,
      `${name} protected disclosure must be rejected`,
    );
  }
});

test("Invoice customer-output detector resolves const aliases in their lexical scope", () => {
  const cases = [
    [
      "outer protected alias is not overwritten by a later safe shadow",
      'const item = {}; const detailKey = "details"; item[detailKey]; { const detailKey = "description"; item[detailKey]; }',
    ],
    [
      "protected inner binding shadows a safe outer alias",
      'const item = {}; const detailKey = "description"; { const detailKey = "details"; item[detailKey]; }',
    ],
    [
      "sibling blocks do not contaminate one another",
      'const item = {}; { const key = "description"; item[key]; } { const key = "details"; item[key]; }',
    ],
    [
      "nested function bindings shadow the outer scope",
      'const item = {}; const key = "description"; function renderInternal() { const key = "details"; return item[key]; }',
    ],
  ] as const;

  for (const [name, source] of cases) {
    const findings = findForbiddenCustomerOutput(source);
    assert.equal(
      findings.filter((finding) => finding.includes("forbidden bracket access: details")).length,
      1,
      `${name} must produce exactly one protected access finding`,
    );
  }

  assert.throws(
    () => assertNoForbiddenCustomerOutput('const item = {}; item[key]; const key = "description";'),
    /unresolved computed property access/,
    "a same-scope alias declared after its access must fail closed",
  );
  assert.throws(
    () => assertNoForbiddenCustomerOutput('const item = {}; const firstKey = secondKey; const secondKey = firstKey; item[firstKey];'),
    /unresolved computed property access/,
    "recursive aliases must fail closed",
  );
});

test("Invoice customer-output detector permits customer and financial rendering", () => {
  assertNoForbiddenCustomerOutput(
    'const item = {}; const seller = {}; const buyer = {}; const invoice = {}; const key = "description"; <div>{item.description} {item["description"]} {item[key]} {seller.officialEmail} {seller.officialPhone} {buyer.email} {buyer.phone} {invoice.grand_total} {seller.bank?.accountName} {["first"][0]}</div>;',
  );

  for (const source of [
    '<div>Generated on 12 January</div>;',
    '<div>Document Number</div>;',
    '<div>Prepared quotation data</div>;',
    '<div>System status</div>;',
  ]) {
    assertNoForbiddenCustomerOutput(source);
  }
});

test("Invoice customer-output detector fails closed on malformed TSX", () => {
  assert.throws(
    () => assertNoForbiddenCustomerOutput('const item = {; <div>{item.description}</div>;'),
    /Invoice PDF source could not be parsed:\nTS\d+ at \d+:\d+:/,
  );
});
