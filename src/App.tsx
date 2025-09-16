import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import AuthLayout from "./_auth/AuthLayout";
import Signin from "./_auth/Signin";
import Home from "./_root/pages/Home";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/auth" element={<AuthLayout />}>
          <Route path="signin" element={<Signin />} />
        </Route>
        <Route path="/" element={<Home />} />
      </Routes>
    </Router>
  );
}

export default App;
