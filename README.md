# 效果展示
## 完整流程 
### 01
![01.gif](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/554be074ce8441a4ab50ec286d9c8777~tplv-k3u1fbpfcp-watermark.image?)
### 02 
![02.gif](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/7938a3bbba2a4e28a4bfa916afb7e56c~tplv-k3u1fbpfcp-watermark.image?)


## 删除某个中文和检测本地文件是否已经存在

![03.gif](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/499da14f75e04dc7a641abe149d2f63c~tplv-k3u1fbpfcp-watermark.image?)
1. 这里如果不想对某个中文做国际化，可以手动给删掉。
2. 如果本地已经对当前中文做过国际化，就不会再去翻译了，而是直接把对应的key取出来，直接替换代码。

## 增加国际化语言类型

![04.gif](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/6e85ec18e71a4fa8b518b7b1707efb08~tplv-k3u1fbpfcp-watermark.image?)
这里新增了一个国际化类型，翻译的时候多了一个繁体中文，保存的时候，也会检测本地文件是否存在如果不存在，会自动创建该类型文件。添加国际化语言时冒号前面是百度翻译支持的类型，后面是文件名，如果一样可以只写一个。

下面是百度翻译常用语种和对应代码。
名称     | 代码   | 名称    | 代码  | 
| ------ | ---- | ----- | --- | 
| 自动检测 | auto | 中文    | zh  | 
| 英语     | en  | 粤语     | yue  |
| 文言文   | wyw | 日语    | jp  |
| 韩语    | kor  | 法语    | fra | 
| 西班牙语 | spa | 泰语     | th   |
| 阿拉伯语 | ara | 俄语    | ru  |
| 葡萄牙语 | pt   | 德语    | de  |
| 意大利语 | it  | 希腊语    | el |
| 荷兰语   | nl  | 波兰语   | pl  |
| 保加利亚语  | bul  | 爱沙尼亚语 | est | 
| 丹麦语   | dan | 芬兰语    | fin  |
| 捷克语   | cs  | 罗马尼亚语 | rom |
| 斯洛文尼亚语 | slo  | 瑞典语   | swe | 
| 匈牙利语  | hu  | 繁体中文   | cht  | 
| 越南语  | vie | |

## react代码中出现中文的几种方式

![05.gif](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c8dc33c970434b4f950e6e76c076836e~tplv-k3u1fbpfcp-watermark.image?)
利用抽象语法树，能够精准的获取代码中的中文。


# 插件功能介绍
1. 首先在百度翻译平台开通通用文本服务，得到APP ID和密钥，然后在vscode配置中设置easy-i18n-helper.Baidu App Id和easy-i18n-helper.Baidu App Token后，就能使用该插件了。开通百度翻译服务教程在下面。
2. 在react代码文件中右键，然后点击翻译当前页面，会自动获取当前页面的中文，然后展示出来，这里如果你不想对某个中文做国际化，你可以给删除。
3. 点击名称，可以跳到对应编辑器中并选中当前中文，可以让你快速知道当前中文在代码中的位置，然后决定是否删除。
4. 点击翻译会调百度翻译公共接口去翻译，这里会检测本地是否已经存在要做国际化的中文，如果存在，则不会去调翻译接口，直接用本地的。
5. 点击翻译按钮过后，会翻译结果页面看到哪些是新增的，哪些是直接取本地的。
6. 点击保存后，会自动检测当前文件是否引入了国际化方法，如果没有引入，会自动引入，这个导入代码可以在配置里自定义。
7. 把新增的国际化内容保存到本地文件中，如果本地文件不存在，则自动创建。
8. 用国际化方法覆盖掉代码中的中文
9. 自定义语种。到vscode配置中搜索`easy-i18n-helper.languages`，然后添加一个语种，百度翻译支持的语种上面已经发过了。
10. 自定义导入国际化方法语句。到vscode配置中搜索`easy-i18n-helper.Import Codes`，然后改成自己想要的。
11. 自定义存放本地国际化文件的文件夹地址。到vscode配置中搜索`easy-i18n-helper.Locales Path`，然后改成自己的。
12. 自定义国际化文件后缀。有的项目可能没有用ts，所以这里支持去修改成js。到vscode配置中搜索`easy-i18n-helper.File Type`，然后改成其他的。
13. 自定义国际化方法名。有的项目可能不叫t，到vscode配置中搜索`easy-i18n-helper.Method Name`，然后改成其他的。
14. mac快捷键：`command+shift+t`
15. win快捷键：`ctrl+shift+t`

# 开通百度翻译翻译服务和获取app id和密钥
开通这个服务还是很简单的，整个流程大概只需要几分钟。百度翻译每个月有100w字符的免费(良心企业啊)，如果个人使用，基本可以放心的使用。这里提醒一下，如果超出100w字符，是会扣费的，所以大家要保护好自己的app id和密钥。

## 进入[百度翻译](https://fanyi-api.baidu.com)网站，登录百度账号。
## 点击下面的通用文本翻译的查看详情

![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/2c74d472b6b443bdadcb08cb268b7132~tplv-k3u1fbpfcp-watermark.image?)
## 点击立即使用

![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/99a7a309bcaf49f895e06ed2ca304f34~tplv-k3u1fbpfcp-watermark.image?)
## 这里选个人开发者，填写一下信息

![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/bb2731b59a2444ebae574cf582014ae6~tplv-k3u1fbpfcp-watermark.image?)
## 这里实名认证一下，可以开通高级版

![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/08fd506523524cf2ba896c2a725fd775~tplv-k3u1fbpfcp-watermark.image?)

## 开通文本翻译服务

![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a93da3a7604546d2aec65e1dcf747bb3~tplv-k3u1fbpfcp-watermark.image?)

## 选通用文本翻译

![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/75034c75bffa43c198306acdf46a7cf8~tplv-k3u1fbpfcp-watermark.image?)
## 开通高级版

![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/39db8cc7e39a488c90ad7bca6e4c2d86~tplv-k3u1fbpfcp-watermark.image?)
## 写个应用名，这个可以随便写一个，其他信息可以不填，提交申请，然后秒通过。

![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/3eddaea7074846e0b99e7cdc097e62b1~tplv-k3u1fbpfcp-watermark.image?)
## 到总览的下方，可以得到app id和密钥，配置到vscode中，就能使用当前插件了。

![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/eac05830a25c42a0baf0adcf745dc904~tplv-k3u1fbpfcp-watermark.image?)