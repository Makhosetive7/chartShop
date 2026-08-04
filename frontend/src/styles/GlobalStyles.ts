import { createGlobalStyle } from 'styled-components';

export const GlobalStyles = createGlobalStyle`
  *, *::before, *::after {
    box-sizing: border-box;
  }

  html, body, #root {
    min-height: 100%;
  }

  body {
    margin: 0;
    font-family: ${({ theme }) => theme.fonts.body};
    font-weight: ${({ theme }) => theme.fontWeights.regular};
    color: ${({ theme }) => theme.colors.textPrimary};
    background: ${({ theme }) => theme.colors.background};
    -webkit-font-smoothing: antialiased;
  }

  h1, h2, h3, h4 {
    font-family: ${({ theme }) => theme.fonts.heading};
    color: ${({ theme }) => theme.colors.textPrimary};
    letter-spacing: -0.02em;
  }

  h1 {
    font-weight: ${({ theme }) => theme.fontWeights.bold};
  }

  h2, h3, h4 {
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
  }

  button, input, select, textarea {
    font-family: ${({ theme }) => theme.fonts.body};
  }

  a {
    color: ${({ theme }) => theme.colors.secondary};
  }
`;
