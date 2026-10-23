import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

// GET: Obtener todos los productos activos
export async function GET() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .eq('activo', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return NextResponse.json({ products: data });
  } catch (error) {
    console.error("Error GET products:", error);
    return NextResponse.json({ error: 'Error interno al obtener productos' }, { status: 500 });
  }
}
