
import React, { useState, useRef } from 'react';
import { ResumeData, ProcessingState } from './types';
import { parseResumeText } from './services/geminiService';
import ResumePreview from './components/ResumePreview';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const DEFAULT_RESUME: ResumeData = {
  name: "Jonathan Patterson",
  title: "Art Director",
  profileInfo: "Experienced Art Director with over 8 years of proven expertise in digital design and brand strategy. Expert at leading cross-functional teams to deliver high-impact visual campaigns for global clients. Specialized in blending creative innovation with business objectives.",
  education: [
    {
      yearRange: "2014 - 2017",
      degree: "Bachelor of Design",
      institution: "Wardiere University",
      description: "Graduated with Honors in Web Design and Digital Media."
    }
  ],
  skills: [
    "Management Skills",
    "Creative Direction",
    "Digital Marketing",
    "Brand Strategy",
    "Adobe Creative Suite",
    "Leadership"
  ],
  languages: ["English", "German (basic)", "Spanish (basic)"],
  contact: {
    phone: "+123-456-7890",
    email: "",
    address: "123 Anywhere St., Any City",
    website: "www.linkedin.com/in/jonathan-patterson"
  },
  experience: [
    {
      yearRange: "2020 - 2024",
      role: "Senior Graphic Designer",
      company: "Studio Shodwe",
      description: "Spearheaded design for 50+ successful client campaigns, resulting in a 30% increase in brand engagement. Managed a team of 10 junior designers and interns. \n\n• Optimized workflow efficiency by 25% through new tool adoption."
    },
    {
      yearRange: "2018 - 2020",
      role: "Graphic Designer",
      company: "Ingoude Company",
      description: "Developed comprehensive brand identity systems for tech startups. Collaborated with marketing teams to produce high-converting social media assets."
    }
  ],
  achievements: [
    {
      yearRange: "2022",
      title: "Efficiency Award",
      description: "Reduced production costs by 20% through strategic vendor negotiation."
    }
  ]
};

const App: React.FC = () => {
  const [rawText, setRawText] = useState("");
  const [resumeData, setResumeData] = useState<ResumeData>(DEFAULT_RESUME);
  const [status, setStatus] = useState<ProcessingState>({ isProcessing: false, error: null });
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const resumeRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async () => {
    if (!rawText.trim()) return;
    setStatus({ isProcessing: true, error: null });
    try {
      const parsed = await parseResumeText(rawText);
      setResumeData(parsed);
      setIsReady(true);
      setStatus({ isProcessing: false, error: null });
    } catch (err: any) {
      console.error(err);
      setStatus({ isProcessing: false, error: "Failed to process text. Check your network or API key." });
    }
  };

  const handleDownloadPdf = async () => {
    if (!resumeRef.current || !isReady) return;
    setIsGeneratingPdf(true);
    
    try {
      const element = resumeRef.current;
      
      const canvas = await html2canvas(element, {
        scale: 2.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 794,
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const bottomMarginMm = 12.7; // Exactly 0.5 inches (25.4 / 2)
      const usableHeightMm = pdfHeight - bottomMarginMm;
      
      const canvasHeightInMm = (canvas.height * pdfWidth) / canvas.width;
      let heightLeft = canvasHeightInMm;
      let position = 0;

      const addBottomMarginOverlay = () => {
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, usableHeightMm, pdfWidth, bottomMarginMm, 'F');
      };

      // Add the first page
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, canvasHeightInMm);
      addBottomMarginOverlay();
      heightLeft -= usableHeightMm;

      // Loop to add subsequent pages
      while (heightLeft >= 2) {
        position = position - usableHeightMm;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, canvasHeightInMm);
        addBottomMarginOverlay();
        heightLeft -= usableHeightMm;
      }

      // Link Mapping Adjustment
      const links = element.querySelectorAll('.pdf-link');
      const elementRect = element.getBoundingClientRect();

      links.forEach((link) => {
        const linkElem = link as HTMLElement;
        const rect = linkElem.getBoundingClientRect();
        const url = linkElem.getAttribute('data-pdf-link') || '';
        
        const relativeYInMm = ((rect.top - elementRect.top) / elementRect.height) * canvasHeightInMm;
        const pageIndex = Math.floor(relativeYInMm / usableHeightMm);
        const yOnPage = relativeYInMm % usableHeightMm;
        
        const relX = (rect.left - elementRect.left) / elementRect.width;
        const relW = rect.width / elementRect.width;
        const relH = rect.height / elementRect.height;

        if (pageIndex < pdf.getNumberOfPages()) {
          pdf.setPage(pageIndex + 1);
          pdf.link(
            relX * pdfWidth, 
            yOnPage, 
            relW * pdfWidth, 
            relH * pdfHeight, 
            { url: url.includes('@') ? `mailto:${url}` : (url.startsWith('http') ? url : `https://${url}`) }
          );
        }
      });
      
      pdf.save(`${resumeData.name.replace(/\s+/g, '_')}_Resume.pdf`);
    } catch (error) {
      console.error('PDF Generation error:', error);
      alert('Automatic download failed. Opening print dialog instead.');
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row overflow-hidden font-inter">
      {/* Sidebar Controls */}
      <aside className="w-full md:w-[400px] bg-white border-r border-slate-200 p-8 flex flex-col no-print h-screen overflow-y-auto z-20 shadow-xl">
        <div className="space-y-8 flex-grow">
          <div>
            <label className="block text-[10px] font-black text-slate-500 mb-3 uppercase tracking-[0.2em]">Source Material</label>
            <textarea
              className="w-full h-[550px] p-5 text-[13px] bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:outline-none resize-none placeholder-slate-300 text-slate-700 font-medium leading-relaxed"
              placeholder="Paste your existing resume or LinkedIn profile text here..."
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={status.isProcessing || !rawText}
            className={`w-full py-5 rounded-2xl font-black text-[11px] tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-3 border ${
              status.isProcessing 
                ? 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed' 
                : 'bg-[#1e293b] text-white border-slate-800 hover:bg-black hover:scale-[1.02] active:scale-[0.98] shadow-2xl shadow-slate-200'
            }`}
          >
            {status.isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin"></div>
                Optimizing Content...
              </>
            ) : (
              'Refine with AI'
            )}
          </button>

          {status.error && (
            <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-[11px] rounded-xl font-bold uppercase tracking-wider text-center">
              {status.error}
            </div>
          )}
        </div>

        <div className="pt-8 mt-8 border-t border-slate-100">
          <button 
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf || !isReady}
            className={`w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-[11px] tracking-[0.2em] uppercase hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-100 ${isGeneratingPdf || !isReady ? 'opacity-30 cursor-not-allowed' : ''}`}
          >
            {isGeneratingPdf ? 'Mapping Components...' : 'Export Interactive PDF'}
          </button>
        </div>
      </aside>

      {/* Preview Area */}
      <main className="flex-1 overflow-y-auto p-12 print:p-0 print:m-0 bg-slate-100 print:bg-white flex justify-center items-start">
        {isReady ? (
          <div className="print-container">
            <ResumePreview data={resumeData} innerRef={resumeRef} />
          </div>
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center text-slate-300">
            <div className="p-16 border-[1px] border-slate-200 bg-white rounded-[3rem] flex flex-col items-center max-w-md text-center shadow-sm">
              <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mb-10">
                <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-4 tracking-tight uppercase tracking-[0.05em]">Executive Layout</h3>
              <p className="text-[14px] text-slate-400 font-medium leading-relaxed">
                Paste your experience data into the left panel. Our AI will structure it into a visually elite, recruiter-approved document.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
