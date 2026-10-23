// src/lib/types.ts
export interface Dictionary {
  nav: {
    title: string;
    titleAccent: string;
    langEs: string;
    langEn: string;
  };
  hero: {
    title: string;
    subtitle: string;
    cta: string;
  };
  categories: {
    reactivos: string;
    materiales: string;
    equipos: string;
  };
  cart: {
    summaryTitle: string;
    subtotal: string;
    total: string;
    checkoutBtn: string;
    checkoutNotice: string;
    emptyTitle?: string;
    emptyDescription?: string;
    exploreProducts?: string;
    each?: string;
    remove?: string;
    summary: {
      title: string;
      subtotal: string;
      total: string;
      cta: string;
      disclaimer: string;
    };
    emptyNotice?: string;
  };
  checkout: {
    title: string;
    customerName: string;
    email: string;
    phone: string;
    uploadReceipt: string;
    submit: string;
    // AGREGADO PARA SOLUCIONAR ERRORES
    aiNote: string;
    success: {
      title: string;
      text: string;
      backToCatalog: string;
    };
    transfer: {
      alias: string;
      aliasValue: string;
      cbu: string;
      cbuValue: string;
      holder: string;
      holderValue: string;
      totalLabel: string;
    };
  };
  catalog: {
    titleAccent: string;
    addToCart: string;
    categories: {
      reactivos: string;
      materiales: string;
      equipos: string;
    };
  };
}