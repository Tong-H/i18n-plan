import * as fs from "node:fs/promises"
import * as url from "node:url"
import { Dirent } from "node:fs"
import * as path from "node:path"
import xlsx from "node-xlsx"
import * as helper from "./index"
import Translators from "./translate"
import { I18NPLAN } from "./type"

let chalk = {
	green: (t: any) => t,
	yellow: (t: any) => t,
	blueBright: (t: any) => t,
	red: (t: any) => t,
}

export const log = console.log,
	getCommands = () => {
		const available = ["export", "import", "translate"]
		const commands = {
			for: "",
			path: "",
		}
		process.argv.forEach((item, index) => {
			const _f = available.some((_c) => _c === item)
			if (_f && !commands.for) {
				commands.for = item
				return
			}
			;/^path=/.test(item) && (commands.path = item.replace(/path=/, ""))
		})
		!commands.for && (commands.for = "collect")
		return commands
	},
	emptyDir = async (_p: string) => {
		if (!(await isExists(_p))) {
			return
		}
		const files = await fs.readdir(_p)
		await Promise.all(
			files.map((item) => {
				return fs.unlink(path.resolve(_p, item))
			})
		)
	},
	set = async (_p: string, context: any) => {
		log(chalk.green(`update ${_p}`))
		if (/.json$/.test(_p)) {
			await fs.writeFile(_p, JSON.stringify(context, null, 4))
		} else if (/.xls$/.test(_p)) {
			await fs.writeFile(_p, context)
		}
	},
	get = async <T>(_p: string): Promise<T | undefined | any> => {
		if (!(await isExists(_p))) return

		if (/.json$/.test(_p)) {
			const _r = await fs.readFile(_p, { encoding: "utf-8" })
			if (!_r) return
			try {
				return JSON.parse(_r)
			} catch (error) {
				console.error("Failed in json parse: " + _p)
				return
			}
		} else if (/.xls$/.test(_p)) {
			const _r = await fs.readFile(_p)
			if (!_r) return
			try {
				const workSheetsFromBuffer = xlsx.parse(_r)
				return workSheetsFromBuffer[0].data
			} catch (error) {
				console.error("Failed in xls transform: " + _p)
				return
			}
		}
	},
	isExists = async (_p: string): Promise<boolean> => {
		try {
			await fs.access(_p)
			return true
		} catch (error) {
			return false
		}
	},
	getLanRes = async (config: I18NPLAN.Config, destination: string) => {
		return (
			await Promise.all(
				config.lans.map(async (item) => {
					const _p = path.resolve(destination, `${item}.json`)

					if (!(await isExists(_p))) {
						return
					}
					const _lan = await get<I18NPLAN.Lan>(_p)
					if (_lan) return { name: item, result: _lan }
					return
				})
			)
		).filter(
			(
				item
			): item is {
				name: string
				result: I18NPLAN.Lan
			} => item !== undefined
		)
	},
	toFlat = (lan: I18NPLAN.Lan, map: I18NPLAN.LanMap = new Map(), mapKey: Record<string, string[]> = {}, parents: string[] = []): [typeof map, typeof mapKey] => {
		Object.entries(lan)
			.map((item) => {
				const indexes = [...parents, item[0]]
				const _i = indexes.join(",")
				mapKey[_i] = indexes

				if (typeof item[1] === "object" && item[1]) {
					map.set(mapKey[_i], undefined)
					toFlat(item[1], map, mapKey, indexes)
				} else {
					mapKey[_i] = indexes
					map.set(mapKey[_i], item[1])
				}
			})
			.flat(1)
		return [map, mapKey]
	},
	toReduce = (
		lan: I18NPLAN.Lan,
		_referResMap: I18NPLAN.LanMap,
		referResMapKey: Record<string, string[]>,
		parents: string[] = [],
		removed: { key: typeof parents; value: string }[] = []
	): { remainder: I18NPLAN.Lan; removed: typeof removed } => {
		const remainder = Object.fromEntries(
			Object.entries(lan)
				.map((item) => {
					const indexes = [...parents, item[0]]
					const _i = referResMapKey[indexes.join(",")]
					if (!_referResMap.has(_i)) {
						removed.push({ key: indexes, value: JSON.stringify(item[1]) })
						log(chalk.yellow(`removed: ${indexes}`))
						return []
					}

					if (typeof item[1] === "object" && item[1]) {
						const _children = toReduce(item[1], _referResMap, referResMapKey, indexes, removed)
						return [item[0], _children.remainder]
					}

					return item
				})
				.filter((item) => item.length === 2)
		)
		return { remainder, removed }
	},
	toAdd = (lan: I18NPLAN.Lan, _referResMap: I18NPLAN.LanMap, parents: string[] = [], added: { key: typeof parents; value: I18NPLAN.LanValue }[] = []) => {
		for (const [key, value] of _referResMap.entries()) {
			const _value = value === undefined ? {} : value
			let last: I18NPLAN.Lan = lan,
				i = 0
			while (i <= key.length - 1) {
				if (i === key.length - 1) {
					if (!(key[i] in last)) {
						last[key[i]] = _value
						added.push({ key: key, value: _value })
						log(chalk.blueBright(`added: ${key}`))
					}
				} else {
					last[key[i]] === undefined && (last[key[i]] = {})
					last = last[key[i]]
				}
				i++
			}
		}
		return { result: lan, added: added }
	},
	getConfig = async (_rootPath: string): Promise<I18NPLAN.Config | undefined> => {
		const json = await get<I18NPLAN.Config>(path.resolve(_rootPath, "I18NPLAN.config.json"))
		if (json) return json
		const href = url.pathToFileURL(path.resolve(_rootPath, "I18NPLAN.config")).href

		const js = await (async () => {
			try {
				return await import(href + ".js")
			} catch (error) {
				log(chalk.red(error))
				return
			}
		})()
		if (js) return js.default

		const cjs = await (async () => {
			try {
				return await import(href + ".cjs")
			} catch (error) {
				log(chalk.red(error))
				return
			}
		})()
		if (cjs) return cjs.default

		return
	},
	getTranslator = (config: I18NPLAN.Config) => {
		if (!config.translation || !config.translation?.resolve) return
		const _resolve = config.translation.resolve
		if (!("translator" in _resolve)) {
			const _r = _resolve as I18NPLAN.TranslationResolveCustom
			if (typeof _r.custom === "function") return _r.custom
			console.log(chalk.red("Custom translator is an invalid function"))
			return
		}
		if (_resolve.translator === "youdao") return Translators.youdao
		if (_resolve.translator === "chatgpt") return Translators.chatgpt
	},
	toTranslate = async (config: I18NPLAN.Config, lanResults: I18NPLAN.CollectedLans[]) => {
		const translation = config.translation
		if (!translation || !translation.resolve) {
			log("translation config is not set")
			return
		}
		const translator = getTranslator(config)
		if (typeof translator !== "function") {
			log(chalk.red(`translator is invalid, please check your resolve settings`))
			return
		}

		const retryTime = typeof translation.retryTime === "number" && translation.retryTime > -1 ? translation.retryTime : 0
		const timeInterval = typeof translation.interval === "number" && translation.interval > -1 ? translation.interval : 1000
		let current = 0,
			currentResult = lanResults
		const isBatch = translation.inBatch === true && ("translator" in translation.resolve ? translation.resolve?.translator !== "youdao" : true)
		
		if (isBatch) {
			let remains = lanResults
			while (current <= retryTime && remains.length > 0) {
				const error: I18NPLAN.CollectedLans[] = []
				const result = await Promise.all(
					remains.map(async (lan, lanIndex) => {
						const reminds = lanResults.length - lanIndex + 1
						const content = lan.added
							.filter((item) => item.value !== "{}")
							.map((item) => ({ ...item, lanName: lan.name }))
							.filter((item) => typeof item.value === "string")
						if (content.length === 0) return []
						const translatorProps = { config, from: config.refer, to: lan.name, content: content }
						const response = await translating(translatorProps, lanIndex * timeInterval, translator)
							.then((res) => res)
							.catch((err) => err)
						if (!(response instanceof Array)) {
							error.push(lan)
							return content
						}
						log(response)
						log(chalk.green(`${lan.name} ${JSON.stringify(response)} \n${reminds} items are waiting to translate...`))
						return response
					})
				)
				currentResult = toUpdate(result.flat(1), currentResult)
				remains = error
				current++
			}
			return currentResult
		}
		const lanItems = lanResults
			.map((_lan) =>
				_lan.added
					.filter((item) => item.value !== "{}")
					.map((item) => ({ ...item, lanName: _lan.name }))
					.filter((item) => typeof item.value === "string")
			)
			.flat(1)

		let remains = lanItems

		while (current <= retryTime && remains.length > 0) {
			const error: I18NPLAN.TranslationItem[] = []
			const result = await Promise.all(
				remains.map(async (item, index) => {
					if (typeof item.value !== "string") {
						return item
					}
					const translatorProps = { config, from: config.refer, to: item.lanName, content: [{ key: item.key, value: item.value }] }
					const response = await translating(translatorProps, index * timeInterval, translator)
					if (!response || !(response instanceof Array) || !response[0]) {
						error.push(item)
						return item
					}
					const reminds = remains.length - (index + 1)
					log(chalk.green(`${item.lanName} ${item.key} ${JSON.stringify(response)} \n${reminds} items are left for translating...`))
					return { lanName: item.lanName, key: item.key, value: response[0].value || item.value }
				})
			)

			log(result)
			currentResult = toUpdate(result, currentResult)
			remains = error
			current++
		}

		return currentResult
	},
	translating = async (params: Parameters<I18NPLAN.Translator>[0], timeInterval: number, translator: I18NPLAN.Translator) => {
		return new Promise<I18NPLAN.TranslationContent[] | undefined>((resolve, reject) => {
			setTimeout(async () => {
				const result = await translator(params)
				if (!result || (typeof result === "object" && "errorCode" in result)) {
					log(chalk.red(JSON.stringify(result, null, 4)))
					resolve(undefined)
					return
				}
				resolve(result)
			}, timeInterval)
		})
	},
	toUpdate = (lanItems: I18NPLAN.TranslationItem[], lanResults: I18NPLAN.CollectedLans[]) => {
		lanItems.forEach((item) => {
			const lan = lanResults.find((lan) => item.lanName === lan.name)
			if (!lan) return
			item.key.reduce<I18NPLAN.Lan>((previousValue, currentValue, currentIndex) => {
				if (currentIndex === item.key.length - 1) {
					if (typeof previousValue[currentValue] === "object" && previousValue[currentValue] !== null) return
					previousValue[currentValue] = item.value
				}
				return previousValue[currentValue]
			}, lan.result)
		})
		lanResults.forEach((item) => {
			set(item.path, item.result)
		})
		return lanResults
	}

const toSync = async (config: I18NPLAN.Config, destination: string, rootPath: string) => {
	const toCollect = async (paths: Dirent[] | string, parent: string): Promise<I18NPLAN.Lan[]> => {
		const empty = {}
		return (
			await Promise.all(
				(typeof paths === "string" ? [paths] : paths).map(async (item) => {
					const name = typeof item === "string" ? item : item.name

					const _p = path.resolve(rootPath, parent, name)
					if (/node_modules/.test(_p)) return empty
					if (/.git/.test(_p)) return empty

					try {
						const _ps = await fs.readdir(_p, { encoding: "utf8", withFileTypes: true })
						const res = await toCollect(_ps, _p)

						return res.length > 0 ? res : empty
					} catch (error) {}

					if (/\.lan\.json$/.test(_p)) {
						const _res = await get<I18NPLAN.Lan>(_p)
						if (!_res) return empty
						log(_p)
						const _name = path.basename(_p).replace(/\.lan\.json/, "")
						return Object.fromEntries([[_name, _res]])
					}
					return empty
				})
			)
		)
			.flat(1)
			.filter((item) => !Object.is(empty, item))
	}

	const referRes = await (async () => {
		return (await toCollect(rootPath, ""))
			.map((item) => Object.entries(item).flat(1))
			.reduce<I18NPLAN.Lan>((a, c) => {
				const _a =
					a instanceof Array
						? {
								[a[0]]: a[1],
						  }
						: a
				const [_name, _val] = c

				_a[_name] = _name in _a ? helper.merge(_a[_name], _val) : _val
				return _a
			}, {})
	})()
	const [referResMap, referResMapKey] = toFlat(referRes)

	if (!(await isExists(destination))) {
		await fs.mkdir(destination)
	}

	set(path.resolve(destination, `${config.refer}.json`), referRes)

	const lanRes = await getLanRes(config, destination)
	const lanResults = lanRes
		.filter((item) => item.name !== config.refer)
		.map((item) => {
			const _p = path.resolve(destination, `${item.name}.json`)
			const { remainder, removed } = toReduce(item.result, referResMap, referResMapKey)
			const { result, added } = toAdd(remainder, referResMap)

			set(_p, result)
			return {
				name: item.name,
				path: _p,
				result: result,
				added,
				removed,
			}
		})
		.concat(
			config.lans
				.filter((lans) => !lanRes.some((el) => el.name === lans))
				.map((item) => {
					const { result, added } = toAdd({}, referResMap),
						_p = path.resolve(destination, `${item}.json`)
					set(_p, result)
					return { name: item, result: result, path: _p, added: added, removed: [] }
				}),
			{
				name: config.refer,
				path: path.resolve(destination, `${config.refer}.json`),
				result: referRes,
				added: [],
				removed: [],
			}
		)

	const _p = path.resolve(destination, `_cache.json`)
	const cache = (await get(_p)) || {}
	const newLog = Object.fromEntries(
		lanResults
			.map((item) => [
				item.name,
				Object.fromEntries(
					Object.entries({
						added: item.added.map((el) => el.key.join(",")),
						removed: item.removed.map((el) => el.key.join(",")),
					}).filter((item) => item[1].length > 0)
				),
			])
			.filter((item) => Object.keys(item[1]).length > 0)
	)
	if (Object.keys(newLog).length > 0) {
		set(_p, {
			[new Date().toJSON()]: newLog,
			...cache,
		})
		log(`Changes have listed in the ${_p}`)
	} else log("No Changes have been made to the items ")
	return lanResults
}

const toExport = async (config: I18NPLAN.Config, exportPath: string, destination: string) => {
	const lanRes = await getLanRes(config, destination)
	lanRes.map((item) => {
		const [referResMap, referResMapKey] = toFlat(item?.result)
		const data: any[] = []
		referResMap.forEach((val, key) => data.push([key.toString(), val]))
		set(path.resolve(exportPath, item.name + ".xls"), xlsx.build([{ name: item.name, data: data, options: {} }]))
	})
}

const toImport = async (config: I18NPLAN.Config, importPath: string, destination: string) => {
	const lanResults = (
		await Promise.all(
			config.lans.map(async (item) => {
				const xls = await get(path.resolve(importPath, item + ".xls"))
				const lanRes = await get(path.resolve(destination, item + ".json"))
				if (!xls) return

				return {
					name: item,
					result: lanRes,
					added: xls.map((item: string[]) => ({ key: item[0].split(","), value: item[1] })),
					path: path.resolve(destination, `${item}.json`),
				}
			})
		)
	).filter((item): item is I18NPLAN.CollectedLans => item !== undefined)
	const lanItems = lanResults.reduce<I18NPLAN.TranslationItem[]>((a, c) => {
		return [...a, ...c.added.map((item) => ({ ...item, lanName: c.name }))]
	}, [])

	toUpdate(lanItems, lanResults)
}

const translateOnly = async (config: I18NPLAN.Config, itemPath: string, destination: string) => {
	const getItems: undefined | { keys: string[] } = await get(itemPath)

	if (!getItems || !(getItems.keys instanceof Array)) {
		console.error(`no available items are find in ${itemPath}`)
		return
	}
	const keys = getItems.keys
	const lanRes = await getLanRes(config, destination)
	const lanResults = lanRes
		.filter((item) => item.name !== config.refer)
		.map((item) => {
			helper.setLan(item.result)
			return {
				...{
					added: keys
						.map((key) => (helper.getLan(key) !== undefined ? { key: key.split(","), value: helper.getLan(key) as I18NPLAN.LanValue } : undefined))
						.filter((a): a is I18NPLAN.Item => a !== undefined),
					path: path.resolve(destination, `${item.name}.json`),
				},
				...item,
			}
		})
	return toTranslate(config, lanResults)
}

async function entry(testConfig?: I18NPLAN.Config) {
	const commands = getCommands()
	const rootPath = path.resolve(process.cwd())

	const config = testConfig ? testConfig : await getConfig(rootPath)

	if (!config) {
		log(chalk.red(`Can't find the config file in the root path`))
		return
	}

	!testConfig && (chalk = (await import("chalk")).default)

	const { output } = config
	const _output = path.resolve(rootPath, output),
		givenPath = commands.path ? path.resolve(rootPath, commands.path) : null

	log(commands)
	if (givenPath === null && commands.for !== "collect") {
		log(chalk.red("path params is missed"))
		return
	}

	switch (commands.for) {
		case "collect":
			const lanResults = await toSync(config, _output, rootPath)
			if (!config.translation || !config.translation.auto) return lanResults
			return await toTranslate(config, lanResults)
		case "export":
			if (givenPath === null) return
			return toExport(config, givenPath, _output)
		case "import":
			if (givenPath === null) return
			return toImport(config, givenPath, _output)
		case "translate":
			if (givenPath === null) return
			return translateOnly(config, givenPath, _output)
	}
}

export default entry
