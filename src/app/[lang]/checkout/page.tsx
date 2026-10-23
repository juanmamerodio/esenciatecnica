'use client';

import { useState, use } from 'react';
import { CheckCircle, Info, AlertTriangle, Loader2 } from 'lucide-react';
import ReceiptUploader from "@/components/ReceiptUploader";
import { formatPrice } from "@/lib/format";
import { useCartStore } from "@/lib/store";
import type { Dictionary } from "@/lib/types";

import esDict from "@/dictionaries/es.json";
import enDict from "@/dictionaries/en.json";

const dicts: Record<string, Dictionary> = { es: esDict as unknown as Dictionary, en: enDict as unknown as Dictionary };

export default function CheckoutPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = use(params);
  const dict = dicts[lang] ?? dicts.es;

  const { items, getTotalPrice, clearCart } = useCartStore();
  const totalPrice = getTotalPrice();

  const [formData, setFormData] = useState({ nombre: '', email: '' });
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageBase64 || items.length === 0) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_cliente: formData.nombre,
          email: formData.email,
          items: items,
          total_ars: totalPrice
        }),
      });

      const orderData = await orderResponse.json();
      if (!orderResponse.ok) throw new Error(orderData.error || 'Error al crear pedido');

      const pedidoId = orderData.order.id;

      const verifyResponse = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          mimeType,
          pedidoId,
          totalEsperado: totalPrice
        }),
      });

      const verifyData = await verifyResponse.json();
      if (!verifyResponse.ok) throw new Error(verifyData.error || 'Error al verificar pago');

      clearCart();
      setShowSuccess(true);
    } catch (err) {
      const error = err as Error;
      setError(error.message || "Ocurrió un problema procesando tu pedido.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0 && !showSuccess) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <h2 className="text-2xl font-bold mb-4">Tu carrito está vacío</h2>
        <p className="text-muted mb-8 text-sm">Agrega algunos productos antes de proceder al pago.</p>
        <button onClick={() => window.location.href = `/${lang}/catalog`} className="btn-primary">Ir al Catálogo</button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      {showSuccess ? (
        <div className="card p-12 text-center mt-10">
          <div className="w-24 h-24 bg-accent-lt rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
            <CheckCircle className="w-12 h-12 text-accent" />
          </div>
          <h2 className="text-4xl font-bold text-text mb-4">{dict.checkout.success.title}</h2>
          <p className="text-muted mb-8 max-w-sm mx-auto">{dict.checkout.success.text}</p>
          <button onClick={() => window.location.href = `/${lang}`} className="btn-primary px-10">
            {dict.checkout.success.backToCatalog}
          </button>
        </div>
      ) : (
        <>
          <h1 className="text-4xl font-bold text-text mb-10 tracking-tight">
            Confirmar <span className="text-accent underline decoration-accent/10 underline-offset-8">Pedido</span>
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
            <div className="lg:col-span-2 space-y-6">
              <div className="card p-8 border-accent/10 bg-accent-lt/30">
                <h2 className="text-xl font-bold mb-6 text-text flex items-center gap-2">
                  <Info className="w-5 h-5 text-accent" />
                  Paso 1: Transferencia
                </h2>
                <div className="space-y-4 text-sm font-medium">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-wider text-muted font-bold">{dict.checkout.transfer.alias}</span>
                    <span className="text-text font-mono bg-white rounded-lg p-2 border border-border">{dict.checkout.transfer.aliasValue}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-wider text-muted font-bold">{dict.checkout.transfer.cbu}</span>
                    <span className="text-text font-mono bg-white rounded-lg p-2 border border-border">{dict.checkout.transfer.cbuValue}</span>
                  </div>
                  <div className="flex flex-col gap-1 pb-4 border-b border-border">
                    <span className="text-[10px] uppercase tracking-wider text-muted font-bold">{dict.checkout.transfer.holder}</span>
                    <span className="text-text">{dict.checkout.transfer.holderValue}</span>
                  </div>
                  <div className="flex justify-between items-end pt-2">
                    <span className="text-muted">{dict.checkout.transfer.totalLabel}:</span>
                    <span className="text-3xl font-bold text-accent font-mono">{formatPrice(totalPrice)}</span>
                  </div>
                </div>
              </div>

              <div className="card p-6 bg-surface border-dashed">
                <h3 className="text-sm font-bold mb-4 uppercase tracking-widest text-muted">Resumen de Compra</h3>
                <div className="space-y-3">
                  {items.map(item => (
                    <div key={item.id} className="flex justify-between text-xs">
                      <span className="text-text truncate max-w-[140px]">{item.quantity}x {item.name}</span>
                      <span className="font-mono text-muted">{formatPrice(item.priceArs * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-3">
              <form onSubmit={handleSubmit} className="card p-8 space-y-8 bg-surface shadow-xl shadow-black/5 relative overflow-hidden">
                <div className="space-y-6 relative z-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">Nombre Completo</label>
                      <input
                        required
                        type="text"
                        className="w-full px-4 py-3 rounded-2xl bg-gray-lt border border-border focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                        placeholder="Ej: Juan Pérez"
                        value={formData.nombre}
                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">Email de Contacto</label>
                      <input
                        required
                        type="email"
                        className="w-full px-4 py-3 rounded-2xl bg-gray-lt border border-border focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                        placeholder="juan@ejemplo.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-3">Subir Comprobante</label>
                    <ReceiptUploader
                      onFileSelect={(base64: string, file: File) => {
                        setImageBase64(base64);
                        setMimeType(file.type);
                      }}
                      texts={{
                        clickToUpload: "Haz clic para subir",
                        dragHint: "o arrastra el comprobante",
                        formats: "PNG, JPG, JPEG (Máx 4MB)",
                        change: "Cambiar imagen"
                      }}
                    />
                    <p className="mt-4 flex gap-2 items-start text-[10px] text-muted leading-relaxed">
                      <AlertTriangle className="w-3 h-3 text-accent shrink-0 mt-0.5" />
                      <span>{dict.checkout.aiNote.replace('<br/>', ' ')}</span>
                    </p>
                  </div>

                  {error && (
                    <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                      <p>{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!imageBase64 || isSubmitting}
                    className={`w-full py-5 px-4 font-bold rounded-full transition-all duration-300 flex justify-center items-center gap-2 transform active:scale-95 shadow-lg ${!imageBase64 || isSubmitting
                      ? 'bg-gray-lt text-muted cursor-not-allowed opacity-50 shadow-none'
                      : 'bg-accent text-surface hover:bg-accent/90 shadow-accent/20 hover:shadow-accent/40'
                      }`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Procesando pedido e IA...
                      </>
                    ) : (
                      <>Finalizar Compra</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}