// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Jest's browser stand-in has no fetch. api.js pings the server as soon as it
// loads, so give every test a fetch that fails until a test replaces it.
global.fetch = jest.fn(() => Promise.reject(new TypeError('No network in tests')))

// React Router 7 needs TextEncoder, which Jest's browser stand-in doesn't have
const { TextEncoder, TextDecoder } = require('util')
Object.assign(global, { TextEncoder, TextDecoder })
