/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { 
  Send, 
  User, 
  Bot, 
  Plus,
  Search,
  MoreVertical,
  Sparkles,
  FileText,
  Upload,
  X,
  LayoutGrid,
  FileSearch,
  Download,
  ClipboardList,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Message } from './types';
import { generateResponse } from './services/gemini';
import Markdown from 'react-markdown';

interface PDFFile {
  id: string;
  name: string;
  url: string;
  base64: string;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'model',
      text: 'Bienvenido, Ejecutivo de Reclutamiento. He habilitado el visor de documentos a la izquierda. Puede cargar varios CV en PDF para que los analicemos juntos.\n\n**Paso recomendado:** Pega la descripción del puesto en el campo "Perfil Maestro" para realizar un análisis comparativo preciso.',
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pdfFiles, setPdfFiles] = useState<PDFFile[]>([]);
  const [activePdfId, setActivePdfId] = useState<string | null>(null);
  const [masterProfile, setMasterProfile] = useState('');
  const [viewMode, setViewMode] = useState<'viewer' | 'scorecard'>('viewer');
  const [scorecardData, setScorecardData] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const pdfBase64s = pdfFiles.map(f => f.base64);
      const aiResponseText = await generateResponse(
        input, 
        history, 
        pdfBase64s.length > 0 ? pdfBase64s : undefined,
        masterProfile || undefined
      );
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: aiResponseText,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error in chat:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "Lo siento, ha ocurrido un error al procesar su solicitud. Por favor, verifique su conexión e intente de nuevo.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const fileList = Array.from(files);
    fileList.forEach((file: File) => {
      if (file.type === 'application/pdf') {
        const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
        const blobUrl = URL.createObjectURL(file);
        
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          const base64Data = dataUrl.split(',')[1];
          
          const newPdf: PDFFile = {
            id,
            name: file.name,
            url: blobUrl,
            base64: base64Data
          };
          
          setPdfFiles(prev => [...prev, newPdf]);
          setActivePdfId(id);
        };
        reader.readAsDataURL(file);
      } else {
        alert(`El archivo ${file.name} no es un PDF válido.`);
      }
    });
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePdf = (id: string) => {
    setPdfFiles(prev => {
      const filtered = prev.filter(f => {
        if (f.id === id) {
          URL.revokeObjectURL(f.url);
          return false;
        }
        return true;
      });
      
      if (activePdfId === id) {
        setActivePdfId(filtered.length > 0 ? filtered[0].id : null);
      }
      
      return filtered;
    });
  };

  const activePdf = pdfFiles.find(f => f.id === activePdfId);

  const generateScorecard = async () => {
    if (pdfFiles.length === 0) {
      alert("Cargue al menos un CV para generar el cuadro comparativo.");
      return;
    }
    setIsLoading(true);
    setViewMode('scorecard');
    
    const prompt = "Genera un cuadro comparativo de todos los candidatos en formato JSON. Para cada candidato incluye: nombre, experiencia_años, habilidades_clave (array), match_porcentaje (0-100) y observacion_breve. Responde ÚNICAMENTE con el JSON, sin texto adicional.";
    
    try {
      const pdfBase64s = pdfFiles.map(f => f.base64);
      const response = await generateResponse(prompt, [], pdfBase64s, masterProfile);
      
      // Robust JSON extraction: find the JSON block even if there is surrounding text
      const jsonMatch = response.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
      const jsonStr = jsonMatch ? jsonMatch[0] : response.replace(/```json|```/g, '').trim();
      
      const data = JSON.parse(jsonStr);
      setScorecardData(Array.isArray(data) ? data : [data]);
    } catch (error) {
      console.error("Error generating scorecard:", error);
      alert("No se pudo generar el cuadro comparativo automáticamente. Intente de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  const exportAnalysis = () => {
    if (scorecardData.length === 0) {
      alert("Primero genere el cuadro comparativo con 'Actualizar con IA'");
      return;
    }

    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text('Cuadro Comparativo de Candidatos', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 30);

    // Master Profile section
    if (masterProfile) {
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text('Perfil Maestro:', 14, 40);
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105); // slate-600
      const splitProfile = doc.splitTextToSize(masterProfile, 180);
      doc.text(splitProfile, 14, 46);
    }

    // Table
    const tableData = scorecardData.map(item => [
      item.nombre,
      `${item.experiencia_años} años`,
      item.habilidades_clave?.join(', ') || '',
      `${item.match_porcentaje}%`,
      item.observacion_breve
    ]);

    (doc as any).autoTable({
      startY: masterProfile ? 46 + (doc.splitTextToSize(masterProfile, 180).length * 4) + 10 : 40,
      head: [['Candidato', 'Exp.', 'Habilidades', 'Match', 'Observación']],
      body: tableData,
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { top: 30 },
      styles: { fontSize: 8, cellPadding: 3 }
    });

    doc.save(`analisis_reclutamiento_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="flex flex-col h-screen bg-[#F8F9FA] overflow-hidden">
      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
            <Sparkles className="text-white w-5 h-5" />
          </div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">RecruitAI <span className="font-normal text-slate-500">Executive</span></h1>
          <div className="h-4 w-[1px] bg-slate-200 mx-2"></div>
          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase rounded tracking-wider">Modo Análisis de CV</span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 mr-4">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200">
              <img 
                src="https://picsum.photos/seed/recruiter/100/100" 
                alt="Profile" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <span className="text-xs font-semibold text-slate-700">Perfil Reclutador</span>
          </div>
          <button className="p-2 text-slate-500 hover:bg-slate-50 rounded-full transition-colors">
            <MoreVertical size={20} />
          </button>
        </div>
      </header>

      {/* Main Split Content */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Side: PDF Viewer & Scorecard */}
        <div className="flex-1 bg-slate-100 border-r border-slate-200 flex flex-col relative">
          <div className="p-4 border-b border-slate-200 bg-white flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <button 
                  onClick={() => setViewMode('viewer')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    viewMode === 'viewer' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <FileSearch size={16} />
                  Visor
                </button>
                <button 
                  onClick={() => setViewMode('scorecard')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    viewMode === 'scorecard' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <ClipboardList size={16} />
                  Cuadro Comparativo
                </button>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={exportAnalysis}
                  className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all"
                  title="Exportar Análisis"
                >
                  <Download size={18} />
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 shadow-sm transition-all"
                >
                  <Upload size={16} />
                  Cargar PDFs
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="application/pdf" 
                  multiple
                  className="hidden" 
                />
              </div>
            </div>

            {/* Master Profile Input */}
            <div className="relative">
              <textarea 
                placeholder="Pegue aquí el Perfil Maestro (Descripción de Puesto)..."
                value={masterProfile}
                onChange={(e) => setMasterProfile(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all resize-none h-20"
              />
              <div className="absolute top-2 right-2">
                <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[9px] font-bold uppercase rounded">Perfil Maestro</span>
              </div>
            </div>
          </div>

          {viewMode === 'viewer' ? (
            <>
              {pdfFiles.length > 0 && (
                <div className="flex gap-2 p-2 bg-slate-50 border-b border-slate-200 overflow-x-auto scrollbar-hide">
                  {pdfFiles.map((file) => (
                    <div 
                      key={file.id}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                        activePdfId === file.id 
                        ? 'bg-white border-slate-900 text-slate-900 shadow-sm' 
                        : 'bg-transparent border-slate-200 text-slate-500 hover:bg-white'
                      }`}
                      onClick={() => setActivePdfId(file.id)}
                    >
                      <FileText size={14} />
                      <span className="max-w-[120px] truncate">{file.name}</span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          removePdf(file.id);
                        }}
                        className="p-0.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-red-500"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex-1 flex items-center justify-center p-8">
                {activePdf ? (
                  <div className="w-full h-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
                    <div className="relative w-full h-full bg-white">
                      <embed 
                        key={activePdf.id}
                        src={`${activePdf.url}#toolbar=0&navpanes=0&scrollbar=0`} 
                        type="application/pdf"
                        className="w-full h-full"
                      />
                      <div className="absolute top-4 right-4 flex gap-2">
                        <button 
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = activePdf.url;
                            link.download = activePdf.name;
                            link.click();
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50 transition-all shadow-sm"
                        >
                          <Download size={14} />
                          Descargar
                        </button>
                        <button 
                          onClick={() => {
                            const newWindow = window.open();
                            if (newWindow) {
                              newWindow.document.write(`
                                <html>
                                  <head><title>${activePdf.name}</title></head>
                                  <body style="margin:0">
                                    <embed src="${activePdf.url}" type="application/pdf" width="100%" height="100%">
                                  </body>
                                </html>
                              `);
                            }
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-all shadow-lg"
                        >
                          <ExternalLink size={14} />
                          Pantalla Completa
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center max-w-md">
                    <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100">
                      <FileText size={40} className="text-slate-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Visor de Documentos</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">
                      Cargue los currículums y la descripción del puesto para visualizarlos aquí mientras interactúa con el asistente.
                    </p>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-6 px-6 py-2.5 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                    >
                      Seleccionar Archivos
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                  <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">Cuadro Comparativo de Candidatos</h3>
                  <button 
                    onClick={generateScorecard}
                    disabled={isLoading}
                    className="px-4 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-all disabled:opacity-50"
                  >
                    {isLoading ? 'Generando...' : 'Actualizar con IA'}
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-3">Candidato</th>
                        <th className="px-6 py-3">Exp.</th>
                        <th className="px-6 py-3">Habilidades</th>
                        <th className="px-6 py-3">Match</th>
                        <th className="px-6 py-3">Observación</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {scorecardData.length > 0 ? scorecardData.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-semibold text-slate-900">{item.nombre}</td>
                          <td className="px-6 py-4 text-slate-600">{item.experiencia_años} años</td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                              {item.habilidades_clave?.map((h: string, i: number) => (
                                <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px]">{h}</span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${
                                    item.match_porcentaje > 70 ? 'bg-emerald-500' : item.match_porcentaje > 40 ? 'bg-amber-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${item.match_porcentaje}%` }}
                                />
                              </div>
                              <span className="font-bold text-slate-900">{item.match_porcentaje}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-500 italic">{item.observacion_breve}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                            Haga clic en "Actualizar con IA" para analizar los candidatos contra el Perfil Maestro.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Chatbot */}
        <div className="flex-1 flex flex-col bg-white">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
            <AnimatePresence initial={false}>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-3 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${
                      message.role === 'user' ? 'bg-slate-100' : 'bg-slate-900'
                    }`}>
                      {message.role === 'user' ? <User size={16} className="text-slate-500" /> : <Bot size={16} className="text-white" />}
                    </div>
                    <div>
                      <div className={message.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}>
                        <div className="text-sm leading-relaxed markdown-body">
                          <Markdown>{message.text}</Markdown>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block px-1">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
                    <Bot size={16} className="text-white" />
                  </div>
                  <div className="chat-bubble-ai flex items-center gap-1 py-4">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <div className="p-6 border-t border-slate-100 bg-white">
            <div className="relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Pregunte sobre el CV o pida ayuda para la entrevista..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 pr-14 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all resize-none min-h-[56px] max-h-[150px]"
                rows={1}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className={`absolute right-2.5 bottom-2.5 p-2 rounded-xl transition-all ${
                  input.trim() && !isLoading 
                  ? 'bg-slate-900 text-white hover:bg-slate-800' 
                  : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                }`}
              >
                <Send size={18} />
              </button>
            </div>
            <div className="flex items-center justify-between mt-3">
              <div className="flex gap-2">
                <QuickAction label="Analizar CV" onClick={() => setInput("Analiza el CV cargado y dime los puntos fuertes y débiles.")} />
                <QuickAction label="Preguntas" onClick={() => setInput("Genera 5 preguntas clave para este perfil.")} />
              </div>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">
                RecruitAI v1.1
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickAction({ label, onClick }: { label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-500 uppercase tracking-tight hover:bg-slate-100 hover:text-slate-900 transition-all"
    >
      {label}
    </button>
  );
}