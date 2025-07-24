'use client';

import React, { useState } from 'react';
import { Star, Copy, Download, Sparkles } from 'lucide-react';

export default function ResultPanel({ pitch }: { pitch: string }) {
  const [copied, setCopied] = useState(false);
  const [liked, setLiked]   = useState(false);

  const handleCopy = async () => {
    if (!pitch) return;
    await navigator.clipboard.writeText(pitch);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!pitch) return;
    const blob = new Blob([pitch], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'ai-pitch.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative flex flex-col h-full bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-card-light border border-slate-200/60 overflow-hidden">
      
      {/* Header */}
      <div className="relative bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative flex items-center justify-between">
          
          {/* Title + Like */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLiked(!liked)}
              className={`
                p-2 rounded-lg transition-colors duration-200
                ${liked
                  ? 'bg-yellow-400 text-white hover:bg-yellow-500'
                  : 'bg-white/20 text-white hover:bg-white/30'}
              `}
              title={liked ? 'Unfavorite' : 'Favorite'}
            >
              <Star className="w-5 h-5" />
            </button>
            <h2 className="text-white font-bold text-lg tracking-wide">
              AI Pitch
            </h2>
          </div>

          {/* Actions */}
          {pitch && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                title="Copy to clipboard"
              >
                <Copy className="text-white w-4 h-4" />
              </button>
              <button
                onClick={handleDownload}
                className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                title="Download text"
              >
                <Download className="text-white w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        {pitch ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <pre className="whitespace-pre-wrap text-slate-700 leading-relaxed font-medium">
              {pitch}
            </pre>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="bg-gradient-to-br from-indigo-100 to-purple-100 p-8 rounded-2xl mb-6">
              <Sparkles className="w-12 h-12 text-indigo-600 mx-auto mb-2" />
              <p className="text-indigo-700 font-semibold">Let’s create some magic!</p>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              Your AI Pitch Awaits
            </h3>
            <p className="text-slate-500 max-w-sm leading-relaxed">
              Once you generate your elevator pitch, it’ll show up here with formatting and handy controls.
            </p>
          </div>
        )}
      </div>

      {/* Copy Toast */}
      {copied && (
        <div className="absolute top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-xl shadow-lg animate-fade-in-out">
          Copied!
        </div>
      )}
    </div>
  );
}
