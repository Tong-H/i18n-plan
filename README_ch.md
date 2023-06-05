# i18n-plan

[中文](/README_ch.md)/[English](/README.md)

i18n-plan 是一个简单的 i18n Javascript 插件，支持基于 Node.js 和浏览器的 App，并且应该适用于所有 Javascript 框架。

**i18n-plan 能做什么**

- **生成和更新本地语言包**，只需执行一个命令即可
- 提供**导出和导入功能**以便高效地管理本地语言包。可以将本地语言包导出为 `.xls` 文件，也可以通过导入 `.xls` 文件对本地语言包进行更新。此功能可以让团队协作管理本地语言包
- 目前已集成 **ChatGPT 和 YouDao，自动翻译功能开箱即用**。此外还提供自定义选项可以将其他翻译器集成到 `i18n-plan` 的流程中
- 通过**相应的键获取文本内容**
- 使用**模板字符串**，在翻译中注入动态数据

# 开始教程

## 安装

``` shell
yarn add i18n-plan
或
npm -i i18n-plan
```

## 用法

### 创建配置文件

- `I18NPLAN.config.cjs` 在的地方表示项目根目录
- 下面是个简单的用例 [查看示例配置文件，包含每个配置项的详细解释](#configuration)

```js
// 配置文件应该由 `module.exports` 导出
module.exports = {
	lans: ["en-US", "es-MX"],
	refer: "en-US",
	output: "build/locales"
}
```

### 管理本地语言包

- 在项目根目录创建配置文件后，就可以开始使用了
- 你可以继续在项目中添加一些 `.lan.json` 文件。 `.lan.json` 是 `i18n-plan` 的命名约定，表示该 `json` 文件是语言包的一部分

``` text
|-- project
|   |
|   |-- build
|   |	|-- locales
|   |
|   |-- page1
|   |   |-- index.js
|   |   |-- index.css
|   |   +-- page1.lan.json // new
|   |
|   `-- page2
|       |-- index.js
|       |-- index.css
|       +-- page2.lan.json // new
```

- 现在我们创建了两个 `.lan.json` 文件:  `page1.lan.json` 和 `page2.lan.json`, 假设文件内容是：

``` json
// page1.lan.json
{
    "name": "hello, I'm the page one",
    "templateString": "now is ${date}"
}
// page2.lan.json
{
    "name": "while I'm the page two"
}
```

- 现在可以在终端中执行 `npx i18n-plan` 命令来生成语言包。 [查看有关 import / export / translation 命令详情](#commands)
- 在搜集过程中, 程序会从根目录开始搜寻所有以 `.lan.json` 为后缀的文件。根据上面的配置文件, 在 `build/locales` 目录中，会生成两个文件: `en-US.json` and `es-MX.json`.
- `lan.json` 文件的名称会作为它的集合的 `key`。如果两个及以上的 `.lan.json` 文件有着相同的名称，那么这些文件的内容会被合并。

``` json
{
	"page1": {
		"name": "hello, I'm the page one",
		"templateString": "now is ${date}"
	},
	"page2": {
		"name": "while I'm the page two"
	}
}
```

### 翻译

- 将 `auto` 设为 `true` 来启用自动翻译功能
- [查看示例配置文件，包含每个配置项的详细解释](#configuration)

```js
{
	translation: {
		auto: true,
		retryTime: 0,
		interval: 1000,
		inBatch: false,
		resolve: {}
	},
}
```

- 现在你可以在 `resolve` 配置翻译相关的设置
  
#### ChatGPT

- [Api key](https://platform.openai.com/account/api-keys) 和 [Organization key](https://platform.openai.com/account/org-settings) 是必需的
- 如果你所在的地区需要通过 VPN 才能访问 ChatGPT, 那么 `proxy` 配置是必需的

``` js
interface TranslationResolveChatgpt {
	translator: "chatgpt"
	rules?: string[]
	options: {
		organization: string
		apiKey: string
	}
	proxy?: tunnel.ProxyOptions
}

resolve: {
	translator: "chatgpt",
	rules: [],
	options: {
		organization: "",
		apiKey: "",
	},
	proxy: {
		host: "127.0.0.1",
		port: 10809,
	},
},
```

#### 有道翻译

- [ID 和 应用 ID](https://ai.youdao.com/console/#/service-singleton/text-translation) 是必需的

``` js

interface TranslationResolveYoudao {
	translator: "youdao"
	options: {
		key: string
		appkey: string
		api?: string
		vocabId?: string
	}
}
	
resolve: {
	translator: "youdao",
	options: {
		key: "",
		appkey: "",
	},
},
```

#### 自定义集成

-你可以集成你需要的翻译服务到 `i18n-plan` 流程中，比如谷歌翻译或者 DeepL

``` js
type Translator= (props: { config: Config; from: string; to: string; content:  I18NPLAN.TranslationContent[] }) => Promise<I18NPLAN.TranslationContent[] | TranslationError>
type TranslationContent = { key: string[]; value: string; lanName: string }
type TranslationError = {
	errorCode: number
	error: any
}
resolve: {
	custom: ({ config, from, to, content }) => {
		return new Promise((resolve, reject) => {
			resolve(content.map(item => ({...item, value: "from the custom translation"})))
		})
	},
}
```

### 在 App 中使用

#### setLan

- 该函数用于保存语言包，你可以通过 import 来导入或者 Ajax 请求来获取。可以被调用多次来合并语言包
- 包含两个参数:

| 参数 | 描述                                                     |
| :-------- | :-------------------------------------------------------------- |
| lanRes    | Json 格式的语言包                    |
| isReset   | 是否重置已有资源，反正合并。默认: `false` |

``` js
function setLan(lanRes: I18NPLAN.Lan, isRestore?: boolean): I18NPLAN.Lan
```

### getLan

- 此函数根据路径返回键对应的值
- 包含两个参数:

| 参数 | 描述                                                        |
| :-------- | :----------------------------------------------------------------- |
| key      | key 的路径                                                   |
| params    | 一个对象，用于填充模板字符 |

``` js
function  getLan(key: string | string[], params?: Record<string, I18NPLAN.BasicLanValue>): I18NPLAN.BasicLanValue | undefined
```

#### 示例

``` js
import { setLan, getLan } from "i18n-plan"
console.log(
	setLan({
		page1: {
			name: "hello, I'm the page one",
			templateString: "what's the time? It's ${date}",
		},
	})
)
console.log(getLan("page1,templateString", { date: new Date().toLocaleTimeString() })) // what's the time? It's 11:28:45 AM
console.log(
	setLan({
		page2: {
			name: "while I'm the page two",
		},
	})
)
console.log(getLan("page2,name")) // while I'm the page two
console.log(setLan({}, true)) // {}
```

# [Commands](#commands)

- 收集和更新本地语言包
- 该命令将在根目录中查找 '.lan.json' 文件，并将文件中的所有条目合并以生成参考语言包。该文件将作为更新其他语言的基础。

``` shell
npx i18n-plan
```

- 翻译给定的 `key` 对应的内容

``` js
//  如果你想要翻译 `page1` 和 `page2` 中的 `name`
{
	"page1": {
		"name": "hello, I'm the page one",
		"templateString": "what's the time? It's ${date}"
	},
	"page2": {
		"name": "while I'm the page two",
	}
}
// 期望的文件内容是:
 {
 	"keys": ["page1,name", "page2,name"]
 }

```

``` shell
npx i18n-plan translate path=<指向 .json 文件的绝对路径>
```

- 导出和导入

``` shell
npx i18n-plan export path=<指向 .xls 文件的绝对路径>
npx i18n-plan import path=<指向 .xls 文件的绝对路径>
```

# [Configuration](#configuration)

``` js
module.exports = {
	/*
		定义翻译的目标语言。此设置中列出的每一项都是输出文件的名称。
		当与翻译功能一起使用时，每一项都将作为翻译的目标语言发送给翻译服务，所以该值必须与翻译器要求的语言代码一致
	*/
	lans: ["en-US", "es-MX", "zh-CN"],
	// 指定将用作生成其他语言参考的主要语言
	refer: "en-US",
	// 指定输出目录，相对于根目录的路径
	output: "locales",
	// 是否缓存历史增删项. 如果设为 true，你可以在 `_cache.json` 文件中找到增删项的 key
	generateCache: true,
	// 翻译配置
	translation: {
		/* 
			默认: false
			是否在同步语言包后自动化翻译。如果设置为 true，则新增加项将自动放入翻译队列中
		*/
		auto: true,
		/*
			默认: 0
			如果有翻译项失败，进行重试的次数
		*/
		 retryTime: 0,
		/*
			默认: 1000
			设置请求的时间间隔。建议避免发送过于频繁的请求
		*/
		 interval: 1000,
		/*
			默认: false
			是逐个翻译项目，还是一次性翻译某种语言的所有项目。只适用于 ChatGPT 和自定义翻译
		*/
		inBatch: true,
		/* 
			两个翻译服务开箱即用：有道和ChatGPT，此外，还提供了一个自定义函数，可以将其他翻译服务（如谷歌或DeepL）集成到我们的流程中
		*/
		resolve: {
			translator: "chatgpt",
			// 设置一个正则表达式数组，指导 ChatGPT 跳过与其匹配的特定文本，可以让 ChatGPT 排除某些单词或格式保留其原始文本
			rules: ["(<[a-zA-Z /]+>)"],
			options: {
				// organization key
				organization: "",
				// apiKey
				apiKey: "",
			},
			// 如果你所在的地区需要通过 VPN 才能访问 ChatGPT, 那么 `proxy` 配置是必需的
			proxy: {
				host: "127.0.0.1",
				port: 10809,
			},
		},
		resolve: {
			translator: "youdao",
			options: {
				api: "https://openapi.youdao.com/api",
				// key
				key: "",
				// appkey
				appkey: "",
				// 有道翻译使用自己的词典来过滤特殊单词或格式。请查看官方文档以获取详细信息
				vocabId: "",
			},
		},
		/*
			这个自定义函数允许您根据您的喜好集成其他的翻译服务
		*/ 
		resolve: {
			/*
				type Translator= (props: { config: Config; from: string; to: string; content:  I18NPLAN.TranslationContent[] }) => Promise<I18NPLAN.TranslationContent[] | TranslationError>
				type TranslationContent = { key: string[]; value: string; lanName: string }
				type TranslationError = {
					errorCode: number
					error: any
				}
			*/
			custom: ({ config, from, to, content }) => {
				return new Promise((resolve, reject) => {
					resolve(content.map(item => ({...item, value: "来自自定义翻译器"})))
				})
			},
		}
	},
}
```
