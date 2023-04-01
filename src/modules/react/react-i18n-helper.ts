import { Position, Range, window } from 'vscode';
import { ParseResult, parse } from '@babel/parser';
import traverse from '@babel/traverse';

import * as t from '@babel/types';
import * as path from 'path';

import { BaseI18nHelper } from '../../base';
import { Words } from '../../interface';
import { getValue } from '../../service';
import { getId } from '../../utils/utils';

export class ReactI18nHelper extends BaseI18nHelper {

  ast: ParseResult<t.File> | undefined;

  async importMethod(): Promise<void> {
    let isImported = false;

    const visitor: any = {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      ImportDefaultSpecifier: (nodePath: any) => {
        if (nodePath.node.local.name === this.methodName) {
          isImported = true;
          nodePath.stop();
        }
      },
      // eslint-disable-next-line @typescript-eslint/naming-convention
      ImportSpecifier: (nodePath: any) => {
        if (nodePath.node.local.name === this.methodName) {
          isImported = true;
          nodePath.stop();
        }
      },
    };

    traverse(this.ast, visitor);

    if (!isImported) {
      await window?.activeTextEditor?.edit(editBuilder => {
        editBuilder.insert(new Position(0, 0), this.importCodes);
      });
    }
  }

  async replaceEditorText(): Promise<void> {
    await window?.activeTextEditor?.edit(editBuilder => {
      this.translateWords?.forEach((element: any) => {
        const { loc } = element;

        const startPosition = new Position(loc.start.line - 1, loc.start.column);
        const endPosition = new Position(loc.end.line - 1, loc.end.column);
        const selection = new Range(startPosition, endPosition);
        if (!selection) { return; }
        editBuilder.replace(selection, getValue(element, this));
      });
    });
  }

  getChineseWords(): Words[] {
    const ast = this.getAst();
    if (!ast) {
      return [];
    }
    return this.getChineseWordsByAst(ast);
  }

  private getChineseWordsByAst(ast: ParseResult<t.File>) {
    const words: Words[] = [];
    traverse(ast, {
      ["StringLiteral"]: (path: any) => {
        if (/[\u4e00-\u9fa5]/.test(path.node.value)) {
          words.push({
            value: path.node.value,
            loc: path.node.loc,
            isJsxAttr: path.parent.type === "JSXAttribute",
            id: getId(),
          });
        }
      },
      ["JSXText"]: (path: any) => {
        if (/[\u4e00-\u9fa5]/.test(path.node.value)) {
          const val = path.node.value.replace(/\n/g, '').trim();
          words.push({
            id: getId(),
            value: val,
            loc: path.node.loc,
            isJsxAttr: true,
            isJsxText: true,
            rawValue: path.node.value,
          });
        }
      },
      ["TemplateElement"]: (path: any) => {
        if (/[\u4e00-\u9fa5]/.test(path.node.value.raw)) {
          const val = path.node.value.raw.replace(/\n/g, '').trim();
          words.push({
            id: getId(),
            value: val,
            loc: path.node.loc,
            isTemplate: true,
          });
        }
      }
    });
    return words;
  }

  private getAst(): ParseResult<t.File> | undefined {
    try {
      this.ast = parse(this.fileContent, {
        sourceType: "module",
        plugins: [
          "jsx",
          [
            "decorators",
            {
              "decoratorsBeforeExport": true
            }
          ],
          "typescript",
        ],
      });
      return this.ast;
    } catch (error) {
      console.log(error);
    }
  }
}