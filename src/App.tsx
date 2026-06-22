import { BrowserRouter, Routes, Route } from "react-router-dom";

function Home() {
  return (
    <div style={{ padding: "2rem" }}>
      <h1>Mynx</h1>
      <p>Welcome to Mynx - qPCR Tools & TIFF-to-JPG Converter</p>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
