import { buildSections, cardCategory } from './RecipeIndex'

const recipe = (title, category) => ({ id: title, title, category })

test('groups recipes by category in the drawer order, alphabetical inside each', () => {
    const sections = buildSections([
        recipe('Scones', 'muffins'),
        recipe('Sugar Cookies', 'cookies'),
        recipe('Brownies', 'cookies'),
    ])
    expect(sections.map(s => s.cat)).toEqual(['cookies', 'muffins'])
    expect(sections[0].recipes.map(r => r.title)).toEqual(['Brownies', 'Sugar Cookies'])
})

test('leaves out empty categories', () => {
    expect(buildSections([])).toEqual([])
})

test('recipes with a missing or unknown category go under Other', () => {
    expect(cardCategory(recipe('Mystery', null))).toBe('other')
    expect(cardCategory(recipe('Old one', 'desserts'))).toBe('other')
    expect(buildSections([recipe('Mystery', undefined)])[0].label).toBe('Other')
})
