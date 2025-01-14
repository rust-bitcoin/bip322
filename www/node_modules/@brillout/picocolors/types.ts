// export type Formatter = (input: string | number | null | undefined) => string
export type Formatter = <T extends string>(input: T) => T

export interface Colors {
	isColorSupported: boolean
	rm: Formatter
	code: Formatter
	string: Formatter
	reset: Formatter
	bold: Formatter
	dim: Formatter
	italic: Formatter
	underline: Formatter
	inverse: Formatter
	hidden: Formatter
	strikethrough: Formatter
	black: Formatter
	red: Formatter
	green: Formatter
	yellow: Formatter
	blue: Formatter
	magenta: Formatter
	cyan: Formatter
	white: Formatter
	gray: Formatter
	bgBlack: Formatter
	bgRed: Formatter
	bgGreen: Formatter
	bgYellow: Formatter
	bgBlue: Formatter
	bgMagenta: Formatter
	bgCyan: Formatter
	bgWhite: Formatter
}
