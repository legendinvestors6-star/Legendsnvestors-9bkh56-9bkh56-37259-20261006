import { HashRouter, Routes, Route } from "react-router-dom";

function Test() {
  return (
    <div style={{background:'white', color:'black', minHeight:'100vh', padding:'30px', fontFamily:'sans-serif'}}>
      <h1 style={{fontSize:'28px', fontWeight:'bold'}}>DEPLOY WORKS ✅</h1>
      <p>App.tsx loads fine</p>
      <p>URL: {window.location.href}</p>
      <br/>
      <p style={{background:'yellow', padding:'10px'}}>If you see this, problem is in one of your pages (LoginPage, HomePage etc), not deployment.</p>
    </div>
  )
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="*" element={<Test />} />
      </Routes>
    </HashRouter>
  )
}
