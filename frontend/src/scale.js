// Scale the amount at the start of an ingredient line, e.g. "1 1/2 cups flour" x 2 -> "3 cups flour".
// Only the leading amount changes; the rest of the line is kept as written.

const UNICODE_FRACTIONS = { '¼': 0.25, '½': 0.5, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3, '⅛': 0.125 }
const NICE_FRACTIONS = [[0, ''], [0.125, '⅛'], [0.25, '¼'], [1 / 3, '⅓'], [0.5, '½'], [2 / 3, '⅔'], [0.75, '¾'], [1, '']]

// One amount: "1 1/2", "1/2", "1½", "½", "1.5", "2"
const QTY = '(?:\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d*[¼½¾⅓⅔⅛]|\\d+(?:\\.\\d+)?)'
// An amount or a range ("2-3", "2 to 3") at the start of the line
const LEADING = new RegExp(`^(\\s*)(${QTY})(?:(\\s*(?:-|–|to)\\s*)(${QTY}))?`)
// Units weighed or measured precisely, so they get decimals instead of fractions
const PRECISE_UNITS = /^\s*(g|grams?|kg|kilograms?|ml|millilit(?:re|er)s?|l|lit(?:re|er)s?|oz|ounces?|lbs?|pounds?)\b/i

export function parseAmount(text) {
    const t = text.trim()
    const uni = t.match(/^(\d*)([¼½¾⅓⅔⅛])$/)
    if (uni) return (uni[1] ? Number(uni[1]) : 0) + UNICODE_FRACTIONS[uni[2]]
    const mixed = t.match(/^(\d+)\s+(\d+)\/(\d+)$/)
    if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3])
    const frac = t.match(/^(\d+)\/(\d+)$/)
    if (frac) return Number(frac[1]) / Number(frac[2])
    return Number(t)
}

export function formatAmount(value, precise) {
    if (precise) {
        if (value >= 10) return String(Math.round(value))
        return String(Math.round(value * 10) / 10)
    }
    const whole = Math.floor(value)
    const rest = value - whole
    const [closest, symbol] = NICE_FRACTIONS.reduce((best, f) =>
        Math.abs(f[0] - rest) < Math.abs(best[0] - rest) ? f : best)
    if (Math.abs(closest - rest) > 0.06) return String(Math.round(value * 10) / 10)
    if (closest === 1) return String(whole + 1)
    if (whole === 0 && symbol) return symbol
    return `${whole}${symbol}`
}

// Common words after an amount, so "1 eggs" becomes "1 egg" and "1½ cup" becomes "1½ cups"
const PLURALS = {
    cup: 'cups', egg: 'eggs', tablespoon: 'tablespoons', teaspoon: 'teaspoons', stick: 'sticks',
    clove: 'cloves', lemon: 'lemons', lime: 'limes', banana: 'bananas', apple: 'apples',
    yolk: 'yolks', white: 'whites', pinch: 'pinches', can: 'cans', packet: 'packets',
}
const SINGULARS = Object.fromEntries(Object.entries(PLURALS).map(([one, many]) => [many, one]))

function matchCount(rest, value) {
    return rest.replace(/^(\s*)([A-Za-z]+)\b/, (whole, space, word) => {
        const lower = word.toLowerCase()
        if (value <= 1 && SINGULARS[lower]) return space + SINGULARS[lower]
        if (value > 1 && PLURALS[lower]) return space + PLURALS[lower]
        return whole
    })
}

// Returns { amount, rest, scaled }: amount is the (possibly scaled) leading amount,
// rest is the remainder of the line. scaled is false when nothing could be scaled.
export function scaleIngredient(line, factor) {
    const match = line.match(LEADING)
    if (!match || !factor || factor === 1) {
        return { amount: match ? match[0].trim() : '', rest: match ? line.slice(match[0].length) : line, scaled: false }
    }
    const rest = line.slice(match[0].length)
    const precise = PRECISE_UNITS.test(rest)
    const first = parseAmount(match[2])
    if (!Number.isFinite(first)) return { amount: '', rest: line, scaled: false }
    let amount = formatAmount(first * factor, precise)
    let largest = first * factor
    if (match[4]) {
        const second = parseAmount(match[4])
        amount += `${match[3]}${formatAmount(second * factor, precise)}`
        largest = second * factor
    }
    return { amount, rest: matchCount(rest, largest), scaled: true }
}
