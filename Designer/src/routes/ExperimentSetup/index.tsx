import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import '../../styles/pages/experiment-setup.css';

export default function ExperimentSetup() {
  const navigate = useNavigate();
  const { expName } = useParams<{ expName: string }>();

  return (
    <div className="experiment-setup-page min-h-screen md:h-screen p-3 sm:p-4 md:p-6 relative overflow-x-hidden overflow-y-auto md:overflow-y-hidden flex items-center justify-center">
      <div className="absolute top-[-8%] left-[-8%] w-[260px] h-[260px] sm:w-[360px] sm:h-[360px] rounded-full blur-[40px] opacity-50 bg-[#D1FAE5] pointer-events-none" />
      <div className="absolute bottom-[-8%] right-[-8%] w-[300px] h-[300px] sm:w-[440px] sm:h-[440px] rounded-full blur-[40px] opacity-50 bg-[#FEE2E2] pointer-events-none" />

      <main className="w-full max-w-2xl mx-auto bg-white rounded-[2.25rem] sm:rounded-[3rem] shadow-xl p-5 sm:p-7 md:p-8 lg:p-8 relative overflow-hidden border-4 border-white my-1 sm:my-2 md:my-0 md:max-h-[calc(100vh-3rem)] md:self-center">
        <header className="text-center mb-6 sm:mb-7 lg:mb-6">
          <div className="flex justify-center mb-4 sm:mb-5 lg:mb-4">
            <div className="bg-[#E6FFFA] p-3 sm:p-4 rounded-full">
              <svg className="w-10 h-10 sm:w-12 sm:h-12 text-[#38B2AC]" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-[2rem] font-bold mb-3 sm:mb-4 text-slate-700">Experiment Setup</h1>
          <p className="text-slate-500 text-sm sm:text-base lg:text-[0.95rem] max-w-md mx-auto">Get ready to explore! Review your science kit components before entering the AR workspace.</p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 lg:gap-4 mb-7 sm:mb-9 lg:mb-7">
          <div className="bg-[#F0FDF4] p-4 sm:p-5 lg:p-4 rounded-3xl border-2 border-dashed border-[#BBF7D0] flex flex-col items-center text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-16 lg:h-16 mb-2 sm:mb-3 flex items-center justify-center">
              <svg className="w-full h-full text-[#059669]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path d="M9 3h6M10 3v6l-4 8a2 2 0 002 3h8a2 2 0 002-3l-4-8V3" />
                <path d="M8.5 13h7" />
              </svg>
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-emerald-900">Beaker &amp; Solutions</h3>
            <p className="text-sm text-emerald-700 mt-1">Ready for mixing</p>
          </div>

          <div className="bg-[#EFF6FF] p-4 sm:p-5 lg:p-4 rounded-3xl border-2 border-dashed border-[#DBEAFE] flex flex-col items-center text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-16 lg:h-16 mb-2 sm:mb-3 flex items-center justify-center">
              <svg className="w-full h-full text-[#2563EB]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="3" />
                <circle cx="5" cy="19" r="3" />
                <circle cx="19" cy="19" r="3" />
                <line x1="12" x2="6.5" y1="8" y2="16.5" />
                <line x1="12" x2="17.5" y1="8" y2="16.5" />
              </svg>
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-blue-900">Atomic Models</h3>
            <p className="text-sm text-blue-700 mt-1">3D Structures loaded</p>
          </div>
        </section>

        <div className="flex flex-col items-center gap-3 sm:gap-4">
          <button
            onClick={() => navigate(`/experiment/${expName}`)}
            className="w-full sm:w-auto bg-[#FB7185] hover:bg-[#F43F5E] text-white text-base sm:text-lg lg:text-base font-bold py-3.5 sm:py-4 lg:py-3.5 px-8 sm:px-12 rounded-full shadow-lg transition-transform transform hover:scale-105 active:scale-95 duration-200"
          >
            Continue to Editor
          </button>
          <button
            onClick={() => navigate('/experiments')}
            className="text-slate-500 hover:text-slate-800 transition-colors font-medium text-sm underline underline-offset-4"
          >
            Go back to Library
          </button>
        </div>

        <div className="absolute -bottom-4 -right-4 opacity-10 pointer-events-none">
          <svg fill="none" height="200" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24" width="200">
            <path d="M3 3c0 0 2 10 7 12s11-2 11-2" />
            <circle cx="5" cy="5" r="1" />
            <circle cx="19" cy="19" r="1" />
            <path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
          </svg>
        </div>
      </main>
    </div>
  );
}
