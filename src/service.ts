import { window } from 'vscode';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import generator from '@babel/generator';

import * as t from '@babel/types';
import * as prettier from 'prettier';
import * as fs from 'fs';
import * as path from 'path';

import type { BaseI18nHelper } from './base';
import { Words } from './interface';

export const saveToLocalFile = (
  data: Words[],
  instance: BaseI18nHelper,
) => {
  if (!instance.currentTextDocumentFileUri) {
    return;
  }

  if (!fs.existsSync(instance.currentTextDocumentFileUri.fsPath)) {
    window.showErrorMessage('文件已被删除');
    return;
  }

  if (!instance.projectRootPath || !instance.localesFullPath) {
    return;
  }

  if (!fs.existsSync(instance.localesFullPath)) {
    fs.mkdirSync(instance.localesFullPath);
    window.showWarningMessage(`${instance.localesFullPath}文件夹不存在，已为您自动生成。`);
  }

  instance.languages.forEach(lang => {

    const fullFilePath = path.join(instance.localesFullPath!, `./${lang.localeFileName}.${instance.fileType}`);
    if (!fs.existsSync(fullFilePath)) {
      window.showWarningMessage(`${lang.localeFileName}文件不存在，已为您自动生成。`);
      fs.writeFileSync(fullFilePath, 'export default {}');
    }

    const newWords = data.reduce((prev: { key: string, value: string }[], item: any) => {
      if (!item[lang.langType]?.exists && prev.some(o => o.key === item.key)) {
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
};

export const getValue = (
  words: any,
  instance: BaseI18nHelper,
) => {
  const { key, value, rawValue, isJsxAttr, isJsxText, isTemplate } = words;

  if (isTemplate) {
    return `\${${instance.methodName}("${key}" /* ${value} */)}`;
  }

  if (!isJsxAttr) {
    return `${instance.methodName}("${key}" /* ${value} */)`;
  }

  if (isJsxText) {
    return rawValue.replace(value, `{${instance.methodName}("${key}" /* ${value} */)}`);
  }

  return `{${instance.methodName}("${key}" /* ${value} */)}`;
};

export const getLocalWordsByFileName = (
  fileName: string,
  defaultLang: boolean,
  instance: BaseI18nHelper,
) => {

  const words: any = {};

  if (!instance.projectRootPath || !instance.localesFullPath) {
    return words;
  }

  const filePath = path.join(instance.localesFullPath, `./${fileName}.${instance.fileType}`);

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
};
