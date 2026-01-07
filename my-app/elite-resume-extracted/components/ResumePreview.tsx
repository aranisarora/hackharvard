
import React from 'react';
import { ResumeData } from '../types';

interface ResumePreviewProps {
  data: ResumeData;
  innerRef: React.RefObject<HTMLDivElement | null>;
}

const ResumePreview: React.FC<ResumePreviewProps> = ({ data, innerRef }) => {
  const websiteUrl = data.contact.website && data.contact.website.startsWith('http') 
    ? data.contact.website 
    : data.contact.website ? `https://${data.contact.website}` : null;

  const nameParts = data.name.trim().split(/\s+/);
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  return (
    <div 
      className="mx-auto print:shadow-none bg-transparent"
      style={{ 
        width: '794px', 
        maxWidth: '100%',
        margin: '0 auto',
      }}
    >
      <div 
        ref={innerRef}
        id="resume-content-wrapper"
        className="w-full flex flex-col h-full text-slate-800 bg-white shadow-2xl overflow-hidden"
        style={{
          minHeight: '1123px',
          backgroundImage: 'linear-gradient(to right, #f8fafc 35%, #ffffff 35%)',
          backgroundRepeat: 'repeat-y',
          // Reduced to 0.5-inch padding at the bottom (48px at 96DPI)
          paddingBottom: '48px' 
        }}
      >
        {/* Premium Header Section - Ryan Phipps Style */}
        <div className="flex w-full bg-[#1e293b] text-white px-12 py-14 items-stretch shrink-0 z-10 gap-10">
          <div className="flex-1 flex flex-col justify-center">
            <h1 className="text-5xl font-extrabold tracking-tighter uppercase leading-[1.0] flex flex-col">
              <span className="block">{firstName}</span>
              <span className="block">{lastName}</span>
            </h1>
            <div className="h-1.5 w-16 bg-blue-500 mt-4 mb-8"></div>
            <p className="text-[14px] font-medium tracking-[0.25em] uppercase opacity-90 text-slate-300 leading-relaxed">
              {data.title}
            </p>
          </div>
          
          {(data.contact.phone || data.contact.address || websiteUrl) && (
            <div className="w-px bg-slate-700 shrink-0"></div>
          )}

          <div className="flex flex-col justify-center items-end text-right space-y-3 shrink-0 min-w-[200px]">
            {data.contact.phone && (
              <p className="text-[11px] font-bold tracking-widest uppercase">{data.contact.phone}</p>
            )}
            {data.contact.address && (
              <p className="text-[11px] font-bold tracking-widest uppercase">{data.contact.address}</p>
            )}
            {websiteUrl && (
              <div className="pt-2">
                <a 
                  href={websiteUrl} 
                  data-pdf-link={websiteUrl}
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-block px-6 py-2 border border-slate-600 text-[10px] font-black tracking-[0.2em] uppercase hover:bg-slate-700 hover:border-slate-500 transition-all pdf-link"
                >
                  Portfolio
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="flex w-full flex-grow relative">
          {/* Left Column Sidebar */}
          <div className="w-[35%] p-10 pt-14 space-y-16 shrink-0 z-10 border-r border-slate-100/50">
            {data.education.length > 0 && (
              <section className="break-inside-avoid">
                <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 mb-6 flex items-center gap-3">
                  Education
                  <span className="flex-1 h-[1.5px] bg-slate-200"></span>
                </h2>
                <div className="space-y-10">
                  {data.education.map((edu, i) => (
                    <div key={i} className="space-y-1.5 break-inside-avoid">
                      <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">{edu.yearRange}</p>
                      <p className="text-[13px] font-extrabold uppercase text-slate-900 leading-tight tracking-tight">{edu.degree}</p>
                      <p className="text-[11px] font-medium text-slate-600">{edu.institution}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {data.skills.length > 0 && (
              <section className="break-inside-avoid">
                <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 mb-6 flex items-center gap-3">
                  Expertise
                  <span className="flex-1 h-[1.5px] bg-slate-200"></span>
                </h2>
                <ul className="space-y-4">
                  {data.skills.map((skill, i) => (
                    <li key={i} className="flex items-center gap-3 text-[10px] text-slate-700 font-bold uppercase tracking-tight break-inside-avoid">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full shrink-0"></span>
                      {skill}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {data.languages.length > 0 && (
              <section className="break-inside-avoid">
                <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 mb-6 flex items-center gap-3">
                  Languages
                  <span className="flex-1 h-[1.5px] bg-slate-200"></span>
                </h2>
                <ul className="space-y-4">
                  {data.languages.map((lang, i) => (
                    <li key={i} className="text-[11px] text-slate-600 font-bold tracking-wide flex items-center justify-between break-inside-avoid">
                      <span>{lang.toUpperCase()}</span>
                      <span className="h-[1px] w-4 bg-slate-300"></span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* Right Column Body */}
          <div className="w-[65%] p-10 pt-14 bg-transparent space-y-16 z-10">
            <section className="break-inside-avoid">
              <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-3">
                Executive Summary
                <span className="flex-1 h-[1px] bg-slate-100"></span>
              </h2>
              <p className="text-[13px] text-slate-600 leading-relaxed font-medium">
                {data.profileInfo}
              </p>
            </section>

            <section>
              <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-3">
                Professional Experience
                <span className="flex-1 h-[1px] bg-slate-100"></span>
              </h2>
              <div className="space-y-12">
                {data.experience.map((exp, i) => (
                  <div key={i} className="relative group break-inside-avoid pb-4">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="text-[15px] font-black text-slate-900 uppercase tracking-tight leading-tight flex-1">{exp.role}</h3>
                      <span className="text-[10px] font-bold text-slate-400 tracking-widest bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-sm uppercase whitespace-nowrap ml-4">{exp.yearRange}</span>
                    </div>
                    <p className="text-[12px] font-black text-blue-600 uppercase mb-3 tracking-wider">{exp.company}</p>
                    <div className="text-[12px] text-slate-600 leading-[1.7] whitespace-pre-line border-l-2 border-slate-100 pl-6 group-hover:border-blue-200 transition-all">
                      {exp.description}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {data.achievements.length > 0 && (
              <section>
                <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-3">
                  Key Achievements
                  <span className="flex-1 h-[1px] bg-slate-100"></span>
                </h2>
                <div className="space-y-8">
                  {data.achievements.map((ach, i) => (
                    <div key={i} className="flex gap-8 items-start py-4 border-b border-slate-50 last:border-0 break-inside-avoid">
                      <div className="w-[85px] shrink-0 flex items-center justify-center pt-1">
                        <span className="text-[11px] font-black text-slate-900 w-full text-center tracking-tighter whitespace-nowrap">
                          {ach.yearRange}
                        </span>
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <p className="text-[14px] font-bold text-slate-900 leading-tight uppercase tracking-tight">{ach.title}</p>
                        <p className="text-[12px] text-slate-500 leading-relaxed font-medium">
                          {ach.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumePreview;
