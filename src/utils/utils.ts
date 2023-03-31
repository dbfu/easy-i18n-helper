import * as vscode from 'vscode';
import * as http from 'http';
import * as querystring from 'querystring';

import MD5 from './md5';

/**
 * 批量翻译
 * @param {关键字} words 
 */
export function translates(words: string[], to = 'en'): any {
  return new Promise((resolve, reject) => {
    const appId = vscode.workspace.getConfiguration().get('easy-i18n-helper.Baidu App Id') as string;
    const appToken = vscode.workspace.getConfiguration().get('easy-i18n-helper.Baidu App Token') as string;

    const keyword = [...new Set(words)].join("\n");
    const salt = (new Date).getTime();
    const from = 'zh';
    const code = appId + keyword + salt + appToken;
    const sign = MD5(code);

    const params = querystring.stringify({
      q: keyword,
      appid: appId,
      salt,
      from,
      to,
      sign,
    });

    const options = {
      host: 'api.fanyi.baidu.com',
      port: 80,
      path: `/api/trans/vip/translate?${params}`,
      method: 'GET',
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        data += chunk;
      });
      res.on('end', () => {
        let result = JSON.parse(data);

        if (result.error_code) {
          showError(`翻译出错：${result.error_msg}`);
          reject();
        }

        // eslint-disable-next-line @typescript-eslint/naming-convention
        const { trans_result } = result;

        result = (trans_result || []).reduce((prev: any, cur: any) => {
          prev[cur.src] = cur.dst;
          return prev;
        }, {});

        resolve(result);
      });
    });

    req.on('error', error => {
      showError('翻译出错，请稍后重试。');
      console.log(error);
      reject();
    });

    req.end();
  });
}

export function sleep(time: number) {
  return new Promise((resolve: any) => {
    setTimeout(() => {
      resolve();
    }, time);
  });
}

export function showError(errorText: string) {
  if (errorText) {
    vscode.window.showErrorMessage(errorText);
  }
}
