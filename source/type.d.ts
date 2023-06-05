
export namespace I18NPLAN {
	type setLan = (lanRes: I18NPLAN.Lan, isRestore?: boolean) => I18NPLAN.Lan
	type getLan = (key: string | string[], params?: Record<string, I18NPLAN.BasicLanValue>) => I18NPLAN.BasicLanValue | undefined
	interface Config {
		lans: string[]
		refer: string
		output: string
		generateCache?: boolean
		translation?: {
			auto?: boolean
			retryTime?: number
			interval?: number
			inBatch?: boolean
			resolve?: TranslationResolveYoudao | TranslationResolveChatgpt | TranslationResolveCustom
		}
	}
	type BasicLanValue = null | string | number | boolean
	type LanValue = LanValue | Lan
	interface Lan {
		[x: string]: LanValue
	}
	type LanMap = Map<string[], BasicLanValue | undefined>
	interface TranslationItem {
		lanName: string
		value: BasicLanValue
		key: string[]
	}
	interface Item {
		key: string[]
		value: LanValue
	}
	interface CollectedLans {
		name: string
		path: string
		result: Lan
		added: Item[]
		removed?: Item[]
	}

	interface TranslationResolveYoudao {
		translator: "youdao"
		options: {
			key: string
			appkey: string
			api?: string
			vocabId?: string
		}
	}
	interface TranslationResolveChatgpt {
		translator: "chatgpt"
		rules?: string[]
		options: {
			organization: string
			apiKey: string
		}
		proxy?: tunnel.ProxyOptions
	}
	interface TranslationResolveCustom{
		custom:  Translator
	}
	type Translator= (props: { config: Config; from: string; to: string; content:  I18NPLAN.TranslationContent[] }) => Promise<I18NPLAN.TranslationContent[] | TranslationError>
	type TranslationContent = { key: string[]; value: string }
	type TranslationError = {
		errorCode: number
		error: any
	}
	
}
