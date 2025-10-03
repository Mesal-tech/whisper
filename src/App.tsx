import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { ToastContainer } from "react-toastify";

import AuthLayout from "./_auth/AuthLayout";
import Signin from "./_auth/Signin";
import RootLayout from "./_root/RootLayout";
import Home from "./_root/pages/Home";
import Rooms from "./_root/pages/Rooms";
import Messages from "./_root/pages/Messages";
import RoomChat from "./_root/pages/RoomChat";
import AnonMessage from "./_root/pages/AnonMessage";

function App() {
  return (
    <main>
      <Router>
        <Routes>
          {/* Auth routes */}
          <Route path="/auth" element={<AuthLayout />}>
            <Route path="signin" element={<Signin />} />
          </Route>

          {/* Main app routes with tabs */}
          <Route element={<RootLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/rooms" element={<Rooms />}>
              <Route path="/rooms/:id" element={<RoomChat />} />
            </Route>
            <Route path="/messages" element={<Messages />} />
          </Route>

          {/* Anonymous message route (accessible without auth) */}
          <Route path="/anon/:id" element={<AnonMessage />} />
        </Routes>
      </Router>

      {/* Toast Container for notifications */}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
    </main>
  );
}

export default App;
