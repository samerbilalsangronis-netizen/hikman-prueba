import { useState } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { SplashScreen } from './components/SplashScreen';
import { MacroDataProvider } from './data/MacroDataContext';
import { CurrencyProvider } from './data/CurrencyContext';
import { Dashboard } from './pages/Dashboard';
import { Tasas } from './pages/Tasas';
import { Inflacion } from './pages/Inflacion';
import { Empleo } from './pages/Empleo';
import { Sentimiento } from './pages/Sentimiento';
import { Crecimiento } from './pages/Crecimiento';
import { Banqueros } from './pages/Banqueros';
import { Titulares } from './pages/Titulares';
import { Fortaleza } from './pages/Fortaleza';
import { RentaVariable } from './pages/RentaVariable';
import { Actualizar } from './pages/Actualizar';
import { PanelControl } from './pages/PanelControl';
import { Alemania } from './pages/Alemania';
import { Francia } from './pages/Francia';
import { EconomicAnalysis } from './pages/EconomicAnalysis';

function App() {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <SplashScreen onDone={() => setShowSplash(false)} />;
  }

  return (
    <CurrencyProvider>
      <MacroDataProvider>
        <HashRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="panel-control" element={<PanelControl />} />
              <Route path="analisis-economico" element={<EconomicAnalysis />} />
              <Route index element={<Dashboard />} />
              <Route path="tasas" element={<Tasas />} />
              <Route path="inflacion" element={<Inflacion />} />
              <Route path="empleo" element={<Empleo />} />
              <Route path="confianza" element={<Sentimiento />} />
              <Route path="crecimiento" element={<Crecimiento />} />
              <Route path="alemania" element={<Alemania />} />
              <Route path="francia" element={<Francia />} />
              <Route path="banqueros" element={<Banqueros />} />
              <Route path="titulares" element={<Titulares />} />
              <Route path="fortaleza" element={<Fortaleza />} />
              <Route path="renta-variable" element={<RentaVariable />} />
              <Route path="actualizar" element={<Actualizar />} />
            </Route>
          </Routes>
        </HashRouter>
      </MacroDataProvider>
    </CurrencyProvider>
  );
}

export default App;
