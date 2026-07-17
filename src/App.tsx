import { HashRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { MacroDataProvider } from './data/MacroDataContext';
import { CurrencyProvider } from './data/CurrencyContext';
import { Dashboard } from './pages/Dashboard';
import { Tasas } from './pages/Tasas';
import { Inflacion } from './pages/Inflacion';
import { Empleo } from './pages/Empleo';
import { Sentimiento } from './pages/Sentimiento';
import { Crecimiento } from './pages/Crecimiento';
import { Banqueros } from './pages/Banqueros';
import { Actualizar } from './pages/Actualizar';

function App() {
  return (
    <CurrencyProvider>
      <MacroDataProvider>
        <HashRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="tasas" element={<Tasas />} />
              <Route path="inflacion" element={<Inflacion />} />
              <Route path="empleo" element={<Empleo />} />
              <Route path="confianza" element={<Sentimiento />} />
              <Route path="crecimiento" element={<Crecimiento />} />
              <Route path="banqueros" element={<Banqueros />} />
              <Route path="actualizar" element={<Actualizar />} />
            </Route>
          </Routes>
        </HashRouter>
      </MacroDataProvider>
    </CurrencyProvider>
  );
}

export default App;
