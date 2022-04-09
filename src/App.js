import './App.css';
import TgView from "./TgView";
import { Provider as AlertProvider } from 'react-alert'
import AlertTemplate from 'react-alert-template-mui'
import {BrowserRouter, Route, Routes} from "react-router-dom";

function App() {

  // add support for routes
  return (
    <AlertProvider template={AlertTemplate}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<TgView />} />
        </Routes>
      </BrowserRouter>
    </AlertProvider>
  );
}

export default App;
