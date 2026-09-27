import { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthProvider.tsx';
import AddEntityModal from '../components/AddEntityModal.tsx';
import { ArrowDownAZ, ArrowUpZA, Plus, Search } from 'lucide-react';

interface Product {
  id: number;
  productName: string;
  sku: string;
  category: string;
  description: string;
  unit: string;
}

export default function Products() {
  const { token, loading, getFreshToken } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc'|'desc'>('asc');

  useEffect(() => {
    if (!loading && token) {
      fetchProducts();
    }
  }, [loading, token]);

  const fetchProducts = async () => {
    try {
      let response = await fetch('/api/products', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.status === 401 && getFreshToken) {
        const fresh = await getFreshToken(true);
        if (fresh) {
          response = await fetch('/api/products', {
            headers: { Authorization: `Bearer ${fresh}` }
          });
        }
      }
      if (response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await response.json();
          setProducts(data);
        } else {
          console.warn("Received non-JSON response");
        }
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async (data: any) => {
    const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });
    if (!response.ok) {
       const err = await response.json();
       throw new Error(err.error || 'Failed to add product');
    }
    fetchProducts();
  };

  const sortedProducts = [...products].sort((a, b) => {
    const cmp = a.productName.localeCompare(b.productName);
    return sortOrder === 'asc' ? cmp : -cmp;
  });

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Products</h1>
          <p className="text-slate-500 mt-1">Manage your catalog, units, and categories.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all active:scale-95 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      <AddEntityModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        entityType="product" 
        onSave={handleAdd} 
      />

      <div className="bg-white rounded-3xl border border-slate-200/60 overflow-hidden shadow-sm">
        {isLoading ? (
           <div className="p-12 text-center text-slate-400 font-medium">Loading products...</div>
        ) : products.length === 0 ? (
           <div className="p-16 text-center flex flex-col items-center justify-center">
             <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
               <Search className="w-6 h-6 text-slate-300" />
             </div>
             <p className="text-slate-500 font-medium text-lg">No products found.</p>
             <p className="text-slate-400 text-sm mt-1">Click 'Add Product' to create your first one.</p>
           </div>
        ) : (
          <div className="overflow-x-auto text-left w-full block">
            <table className="w-full whitespace-nowrap align-middle">
              <thead className="bg-slate-50 text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-200/60">
                <tr>
                  <th className="px-6 py-5 font-bold text-left cursor-pointer hover:bg-slate-100 transition-colors group" onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}>
                    <div className="flex items-center gap-2">
                      Product Name
                      <div className="text-slate-300 group-hover:text-slate-500">
                        {sortOrder === 'asc' ? <ArrowDownAZ className="w-4 h-4" /> : <ArrowUpZA className="w-4 h-4" />}
                      </div>
                    </div>
                  </th>
                  <th className="px-6 py-5 font-bold text-left">SKU</th>
                  <th className="px-6 py-5 font-bold text-left">Category</th>
                  <th className="px-6 py-5 font-bold text-left">Unit</th>
                  <th className="px-6 py-5 font-bold text-left">Description</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                {sortedProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                    <td className="px-6 py-4 font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">{product.productName}</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{product.sku || '-'}</td>
                    <td className="px-6 py-4 text-slate-600">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold tracking-wider uppercase">
                        {product.category || 'UNCATEGORIZED'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{product.unit || '-'}</td>
                    <td className="px-6 py-4 text-slate-500 max-w-[250px] truncate">{product.description || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
