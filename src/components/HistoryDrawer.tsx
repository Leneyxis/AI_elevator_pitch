'use client';

import { useState } from 'react';
import { FiClock, FiX } from 'react-icons/fi';

export default function HistoryDrawer({ history }: { history: string[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="absolute top-6 right-6 flex items-center space-x-1 px-3 py-1 bg-malibu text-white rounded-lg text-sm shadow"
      >
        <FiClock /> <span>View History</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <section className="w-80 bg-white shadow-xl p-4 overflow-auto">
            <header className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">History</h3>
              <button onClick={() => setOpen(false)}>
                <FiX size={20} />
              </button>
            </header>
            <ul className="space-y-2">
              {history.length === 0 ? (
                <li className="text-gray-500 text-sm">No history yet.</li>
              ) : (
                history.map((h, i) => (
                  <li key={i} className="border border-gray-200 rounded-lg p-2 text-sm">
                    {h}
                  </li>
                ))
              )}
            </ul>
          </section>
          <div className="flex-1 bg-black/20" onClick={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}
