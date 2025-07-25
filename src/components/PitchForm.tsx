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
}
const FormField: React.FC<FormFieldProps> = ({
  name,
  label,
  placeholder,
  rows,
  register,
  errors,
  tooltipText,
}) => {
  const props = register(name);
  return (
    <div className="space-y-1">
      <label className="flex items-center text-sm font-medium text-gray-800">
        {label}
        {tooltipText && <InfoTooltip text={tooltipText} />}
      </label>
      {rows ? (
        <textarea
          {...props}
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
          {...props}
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

  return { register, handleSubmit, formState: { errors: {}, isValid: true } };
};

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
  const { register, handleSubmit, formState: { errors, isValid } } = useForm();
  const [profileSource, setProfileSource] = useState<'resume'|'linkedin'>('resume');
  const [uploadedFile, setUploadedFile] = useState<File|null>(null);
  const [tone, setTone] = useState<string>('');
  const [lengthVal, setLength] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      formData.append('jobTitle', data.jobTitle || '');
      formData.append('purpose', data.purpose || '');
      formData.append('focusArea', data.focusArea || '');
      formData.append('audience', data.audience || '');
      // combine LinkedIn + notes...
      const contextParts = [];
      if (data.linkedinUrl) contextParts.push(`LinkedIn Profile: ${data.linkedinUrl}`);
      if (data.additionalContext) contextParts.push(data.additionalContext);
      formData.append('additionalContext', contextParts.join('\n\n'));
      formData.append('tone', tone);
      formData.append('length', lengthVal);
      if (profileSource === 'resume' && uploadedFile) {
        formData.append('resumeFile', uploadedFile);
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

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form
        encType="multipart/form-data"
        onSubmit={handleSubmit(onFormSubmit)}
        className="bg-white rounded-3xl shadow-xl shadow-black/5 border border-gray-100 overflow-hidden"
      >
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

        <div className="p-6 space-y-6">
          {/* Core Fields */}
          <div className="grid gap-5">
            <FormField
              name="jobTitle"
              label="Target Job Title"
              placeholder="e.g., Senior PM"
              register={register}
              errors={errors}
              tooltipText={tooltipTexts.jobTitle}
            />
            <FormField
              name="purpose"
              label="Purpose"
              placeholder="e.g., Networking"
              register={register}
              errors={errors}
              tooltipText={tooltipTexts.purpose}
            />
            <div className="grid md:grid-cols-2 gap-5">
              <FormField
                name="focusArea"
                label="Focus Area"
                placeholder="e.g., Leadership"
                register={register}
                errors={errors}
                tooltipText={tooltipTexts.focusArea}
              />
              <FormField
                name="audience"
                label="Target Audience"
                placeholder="e.g., CTO"
                register={register}
                errors={errors}
                tooltipText={tooltipTexts.audience}
              />
            </div>
          </div>

          {/* Profile Toggle */}
          <div className="bg-gray-100 p-1 rounded-xl flex relative overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full w-1/2 rounded-xl transition-transform duration-300 ease-out bg-emerald-500 z-0"
              style={{
                transform: profileSource === 'resume' ? 'translateX(0)' : 'translateX(100%)',
                boxShadow: '0 4px 20px rgba(16,185,129,0.20)',
              }}
            />
            <div className="relative w-full flex z-10">
              {[
                { id: 'resume',   label: 'Resume Upload', icon: UploadIcon },
                { id: 'linkedin', label: 'LinkedIn URL',  icon: LinkIcon },
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setProfileSource(opt.id as any)}
                  className={`
                    flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium
                    transition-colors duration-300
                    ${profileSource === opt.id ? 'text-white' : 'text-gray-600'}
                  `}
                >
                  <opt.icon className={`h-4 w-4 ${profileSource === opt.id ? 'text-white' : 'text-gray-600'}`} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Profile Input */}
          {profileSource === 'resume' ? (
            <div className="relative">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileUpload}
                className="hidden"
                key={uploadedFile ? uploadedFile.name : 'nofile'}
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`
                  border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
                  transition-all duration-200 ease-out
                  ${uploadedFile
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'}
                `}
              >
                {uploadedFile ? (
                  <div className="space-y-2">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                    <h3 className="font-semibold text-green-800">File Uploaded</h3>
                    <p className="text-sm text-green-600">{uploadedFile.name}</p>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        setUploadedFile(null);
                        // Reset file input value so user can re-upload same file
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="text-xs text-green-600 hover:text-green-800 underline"
                    >
                      Remove file
                    </button>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="ml-2 text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      Re-upload
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Plus className="h-12 w-12 text-gray-400 mx-auto" />
                    <h3 className="font-semibold text-gray-800">Upload Your Resume</h3>
                    <p className="text-sm text-gray-600">PDF, DOC, or DOCX only</p>
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                      <UploadIcon className="h-4 w-4" />
                      Choose File
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <LinkIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  {...register('linkedinUrl')}
                  type="url"
                  placeholder="Paste your LinkedIn profile URL here"
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200"
                />
              </div>
            </div>
          )}

          {/* Advanced Settings */}
          <div className="border-t border-gray-100 pt-6">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center justify-between w-full py-2 text-left text-gray-800 font-medium hover:text-gray-900 transition-colors"
            >
              <span className="flex items-center gap-2">
                Advanced Settings
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                  Optional
                </span>
              </span>
              <ChevronDown
                className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
                  showAdvanced ? 'rotate-180' : ''
                }`}
              />
            </button>
            {showAdvanced && (
              <div className="mt-4 space-y-5 p-4 bg-gray-50 rounded-xl">
                <FormField
                  name="additionalContext"
                  label="Additional Context"
                  placeholder="Any specific achievements or notes..."
                  rows={3}
                  register={register}
                  errors={errors}
                />
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Tone */}
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-800">Tone</label>
                    <div className="flex flex-wrap gap-3">
                      {['Professional','Casual','Enthusiastic','Conversational'].map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTone(t)}
                          className={`
                            px-4 py-2 rounded-full text-sm font-medium cursor-pointer
                            transition-colors duration-200
                            ${tone === t
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}
                          `}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Length */}
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-800">Length</label>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { value: 'Short',  desc: '30–45s' },
                        { value: 'Medium', desc: '60–90s' },
                        { value: 'Long',   desc: '2–3m' },
                      ].map(l => (
                        <button
                          key={l.value}
                          type="button"
                          onClick={() => setLength(l.value)}
                          className={`
                            px-4 py-2 rounded-full text-sm font-medium cursor-pointer
                            transition-colors duration-200
                            ${lengthVal === l.value
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}
                          `}
                        >
                          <div className="flex items-baseline gap-1.5">
                            <span>{l.value}</span>
                            <span className="text-xs opacity-70">({l.desc})</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="p-6 bg-gray-50 border-t border-gray-100">
          <button
            type="submit"
            disabled={!isValid || isSubmitting || disabled}
            className={`
              w-full py-4 px-6 rounded-xl font-semibold text-white
              transition-all duration-200 ease-out
              ${!isValid || isSubmitting || disabled
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 active:scale-95 shadow-lg hover:shadow-xl'
              }
            `}
          >
            {isSubmitting ? 'Generating…' : 'Generate Pitch'}
          </button>
        </div>
      </form>
    </div>
  );
}