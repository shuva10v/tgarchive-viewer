import './App.css';
import TgView from "./TgView";
import { Provider as AlertProvider } from 'react-alert'
import AlertTemplate from 'react-alert-template-mui'
import {HashRouter, Route, Routes} from "react-router-dom";
import TgAdmin from "./TgAdmin";

function App() {

  // add support for routes
  return (
    <AlertProvider template={AlertTemplate}>
      <HashRouter>
        <Routes>
          <Route path="/" element={<TgView />} />
          <Route path="/admin" element={<TgAdmin />} />
        </Routes>
      </HashRouter>
    </AlertProvider>
  );
}

export default App;
