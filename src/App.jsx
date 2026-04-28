import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Inicio from './pages/inicio/Inicio';
//agreagr import de catalogo aqui
import Agendarcita from './pages/agendar/Agendarcita';

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/"         element={<Inicio />} />
        //agregar ruta de catalogo aqui
        <Route path="/agendar"  element={<Agendarcita />} />
      </Routes>
    </BrowserRouter>
  );
}