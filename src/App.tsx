// src/App.tsx
import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import Leaderboard from './components/Leaderboard';

const theme = createTheme({
  palette: {
    mode: 'dark',
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <Leaderboard />
    </ThemeProvider>
  );
}

export default App;
