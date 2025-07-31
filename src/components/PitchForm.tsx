'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  ChevronDown,
  Plus,
  Upload as UploadIcon,
  Link as LinkIcon,
  CheckCircle,
  AlertCircle,
  Info as InfoIcon,
  Sparkles,
  Mic,
  MicOff,
  Play,
  RotateCcw,
  Send,
  FileText,
  MessageSquare,
} from 'lucide-react';

// ----------------------------------------------------------------
// Tooltip stays where it was
// ----------------------------------------------------------------
const InfoTooltip = ({ text }: { text: string }) => (
  <span className="relative inline-block ml-2 group overflow-visible">
    <InfoIcon className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
    <div className="
      absolute bottom-full left-1/2 mb-2 w-56 -translate-x-1/2
      rounded-lg bg-gray-900 p-2 text-xs text-white
      opacity-0 transition-opacity duration-200 group-hover:opacity-100
      pointer-events-none z-50
    ">
      {text}
      <div className="
        absolute top-full left-1/2 -translate-x-1/2
        border-4 border-transparent border-t-gray-900
      "/>
    </div>
  </span>
);

// ----------------------------------------------------------------
// MOVE THIS OUTSIDE PitchForm so React doesn’t remount it every render
// ----------------------------------------------------------------
interface FormFieldProps {
  name: string;
  label: string;
  placeholder: string;
  rows?: number;
  register: (name: string) => {
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  };
  errors: Record<string, string | null>;
  tooltipText?: string;
  // Add for controlled input
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}
const FormField: React.FC<FormFieldProps> = ({
  name,
  label,
  placeholder,
  rows,
  register,
  errors,
  tooltipText,
  value,
  onChange,
}) => {
  const props = register(name);
  // If controlled, override value/onChange
  const inputProps = {
    ...props,
    ...(value !== undefined ? { value } : {}),
    ...(onChange ? { onChange } : {}),
  };
  return (
    <div className="space-y-1">
      <label className="flex items-center text-sm font-medium text-gray-800">
        {label}
        {tooltipText && <InfoTooltip text={tooltipText} />}
      </label>
      {rows ? (
        <textarea
          {...inputProps}
          rows={rows}
          placeholder={placeholder}
          className={`
            w-full rounded-xl border-2 px-4 py-3 text-sm
            focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10
            hover:border-gray-400 transition
            ${errors[name] ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'}
          `}
        />
      ) : (
        <input
          {...inputProps}
          placeholder={placeholder}
          className={`
            w-full rounded-xl border-2 px-4 py-3 text-sm
            focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10
            hover:border-gray-400 transition
            ${errors[name] ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'}
          `}
        />
      )}
      {errors[name] && (
        <div className="flex items-center gap-1 text-red-600 text-xs">
          <AlertCircle className="h-4 w-4" />
          {errors[name]}
        </div>
      )}
    </div>
  );
};

// ----------------------------------------------------------------
// Your useForm hook (unchanged, no validation)
// ----------------------------------------------------------------
const useForm = () => {
  const [values, setValues] = useState<Record<string, string>>({});

  const register = (name: string) => ({
    name,
    value: values[name] ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setValues(prev => ({ ...prev, [name]: e.target.value }));
    },
  });

  const handleSubmit =
    (cb: (data: Record<string, string>) => void) =>
    (e: React.FormEvent) => {
      e.preventDefault();
      cb(values);
    };

  return { register, handleSubmit, setValues, formState: { errors: {}, isValid: true } };
};

// ----------------------------------------------------------------
// Voice Transcribe Helper
// ----------------------------------------------------------------
async function transcribeAudio(blob: Blob): Promise<string> {
  try {
    console.log('Sending audio for transcription...');
    const formData = new FormData();
    
    // Convert to proper format if needed
    const audioFile = new File([blob], 'recording.webm', { 
      type: blob.type || 'audio/webm',
      lastModified: Date.now() 
    });
    
    formData.append('file', audioFile);
    
    // Call our API route that proxies to Azure GPT-4o transcribe
    const res = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData,
    });
    
    if (!res.ok) {
      let msg = res.statusText;
      try {
        const errorData = await res.json();
        console.error('Transcription error:', errorData);
        msg = errorData?.error?.message || errorData?.error || errorData?.details || msg;
      } catch (_) {/* body not json */}
      throw new Error(`Transcription failed: ${msg}`);
    }
    
    const data = await res.json();
    console.log('Transcription successful:', data);
    return data.text || '';
  } catch (err) {
    console.error('Error during transcription:', err);
    throw err;
  }
}

// ----------------------------------------------------------------
// Main component (wiring in the moved‑out FormField)
// ----------------------------------------------------------------
export default function PitchForm({
  onSubmit,
  disabled,
}: {
  onSubmit: (result: any) => void;
  disabled: boolean;
}) {
  const { register, handleSubmit, setValues, formState: { errors, isValid } } = useForm();
  
  // Input mode selection
  const [inputMode, setInputMode] = useState<'form' | 'voice'>('form');
  
  // Form-based input state
  const [profileSource, setProfileSource] = useState<'resume'|'linkedin'>('resume');
  const [uploadedFile, setUploadedFile] = useState<File|null>(null);
  const [tone, setTone] = useState<string>('');
  const [lengthVal, setLength] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Voice Input State ---
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder|null>(null);
  const [audioURL, setAudioURL] = useState<string|null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob|null>(null);
  const [transcription, setTranscription] = useState<string>('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeError, setTranscribeError] = useState<string|null>(null);
  const [voicePrompt, setVoicePrompt] = useState('');
  const audioChunks = useRef<Blob[]>([]);

  // --- Additional Context State (for form mode) ---
  const [additionalContext, setAdditionalContext] = useState('');

  const tooltipTexts: Record<string,string> = {
    jobTitle:  'What role are you targeting? e.g., "Product Manager"',
    purpose:   'Why are you pitching? Could be for a job, networking, etc.',
    focusArea: 'Which skill or message to highlight—leadership, technical wins, etc.',
    audience:  'Who will hear it? Hiring manager, recruiter, etc.',
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setUploadedFile(e.target.files[0]);
  };

  const onFormSubmit = async (data: Record<string,string>) => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      
      if (inputMode === 'voice') {
        // Voice mode: send transcription as main input
        formData.append('inputMode', 'voice');
        formData.append('voiceTranscription', transcription);
        formData.append('tone', tone || 'Professional');
        formData.append('length', lengthVal || 'Medium');
      } else {
        // Form mode: send structured data
        formData.append('inputMode', 'form');
        formData.append('jobTitle', data.jobTitle || '');
        formData.append('purpose', data.purpose || '');
        formData.append('focusArea', data.focusArea || '');
        formData.append('audience', data.audience || '');
        
        const contextParts = [];
        if (data.linkedinUrl) contextParts.push(`LinkedIn Profile: ${data.linkedinUrl}`);
        if (data.additionalContext) contextParts.push(data.additionalContext);
        formData.append('additionalContext', contextParts.join('\n\n'));
        formData.append('tone', tone);
        formData.append('length', lengthVal);
        
        if (profileSource === 'resume' && uploadedFile) {
          formData.append('resumeFile', uploadedFile);
        }
      }
      
      let pitch = '';
      const res = await fetch('/api/pitch', { method: 'POST', body: formData });
      if (res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          pitch += decoder.decode(value);
          onSubmit({ pitch }); // update ResultPanel as text streams in
        }
      } else {
        onSubmit({ pitch: await res.text() });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Recording Logic ---
  const startRecording = async () => {
    setTranscribeError(null);
    setTranscription('');
    setAudioURL(null);
    setAudioBlob(null);
    audioChunks.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(audioChunks.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioURL(URL.createObjectURL(blob));
      };
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      setTranscribeError('Could not access microphone.');
    }
  };
  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };
  const resetRecording = () => {
    setAudioURL(null);
    setAudioBlob(null);
    setTranscription('');
    setTranscribeError(null);
    audioChunks.current = [];
  };
  const handleTranscribe = async () => {
    if (!audioBlob) return;
    setIsTranscribing(true);
    setTranscribeError(null);
    try {
      const text = await transcribeAudio(audioBlob);
      setTranscription(text);
      if (inputMode === 'form') {
        // In form mode, populate additional context
        setAdditionalContext(text);
        setValues(prev => ({ ...prev, additionalContext: text }));
      }
    } catch (err: any) {
      console.error('Transcription error:', err);
      setTranscribeError(err.message || 'Transcription failed. Please try again.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleVoiceSubmit = async () => {
    if (!transcription.trim()) return;
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('inputMode', 'voice');
      formData.append('voiceTranscription', transcription);
      formData.append('tone', tone || 'Professional');
      formData.append('length', lengthVal || 'Medium');
      
      let pitch = '';
      const res = await fetch('/api/pitch', { method: 'POST', body: formData });
      if (res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          pitch += decoder.decode(value);
          onSubmit({ pitch });
        }
      } else {
        onSubmit({ pitch: await res.text() });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white rounded-3xl shadow-xl shadow-black/5 border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">AI Pitch Generator</h2>
              <p className="text-blue-100 text-sm">Create your perfect elevator pitch</p>
            </div>
          </div>
        </div>

        {/* Input Mode Selection */}
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Choose Your Input Method</h3>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setInputMode('form')}
              className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                inputMode === 'form'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <FileText className="h-8 w-8" />
                <div className="text-center">
                  <div className="font-semibold">Form Input</div>
                  <div className="text-sm opacity-75">Fill out structured fields</div>
                </div>
              </div>
            </button>
            
            <button
              type="button"
              onClick={() => setInputMode('voice')}
              className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                inputMode === 'voice'
                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                  : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <MessageSquare className="h-8 w-8" />
                <div className="text-center">
                  <div className="font-semibold">Voice Input</div>
                  <div className="text-sm opacity-75">Record and transcribe</div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Content based on input mode */}
        {inputMode === 'form' ? (
          <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-0">
            <div className="p-6 space-y-6">
              <div className="text-center py-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Tell Us About Your Pitch</h3>
                <p className="text-gray-600">Fill out the details below to generate your elevator pitch</p>
              </div>

              {/* Core Fields */}
              <div className="grid gap-5">
                <FormField
                  name="jobTitle"
                  label="Target Job Title"
                  placeholder="e.g., Senior Product Manager"
                  register={register}
                  errors={errors}
                  tooltipText={tooltipTexts.jobTitle}
                />
                <FormField
                  name="purpose"
                  label="Purpose"
                  placeholder="e.g., Job interview, Networking event"
                  register={register}
                  errors={errors}
                  tooltipText={tooltipTexts.purpose}
                />
                <div className="grid md:grid-cols-2 gap-5">
                  <FormField
                    name="focusArea"
                    label="Focus Area"
                    placeholder="e.g., Leadership, Technical skills"
                    register={register}
                    errors={errors}
                    tooltipText={tooltipTexts.focusArea}
                  />
                  <FormField
                    name="audience"
                    label="Target Audience"
                    placeholder="e.g., Hiring manager, CTO"
                    register={register}
                    errors={errors}
                    tooltipText={tooltipTexts.audience}
                  />
                </div>
              </div>

              {/* Basic Settings */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-800">Tone</label>
                  <div className="flex flex-wrap gap-2">
                    {['Professional','Casual','Enthusiastic'].map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTone(t)}
                        className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                          tone === t ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-800">Length</label>
                  <div className="flex flex-wrap gap-2">
                    {[{value: 'Short', desc: '30-45s'}, {value: 'Medium', desc: '60-90s'}, {value: 'Long', desc: '2-3m'}].map(l => (
                      <button
                        key={l.value}
                        type="button"
                        onClick={() => setLength(l.value)}
                        className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                          lengthVal === l.value ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {l.value} ({l.desc})
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <FormField
                name="additionalContext"
                label="Additional Context (Optional)"
                placeholder="Any specific achievements, experiences, or notes..."
                rows={3}
                register={register}
                errors={errors}
              />
            </div>

            {/* Form Submit */}
            <div className="p-6 bg-gray-50 border-t border-gray-100">
              <button
                type="submit"
                disabled={!isValid || isSubmitting || disabled}
                className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all duration-200 ${
                  !isValid || isSubmitting || disabled
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl'
                }`}
              >
                {isSubmitting ? 'Generating Pitch...' : 'Generate Pitch'}
              </button>
            </div>
          </form>
        ) : (
          /* Voice Input Mode */
          <div className="p-6 space-y-6">
            <div className="text-center py-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Record Your Pitch Description</h3>
              <p className="text-gray-600">Tell us about yourself, your goals, and what you want to highlight in your pitch</p>
            </div>

            {/* Voice Recording Interface */}
            <div className="bg-gray-50 rounded-xl p-6 text-center">
              {!audioURL ? (
                <div className="space-y-4">
                  <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center transition-colors ${
                    isRecording ? 'bg-red-100 animate-pulse' : 'bg-purple-100'
                  }`}>
                    {isRecording ? (
                      <MicOff className="h-8 w-8 text-red-600" />
                    ) : (
                      <Mic className="h-8 w-8 text-purple-600" />
                    )}
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">
                      {isRecording ? 'Recording in progress...' : 'Ready to record'}
                    </h4>
                    <p className="text-sm text-gray-600 mb-4">
                      {isRecording 
                        ? 'Speak clearly about your background, goals, and what makes you unique'
                        : 'Click the button below to start recording your pitch description'
                      }
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`px-6 py-3 rounded-full font-semibold transition-all ${
                      isRecording 
                        ? 'bg-red-600 text-white hover:bg-red-700' 
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                  >
                    {isRecording ? 'Stop Recording' : 'Start Recording'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Recording Complete</h4>
                    <p className="text-sm text-gray-600 mb-4">Review your recording and transcribe to text</p>
                  </div>

                  <div className="flex items-center justify-center gap-3">
                    <audio src={audioURL} controls className="rounded" />
                  </div>

                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={resetRecording}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      <RotateCcw className="h-4 w-4 inline mr-2" />
                      Re-record
                    </button>
                    
                    <button
                      type="button"
                      onClick={handleTranscribe}
                      disabled={isTranscribing}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                    >
                      {isTranscribing ? 'Transcribing...' : 'Transcribe'}
                    </button>
                  </div>
                </div>
              )}

              {transcribeError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {transcribeError}
                </div>
              )}
            </div>

            {/* Transcription Result */}
            {transcription && (
              <div className="space-y-4">
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-800">Transcription</label>
                  <textarea
                    value={transcription}
                    onChange={e => setTranscription(e.target.value)}
                    rows={6}
                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10"
                    placeholder="Your transcribed text will appear here..."
                  />
                  <p className="text-xs text-gray-500 mt-2">You can edit the transcription if needed</p>
                </div>

                {/* Voice Settings */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-800">Tone</label>
                    <div className="flex flex-wrap gap-2">
                      {['Professional','Casual','Enthusiastic'].map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTone(t)}
                          className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                            tone === t ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-800">Length</label>
                    <div className="flex flex-wrap gap-2">
                      {[{value: 'Short', desc: '30-45s'}, {value: 'Medium', desc: '60-90s'}, {value: 'Long', desc: '2-3m'}].map(l => (
                        <button
                          key={l.value}
                          type="button"
                          onClick={() => setLength(l.value)}
                          className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                            lengthVal === l.value ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {l.value} ({l.desc})
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Voice Submit */}
                <div className="pt-4">
                  <button
                    type="button"
                    onClick={handleVoiceSubmit}
                    disabled={!transcription.trim() || isSubmitting}
                    className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all duration-200 ${
                      !transcription.trim() || isSubmitting
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl'
                    }`}
                  >
                    {isSubmitting ? 'Generating Pitch...' : (
                      <>
                        <Send className="h-5 w-5 inline mr-2" />
                        Generate Pitch from Voice
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}