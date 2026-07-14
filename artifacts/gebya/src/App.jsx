import { PrivacyProvider } from './context/PrivacyContext';
import { LangProvider } from './context/LangContext';
import { ThemeProvider } from './context/ThemeContext';
import AppShell from './components/AppShell';

function App() {
  return (
    <LangProvider>
      <ThemeProvider>
        <PrivacyProvider>
          <AppShell />
        </PrivacyProvider>
      </ThemeProvider>
    </LangProvider>
  );
}

export default App;
