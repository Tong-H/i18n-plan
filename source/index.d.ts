import {I18NPLAN} from "./type"

declare module "i18n-plan" {
	function setLan(lanRes: I18NPLAN.Lan, isRestore?: boolean): I18NPLAN.Lan
	function  getLan(key: string | string[], params?: Record<string, I18NPLAN.BasicLanValue>): I18NPLAN.BasicLanValue | undefined
}
