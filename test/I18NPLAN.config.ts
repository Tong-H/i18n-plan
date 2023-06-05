import  {I18NPLAN} from "../source/type"

const config: I18NPLAN.Config = {
	lans: ["en", "zh-CHS", "es-MX"],
	refer: "en",
	output: "test/locals",
	generateCache: true,
	translation: {
		auto: true,
		retryTime: 3,
		// custom: (config, detail) => {
		// 	return new Promise<string>((resolve, reject) => {
		// 		resolve("my translation")
		// 	})
		// },
		resolve: {
			translator: "youdao",
			options: {
				key: "b9Mj06A22QVXtYksYWaNwlXuGThbxB2x",
				appkey: "6deac4e33f0ad3a3",
				api: "https://openapi.youdao.com/api",
				vocabId: "",
			},
		},
	},
} 

export default config
