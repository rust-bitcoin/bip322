if (isBrowser()) throw new Error("This file should never be included in the browser.")

const isColorSupported = (() => {
	if (typeof process === 'undefined') {
		return false
	}

	const argv = process.argv || []

	if ("NO_COLOR" in process.env || argv.includes("--no-color")) {
		return false
	}

	if (
		"FORCE_COLOR" in process.env ||
		argv.includes("--color") ||
		"CI" in process.env
	) {
		return true
	}

	if (process.platform === "win32") {
		return true
	} else {
		let tty
		try {
			const req = require
			tty = req("tty")
		} catch {
			return false
		}
		return tty.isatty(1) && process.env.TERM !== "dumb"
	}
})()

let formatter =
	(open, close, replace = open) =>
	input => {
		let string = "" + input
		let index = string.indexOf(close, open.length)
		return ~index
			? open + replaceClose(string, close, replace, index) + close
			: open + string + close
	}

let replaceClose = (string, close, replace, index) => {
	let start = string.substring(0, index) + replace
	let end = string.substring(index + close.length)
	let nextIndex = end.indexOf(close)
	return ~nextIndex ? start + replaceClose(end, close, replace, nextIndex) : start + end
}

let createColors = (enabled = isColorSupported) => {
	const cyan = formatter("\x1b[36m", "\x1b[39m")
	return {
	isColorSupported: enabled,
	code: enabled ? cyan : (s) => `\`${s}\``,
	string: enabled ? cyan : (s) => `'${s}'`,
	reset: enabled ? s => `\x1b[0m${s}\x1b[0m` : String,
	bold: enabled ? formatter("\x1b[1m", "\x1b[22m", "\x1b[22m\x1b[1m") : String,
	dim: enabled ? formatter("\x1b[2m", "\x1b[22m", "\x1b[22m\x1b[2m") : String,
	italic: enabled ? formatter("\x1b[3m", "\x1b[23m") : String,
	underline: enabled ? formatter("\x1b[4m", "\x1b[24m") : String,
	inverse: enabled ? formatter("\x1b[7m", "\x1b[27m") : String,
	hidden: enabled ? formatter("\x1b[8m", "\x1b[28m") : String,
	strikethrough: enabled ? formatter("\x1b[9m", "\x1b[29m") : String,
	black: enabled ? formatter("\x1b[30m", "\x1b[39m") : String,
	red: enabled ? formatter("\x1b[31m", "\x1b[39m") : String,
	green: enabled ? formatter("\x1b[32m", "\x1b[39m") : String,
	yellow: enabled ? formatter("\x1b[33m", "\x1b[39m") : String,
	blue: enabled ? formatter("\x1b[34m", "\x1b[39m") : String,
	magenta: enabled ? formatter("\x1b[35m", "\x1b[39m") : String,
	cyan: enabled ? cyan : String,
	white: enabled ? formatter("\x1b[37m", "\x1b[39m") : String,
	gray: enabled ? formatter("\x1b[90m", "\x1b[39m") : String,
	bgBlack: enabled ? formatter("\x1b[40m", "\x1b[49m") : String,
	bgRed: enabled ? formatter("\x1b[41m", "\x1b[49m") : String,
	bgGreen: enabled ? formatter("\x1b[42m", "\x1b[49m") : String,
	bgYellow: enabled ? formatter("\x1b[43m", "\x1b[49m") : String,
	bgBlue: enabled ? formatter("\x1b[44m", "\x1b[49m") : String,
	bgMagenta: enabled ? formatter("\x1b[45m", "\x1b[49m") : String,
	bgCyan: enabled ? formatter("\x1b[46m", "\x1b[49m") : String,
	bgWhite: enabled ? formatter("\x1b[47m", "\x1b[49m") : String,
	}
}

module.exports = createColors()
module.exports.createColors = createColors
module.exports.rm = stripAnsi

function isBrowser() {
	/* We don't use this check in order to tolerate jsdom environments to load this file.
	return typeof window !== "undefined" && typeof window.scrollY === "number"
  */
	// Test whether whether the environment is a *real* browser.
	//  - https://github.com/jsdom/jsdom/issues/1537#issuecomment-1689368267
	return (
		Object.getOwnPropertyDescriptor(globalThis, "window")
			?.get?.toString()
			.includes("[native code]") ?? false
	)
}

// Copied from https://github.com/chalk/strip-ansi/blob/1fdc531d4046cbaa830460f5c74452bf1f0a0884/index.js
function stripAnsi(string) {
  // Even though the regex is global, we don't need to reset the `.lastIndex`
  // because unlike `.exec()` and `.test()`, `.replace()` does it automatically
  // and doing it manually has a performance penalty.
  return string.replace(ansiRegex, '')
}
const ansiRegex = getAnsiRegex()
// Copied from https://github.com/chalk/ansi-regex/blob/02fa893d619d3da85411acc8fd4e2eea0e95a9d9/index.js
function getAnsiRegex() {
  const pattern = [
    '[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)',
    '(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))'
  ].join('|')
  return new RegExp(pattern, 'g')
}
