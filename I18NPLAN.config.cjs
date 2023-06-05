module.exports = {
	// It defines the target languages for translation. Each item listed in this setting refers to the name of the output file. When used with the translation feature, each item will be send to the translator as the target language for translation.
	lans: ["en-US", "es-MX", "zh-CN"],
	// It specifies the main language that will serve as the reference for generating other languages.
	refer: "en-US",
	// It specifies the output directory. The expected value should be relative to the root directory.
	output: "locales",
	// Whether newly added and removed items should be recorded. If set to true, you will be able to find these items in the _cache.json file.
	generateCache: true,
	// Translation config
	translation: {
		/* 
			default: false
			Whether automate the translation processor after syncing language files.  The new items will automatically put in the translation queue if it set to true
		*/
		auto: true,
		/*
			default: 0
			Set the number of times the translation processor should attempt to translate if any item failed to translate. 
		*/
		 retryTime: 0,
		/*
			default: 1000
			Set a specific time interval for requests. It is recommended to avoid sending requests too quickly.
		*/
		 interval: 1000,
		/*
			default: false
			Whether translating items one by one, or translating all the items for one language at once. It's specifically for ChatGPT and Custom Translator. 
		*/
		inBatch: true,
		/* 
			Two integrated translators are out of box for automated translation: youdao and chatgpt. Additionally, a custom function is included that allows you to integrate other translation services, such as Google or DeepL, into our procedures.
		*/
		resolve: {
			translator: "chatgpt",
			// It sets up an array of regular expressions that instruct ChatGPT to skip specific text that matches them. This is especially helpful in cases where you want to exclude certain words or formats from being translated by ChatGPT. For the following example, the regular expression used to matchs HTML elements to ensure that ChatGPT preserves the matched parts of text.
			rules: ["(<[a-zA-Z /]+>)"],
			options: {
				// your organization key
				organization: "",
				// your apiKey
				apiKey: "",
			},
			// It is necessary to use this proxy configuration if you need to use vpn to access ChatGPT.
			proxy: {
				host: "127.0.0.1",
				port: 10809,
			},
		},
		resolve: {
			translator: "youdao",
			options: {
				api: "https://openapi.youdao.com/api",
				// Your key
				key: "",
				// Your appkey
				appkey: "",
				// Youdao uses its own set of vocabularies to filter out special words or formats. Check its official document for the detailed information.
				vocabId: "",
			},
		},
		/*
			This custom function allows you to integrate other translation services according to your preference
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
					resolve(content.map(item => ({...item, value: "from the custom translation"})))
				})
			},
		}
	},
}
