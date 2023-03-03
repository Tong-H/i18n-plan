import typescript from "@rollup/plugin-typescript"
import { uglify } from "rollup-plugin-uglify"
import path from "node:path"
import copy from "rollup-plugin-copy"

const isWatch = process.argv.some((item) => /watch/.test(item))

export default {
	input: ["./source/cli.ts", "./source/index.ts"],
	output: {
		dir: "lib",
		sourcemap: true,
		format: "es",
		compact: true,
	},
	plugins: [
		typescript({ tsconfig: path.resolve(".", "tsconfig.json") }),
		...[!isWatch ? [uglify()] : []],
		copy({
			targets: [{ src: "source/*.d.ts", dest: "lib" }],
		}),
	],
}
