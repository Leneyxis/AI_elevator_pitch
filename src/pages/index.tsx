import { useState } from 'react';
import PitchForm from '@/components/PitchForm';
import ResultPanel from '@/components/ResultPanel';
import HistoryDrawer from '@/components/HistoryDrawer';

export default function Home() {
  const [pitch, setPitch] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (result: { pitch?: string }) => {
    if (result.pitch) {
      setPitch(result.pitch);
      setHistory((h) => [result.pitch!, ...h]);
    }
  };

  return (
    <main className="min-h-screen bg-primary-light/20 p-8 grid lg:grid-cols-2 gap-8">
      {/* Form Card */}
      <div className="relative bg-white rounded-2xl shadow-card-light p-6 flex flex-col">
        <h1 className="text-2xl font-bold text-primary mb-4">AI Elevator Pitch</h1>
        <HistoryDrawer history={history} />
        <PitchForm onSubmit={handleSubmit} disabled={loading} />
      </div>

      {/* Result Card */}
      <div className="bg-white rounded-2xl shadow-card-light p-6 flex flex-col">
        <ResultPanel pitch={pitch} />
      </div>
    </main>
  );
}
