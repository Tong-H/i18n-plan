import Crypto from "crypto-js"
import request from "request"
import { I18NPLAN } from "./type"
import tunnel from "tunnel"

const chatgpt: I18NPLAN.Translator = ({ config, from, to, content }) => {
	const { options, rules, proxy } = config.translation?.resolve as I18NPLAN.TranslationResolveChatgbt
	return new Promise(async (resolve, reject) => {
		const { Configuration, OpenAIApi } = await import("openai")
		const configuration = new Configuration({
			organization: options.organization,
			apiKey: options.apiKey,
		})
		const openai = new OpenAIApi(configuration)
		// const response = await openai.listEngines();
		// console.log(response.data);
		const _content = JSON.stringify(Object.fromEntries(content.map((item, index) => [index, item.value])))
		const reg = ["(${[a-zA-Z]+})", ...(rules || [])].join("|")
		const message = `It's a key-value structure, keep the key and translate the value to ${to}. If any part of the value is meet this regular expression ${reg}, then don't change the met part. However, your response must be and only be a key-value structure.`

		const completion = await openai
			.createChatCompletion(
				{
					model: "gpt-3.5-turbo",
					messages: [
						{
							role: "system",
							content: message,
						},
						{
							role: "user",
							content: _content,
						},
					],
				},
				proxy
					? {
							httpsAgent: tunnel.httpsOverHttp({
								proxy: {
									host: "127.0.0.1",
									port: 10809,
								},
							}),
					  }
					: {}
			)
			.then((res) => {
				try {
					if (!res.data.choices[0].message) {
						return { errorCode: -2, error: { messgae: "empty translation" } }
					}
					const response = JSON.parse(
						res.data.choices[0].message?.content.replace(/(?<=\}) \(.*$/, (r1) => {
							console.log(r1, "sdsdsd")
							return ""
						})
					)
					return content.map((item, index) => ({ ...item, value: response[index] }))
				} catch (error) {
					return { errorCode: -2, error: res.data.choices[0].message }
				}
			})
			.catch((error) => {
				return { errorCode: -1, error: error.response.data }
			})
		if (completion instanceof Array) resolve(completion)
		else resolve(completion)
	})
}
const youdao: I18NPLAN.Translator = ({ config, from, to, content }) => {
	const { options } = config.translation?.resolve as I18NPLAN.TranslationResolveYoudao
	return new Promise((resolve, reject) => {
		if (options === undefined) {
			resolve({ errorCode: -2, error: "options are undefined" })
			return
		}
		function truncate(q: string) {
			const len = q.length
			if (len <= 20) return q
			return q.substring(0, 10) + len + q.substring(len - 10, len)
		}

		const appKey = options.appkey
		const key = options.key
		const salt = new Date().getTime()
		const curtime = Math.round(new Date().getTime() / 1000)
		const str1 = appKey + truncate(content[0].value) + salt + curtime + key

		const sign = Crypto.SHA256(str1).toString(Crypto.enc.Hex)
		const data = {
			q: content[0].value,
			appKey: appKey,
			salt: salt,
			from: from,
			to: to,
			sign: sign,
			signType: "v3",
			curtime: curtime,
			vocabId: options.vocabId || "",
		}
		request.post(typeof options.api === "string" ? options.api : "https://openapi.youdao.com/api", { form: data }, (error, response, body) => {
			if (error) {
				resolve({ errorCode: -1, error: body })
				return
			}
			try {
				const _res = JSON.parse(body)
				_res.translation ? resolve([{ key: content[0].key, value: _res.translation[0] }]) : resolve({ errorCode: -2, error: { messgae: "empty translation" } })
			} catch (error) {
				resolve({ errorCode: -2, error: error })
			}
		})
	})
}

export default { chatgpt, youdao }
