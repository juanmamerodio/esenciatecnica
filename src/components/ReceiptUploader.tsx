"use client";

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Loader2, ScanEye } from 'lucide-react';
import { cn } from "@/lib/utils";

// ESTA INTERFAZ ES LA QUE SOLUCIONA EL ERROR TS(2322)
interface ReceiptUploaderProps {
  onFileSelect: (base64: string, file: File) => void;
  texts: {
    clickToUpload: string;
    dragHint: string;
    formats: string;
    change: string;
  };
}

export default function ReceiptUploader({ onFileSelect, texts }: ReceiptUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (!file || !file.type.startsWith('image/')) {
      alert("Por favor, subí una imagen válida (JPG, PNG).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("El archivo es demasiado grande. Máximo 5MB.");
      return;
    }

    setIsProcessing(true);

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setPreview(base64String);

      // Ejecutamos el callback que el CheckoutPage necesita
      onFileSelect(base64String, file);

      // Efecto visual de escaneo
      setTimeout(() => setIsProcessing(false), 1500);
    };
    reader.readAsDataURL(file);
  }, [onFileSelect]);

  const removeFile = (e: React.MouseEvent) => {
    e.preventDefault();
    setPreview(null);
    // Notificamos al padre que el archivo fue eliminado enviando null o manejando el estado allá
    // Para evitar errores de tipo, el padre debería manejar el estado de la imagen
  };

  return (
    <div className="w-full">
      <motion.div
        layout
        className={cn(
          "relative flex flex-col items-center justify-center w-full min-h-[240px] rounded-[32px] border-2 border-dashed transition-all duration-500 cursor-pointer overflow-hidden",
          isDragging
            ? "border-accent bg-accent-lt scale-[1.01] shadow-lg shadow-accent/10"
            : "border-border bg-gray-lt/50 hover:border-accent/40 hover:bg-gray-lt",
          preview && "border-solid border-border bg-surface"
        )}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
          }
        }}
      >
        <input
          type="file"
          className="absolute inset-0 opacity-0 cursor-pointer z-20"
          accept="image/*"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFile(e.target.files[0]);
            }
          }}
        />

        <AnimatePresence mode="wait">
          {!preview ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center p-8 text-center space-y-4"
            >
              <div className="p-4 rounded-full bg-white shadow-soft text-muted transition-colors">
                <Upload className={cn("w-10 h-10 transition-transform duration-500", isDragging && "translate-y-[-5px]")} />
              </div>
              <div className="space-y-1">
                <p className="text-sm text-text">
                  <span className="font-bold text-accent">{texts.clickToUpload}</span> {texts.dragHint}
                </p>
                <p className="text-xs text-muted font-mono">{texts.formats}</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative w-full h-full p-4 flex items-center justify-center"
            >
              <div className="relative group max-w-xs max-h-48 rounded-2xl overflow-hidden border border-border shadow-sm">
                <img src={preview} alt="Comprobante" className="max-h-48 w-auto object-contain block" />

                {/* EFECTO DE ESCANEO IA */}
                <AnimatePresence>
                  {isProcessing && (
                    <motion.div
                      initial={{ top: "0%" }}
                      animate={{ top: "100%" }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                      className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-accent to-transparent z-10 shadow-[0_0_15px_rgba(61,140,110,0.8)]"
                    />
                  )}
                </AnimatePresence>

                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                  <span className="text-white text-sm font-bold px-4 py-2 rounded-full bg-black/20 backdrop-blur-md border border-white/20">
                    {texts.change}
                  </span>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={removeFile}
                className="absolute top-6 right-6 p-2 rounded-full bg-white/90 backdrop-blur-md text-red-500 shadow-soft border border-red-100 z-30"
              >
                <X className="w-5 h-5" />
              </motion.button>

              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-surface/80 backdrop-blur-md border border-border text-[10px] font-bold text-muted flex items-center gap-2 shadow-sm">
                {isProcessing ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-accent" />
                    <span className="text-accent uppercase tracking-widest">Analizando...</span>
                  </>
                ) : (
                  <>
                    <ScanEye className="w-3 h-3 text-accent" />
                    <span className="uppercase tracking-widest">Cargado</span>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}