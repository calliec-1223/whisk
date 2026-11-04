import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Login from './Login'

function renderLogin() {
    render(
        <MemoryRouter initialEntries={['/']}>
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/recipes" element={<p>Recipe box page</p>} />
            </Routes>
        </MemoryRouter>
    )
}

function reply(status, body) {
    return Promise.resolve({ status, ok: status < 400, json: () => Promise.resolve(body) })
}

beforeEach(() => localStorage.clear())

test('Try the demo saves the token and opens the recipe box', async () => {
    fetch.mockImplementationOnce(() => reply(201, { token: 'demo-token' }))
    renderLogin()
    userEvent.click(screen.getByRole('button', { name: 'Try the demo' }))

    expect(await screen.findByText('Recipe box page')).toBeInTheDocument()
    expect(localStorage.getItem('token')).toBe('demo-token')
    const [url, options] = fetch.mock.calls.at(-1)
    expect(url).toMatch(/\/demo$/)
    expect(options.method).toBe('POST')
})

test('Try the demo explains when the server is unreachable', async () => {
    fetch.mockImplementationOnce(() => Promise.reject(new TypeError('Failed to fetch')))
    renderLogin()
    userEvent.click(screen.getByRole('button', { name: 'Try the demo' }))

    expect(await screen.findByText("Can't reach the server. Please try again.")).toBeInTheDocument()
    expect(localStorage.getItem('token')).toBeNull()
    expect(screen.getByRole('button', { name: 'Try the demo' })).toBeEnabled()
})

test('Try the demo explains the rate limit', async () => {
    fetch.mockImplementationOnce(() => reply(429, null))
    renderLogin()
    userEvent.click(screen.getByRole('button', { name: 'Try the demo' }))

    expect(await screen.findByText(/Too many demos/)).toBeInTheDocument()
})

test('a failed login shows the server message and stays on the page', async () => {
    fetch.mockImplementationOnce(() => reply(401, { error: 'Invalid username or password' }))
    renderLogin()
    userEvent.type(screen.getByLabelText('Username'), 'alice')
    userEvent.type(screen.getByLabelText('Password'), 'wrong')
    userEvent.click(screen.getByRole('button', { name: 'Log in' }))

    expect(await screen.findByText('Invalid username or password')).toBeInTheDocument()
    expect(localStorage.getItem('token')).toBeNull()
})
