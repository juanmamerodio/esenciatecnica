"use client";

import { useEffect, useState, useMemo } from 'react';
import {
  CheckCircle2,
  XCircle,
  Truck,
  Search,
  Filter,
  ExternalLink,
  Clock,
  RefreshCcw,
  LogOut,
  Activity,
  AlertCircle,
  Package,
  Eye,
  LucideIcon,
  AlertTriangle 
} from 'lucide-react';
import { supabase } from '@/lib/supabase'; // Usando la instancia exportada
import { type Pedido } from '@/lib/supabase';
import { formatPrice } from '@/lib/format';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // parte agregada enzo: Estado para el conteo de stock bajo
  const [lowStockCount, setLowStockCount] = useState<number>(0);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('pedidos')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) setOrders(data);

    // parte agregada enzo: Consulta de verificación de stock bajo
    const { data: stockData, error: stockError } = await supabase
      .from('stock')
      .select('*');

    if (!stockError && stockData) {
      const criticalItems = stockData.filter((item: { cantidad?: number; stock?: number }) => {
        const cantidad = Number(item.cantidad ?? item.stock ?? 0);
        return cantidad <= 5;
      });
      setLowStockCount(criticalItems.length);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const updateStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    const response = await fetch('/api/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: newStatus }),
    });

    if (response.ok) await fetchOrders();
    setUpdatingId(null);
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesSearch = order.nombre_cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filter === 'todos' || order.estado === filter;
      return matchesSearch && matchesFilter;
    });
  }, [orders, searchTerm, filter]);

  // KPIs Calculados
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.estado === 'pendiente').length,
    toVerify: orders.filter(o => o.estado === 'comprobante_subido').length,
    shipped: orders.filter(o => o.estado === 'enviado').length,
  };

  // parte agregada enzo: Condición de alertas al ingresar
  const hayAlertas = stats.toVerify > 0 || lowStockCount > 0;

  const statusConfig: Record<string, { color: string; icon: LucideIcon; label: string }> = {
    'pendiente': { color: 'bg-gray-lt text-gray-600 border-gray-200', icon: Clock, label: 'Pendiente' },
    'comprobante_subido': { color: 'bg-blue-50 text-blue-600 border-blue-100', icon: Eye, label: 'Por Verificar' },
    'pre_aprobado': { color: 'bg-accent-lt text-accent border-accent/20', icon: CheckCircle2, label: 'Aprobado' },
    'enviado': { color: 'bg-purple-50 text-purple-600 border-purple-100', icon: Truck, label: 'Enviado' },
    'rechazado': { color: 'bg-red-50 text-red-600 border-red-100', icon: XCircle, label: 'Rechazado' },
  };

  return (
    <div className="min-h-screen bg-bg p-4 md:p-10 space-y-10">

      {/* HEADER: Identidad y Acciones */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-accent font-bold uppercase tracking-widest text-[10px]">
            <Activity className="w-3 h-3" />
            Control de Operaciones · Química EEST1
          </div>
          <h1 className="text-4xl font-bold text-text tracking-tight">Panel de Gestión</h1>
          <p className="text-muted text-sm">Administración de pedidos y validación de pagos</p>
        </div>

        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={fetchOrders}
            className="p-3 rounded-2xl bg-surface border border-border text-muted hover:text-accent transition-all shadow-sm"
          >
            <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </motion.button>
          <button
            onClick={() => window.location.href = '/'}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-surface border border-border text-red-600 font-bold hover:bg-red-50 transition-all shadow-sm text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Salir</span>
          </button>
        </div>
      </header>

      {/* parte agregada enzo: Banner de alerta visual al ingresar */}
      <AnimatePresence>
        {hayAlertas && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-6 rounded-[30px] bg-amber-50 border border-amber-200 shadow-soft flex items-start gap-4"
          >
            <div className="p-3 rounded-2xl bg-amber-500 text-white mt-0.5">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-amber-900 text-base">Avisos del Sistema al Ingresar</h3>
              {stats.toVerify > 0 && (
                <p className="text-sm text-amber-700">
                  • Tienes <strong>{stats.toVerify}</strong> comprobante(s) nuevo(s) esperando verificación.
                </p>
              )}
              {lowStockCount > 0 && (
                <p className="text-sm text-amber-700">
                  • Hay <strong>{lowStockCount}</strong> producto(s) con stock crítico o agotado.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KPI GRID: Información rápida y didáctica */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Pedidos', value: stats.total, icon: Package, color: 'text-text' },
          { label: 'Pendientes', value: stats.pending, icon: Clock, color: 'text-gray-500' },
          { label: 'Por Verificar', value: stats.toVerify, icon: Eye, color: 'text-blue-500' },
          { label: 'Enviados', value: stats.shipped, icon: Truck, color: 'text-purple-500' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="card p-6 flex items-center justify-between"
          >
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1">{stat.label}</p>
              <p className="text-3xl font-bold text-text tabular-nums">{stat.value}</p>
            </div>
            <stat.icon className={`w-8 h-8 ${stat.color} opacity-20`} />
          </motion.div>
        ))}
      </section>

      {/* FILTROS: Interfaz limpia y moderna */}
      <section className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
          <input
            type="text"
            placeholder="Buscar cliente, email o ID de pedido..."
            className="w-full pl-12 pr-4 py-4 rounded-3xl bg-surface border border-border focus:outline-none focus:ring-2 focus:ring-accent shadow-sm transition-all text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="relative w-full md:w-64">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
          <select
            className="w-full pl-12 pr-4 py-4 rounded-3xl bg-surface border border-border appearance-none focus:outline-none focus:ring-2 focus:ring-accent shadow-sm transition-all text-sm font-medium text-text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="todos">Todos los estados</option>
            <option value="pendiente">Pendientes</option>
            <option value="comprobante_subido">Por verificar</option>
            <option value="pre_aprobado">Pre-aprobados</option>
            <option value="enviado">Enviados</option>
            <option value="rechazado">Rechazados</option>
          </select>
        </div>
      </section>

      {/* TABLA: Diseño de lista ejecutiva */}
      <section className="bg-surface rounded-[40px] border border-border shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-lt/50 border-b border-border">
                <th className="px-6 py-5 text-[11px] font-bold uppercase tracking-widest text-muted">Pedido / Fecha</th>
                <th className="px-6 py-5 text-[11px] font-bold uppercase tracking-widest text-muted">Cliente</th>
                <th className="px-6 py-5 text-[11px] font-bold uppercase tracking-widest text-muted">Estado</th>
                <th className="px-6 py-5 text-[11px] font-bold uppercase tracking-widest text-muted">Monto</th>
                <th className="px-6 py-5 text-[11px] font-bold uppercase tracking-widest text-muted text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              <AnimatePresence mode="popLayout">
                {filteredOrders.length === 0 ? (
                  <motion.tr
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="text-center"
                  >
                    <td colSpan={5} className="py-20 text-muted font-medium">
                      <div className="flex flex-col items-center gap-3 opacity-40">
                        <AlertCircle className="w-12 h-12" />
                        <p>No se encontraron pedidos con estos filtros</p>
                      </div>
                    </td>
                  </motion.tr>
                ) : (
                  filteredOrders.map((order) => {
                    const config = statusConfig[order.estado] || statusConfig['pendiente'];
                    return (
                      <motion.tr
                        key={order.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="hover:bg-gray-lt/30 transition-colors group"
                      >
                        <td className="px-6 py-5">
                          <div className="flex flex-col">
                            <span className="text-xs font-mono font-bold text-accent">#{order.id.substring(0, 8)}</span>
                            <span className="text-[11px] text-muted">
                              {new Date(order.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col">
                            <span className="font-bold text-text">{order.nombre_cliente}</span>
                            <span className="text-xs text-muted">{order.email}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${config.color}`}>
                            <config.icon className="w-3 h-3" />
                            {config.label}
                          </span>
                        </td>
                        <td className="px-6 py-5 font-mono font-bold text-text tabular-nums">
                          {formatPrice(order.total_ars)}
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center justify-end gap-3">
                            {order.comprobante_url && (
                              <a
                                href={order.comprobante_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-xl bg-surface border border-border text-muted hover:text-accent hover:border-accent transition-all shadow-sm"
                                title="Ver comprobante"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}

                            <div className="flex items-center gap-2">
                              {order.estado === 'comprobante_subido' && (
                                <>
                                  <button
                                    onClick={() => updateStatus(order.id, 'pre_aprobado')}
                                    className="p-2 rounded-xl bg-accent-lt text-accent hover:bg-accent hover:text-surface transition-all shadow-sm"
                                    title="Aprobar"
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => updateStatus(order.id, 'rechazado')}
                                    className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-surface transition-all shadow-sm"
                                    title="Rechazado"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                </>
                              )}

                              {order.estado === 'pre_aprobado' && (
                                <button
                                  onClick={() => updateStatus(order.id, 'enviado')}
                                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-surface font-bold text-xs hover:shadow-lg transition-all active:scale-95"
                                >
                                  <Truck className="w-4 h-4" />
                                  Enviar
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </section>

      {/* LOADING STATE: No intrusivo */}
      <AnimatePresence>
        {updatingId && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-10 right-10 z-[100] flex items-center gap-3 px-6 py-4 rounded-full bg-text text-surface shadow-2xl border border-white/10"
          >
            <RefreshCcw className="w-4 h-4 animate-spin" />
            <span className="text-sm font-medium">Actualizando pedido...</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
