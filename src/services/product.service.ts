import { getSupabase, type ProductCategory } from '@/lib/supabase';
import { ProductSchema, type Product } from '@/lib/schemas';

/**
 * PRODUCT SERVICE
 * Abstracción de datos para la entidad de productos.
 */
export class ProductService {
  /**
   * Obtiene todos los productos activos de la base de datos.
   */
  static async getAllActive(): Promise<Product[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .eq('activo', true)
      .order('nombre_es', { ascending: true });

    if (error) {
      console.error('Error fetching products:', error);
      throw new Error(`Failed to fetch products: ${error.message}`);
    }

    // Validación y tipado con Zod para asegurar integridad en runtime
    const validatedProducts = data.map((p) => ProductSchema.parse(p));
    return validatedProducts;
  }

  /**
   * Obtiene un producto por su categoría.
   */
  static async getByByCategory(category: string): Promise<Product[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .eq('activo', true)
      .eq('categoria', category as ProductCategory)
      .order('nombre_es', { ascending: true });

    if (error) {
      console.error(`Error fetching products for category ${category}:`, error);
      throw new Error(`Failed to fetch products: ${error.message}`);
    }

    return data.map((p) => ProductSchema.parse(p));
  }

  /**
   * Obtiene un producto específico por ID.
   */
  static async getById(id: string): Promise<Product | null> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Error fetching product ${id}: ${error.message}`);
    }

    return ProductSchema.parse(data);
  }
}
