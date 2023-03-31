import { ExtensionContext, Position, Range, Uri, ViewColumn, WebviewPanel, window, workspace } from 'vscode';

import * as fs from 'fs';
import * as path from 'path';

import { Language, Words } from './interface';
import { getLoadingHtml, getTranslateWebviewHtml, getWordWebviewHtml } from './html';
import { supportLangTypes } from './languages';
import { getLocalWordsByFileName, saveToLocalFile } from './service';
import { sleep, translates } from './utils/utils';

/**
 * 默认简体中文
 */
const DEFAULT_LANG_TYPE = 'zh';

export abstract class BaseI18nHelper {
  context: ExtensionContext;
  languages: Language[] = [];
  appId: string = '';
  appToken: string = '';
  localesPath: string = '';
  importCodes: string = '';
  methodName: string = '';
  fileType: string = '';
  fileContent: string = '';
  words: Words[] = [];
  currentTextDocumentFileUri: Uri | undefined;
  webviewPanel: WebviewPanel | undefined;
  titleChangeTimer: NodeJS.Timeout | undefined;
  projectRootPath: string | undefined = '';
  localesFullPath: string = '';
  translateWords: Words[] = [];

  constructor(context: ExtensionContext) {
    this.context = context;
    this.fileContent = window.activeTextEditor?.document.getText() || this.fileContent;
    this.currentTextDocumentFileUri = window.activeTextEditor?.document.uri;
    this.projectRootPath = workspace.workspaceFolders?.[0]?.uri?.fsPath;

    this.languages = this.getLanguages() || [];

    if (!this.currentTextDocumentFileUri || !this.projectRootPath) {
      return;
    }

    if (!this.getAndCheckSetting()) {
      return;
    }

    this.localesFullPath = path.join(this.projectRootPath, this.localesPath!);

    this.words = this.getChineseWords();

    if (!this.words?.length) {
      return;
    }

    this.openWordsPage();
  }

  /**
   * 获取并检查用户配置
   */
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

  private openWordsPage() {

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

    this.webviewPanel.webview.html = getWordWebviewHtml(this.context, this.words);
    this.webviewPanel.webview.onDidReceiveMessage((e) => this.didReceiveMessageHandle(e));
  }

  private didReceiveMessageHandle(
    e: { type: string, data: any }
  ) {
    const { type, data } = e;

    const methodMap: { [k: string]: Function } = {
      open: () => {
        this.skipAndSelectWords(data as Words);
      },
      translate: () => {
        this.translate(data as Words[]);
      },
      save: async () => {
        await window.showTextDocument(this.currentTextDocumentFileUri!);
        saveToLocalFile(data as Words[], this);
        await this.replaceEditorText();
        await this.importMethod();
        this.webviewPanel?.dispose();
      },
    };

    if (methodMap[type]) {
      methodMap[type]();
    }
  }

  private async getTranslateResult(
    defalutLanguage: Language, data: Words[]
  ): Promise<Words[]> {
    const defaultWords = getLocalWordsByFileName(defalutLanguage.localeFileName, true, this);

    data.forEach((item: any) => {
      if (defaultWords[item.value]) {
        item.key = defaultWords[item.value];
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

      const words = getLocalWordsByFileName(lang.localeFileName, false, this);
      const toTranslateWords = data.filter((item: any) => !words[item.key]).map((item: any) => item.value);

      let transResult: any = {};

      if (toTranslateWords.length) {
        try {
          transResult = await translates(toTranslateWords, lang.langType);
        } catch {
          return [];
        }
        if (i !== toTranslateLanguages.length - 1) {
          await sleep(1000);
        }
      }

      data.forEach((item: Words) => {
        const value = words[item.key!];
        item[lang.langType] = {
          exists: !!value,
          value: value || transResult[item.value],
        };
      });

    }
    return data;
  }

  private async translate(data: Words[]) {

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
      this.webviewPanel.webview.html = getLoadingHtml(this.context);

      if (!this.projectRootPath) {
        return;
      };

      const defalutLanguage = this.languages.find(o => o.langType === DEFAULT_LANG_TYPE);
      if (!defalutLanguage) {
        return;
      }

      this.translateWords = await this.getTranslateResult(defalutLanguage, data);

      if (!this.translateWords.length) {
        if (this.titleChangeTimer) {
          globalThis.clearInterval(this.titleChangeTimer);
        }

        if (this.webviewPanel) {
          // 退到中文列表页面
          this.webviewPanel.title = "中文列表";
          this.webviewPanel.webview.html = getWordWebviewHtml(this.context, this.words);
        }
        return;
      }

      if (this.titleChangeTimer) {
        globalThis.clearInterval(this.titleChangeTimer);
      }

      this.webviewPanel.title = '翻译';
      this.webviewPanel.webview.html = getTranslateWebviewHtml(this.context, this.translateWords, this.languages);
    }
  }

  private skipAndSelectWords(data: Words) {
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

  /**
   * 获取所有中文词组
   */
  abstract getChineseWords(): Words[];

  /**
   * 导入国际化方法
  */
  abstract importMethod(): Promise<void>;

  /**
   * 用格式化后的内容替换中文
   */
  abstract replaceEditorText(): Promise<void>;
}