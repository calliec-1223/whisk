import { formatAmount, parseAmount, scaleIngredient } from './scale'

const scaled = (line, factor) => {
    const { amount, rest } = scaleIngredient(line, factor)
    return `${amount}${rest}`
}

test('reads whole, decimal, fraction, mixed and unicode amounts', () => {
    expect(parseAmount('2')).toBe(2)
    expect(parseAmount('1.5')).toBe(1.5)
    expect(parseAmount('1/2')).toBe(0.5)
    expect(parseAmount('1 1/2')).toBe(1.5)
    expect(parseAmount('½')).toBe(0.5)
    expect(parseAmount('1¼')).toBe(1.25)
})

test('formats cups and spoons as friendly fractions', () => {
    expect(formatAmount(0.5, false)).toBe('½')
    expect(formatAmount(1.5, false)).toBe('1½')
    expect(formatAmount(2 / 3, false)).toBe('⅔')
    expect(formatAmount(3, false)).toBe('3')
    expect(formatAmount(0.97, false)).toBe('1')
    expect(formatAmount(1.4, false)).toBe('1.4') // not near a nice fraction
})

test('weights round to whole numbers, small ones to one decimal', () => {
    expect(scaled('225 g butter', 0.5)).toBe('113 g butter')
    expect(scaled('7 g yeast', 0.5)).toBe('3.5 g yeast')
    expect(scaled('160 ml olive oil', 1.5)).toBe('240 ml olive oil')
})

test('scales counts, spoons and cups', () => {
    expect(scaled('2 eggs', 1.5)).toBe('3 eggs')
    expect(scaled('3 eggs', 0.5)).toBe('1½ eggs')
    expect(scaled('1 tsp baking soda', 0.5)).toBe('½ tsp baking soda')
    expect(scaled('1 1/2 cups flour', 2)).toBe('3 cups flour')
    expect(scaled('½ cup sugar', 3)).toBe('1½ cups sugar')
})

test('scales both ends of a range', () => {
    expect(scaled('2-3 tbsp milk', 2)).toBe('4-6 tbsp milk')
    expect(scaled('2 to 3 lemons', 2)).toBe('4 to 6 lemons')
})

test('leaves lines without a leading amount alone', () => {
    expect(scaleIngredient('Pinch of salt', 2)).toEqual({ amount: '', rest: 'Pinch of salt', scaled: false })
    expect(scaled('Zest of 2 lemons', 2)).toBe('Zest of 2 lemons')
})

test('a factor of 1 changes nothing', () => {
    expect(scaleIngredient('225 g butter', 1).scaled).toBe(false)
    expect(scaled('225 g butter', 1)).toBe('225 g butter')
})

test('singular and plural follow the new amount', () => {
    expect(scaled('2 eggs', 0.5)).toBe('1 egg')
    expect(scaled('2 cups flour', 0.25)).toBe('½ cup flour')
    expect(scaled('1 lemon', 2)).toBe('2 lemons')
    expect(scaled('2 Eggs', 0.5)).toBe('1 egg')
    expect(scaled('3 eggs', 0.5)).toBe('1½ eggs')
    expect(scaled('225 g butter', 0.5)).toBe('113 g butter') // unknown words untouched
})
