import { I18NPLAN } from "./type"

const lanResource: I18NPLAN.Lan = {}
export const getKey = (string: string) => /\$\{(?<key>[a-zA-Z0-9]+)\}/.exec(string)

export function setLan(...[lanRes, isRestore]: Parameters<I18NPLAN.setLan>): ReturnType<I18NPLAN.setLan> {
	if (isRestore) {
		Object.entries(lanResource).map((item) => delete lanResource[item[0]])
	}
	Object.entries(lanRes || {}).map((item) => (lanResource[item[0]] = item[1]))
	return lanResource
}
export const merge = (first: I18NPLAN.LanValue, second: I18NPLAN.LanValue): I18NPLAN.LanValue => {
	const toMerge = (_first: I18NPLAN.LanValue, _second: I18NPLAN.LanValue): I18NPLAN.LanValue => {
		const _a = Object.entries(_first)
		const _b = Object.entries(_second)
		return Object.fromEntries(
			_a
				.map((_ai) => {
					let _fi
					const _f = _b.find((_bi, _bIndex) => {
						const _res = _bi[0] === _ai[0]
						_res && (_fi = _bIndex)
						return _res
					})
					if (!_f) return _ai

					_fi !== undefined && _b.splice(_fi, 1)

					if ((_ai[1] && typeof _ai[1] !== "object") || typeof _f[1] !== "object") return _ai
					return [_ai[0], toMerge(_ai[1], _f[1])]
				})
				.concat(_b)
		)
	}

	return toMerge(first, second)
}
export function getLan(...[key, params]: Parameters<I18NPLAN.getLan>): ReturnType<I18NPLAN.getLan> {
	const keys = typeof key === "string" ? key.split(",") : key
	const _r = keys.reduce<I18NPLAN.Lan>((previousValue, currentValue, currentIndex) => {
		try {
			return previousValue[currentValue]
		} catch (error) {
			console.error(`${currentValue} is not fount in ${JSON.stringify(previousValue)}`)
			return
		}
	}, lanResource)
	if (_r === undefined) return undefined
	if (params === undefined) return typeof _r === "object" && _r ? JSON.stringify(_r) : _r
	const _params = typeof params === "object" && params ? params : {}
	const string = typeof _r === "string" ? _r : JSON.stringify(_r)
	return string.replace(/(\$\{[a-zA-Z0-9]+\})/gim, (r1) => {
		const _p = getKey(r1)
		if (!_p) return ""
		return typeof _params[_p[1]] === "string" ? _params[_p[1]] + "" : JSON.stringify(_params[_p[1]])
	})
}
