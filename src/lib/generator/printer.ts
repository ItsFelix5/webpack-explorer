/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */

import {
  isLastChild,
  parentNeedsParens,
  __node,
  generatorInfosMap,
} from "./node";
import type * as t from "@babel/types";
import {
  isExpression,
  isFunction,
  isStatement,
  isClassBody,
  isTSInterfaceBody,
  isTSEnumMember,
  type SourceLocation,
} from "@babel/types";

import { type GenMapping, maybeAddMapping } from "@jridgewell/gen-mapping";
import type { Token } from "@babel/parser";
import type { Token as OutputToken } from "../../types";

const HAS_NEWLINE = /[\n\r\u2028\u2029]/;
const HAS_NEWLINE_OR_BlOCK_COMMENT_END = /[\n\r\u2028\u2029]|\*\//;

function commentIsNewline(c: t.Comment) {
  return c.type === "CommentLine" || HAS_NEWLINE.test(c.value);
}

import { TokenContext } from "./node";

const enum COMMENT_TYPE {
  LEADING,
  INNER,
  TRAILING,
}

const enum COMMENT_SKIP_NEWLINE {
  DEFAULT,
  ALL,
  LEADING,
  TRAILING,
}

const enum PRINT_COMMENT_HINT {
  SKIP,
  ALLOW,
  DEFER,
}

const enum LAST_CHAR_KINDS {
  EMPTY = 0,
  NORMAL = -1,
  INTEGER = -2,
  WORD = -3,
}

const enum INNER_COMMENTS_STATE {
  DISALLOWED = 0,
  ALLOWED = 1,
  PRINTED = 2,

  WITH_INDENT = 4,
  MASK = 3,
}

const enum PRINT_COMMENTS_RESULT {
  PRINTED_NONE = 0,
  PRINTED_SOME = 1,
  PRINTED_ALL = 2,
}

interface PrintListOptions {
  separator?: (this: Printer, last: boolean) => void;
  statement?: boolean;
  indent?: boolean;
  printTrailingSeparator?: boolean;
}

export type PrintJoinOptions = PrintListOptions & {
  statement?: boolean;
  indent?: boolean;
  trailingCommentsLineOffset?: number;
};
class Printer {
  constructor(map: GenMapping | null) {
    this.map = map;
  }

  enterDelimited() {
    const oldNoLineTerminatorAfterNode = this._noLineTerminatorAfterNode;
    if (oldNoLineTerminatorAfterNode !== null) {
      this._noLineTerminatorAfterNode = null;
    }
    return oldNoLineTerminatorAfterNode;
  }

  tokenContext: number = TokenContext.normal;

  _currentNode: t.Node | null = null;
  _currentTypeId: number | null = null;
  indent: number = 0;
  _noLineTerminator: boolean = false;
  _noLineTerminatorAfterNode: t.Node | null = null;
  _printedComments = new Set<t.Comment>();
  _lastCommentLine = 0;
  _innerCommentsState = INNER_COMMENTS_STATE.DISALLOWED;

  map: GenMapping | null = null;
  str = "";
  tokens: OutputToken[][] = [];
  _offset = 0;
  _last = 0;
  _canMarkIdName = true;
  _queuedChar: 32 | 59 | 0 = 0;

  _position = {
    line: 1,
    column: 0,
  };
  _sourcePosition: {
    identifierName: string | undefined;
    line: number | undefined;
    column: number | undefined;
  } = {
    identifierName: undefined,
    line: undefined,
    column: undefined,
  };

  /**
   * Add a semicolon to the buffer.
   */
  semicolon(force: boolean = false): void {
    if (force) {
      this._maybeIndent();
      this._flush();
      this._appendChar(59, "punctuation");
    } else {
      this._flush();
      this._queuedChar = 59;
      this.setLastChar(-1);
    }
    this._noLineTerminator = false;
  }

  /**
   * Add a right brace to the buffer.
   */

  rightBrace(node: t.Node): void {
    this.sourceWithOffset("end", node.loc, -1);
    this.token("}");
  }

  rightParens(node: t.Node): void {
    this.sourceWithOffset("end", node.loc, -1);
    this.token(")");
  }

  /**
   * Add a space to the buffer unless it is compact.
   */
  space(force: boolean = false): void {
    if (force) this._space();
    else {
      const lastCp = this.getLastChar(true);
      if (lastCp !== 0 && lastCp !== 32 && lastCp !== 10) this._space();
    }
  }

  /**
   * Writes a token that can't be safely parsed without taking whitespace into account.
   */
  word(
    str: string,
    type: OutputToken["type"] = "keyword",
    noLineTerminatorAfter: boolean = false,
  ): void {
    this.tokenContext &= TokenContext.forInOrInitHeadAccumulatePassThroughMask;

    this._maybePrintInnerComments();

    const lastChar = this.getLastChar();

    if (
      lastChar === LAST_CHAR_KINDS.INTEGER ||
      lastChar === LAST_CHAR_KINDS.WORD ||
      // prevent concatenating words and creating // comment out of division and regex
      (lastChar === 47 && str.charCodeAt(0) === 47)
    )
      this._space();
    this._append(str, type, false);

    this.setLastChar(-3);
    this._noLineTerminator = noLineTerminatorAfter;
  }

  /**
   * Writes a simple token.
   *
   * @param str The string to append.
   * @param [maybeNewline=false] Whether `str` might potentially
   *    contain a line terminator or not.
   * @param [mayNeedSpace=false] Check whether a whitespace might be
   *    needed after this token, and if so, add a whitespace after it.
   */
  token(
    str: string,
    type: OutputToken["type"] = "",
    maybeNewline = false,
    mayNeedSpace: boolean = false,
  ): void {
    this.tokenContext &= TokenContext.forInOrInitHeadAccumulatePassThroughMask;

    this._maybePrintInnerComments();

    if (mayNeedSpace) {
      const strFirst = str.charCodeAt(0);
      if (
        // space is mandatory to avoid outputting <!--
        // http://javascript.spec.whatwg.org/#comment-syntax
        (((strFirst === 45 && str === "--") ||
          // Needs spaces to avoid changing a! == 0 to a!== 0
          strFirst === 61) &&
          this.getLastChar() === 33) ||
        // Need spaces for operators of the same kind to avoid: `a+++b`
        (strFirst === 43 && this.getLastChar() === 43) ||
        (strFirst === 45 && this.getLastChar() === 45) ||
        // Needs spaces to avoid changing '34' to '34.', which would still be a valid number.
        (strFirst === 46 && this.getLastChar() === LAST_CHAR_KINDS.INTEGER)
      )
        this._space();
    }
    this._append(str, type, maybeNewline);
    this._noLineTerminator = false;
  }

  tokenChar(char: number, type: OutputToken["type"]): void {
    this.tokenContext &= TokenContext.forInOrInitHeadAccumulatePassThroughMask;

    this._maybePrintInnerComments();

    if (
      // Need spaces for operators of the same kind to avoid: `a+++b`
      (char === 43 && this.getLastChar() === 43) ||
      (char === 45 && this.getLastChar() === 45) ||
      // Needs spaces to avoid changing '34' to '34.', which would still be a valid number.
      (char === 46 && this.getLastChar() === LAST_CHAR_KINDS.INTEGER)
    )
      this._space();
    this._maybeIndent();
    this._flush();
    this._appendChar(char, type);
    this._noLineTerminator = false;
  }

  /**
   * Add a newline (or many newlines), maintaining formatting.
   * This function checks the number of newlines in the queue and subtracts them.
   * It currently has some limitations.
   * @see {Buffer#getNewlineCount}
   */
  newline(i: number = 1): void {
    if (i <= 0) return;
    if (i > 2) i = 2; // Max two lines

    i -= this._queuedChar === 0 && this._last === 10 ? 1 : 0;

    for (let j = 0; j < i; j++) this._newline();
  }

  endsWith(char: number): boolean {
    return this.getLastChar(true) === char;
  }

  getLastChar(checkQueue?: boolean): number {
    if (!checkQueue) return this._last;
    return this._queuedChar !== 0 ? this._queuedChar : this._last;
  }

  setLastChar(char: number) {
    this._last = char;
  }

  source(prop: "start" | "end", loc: SourceLocation | undefined): void {
    if (!loc || !this.map) return;

    this._normalizePosition(prop, loc, 0);
  }

  sourceWithOffset(
    prop: "start" | "end",
    loc: SourceLocation | null | undefined,
    columnOffset: number,
  ): void {
    if (!loc) return;

    if (!this.map) return;
    this._normalizePosition(prop, loc, columnOffset);
  }

  _normalizePosition(
    prop: "start" | "end",
    loc: SourceLocation,
    columnOffset: number,
  ) {
    this._flush();

    if (loc[prop]) {
      this._sourcePosition.line = loc[prop].line;
      this._sourcePosition.column = Math.max(
        loc[prop].column + columnOffset,
        0,
      );
    }
  }

  sourceIdentifierName(
    identifierName: string,
    pos?: SourceLocation["start"],
  ): void {
    if (!this._canMarkIdName) return;

    const sourcePosition = this._sourcePosition;
    sourcePosition.identifierName = identifierName;
  }

  _space(): void {
    this._flush();
    this._queuedChar = 32;
    this.setLastChar(-1);
  }

  _newline(): void {
    // Drop trailing spaces when a newline is inserted.
    if (this._queuedChar === 32) this._queuedChar = 0;
    this._flush();
    this._appendChar(10, "");
  }

  _append(str: string, type: OutputToken["type"], maybeNewline: boolean): void {
    this._maybeIndent();
    this._flush();
    const len = str.length;
    const position = this._position;
    const sourcePos = this._sourcePosition;

    this._last = -1;

    while (this.tokens.length - 1 < position.line + str.split("\n").length - 1)
      this.tokens.push([]);
    let i,
      lineIndex = position.line - 1,
      start = 0;

    while ((i = str.indexOf("\n", start)) !== -1) {
      this.tokens[lineIndex].push({
        content: str.slice(start, i + 1),
        offset: this._offset + start,
        type,
      });

      lineIndex++;
      start = i + 1;
    }
    if (start < str.length)
      this.tokens[lineIndex].push({
        content: str.slice(start),
        offset: this._offset + start,
        type,
      });

    this.str += str;
    this._offset += len;

    if (!maybeNewline && !this.map) {
      position.column += len;
      return;
    }

    const { column, identifierName } = sourcePos;
    let line = sourcePos.line;

    if (identifierName != null && this._canMarkIdName) {
      sourcePos.identifierName = undefined;
    }

    i = str.indexOf("\n");
    let last = 0;

    // If the string starts with a newline char, then adding a mark is redundant.
    // This catches both "no newlines" and "newline after several chars".
    if (this.map && i !== 0) this.mark(position, line, column, identifierName);

    // Now, find each remaining newline char in the string.
    while (i !== -1) {
      position.line++;
      position.column = 0;
      last = i + 1;

      // We mark the start of each line, which happens directly after this newline char
      // unless this is the last char.
      // When manually adding multi-line content (such as a comment), `line` will be `undefined`.
      if (last < len && line !== undefined) {
        line++;
        if (this.map) {
          maybeAddMapping(this.map, {
            generated: position,
            source: "",
            original: {
              line,
              column: 0,
            },
          });
        }
      }
      i = str.indexOf("\n", last);
    }
    position.column += len - last;
  }

  _flush(): void {
    const queuedChar = this._queuedChar;
    if (queuedChar !== 0) {
      this._appendChar(queuedChar, "");
      this._queuedChar = 0;
    }
  }

  _appendChar(
    char: number,
    type: OutputToken["type"],
    repeat: number = 1,
    useSourcePos: boolean = true,
  ): void {
    this._last = char;

    let str = char === -1 ? " " : String.fromCharCode(char);
    if (repeat > 1) str = str.repeat(repeat);

    const position = this._position;
    if (char !== 10) {
      if (this.map) {
        const sourcePos = this._sourcePosition;
        if (useSourcePos && sourcePos?.line && sourcePos?.column) {
          if (char === 32 || !sourcePos.identifierName)
            maybeAddMapping(this.map, {
              generated: position,
              source: "",
              original: {
                line: sourcePos.line,
                column: sourcePos.column,
              },
            });
          else
            maybeAddMapping(this.map, {
              name: sourcePos.identifierName,
              generated: position,
              source: "",
              original: {
                line: sourcePos.line,
                column: sourcePos.column,
              },
            });
        } else
          maybeAddMapping(this.map, {
            generated: position,
          });

        if (useSourcePos && sourcePos && char !== 32 && this._canMarkIdName)
          sourcePos.identifierName = undefined;
      }

      position.column += repeat;
    } else {
      position.line++;
      position.column = 0;
    }

    while (this.tokens.length - 1 < position.line) this.tokens.push([]);
    if (str != "\n")
      this.tokens[position.line - 1].push({
        content: str,
        offset: this._offset,
        type,
      });

    this.str += str;
    this._offset += repeat;
    this._position.column += repeat;
  }

  _maybeIndent(): void {
    const indent = this.endsWith(10) ? this.indent * 2 : 0;
    for (let i = 0; i < indent; i += 2)
      this._appendChar(-1, "indent", 2, false);
  }

  print(
    node: t.Node | null | undefined,
    noLineTerminatorAfter: boolean = false,
    resetTokenContext: boolean = false,
    // trailingCommentsLineOffset also used to check if called from printJoin
    // it will be ignored if `noLineTerminatorAfter||this._noLineTerminator`
    trailingCommentsLineOffset?: number,
    typeFallback?: OutputToken["type"],
  ) {
    if (!node) return;

    this._innerCommentsState = INNER_COMMENTS_STATE.DISALLOWED;

    const { type, loc, extra } = node;

    const nodeInfo = generatorInfosMap.get(type);
    if (nodeInfo === undefined)
      throw new ReferenceError(
        `unknown node of type ${JSON.stringify(
          type,
        )} with constructor ${JSON.stringify(node.constructor.name)}`,
      );

    const [printMethod, nodeId, needsParens] = nodeInfo;

    const parent = this._currentNode;
    const parentId = this._currentTypeId;
    this._currentNode = node;
    this._currentTypeId = nodeId;

    let oldTokenContext = 0;
    if (resetTokenContext) {
      oldTokenContext = this.tokenContext;
      if (oldTokenContext & TokenContext.forInOrInitHeadAccumulate)
        this.tokenContext = 0;
      else oldTokenContext = 0;
    }

    const parenthesized =
      extra != null && (extra.parenthesized as boolean | undefined);
    let shouldPrintParens =
      parent &&
      (parentNeedsParens(node, parent, parentId!) ||
        (needsParens != null &&
          needsParens(node, parent, parentId!, this.tokenContext, undefined)));

    if (
      !shouldPrintParens &&
      parenthesized &&
      node.leadingComments?.length &&
      node.leadingComments[0].type === "CommentBlock"
    ) {
      switch (parentId) {
        case __node("ExpressionStatement"):
        case __node("VariableDeclarator"):
        case __node("AssignmentExpression"):
        case __node("ReturnStatement"):
          break;
        case __node("CallExpression"):
        case __node("OptionalCallExpression"):
        case __node("NewExpression"):
          // @ts-expect-error checked by parentTypeId
          if (parent.callee !== node) break;
        // falls through
        default:
          shouldPrintParens = true;
      }
    }

    let indentParenthesized = false;
    if (
      !shouldPrintParens &&
      this._noLineTerminator &&
      node.leadingComments?.some(commentIsNewline)
    ) {
      shouldPrintParens = true;
      indentParenthesized = true;
    }

    let oldNoLineTerminatorAfterNode;
    if (!shouldPrintParens) {
      noLineTerminatorAfter ||=
        !!parent &&
        this._noLineTerminatorAfterNode === parent &&
        isLastChild(parent, node);
      if (noLineTerminatorAfter) {
        if (node.trailingComments?.some(commentIsNewline)) {
          if (isExpression(node)) shouldPrintParens = true;
        } else {
          oldNoLineTerminatorAfterNode = this._noLineTerminatorAfterNode;
          this._noLineTerminatorAfterNode = node;
        }
      }
    }

    if (shouldPrintParens) {
      this.token("(");
      if (indentParenthesized) this.indent++;
      this._innerCommentsState = INNER_COMMENTS_STATE.DISALLOWED;
      if (!resetTokenContext) oldTokenContext = this.tokenContext;
      if (oldTokenContext & TokenContext.forInOrInitHeadAccumulate)
        this.tokenContext = 0;
      oldNoLineTerminatorAfterNode = this._noLineTerminatorAfterNode;
      this._noLineTerminatorAfterNode = null;
    }

    this._printLeadingComments(node, parent);

    this.source("start", loc ?? undefined);
    if (loc?.identifierName != null) {
      this._canMarkIdName = false;
      this._sourcePosition.identifierName = loc.identifierName;
    }
    printMethod.apply(this, [node, parent, typeFallback]);
    if (loc?.identifierName != null) {
      this._canMarkIdName = true;
      this._sourcePosition.identifierName = undefined;
    }
    this.source("end", loc ?? undefined);

    if (shouldPrintParens) {
      this._printTrailingComments(node, parent);
      if (indentParenthesized) {
        this.indent--;
        this.newline();
      }
      this.token(")");
      this._noLineTerminator = noLineTerminatorAfter;
    } else if (noLineTerminatorAfter && !this._noLineTerminator) {
      this._noLineTerminator = true;
      this._printTrailingComments(node, parent);
    } else {
      this._printTrailingComments(node, parent, trailingCommentsLineOffset);
    }
    if (oldTokenContext) this.tokenContext = oldTokenContext;

    // end
    this._currentNode = parent;
    this._currentTypeId = parentId;

    if (oldNoLineTerminatorAfterNode != null)
      this._noLineTerminatorAfterNode = oldNoLineTerminatorAfterNode;

    this._innerCommentsState = INNER_COMMENTS_STATE.DISALLOWED;
  }

  getPossibleRaw(
    node:
      | t.StringLiteral
      | t.NumericLiteral
      | t.BigIntLiteral
      | t.DirectiveLiteral
      | t.JSXText,
  ): string | undefined {
    const extra = node.extra;
    if (
      extra?.raw != null &&
      extra.rawValue != null &&
      node.value === extra.rawValue
    )
      // @ts-expect-error: The extra.raw of these AST node types must be a string
      return extra.raw;
  }

  printJoin(
    nodes: t.Node[] | undefined | null,
    statement?: boolean,
    indent?: boolean,
    separator?: PrintJoinOptions["separator"] | null,
    printTrailingSeparator?: boolean | null,
    resetTokenContext?: boolean,
    trailingCommentsLineOffset?: number,
  ) {
    if (!nodes?.length) return;

    if (indent) this.indent++;

    const len = nodes.length;
    for (let i = 0; i < len; i++) {
      const node = nodes[i];
      if (!node) continue;

      // don't add newlines at the beginning of the file
      if (statement && i === 0 && this._last !== 0) {
        this.newline(1);
      }

      this.print(
        node,
        false,
        resetTokenContext,
        trailingCommentsLineOffset || 0,
      );

      if (separator != null) {
        if (i < len - 1) separator.call(this, false);
        else if (printTrailingSeparator) separator.call(this, true);
      }

      if (statement) {
        if (i + 1 === len) {
          this.newline(1);
        } else {
          const lastCommentLine = this._lastCommentLine;
          if (lastCommentLine > 0) {
            const offset =
              (nodes[i + 1].loc?.start.line || 0) - lastCommentLine;
            if (offset >= 0) {
              this.newline(offset || 1);
              continue;
            }
          }

          this.newline(1);
        }
      }
    }

    if (indent) this.indent--;
  }

  printAndIndentOnComments(node: t.Node) {
    const indent = node.leadingComments && node.leadingComments.length > 0;
    if (indent) this.indent++;
    this.print(node);
    if (indent) this.indent--;
  }

  printBlock(body: t.Statement) {
    if (body.type !== "EmptyStatement") this.space();

    this.print(body);
  }

  _printTrailingComments(
    node: t.Node,
    parent?: t.Node | null,
    lineOffset?: number,
  ) {
    const { innerComments, trailingComments } = node;
    // We print inner comments here, so that if for some reason they couldn't
    // be printed in earlier locations they are still printed *somewhere*,
    // even if at the end of the node.
    if (innerComments?.length) {
      this._printComments(
        COMMENT_TYPE.TRAILING,
        innerComments,
        node,
        parent,
        lineOffset,
      );
    }
    if (trailingComments?.length) {
      this._printComments(
        COMMENT_TYPE.TRAILING,
        trailingComments,
        node,
        parent,
        lineOffset,
      );
    } else {
      this._lastCommentLine = 0;
    }
  }

  _printLeadingComments(node: t.Node, parent: t.Node | null) {
    const comments = node.leadingComments;
    if (!comments?.length) return;
    this._printComments(COMMENT_TYPE.LEADING, comments, node, parent);
  }

  _maybePrintInnerComments() {
    const state = this._innerCommentsState;
    switch (state & INNER_COMMENTS_STATE.MASK) {
      case INNER_COMMENTS_STATE.DISALLOWED:
        this._innerCommentsState =
          INNER_COMMENTS_STATE.ALLOWED | INNER_COMMENTS_STATE.WITH_INDENT;
        return;
      case INNER_COMMENTS_STATE.ALLOWED:
        this.printInnerComments((state & INNER_COMMENTS_STATE.WITH_INDENT) > 0);
    }
  }

  printInnerComments(indent = true, nextToken?: Token | null) {
    const node = this._currentNode!;
    const comments = node.innerComments;
    if (!comments?.length) {
      this._innerCommentsState = INNER_COMMENTS_STATE.PRINTED;
      return;
    }

    const hasSpace = this.endsWith(32);
    if (indent) this.indent++;

    switch (
      this._printComments(
        COMMENT_TYPE.INNER,
        comments,
        node,
        undefined,
        undefined,
        nextToken,
      )
    ) {
      case PRINT_COMMENTS_RESULT.PRINTED_ALL:
        this._innerCommentsState = INNER_COMMENTS_STATE.PRINTED;
      // falls through
      case PRINT_COMMENTS_RESULT.PRINTED_SOME:
        if (hasSpace) this.space();
    }

    if (indent) this.indent--;
  }

  noIndentInnerCommentsHere() {
    this._innerCommentsState &= ~INNER_COMMENTS_STATE.WITH_INDENT;
  }

  printSequence(
    nodes: t.Node[],
    indent?: boolean,
    resetTokenContext?: boolean,
    trailingCommentsLineOffset?: number,
  ) {
    this.printJoin(
      nodes,
      true,
      indent ?? false,
      undefined,
      undefined,
      resetTokenContext,
      trailingCommentsLineOffset,
    );
  }

  printList(
    items: t.Node[] | null | undefined,
    printTrailingSeparator?: boolean | null,
    statement?: boolean,
    indent?: boolean,
    separator?: PrintListOptions["separator"],
    resetTokenContext?: boolean,
  ) {
    this.printJoin(
      items,
      statement,
      indent,
      separator ??
        ((last: boolean) => {
          this.tokenChar(44, "punctuation");
          if (!last) this.space();
        }),
      printTrailingSeparator,
      resetTokenContext,
    );
  }

  // Returns `PRINT_COMMENT_HINT.DEFER` if the comment cannot be printed in this position due to
  // line terminators, signaling that the print comments loop can stop and
  // resume printing comments at the next possible position. This happens when
  // printing inner comments, since if we have an inner comment with a multiline
  // there is at least one inner position where line terminators are allowed.
  _shouldPrintComment(
    comment: t.Comment,
    nextToken?: Token | null,
  ): PRINT_COMMENT_HINT {
    // Some plugins (such as flow-strip-types) use this to mark comments as removed using the AST-root 'comments' property,
    // where they can't manually mutate the AST node comment lists.
    if (comment.ignore) return PRINT_COMMENT_HINT.SKIP;

    if (this._printedComments.has(comment)) return PRINT_COMMENT_HINT.SKIP;

    if (
      this._noLineTerminator &&
      HAS_NEWLINE_OR_BlOCK_COMMENT_END.test(comment.value)
    ) {
      return PRINT_COMMENT_HINT.DEFER;
    }

    this._printedComments.add(comment);

    return PRINT_COMMENT_HINT.ALLOW;
  }

  _printComment(comment: t.Comment, skipNewLines: COMMENT_SKIP_NEWLINE) {
    const noLineTerminator = this._noLineTerminator;
    const isBlockComment = comment.type === "CommentBlock";

    // Add a newline before and after a block comment, unless explicitly
    // disallowed
    const printNewLines =
      isBlockComment &&
      skipNewLines !== COMMENT_SKIP_NEWLINE.ALL &&
      !noLineTerminator;

    if (
      printNewLines &&
      this._last !== 0 &&
      skipNewLines !== COMMENT_SKIP_NEWLINE.LEADING
    ) {
      this.newline(1);
    }

    switch (this.getLastChar(true)) {
      // Avoid converting a / operator into a line comment by appending /* to it
      case 47:
        this._space();
      // falls through
      case 91:
      case 123:
      case 40:
        break;

      default:
        this.space();
    }

    let val;
    if (isBlockComment) {
      val = `/*${comment.value}*/`;
      const offset = comment.loc?.start.column;
      if (offset) {
        const newlineRegex = new RegExp("\\n\\s{1," + offset + "}", "g");
        val = val.replace(newlineRegex, "\n");
      }

      val = val.replace(
        /\n(?!$)/g,
        `\n${" ".repeat(
          this._position.column +
            (this._queuedChar ? 1 : 0) +
            (this.endsWith(10) ? this.indent * 2 : 0),
        )}`,
      );
    } else if (!noLineTerminator) {
      val = `//${comment.value}`;
    } else {
      // It was a single-line comment, so it's guaranteed to not
      // contain newlines and it can be safely printed as a block
      // comment.
      val = `/*${comment.value}*/`;
    }

    this.source("start", comment.loc);
    this._append(val, "comment", isBlockComment);

    if (!isBlockComment && !noLineTerminator) this._newline();

    if (printNewLines && skipNewLines !== COMMENT_SKIP_NEWLINE.TRAILING)
      this.newline(1);
  }

  _printComments(
    type: COMMENT_TYPE,
    comments: t.Comment[],
    node: t.Node,
    parent?: t.Node | null,
    lineOffset: number = 0,
    nextToken?: Token | null,
  ): PRINT_COMMENTS_RESULT {
    const nodeLoc = node.loc;
    const len = comments.length;
    let hasLoc = !!nodeLoc;
    const nodeStartLine = hasLoc ? nodeLoc!.start.line : 0;
    const nodeEndLine = hasLoc ? nodeLoc!.end.line : 0;
    let lastLine = 0;
    let leadingCommentNewline = 0;

    const { _noLineTerminator } = this;

    for (let i = 0; i < len; i++) {
      const comment = comments[i];

      const shouldPrint = this._shouldPrintComment(comment, nextToken);
      if (shouldPrint === PRINT_COMMENT_HINT.DEFER) {
        return i === 0
          ? PRINT_COMMENTS_RESULT.PRINTED_NONE
          : PRINT_COMMENTS_RESULT.PRINTED_SOME;
      }
      if (hasLoc && comment.loc && shouldPrint === PRINT_COMMENT_HINT.ALLOW) {
        const commentStartLine = comment.loc.start.line;
        const commentEndLine = comment.loc.end.line;
        if (type === COMMENT_TYPE.LEADING) {
          let offset = 0;
          if (i === 0) {
            // Because currently we cannot handle blank lines before leading comments,
            // we always wrap before and after multi-line comments.
            if (
              this._last !== 0 &&
              (comment.type === "CommentLine" ||
                commentStartLine !== commentEndLine)
            )
              offset = leadingCommentNewline = 1;
          } else offset = commentStartLine - lastLine;

          lastLine = commentEndLine;

          if (offset > 0 && !_noLineTerminator) this.newline(offset);

          this._printComment(comment, COMMENT_SKIP_NEWLINE.ALL);

          if (i + 1 === len) {
            const count = Math.max(
              nodeStartLine - lastLine,
              leadingCommentNewline,
            );
            if (count > 0 && !_noLineTerminator) this.newline(count);

            lastLine = nodeStartLine;
          }
        } else if (type === COMMENT_TYPE.INNER) {
          const offset =
            commentStartLine - (i === 0 ? nodeStartLine : lastLine);
          lastLine = commentEndLine;

          if (offset > 0 && !_noLineTerminator) this.newline(offset);

          this._printComment(comment, COMMENT_SKIP_NEWLINE.ALL);

          if (i + 1 === len) {
            const count = Math.min(1, nodeEndLine - lastLine);
            if (count > 0 && !_noLineTerminator) this.newline(count);

            lastLine = nodeEndLine;
          }
        } else {
          const offset =
            commentStartLine - (i === 0 ? nodeEndLine - lineOffset : lastLine);
          lastLine = commentEndLine;

          if (offset > 0 && !_noLineTerminator) this.newline(offset);

          this._printComment(comment, COMMENT_SKIP_NEWLINE.ALL);
        }
      } else {
        hasLoc = false;
        if (shouldPrint !== PRINT_COMMENT_HINT.ALLOW) continue;

        if (len === 1) {
          const singleLine = comment.loc
            ? comment.loc.start.line === comment.loc.end.line
            : !HAS_NEWLINE.test(comment.value);

          const shouldSkipNewline =
            singleLine &&
            !isStatement(node) &&
            !isClassBody(parent) &&
            !isTSInterfaceBody(parent) &&
            !isTSEnumMember(node);

          if (type === COMMENT_TYPE.LEADING)
            this._printComment(
              comment,
              (shouldSkipNewline && node.type !== "ObjectExpression") ||
                (singleLine && isFunction(parent) && parent.body === node)
                ? COMMENT_SKIP_NEWLINE.ALL
                : COMMENT_SKIP_NEWLINE.DEFAULT,
            );
          else if (shouldSkipNewline && type === COMMENT_TYPE.TRAILING)
            this._printComment(comment, COMMENT_SKIP_NEWLINE.ALL);
          else this._printComment(comment, COMMENT_SKIP_NEWLINE.DEFAULT);
        } else if (
          type === COMMENT_TYPE.INNER &&
          !(node.type === "ObjectExpression" && node.properties.length > 1) &&
          node.type !== "ClassBody" &&
          node.type !== "TSInterfaceBody"
        ) {
          // class X {
          //   /*:: a: number*/
          //   /*:: b: ?string*/
          // }

          this._printComment(
            comment,
            i === 0
              ? COMMENT_SKIP_NEWLINE.LEADING
              : i === len - 1
                ? COMMENT_SKIP_NEWLINE.TRAILING
                : COMMENT_SKIP_NEWLINE.DEFAULT,
          );
        } else this._printComment(comment, COMMENT_SKIP_NEWLINE.DEFAULT);
      }
    }

    if (type === COMMENT_TYPE.TRAILING && hasLoc && lastLine)
      this._lastCommentLine = lastLine;

    return PRINT_COMMENTS_RESULT.PRINTED_ALL;
  }

  /**
   * Mark the current generated position with a source position. May also be passed null line/column
   * values to insert a mapping to nothing.
   */
  mark(
    generated: { line: number; column: number },
    line?: number,
    column?: number,
    identifierName?: string | null,
  ) {
    if (this.map) {
      if (line != null) {
        if (identifierName)
          maybeAddMapping(this.map, {
            name: identifierName ?? undefined,
            generated,
            source: "",
            original: {
              line: line,
              column: column!,
            },
          });
      } else maybeAddMapping(this.map, { generated });
    }
  }
}

export default Printer;
