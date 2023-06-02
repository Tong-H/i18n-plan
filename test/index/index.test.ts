import { describe, expect, test } from "@jest/globals"
import { getLanRes, toFlat } from "../../source/cli"
import * as helper from "../../source/index"
import config from "../I18NPLAN.config"
import * as path from "node:path"

const rootPath = path.resolve(process.cwd())

describe("helper", () => {
	test("get lan item", async () => {
		const lanRes = await getLanRes(config, path.resolve(rootPath, config.output))

		lanRes.map((item) => {
			const { name, result } = item
			helper.setLan(result)
			const [referResMap, referResMapKey] = toFlat(result)
			const keys = Object.entries(referResMapKey)

			keys.map((item) => {
				const value = referResMap.get(item[1])
				if (value === undefined) return
				const params = (() => {
					if (typeof value !== "string") return undefined
					const matched = value.match(/(\$\{[a-zA-Z0-9]+\})/gim)
					if (!matched) return undefined
					return Object.fromEntries(
						matched
							.map((item) => {
								const key = helper.getKey(item)
								return key ? [key[1], `<the key is ${key[1]}>`] : undefined
							})
							.filter((item): item is [string, string] => item !== undefined)
					)
				})()
				console.log(`language name: ${name}\nitem: ${item}\nparams:${params}\nvalue:${value}`)
				expect(helper.getLan(item[0])).toBe(value)
				if (params) {
					const _string = helper.getLan(item[0], params)
					console.log(`contain template literal:${_string}`)
					if (_string === undefined) {
						expect(_string === undefined).toBeFalsy()
						return
					}
					Object.entries(params).map((par) => {
						expect(new RegExp(par[1], "img").test(_string as string)).toBeTruthy()
					})
				}
			})
		})
	})
	test("merge", () => {
		const res = helper.merge(
			{
				a: { b: 1, c: 2, d: 3 },
				g: {
					one: {
						two: {
							three: "three",
						},
					},
				},
			},
			{
				a: { f: 4, c: 8, d: { e: 3 } },
				g: {
					one: {
						two: {
							four: "four",
						},
					},
				},
			}
		)
		expect(res).toEqual({
			a: { f: 4, b: 1, c: 2, d: 3 },
			g: {
				one: {
					two: {
						three: "three",
						four: "four",
					},
				},
			},
		})
	})
})
