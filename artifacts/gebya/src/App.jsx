import { PrivacyProvider } from './context/PrivacyContext';
import { LangProvider } from './context/LangContext';
import { ThemeProvider } from './context/ThemeContext';
import AppShell from './components/AppShell';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <LangProvider>
        <ThemeProvider>
          <PrivacyProvider>
            <AppShell />
          </PrivacyProvider>
        </ThemeProvider>
      </LangProvider>
    </ErrorBoundary>
  );
}

export default App;
