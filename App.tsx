
import React, { useState, useRef, useEffect } from 'react';
import { GenerationStyle, GenerationTheme, GeneratedImage, ImageFormat } from './types';
import { generateProductCover } from './services/geminiService';
import { Button } from './components/Button';

const formatIcons: Record<string, React.ReactNode> = {
  [ImageFormat.SQUARE]: <div className="w-4 h-4 border-2 border-current rounded-sm" />,
  [ImageFormat.VERTICAL]: <div className="w-4 h-5 border-2 border-current rounded-sm" />,
  [ImageFormat.STORY]: <div className="w-3 h-6 border-2 border-current rounded-sm" />,
  [ImageFormat.BANNER]: <div className="w-6 h-3 border-2 border-current rounded-sm" />,
  [ImageFormat.BOOK]: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
  [ImageFormat.PHONE]: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
  [ImageFormat.ALL]: <div className="flex gap-0.5"><div className="w-2 h-2 bg-current" /><div className="w-2 h-2 bg-current" /></div>
};

const App: React.FC = () => {
  const [selectedStyle, setSelectedStyle] = useState<GenerationStyle>(GenerationStyle.PHOTOGRAPHIC);
  const [selectedTheme, setSelectedTheme] = useState<GenerationTheme>(GenerationTheme.NATURE);
  const [selectedFormat, setSelectedFormat] = useState<ImageFormat>(ImageFormat.SQUARE);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [transparentBackground, setTransparentBackground] = useState(false);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentImages, setCurrentImages] = useState<GeneratedImage[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [history, setHistory] = useState<GeneratedImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentImages.length > 0 && window.innerWidth < 1024) {
      previewRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentImages]);

  const processTransparency = (imgUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(imgUrl);

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const threshold = 230; 

        for (let i = 0; i < data.length; i += 4) {
          if (data[i] > threshold && data[i + 1] > threshold && data[i + 2] > threshold) {
            data[i + 3] = 0;
          }
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.src = imgUrl;
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setReferenceImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeReferenceImage = () => {
    setReferenceImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setCurrentImages([]);
    setActiveImageIndex(0);

    const formatsToGenerate = selectedFormat === ImageFormat.ALL 
      ? [ImageFormat.SQUARE, ImageFormat.VERTICAL, ImageFormat.STORY, ImageFormat.BANNER, ImageFormat.BOOK, ImageFormat.PHONE]
      : [selectedFormat];

    try {
      const results: GeneratedImage[] = [];
      
      for (const fmt of formatsToGenerate) {
        try {
          const url = await generateProductCover(
            selectedStyle, 
            selectedTheme, 
            fmt as ImageFormat, 
            title, 
            subtitle, 
            customDescription,
            referenceImage || undefined,
            transparentBackground
          );
          
          results.push({
            id: Math.random().toString(36).substr(2, 9),
            url,
            timestamp: Date.now(),
            prompt: title || "Método Pulmão Livre",
            style: selectedStyle,
            theme: selectedTheme,
            format: fmt as ImageFormat
          });
          
          if (formatsToGenerate.length > 1) {
             setCurrentImages([...results]);
          }
        } catch (innerErr: any) {
          console.error(`Erro ao gerar formato ${fmt}:`, innerErr);
          if (formatsToGenerate.length === 1) throw innerErr;
        }
      }

      if (results.length === 0) throw new Error("Não foi possível gerar nenhuma imagem.");
      
      setCurrentImages(results);
      setHistory(prev => [...results, ...prev].slice(0, 20));
    } catch (err: any) {
      console.error("Erro geral de geração:", err);
      setError(err.message || "Falha na conexão com o servidor de IA. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async (img: GeneratedImage) => {
    const link = document.createElement('a');
    if (transparentBackground) {
      link.href = await processTransparency(img.url);
    } else {
      link.href = img.url;
    }
    link.download = `Pulmao-Livre-${img.format}-${img.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currentActiveImage = currentImages[activeImageIndex];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 overflow-x-hidden">
      <header className="bg-white border-b border-slate-200 py-3 md:py-4 px-4 md:px-6 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="bg-gradient-to-br from-teal-500 to-blue-600 p-1.5 md:p-2 rounded-lg md:rounded-xl shadow-md">
              <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold leading-none tracking-tight">Pulmão Livre</h1>
              <span className="text-[8px] md:text-[10px] uppercase tracking-widest text-teal-600 font-bold">Studio Criativo</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-3 md:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-8">
        
        <div className="lg:col-span-4 space-y-4 md:space-y-6">
          <section className="bg-white p-5 md:p-6 rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm">
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-5">Configuração do Ativo</h2>
            <div className="space-y-5">
              
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Título <span className="text-teal-500 font-medium">(Opcional)</span>
                  </label>
                  <input 
                    type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Método Pulmão Livre"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-500 outline-none transition-all text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Subtítulo <span className="text-teal-500 font-medium">(Opcional)</span>
                  </label>
                  <input 
                    type="text" value={subtitle} onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="Ex: Respire a Liberdade"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-500 outline-none transition-all text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Instruções da Imagem <span className="text-teal-500 font-medium">(O que deve aparecer?)</span></label>
                <textarea 
                  value={customDescription} onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="Ex: Uma pessoa respirando ar puro em uma floresta com pulmões estilizados em 3D brilhando levemente..." 
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-500 outline-none transition-all text-xs resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Imagem de Base <span className="text-teal-500 font-medium">(Opcional)</span></label>
                {!referenceImage ? (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 rounded-xl p-4 md:p-6 text-center hover:border-teal-400 hover:bg-teal-50 cursor-pointer transition-all group"
                  >
                    <svg className="w-6 h-6 md:w-8 md:h-8 text-slate-300 mx-auto mb-2 group-hover:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Toque para enviar</p>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                  </div>
                ) : (
                  <div className="relative rounded-xl overflow-hidden border-2 border-teal-500 shadow-md">
                    <img src={referenceImage} alt="Referência" className="w-full h-24 md:h-32 object-cover" />
                    <button onClick={removeReferenceImage} className="absolute top-1 right-1 md:top-2 md:right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 shadow-lg">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between p-3 bg-teal-50 rounded-xl border border-teal-100">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-[10px] font-black text-teal-800 uppercase tracking-widest block">Sem Fundo (PNG)</span>
                </div>
                <button 
                  onClick={() => setTransparentBackground(!transparentBackground)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${transparentBackground ? 'bg-teal-500' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${transparentBackground ? 'translate-x-5' : ''}`} />
                </button>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Formato / Mockup</label>
                <div className="grid grid-cols-3 lg:grid-cols-2 gap-2">
                  {Object.values(ImageFormat).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setSelectedFormat(fmt as ImageFormat)}
                      className={`flex flex-col md:flex-row items-center justify-center md:justify-start gap-2 px-2 py-2.5 rounded-xl border-2 transition-all ${
                        selectedFormat === fmt ? 'border-teal-500 bg-teal-50 text-teal-700 font-bold' : 'border-transparent bg-slate-50 text-slate-500'
                      }`}
                    >
                      {formatIcons[fmt]}
                      <span className="text-[8px] md:text-[10px] leading-tight text-center md:text-left truncate w-full">{fmt.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <Button onClick={handleGenerate} isLoading={isGenerating} className="w-full h-12 md:h-14 bg-gradient-to-r from-teal-600 to-blue-600 text-sm md:text-base">
                  {referenceImage ? 'Editar Imagem' : (transparentBackground ? 'Gerar PNG Transparente' : 'Gerar Criativo')}
                </Button>
                {error && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-red-600 text-[10px] text-center font-bold uppercase tracking-tight">Erro na Geração</p>
                    <p className="text-red-500 text-[9px] text-center mt-1 leading-tight">{error}</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        <div ref={previewRef} className="lg:col-span-8 space-y-4 md:space-y-6">
          <section className="bg-white p-4 md:p-8 rounded-2xl md:rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col items-center min-h-[350px] md:min-h-[600px] justify-center relative">
            {currentImages.length > 0 ? (
              <div className="w-full flex flex-col items-center">
                {currentImages.length > 1 && (
                  <div className="flex gap-1.5 mb-6 bg-slate-100 p-1 rounded-xl shadow-inner overflow-x-auto max-w-full no-scrollbar">
                    {currentImages.map((img, idx) => (
                      <button key={img.id} onClick={() => setActiveImageIndex(idx)}
                        className={`px-3 md:px-5 py-2 rounded-lg text-[9px] md:text-xs font-bold transition-all whitespace-nowrap ${activeImageIndex === idx ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500'}`}
                      >
                        {img.format.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                )}

                <div 
                  className={`w-full max-w-[480px] relative bg-white rounded-xl overflow-hidden shadow-xl border border-slate-100 transition-all`}
                  style={{ aspectRatio: '1/1', background: transparentBackground ? 'repeating-conic-gradient(#f1f5f9 0% 25%, #fff 0% 50%) 50% / 16px 16px' : '#fff' }}
                >
                  <img src={currentActiveImage.url} alt="Capa" className="w-full h-full object-cover" />
                  <div className="absolute bottom-2 md:bottom-4 right-2 md:right-4 bg-teal-600 text-white text-[7px] md:text-[8px] font-black px-2 md:px-3 py-1 rounded-full uppercase tracking-tighter">
                    {transparentBackground ? 'PNG TRANSPARENTE' : 'MOCKUP 3D'}
                  </div>
                </div>

                <div className="mt-6 md:mt-10 flex flex-col sm:flex-row gap-3 w-full max-w-md">
                  <Button variant="primary" onClick={() => handleDownload(currentActiveImage)} className="flex-1 rounded-xl text-sm h-12">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Baixar Ativo
                  </Button>
                  {currentImages.length > 1 && (
                    <Button variant="outline" onClick={() => currentImages.forEach(handleDownload)} className="rounded-xl text-xs h-12">
                      Baixar Todos
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 md:py-20 opacity-80">
                <div className="w-16 h-16 md:w-24 md:h-24 bg-teal-50 rounded-2xl md:rounded-3xl flex items-center justify-center mx-auto mb-6">
                   <svg className="w-8 h-8 md:w-12 md:h-12 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                   </svg>
                </div>
                <h3 className="text-xl md:text-2xl font-black text-slate-800 italic">
                  Pronto para Gerar?
                </h3>
                <p className="text-slate-400 text-[11px] md:text-sm mt-2 max-w-[200px] md:max-w-xs mx-auto font-medium leading-relaxed">
                  Descreva o que deseja na barra de instruções ou apenas toque em gerar.
                </p>
              </div>
            )}
            
            {isGenerating && (
              <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex items-center justify-center z-30 rounded-2xl md:rounded-[2.5rem]">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 md:w-16 md:h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                  <div className="text-center">
                    <p className="font-bold text-slate-800 text-sm md:text-lg">Processando Ativo...</p>
                    <p className="text-slate-400 text-[9px] uppercase tracking-widest mt-1">Isso pode levar alguns segundos</p>
                  </div>
                </div>
              </div>
            )}
          </section>

          {history.length > 0 && (
            <section className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-200">
              <h2 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Produções Recentes</h2>
              <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                {history.map((img) => (
                  <button key={img.id} onClick={() => { setCurrentImages([img]); setActiveImageIndex(0); }} className="flex-shrink-0 w-20 group">
                    <div className="aspect-square rounded-xl overflow-hidden border-2 border-transparent hover:border-teal-500 transition-all shadow-sm bg-slate-50">
                      <img src={img.url} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[7px] text-slate-400 mt-1.5 block truncate text-center font-bold uppercase">{img.format.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 py-6 px-6 text-center text-slate-400 text-[8px] md:text-[9px] uppercase tracking-[0.2em] font-black">
        Pulmão Livre Cover Studio • Powered by Gemini 2.5
      </footer>
    </div>
  );
};

export default App;
