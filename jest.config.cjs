const esModules = ["chalk|ansi-styles", "chalk"].join("|")
module.exports = {
	preset: "ts-jest",
	testEnvironment: "node",
	coverageReporters: ["text-summary", "html"],
	transformIgnorePatterns: [`/node_modules/(?!${esModules})`],
}
