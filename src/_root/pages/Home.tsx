import Header from "../../components/Header";

function Home() {
  return (
    <div className="h-screen bg-black">
      <Header />
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-black border border-white rounded-xl shadow p-8 mt-20">
          <h2 className="text-3xl font-bold text-white mb-4">Main App</h2>
          <p className="text-gray-600">This is where stuff will go</p>
        </div>
      </main>
    </div>
  );
}

export default Home;
