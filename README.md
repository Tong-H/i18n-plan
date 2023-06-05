# i18n-plan

[中文](/README_ch.md)/[English](/README.md)

i18n-plan is an easy-to-use internationalization plugin for Javascript, supports both nodejs and browser-based applications, and should work with any Javascript framework.

**What i18n-plan can do**

- Use a sample commands provided to **generate and update your local language files**
- Provide **export and import features** to enable efficient management of local language files. Your local language files can be export as `.xls` files , and can update by import `.xls` files. This feature allows for seamless collaboration on manage the local languages files.
- Out-of-the-box **automatic translation feature powered by ChatGPT or YouDao** is currently integrated. Additionally, We provide a custom option that allows you to integrate any other translator of your choice into our procedures.
- **retrieve the text content** using its corresponding key.
- Use **template strings** to inject dynamic data into translations.

# Getting started

## install

``` shell
yarn add npx i18n-plan
or
npm -i npx i18n-plan
```

## Usage

### Create a Configuration file

- The presence of a `I18NPLAN.config.cjs` file in a directory indicates that the directory is a project's root. i18n-plan will then search for `.lan.json` files within this root directory.
- The following content is a simple case. [Here is an example configuration with detailed explanation for each setting item](/I18NPLAN.config.cjs)

```js
// The file should be export by `module.exports`
module.exports = {
	lans: ["en-US", "es-MX"],
	refer: "en-US",
	output: "build/locales"
}
```

### Manage locale language files

- After creating the Configuration file in your project's root directory, you are now able to use it.
- you can proceed to create some `.lan.json` files within your project.

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

- we have created two `.lan.json`:  `page1.lan.json` and `page2.lan.json`, and assuming that the content of the two files are:

``` json
// page1.lan.json
{
    "name": "hello, I'm the page one",
    "templateString": "what's the time? It's ${date}"
}
// page2.lan.json
{
    "name": "while I'm the page two",
}
```

- Now you can execute `npx i18n-plan` command in the terminal to generate locale files. [See details about  import / export / translation](#commands)
- During the collection process, the process will search for all files that match the `.lan.json` format, starting from the root directory. With the configuration specified above, two files will be generated in the `build/locales` directory: `en-US.json` and `es-MX.json`.
- The name of `lan.json` will takes as the `key` for it's collection. if two or more `.lan.json` file with the same name, they will be merged.

``` json
{
	"page1": {
		"name": "hello, I'm the page one",
		"templateString": "what's the time? It's ${date}"
	},
	"page2": {
		"name": "while I'm the page two",
	}
}
```

### translation

- Set `auto` to true to enable translation feature
- [Here is the detailed explanation for each setting item](/I18NPLAN.config.cjs)

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

- You can now configure your translator settings in `resolve`.
  
### ChatGPT

- [Api key](https://platform.openai.com/account/api-keys) and [Organization key](https://platform.openai.com/account/org-settings) are required.
- If you are in a district where you need to use a VPN to access ChatGPT, then `proxy` setting is required.

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

### YouDao translation

- [key and appkey](https://ai.youdao.com/console/#/service-singleton/text-translation) are required.

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

### Custom translator integration

- You can integrate your preferred translation service, like DeepL or Google

``` js
type Translator= (props: { config: Config; from: string; to: string; content:  I18NPLAN.TranslationContent[] }) => Promise<I18NPLAN.TranslationContent[] | TranslationError>
type TranslationContent = { key: string[]; value: string }
type TranslationError = {
	errorCode: number
	error: any
}

resolve: {
	custom: ({ config, from, to, content }) => {
		console.log(from, to, content );
		return new Promise((resolve, reject) => {
			resolve("my translator")
		})
	},
}
```

### Usage in your app

#### setLan

- This function saves language resources that can be obtained through imports or Ajax requests. You can invoke this function multiple times to merge language resources.
- It has two parameters:

| Parameter | Description                                                     |
| :-------- | :-------------------------------------------------------------- |
| lanRes    | it expects a language resources in json format                     |
| isReset   | it determines if the language resources should be reset or merged. default: `false` |

``` js
function setLan(lanRes: I18NPLAN.Lan, isRestore?: boolean): I18NPLAN.Lan
```

### getLan

- This function returns the value by its path
- It has two parameters:
  - The first one expects a string which is a key's path
  - The second is a boolean that determines if the language resources should be merged or reset."

| Parameter | Description                                                        |
| :-------- | :----------------------------------------------------------------- |
| key      | the path of key                                                    |
| params    | an object should be provided if the text contains template formats |

``` js
function  getLan(key: string | string[], params?: Record<string, I18NPLAN.BasicLanValue>): I18NPLAN.BasicLanValue | undefined
```

#### example

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

- Collect and Update Locale Language Files

This command will search for the `.lan.json` files in the root directory, and merges all the items within the files to generate the reference language file. This file will serve as the basis for updating other languages.

``` shell
npx i18n-plan
```

- To translate the corresponding content of the giving keys

``` js
//  If you want to translate the keys for the `name` of `page1` and `page2`
{
	"page1": {
		"name": "hello, I'm the page one",
		"templateString": "now is ${date}"
	},
	"page2": {
		"name": "while I'm the page two",
	}
}
// then expected file content be like:
 {
 	"keys": ["page1,name", "page2,name"]
 }

```

``` shell
npx i18n-plan translate path=<an absolute path which refer to a json file>
```

- export and import

``` shell
npx i18n-plan export path=<an absolute path which refer to a .xls file>
npx i18n-plan import path=<an absolute path which refer to a .xls file>
```
