import { ExtensionContext, Position, Range, Uri, ViewColumn, WebviewPanel, window, workspace } from 'vscode';
import { ParseResult, parse } from '@babel/parser';
import traverse from '@babel/traverse';
import { nanoid } from 'nanoid';
import generator from '@babel/generator';

import * as prettier from 'prettier';
import * as t from '@babel/types';
import * as fs from 'fs';
import * as path from 'path';
import * as ejs from 'ejs';

import { sleep, translates } from './utils/utils';
import { Words } from './interface';
import { supportLangTypes } from './languages';

/**
 * 默认简体中文
 */
const DEFAULT_LANG_TYPE = 'zh';

export class Translate {

  fileContent: string;
  ast: ParseResult<t.File> | undefined;
  words: Words[] | undefined;
  currentTextDocumentFileUri: Uri | undefined;
  webviewPanel: WebviewPanel | undefined;
  context: ExtensionContext;
  titleChangeTimer: NodeJS.Timer | undefined;
  translateWords: any[] | undefined;
  projectRootPath: string | undefined;
  localesFullPath: string | undefined;
  languages: { langType: string, localeFileName: string }[] = [];
  localesPath: string | undefined;
  appId: string | undefined;
  appToken: string | undefined;
  methodName: string = 't';
  fileType: string = 'ts';
  importCodes: string = "import { t } from 'utils';\n";

  constructor(fileContent: string, context: ExtensionContext) {
    this.context = context;
    this.fileContent = fileContent;
    this.projectRootPath = workspace.workspaceFolders?.[0]?.uri?.fsPath;

    if (!this.getAndCheckSetting()) {
      return;
    };

    if (!this.projectRootPath) {
      return;
    }

    this.localesFullPath = path.join(this.projectRootPath, this.localesPath!);

    try {
      this.languages = this.getLanguages() || [];
      this.ast = this.getAst();
      this.words = this.getChineseWords();
      this.openWebview();
    } catch { }

  }

  private getAndCheckSetting() {
    this.appId = workspace.getConfiguration().get('easy-i18n-helper.Baidu App Id') as string;
    if (!this.appId) {
      window.showErrorMessage("请先参考使用文档设置百度app id");
    }

    this.appToken = workspace.getConfiguration().get('easy-i18n-helper.Baidu App Id') as string;
    if (!this.appToken) {
      window.showErrorMessage("请先参考使用文档设置百度app token");
    }

    this.localesPath = workspace.getConfiguration().get('easy-i18n-helper.Locales Path') as string;
    if (!this.localesPath) {
      window.showErrorMessage("请先参考使用文档设置存在国际化文件的文件夹地址。");
    }

    this.importCodes = workspace.getConfiguration().get('easy-i18n-helper.Import Codes') as string || this.importCodes;
    this.methodName = workspace.getConfiguration().get('easy-i18n-helper.Method Name') as string || this.methodName;
    this.fileType = workspace.getConfiguration().get('easy-i18n-helper.File Type') as string || this.fileType;

    return !!this.appId && !!this.appToken && !!this.localesPath;
  }

  private getLanguages() {
    const languages = workspace.getConfiguration().get('easy-i18n-helper.languages') as Array<string>;
    if (!languages.length) {
      return [];
    }

    return languages.map(lang => {
      let [langType, localeFileName] = lang.split(':');

      if (!supportLangTypes.includes(langType)) {
        window.showErrorMessage(`你配置的语言类型{${langType}}不在百度翻译支持的语言类型内，请检查是否输入错误。`);
        throw new Error();
      }

      // 兼容文件名和key同名的情况
      if (!localeFileName) {
        localeFileName = langType;
      }

      return {
        langType,
        localeFileName,
      };
    }).filter(o => !!o);
  }

  private openWebview(): void {

    this.currentTextDocumentFileUri = window.activeTextEditor?.document.uri;

    const columnToShowIn = window.activeTextEditor
      ? window.activeTextEditor.viewColumn
      : ViewColumn.Active;

    if (!this.webviewPanel) {
      this.webviewPanel = window.createWebviewPanel(
        'translate',
        "中文列表",
        columnToShowIn || ViewColumn.Active,
        {
          retainContextWhenHidden: true,
          enableScripts: true
        }
      );
    } else {
      this.webviewPanel.reveal(columnToShowIn);
    }

    this.webviewPanel.onDidDispose(() => {
      this.webviewPanel = undefined;
    });

    this.webviewPanel.webview.html = this.getWordWebviewHtml();

    this.webviewPanel.webview.onDidReceiveMessage(async e => {

      const { type, data } = e;

      const handleMap: any = {
        open: () => {
          if (this.currentTextDocumentFileUri) {
            if (!fs.existsSync(this.currentTextDocumentFileUri.fsPath)) {
              window.showErrorMessage('文件已被删除');
              return;
            }

            const { loc } = data;
            const startPosition = new Position(loc.start.line - 1, loc.start.column);
            const endPosition = new Position(loc.end.line - 1, loc.end.column);
            window.showTextDocument(this.currentTextDocumentFileUri, {
              selection: new Range(startPosition, endPosition),
              preview: false,
            });
          }
        },
        translate: async () => {
          if (this.webviewPanel && this.currentTextDocumentFileUri) {

            if (!fs.existsSync(this.currentTextDocumentFileUri.fsPath)) {
              window.showErrorMessage('文件已被删除');
              return;
            }

            let index = 1;

            this.titleChangeTimer = globalThis.setInterval(() => {
              if (this.webviewPanel) {
                this.webviewPanel.title = `翻译中${".".repeat(index)}`;
              } else {
                globalThis.clearInterval(this.titleChangeTimer);
              }
              index += 1;
              if (index === 4) {
                index = 1;
              }
            }, 500);

            this.webviewPanel.title = '翻译中';
            this.webviewPanel.webview.html = this.getLoadingHtml();

            try {

              if (!this.projectRootPath) {
                return;
              };

              const cnLanguage = this.languages.find(o => o.langType === DEFAULT_LANG_TYPE);
              if (!cnLanguage) {
                return;
              }

              const cnWords = this.getExistsWords(cnLanguage.localeFileName, true);

              data.forEach((item: any) => {
                if (cnWords[item.value]) {
                  item.key = cnWords[item.value];
                  item[DEFAULT_LANG_TYPE] = {
                    exists: true,
                    value: item.value,
                  };
                } else {
                  item.key = `${item.id.slice(0, 4)}${item.id.slice(-4)}`;
                  item[DEFAULT_LANG_TYPE] = {
                    exists: false,
                    value: item.value,
                  };
                }
              });

              const toTranslateLanguages = this.languages.filter(lang => lang.langType !== DEFAULT_LANG_TYPE);

              for (let i = 0; i < toTranslateLanguages.length; i += 1) {
                const lang = toTranslateLanguages[i];

                const words = this.getExistsWords(lang.localeFileName, false);
                const toTranslateWords = data.filter((item: any) => !words[item.key]).map((item: any) => item.value);

                let transResult: any = {};

                if (toTranslateWords.length) {
                  try {
                    transResult = await translates(toTranslateWords, lang.langType);
                  } catch {
                    if (this.titleChangeTimer) {
                      globalThis.clearInterval(this.titleChangeTimer);
                    }
                    // 退到中文列表页面
                    this.webviewPanel.title = "中文列表";
                    this.webviewPanel.webview.html = this.getWordWebviewHtml();
                    throw new Error();
                  }
                  if (i !== toTranslateLanguages.length - 1) {
                    await sleep(1000);
                  }
                }

                data.forEach((item: any) => {
                  const value = words[item.key];
                  item[lang.langType] = {
                    exists: !!value,
                    value: value || transResult[item.value],
                  };
                });
              }

              if (this.titleChangeTimer) {
                globalThis.clearInterval(this.titleChangeTimer);
              }

              this.translateWords = data;

              this.webviewPanel.title = '翻译';
              this.webviewPanel.webview.html = this.getTranslateWebviewHtml();

            } catch {
              // 退到中文列表页面
              this.webviewPanel.title = "中文列表";
              this.webviewPanel.webview.html = this.getWordWebviewHtml();
            }
          }
        },
        save: async () => {

          if (!this.currentTextDocumentFileUri) {
            return;
          }

          if (!fs.existsSync(this.currentTextDocumentFileUri.fsPath)) {
            window.showErrorMessage('文件已被删除');
            return;
          }

          if (!this.projectRootPath || !this.localesFullPath) {
            return;
          }

          if (!fs.existsSync(this.localesFullPath)) {
            fs.mkdirSync(this.localesFullPath);
            window.showWarningMessage(`${this.localesFullPath}文件夹不存在，已为您自动生成。`);
          }

          this.languages.forEach(lang => {

            const fullFilePath = path.join(this.localesFullPath!, `./${lang.localeFileName}.${this.fileType}`);
            if (!fs.existsSync(fullFilePath)) {
              window.showWarningMessage(`${lang.localeFileName}文件不存在，已为您自动生成。`);
              fs.writeFileSync(fullFilePath, 'export default {}');
            }

            const newWords: { key: string, value: string }[] = data.reduce((prev: { key: string, value: string }[], item: any) => {
              if (!item[lang.langType]?.exists) {
                prev.push({
                  key: item.key,
                  value: item[lang.langType]?.value,
                });
              }
              return prev;
            }, []);


            const fileContent = fs.readFileSync(fullFilePath).toString();


            const ast = parse(fileContent, { sourceType: "module" });

            const visitor: any = {
              // eslint-disable-next-line @typescript-eslint/naming-convention
              ObjectExpression(nodePath: any) {
                const { node } = nodePath;

                node.properties.push(
                  ...newWords.map((word) => {
                    return t.objectProperty(
                      t.stringLiteral(word.key),
                      t.stringLiteral(word.value),
                    );
                  })
                );
              },
            };

            traverse(ast, visitor);

            const newContent = generator(ast, {
              jsescOption: { minimal: true },
            }).code;

            const formatted = prettier.format(
              newContent,
              {
                parser: 'babel',
                trailingComma: 'all',
              }
            );


            if (formatted) {
              fs.writeFileSync(fullFilePath, formatted);
            }
          });


          if (this.currentTextDocumentFileUri) {
            await window.showTextDocument(this.currentTextDocumentFileUri);
          }

          await this.replaceEditorText();
          await this.importMethod();

          this.webviewPanel?.dispose();
        },
      };

      if (handleMap[type]) {
        handleMap[type]();
      }
    });
  }

  private async importMethod() {
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

  private async replaceEditorText() {
    await window?.activeTextEditor?.edit(editBuilder => {
      this.translateWords?.forEach((element: any) => {
        const { loc } = element;

        const startPosition = new Position(loc.start.line - 1, loc.start.column);
        const endPosition = new Position(loc.end.line - 1, loc.end.column);
        const selection = new Range(startPosition, endPosition);
        if (!selection) { return; }
        editBuilder.replace(selection, this.getValue(element));
      });
    });
  }

  private getValue(words: any) {
    const { key, value, rawValue, isJsxAttr, isJsxText, isTemplate } = words;

    if (isTemplate) {
      return `\${${this.methodName}("${key}" /* ${value} */)}`;
    }

    if (!isJsxAttr) {
      return `${this.methodName}("${key}" /* ${value} */)`;
    }

    if (isJsxText) {
      return rawValue.replace(value, `{${this.methodName}("${key}" /* ${value} */)}`);
    }

    return `{${this.methodName}("${key}" /* ${value} */)}`;
  }

  private getExistsWords(fileName: string, defaultLang: boolean) {

    const words: any = {};

    if (!this.projectRootPath || !this.localesFullPath) {
      return words;
    }

    const filePath = path.join(this.localesFullPath, `./${fileName}.${this.fileType}`);

    if (!fs.existsSync(filePath)) {
      return words;
    }

    const fileContent = fs.readFileSync(filePath).toString();

    const ast = parse(fileContent, { sourceType: "module" });

    const visitor: any = {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      ObjectProperty(nodePath: any) {
        const { node } = nodePath;
        if (defaultLang) {
          words[node.value?.value] = node.key?.value || node.key?.name;
        } else {
          words[node.key?.value || node.key?.name] = node.value?.value;
        }
      },
    };

    traverse(ast, visitor);

    return words;
  }

  private getAst(): ParseResult<t.File> | undefined {
    try {
      const ast = parse(this.fileContent, {
        sourceType: "module",
        plugins: [
          "jsx",
          "flow",
          ["decorators", { "decoratorsBeforeExport": true }],
        ],
      });
      return ast;
    } catch (error) {
      console.log(error);
    }
  }

  private getChineseWords() {
    const words: any[] = [];
    traverse(this.ast, {
      ["StringLiteral"]: (path: any) => {
        if (/[\u4e00-\u9fa5]/.test(path.node.value)) {
          words.push({
            value: path.node.value,
            loc: path.node.loc,
            isJsxAttr: path.parent.type === "JSXAttribute",
            id: nanoid(),
          });
        }
      },
      ["JSXText"]: (path: any) => {
        if (/[\u4e00-\u9fa5]/.test(path.node.value)) {
          const val = path.node.value.replace(/\n/g, '').trim();
          words.push({
            value: val,
            loc: path.node.loc,
            isJsxAttr: true,
            needAdd: true,
            isJsxText: true,
            id: nanoid(),
            rawValue: path.node.value,
          });
        }
      },
      ["TemplateElement"]: (path: any) => {
        if (/[\u4e00-\u9fa5]/.test(path.node.value.raw)) {
          const val = path.node.value.raw.replace(/\n/g, '').trim();
          words.push({
            value: val,
            loc: path.node.loc,
            id: nanoid(),
            rawValue: path.node.value,
            isTemplate: true,
          });
        }
      }
    });
    return words;
  }

  private getTranslateWebviewHtml() {
    let html = fs.readFileSync(
      path.join(this.context.extensionPath, './src/html/translate.ejs')
    ).toString();
    html = ejs.render(html, {
      words: this.translateWords,
      languages: this.languages,
    });
    return html;
  }

  private getWordWebviewHtml() {
    let html = fs.readFileSync(
      path.join(this.context.extensionPath, './src/html/word.ejs')
    ).toString();

    html = ejs.render(html, { words: this.words });

    return html;
  }

  private getLoadingHtml() {
    return fs.readFileSync(path.join(this.context.extensionPath, './src/html/loading.ejs')).toString();
  }
}

