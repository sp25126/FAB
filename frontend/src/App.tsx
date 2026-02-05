import { BrainToggle } from './components/BrainToggle';

function App() {
  return (
    <div className="min-h-screen bg-black text-slate-200 font-sans p-8">
      <header className="max-w-4xl mx-auto mb-12 text-center">
        <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 mb-4">
          FAB
        </h1>
        <p className="text-xl text-slate-400">
          The Brutal Truth Interview Agent
        </p>
      </header>

      <main className="max-w-4xl mx-auto space-y-12">
        <section>
          <BrainToggle />
        </section>

        {/* Future Layout: Resume Upload Area Here */}
        <div className="text-center p-12 border-2 border-dashed border-slate-800 rounded-xl text-slate-600">
          Resume Upload & Analyzer Coming Next...
        </div>
      </main>
    </div>
  );
}

export default App;
