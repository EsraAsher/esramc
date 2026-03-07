import { useState, useEffect, useCallback } from 'react';
import { fetchAllProducts, createManualOrder, fetchManualOrders } from '../../api';

const paymentMethods = ['UPI', 'Cash', 'Other'];

const AdminManualOrders = () => {
  // ─── Orders list state ─────────────────────────────
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // ─── Form state ────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [mcUsername, setMcUsername] = useState('');
  const [items, setItems] = useState([{ product: '', quantity: 1, price: '' }]);
  const [total, setTotal] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [note, setNote] = useState('');

  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const data = await fetchManualOrders({ page, limit: 50 });
      setOrders(data.orders);
      setTotalPages(data.pages);
    } catch (err) {
      console.error('Failed to load manual orders:', err);
    } finally {
      setLoadingOrders(false);
    }
  }, [page]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const loadProducts = async () => {
    if (products.length > 0) return;
    setLoadingProducts(true);
    try {
      const data = await fetchAllProducts();
      setProducts(data);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const openForm = () => {
    setShowForm(true);
    loadProducts();
    setError('');
    setSuccess('');
  };

  const resetForm = () => {
    setMcUsername('');
    setItems([{ product: '', quantity: 1, price: '' }]);
    setTotal('');
    setPaymentMethod('UPI');
    setNote('');
    setError('');
    setSuccess('');
  };

  const addItem = () => {
    setItems([...items, { product: '', quantity: 1, price: '' }]);
  };

  const removeItem = (index) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-fill price when product changes
    if (field === 'product' && value) {
      const p = products.find((pr) => pr._id === value);
      if (p) updated[index].price = p.price;
    }

    setItems(updated);
  };

  // Recalculate total whenever items change
  const calcTotal = () => {
    const sum = items.reduce((acc, item) => {
      const price = parseFloat(item.price) || 0;
      return acc + price * item.quantity;
    }, 0);
    setTotal(sum.toFixed(2));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!mcUsername.trim()) return setError('Minecraft username is required');
    if (items.some((i) => !i.product)) return setError('Select a product for every item');
    if (!total || parseFloat(total) < 0) return setError('Valid total is required');

    setSubmitting(true);
    try {
      await createManualOrder({
        mcUsername: mcUsername.trim(),
        items: items.map((i) => ({
          product: i.product,
          quantity: i.quantity,
          price: parseFloat(i.price) || undefined,
        })),
        total: parseFloat(total),
        paymentMethod,
        note,
      });
      setSuccess('Manual order created successfully!');
      resetForm();
      setShowForm(false);
      loadOrders();
    } catch (err) {
      setError(err.message || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  const fmt = (v) => `₹${(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      {/* ─── Header ───────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h2 className="font-pixel text-sm text-red-400">MANUAL ORDERS</h2>
        <button
          onClick={showForm ? () => { setShowForm(false); resetForm(); } : openForm}
          className={`px-4 py-2 font-pixel text-xs rounded-lg transition-all ${
            showForm
              ? 'bg-gray-500/10 border border-white/10 text-gray-400 hover:text-white'
              : 'bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30'
          }`}
        >
          {showForm ? 'CANCEL' : '+ NEW ORDER'}
        </button>
      </div>

      {success && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-green-400 text-xs font-pixel">
          {success}
        </div>
      )}

      {/* ─── Create Form ──────────────────────────────── */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-dark-surface border border-white/10 rounded-xl p-4 sm:p-6 space-y-5">
          <h3 className="font-pixel text-xs text-gray-400 mb-2">CREATE MANUAL ORDER</h3>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-xs">
              {error}
            </div>
          )}

          {/* Minecraft Username */}
          <div>
            <label className="block text-gray-400 text-xs mb-1">Minecraft Username *</label>
            <input
              type="text"
              value={mcUsername}
              onChange={(e) => setMcUsername(e.target.value)}
              placeholder="e.g. Steve"
              className="w-full bg-dark-bg border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50"
            />
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-gray-400 text-xs">Items *</label>
              <button
                type="button"
                onClick={addItem}
                className="text-red-400 text-xs hover:text-red-300 font-pixel transition-colors"
              >
                + ADD ITEM
              </button>
            </div>

            {loadingProducts ? (
              <div className="text-gray-500 text-xs animate-pulse py-4">Loading products...</div>
            ) : (
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={index} className="flex flex-col sm:flex-row gap-2 items-start sm:items-end bg-dark-bg/50 rounded-lg p-3 border border-white/5">
                    {/* Product select */}
                    <div className="flex-1 w-full sm:w-auto">
                      <label className="text-gray-500 text-[10px] block mb-1">Product</label>
                      <select
                        value={item.product}
                        onChange={(e) => updateItem(index, 'product', e.target.value)}
                        className="w-full bg-dark-bg border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50"
                      >
                        <option value="">Select product...</option>
                        {products.map((p) => (
                          <option key={p._id} value={p._id}>
                            {p.title} — ₹{p.price}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity */}
                    <div className="w-full sm:w-28">
                      <label className="text-gray-500 text-[10px] block mb-1">Qty</label>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => updateItem(index, 'quantity', Math.max(1, item.quantity - 1))}
                          className="bg-dark-bg border border-white/10 rounded px-2 py-1.5 text-gray-400 hover:text-white text-sm"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full bg-dark-bg border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white text-center focus:outline-none focus:border-red-500/50"
                        />
                        <button
                          type="button"
                          onClick={() => updateItem(index, 'quantity', item.quantity + 1)}
                          className="bg-dark-bg border border-white/10 rounded px-2 py-1.5 text-red-400 hover:text-red-300 text-sm font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Price override */}
                    <div className="w-full sm:w-28">
                      <label className="text-gray-500 text-[10px] block mb-1">Price (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.price}
                        onChange={(e) => updateItem(index, 'price', e.target.value)}
                        className="w-full bg-dark-bg border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-red-500/50"
                      />
                    </div>

                    {/* Remove */}
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-gray-500 hover:text-red-400 text-lg px-2 transition-colors"
                        title="Remove item"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Total + Auto-calc */}
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-gray-400 text-xs mb-1">Total Amount (₹) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                className="w-full bg-dark-bg border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50"
              />
            </div>
            <button
              type="button"
              onClick={calcTotal}
              className="px-3 py-2 text-xs text-gray-400 hover:text-white border border-white/10 rounded-lg transition-colors"
              title="Auto-calculate from items"
            >
              AUTO-CALC
            </button>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-gray-400 text-xs mb-1">Payment Method</label>
            <div className="flex gap-2">
              {paymentMethods.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPaymentMethod(m)}
                  className={`px-4 py-2 text-xs font-pixel rounded-lg border transition-all ${
                    paymentMethod === m
                      ? 'bg-red-500/20 border-red-500/50 text-red-400'
                      : 'bg-dark-bg border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-gray-400 text-xs mb-1">Note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="e.g. Paid via Discord DM"
              className="w-full bg-dark-bg border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 resize-none"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 font-pixel text-xs bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/30 transition-all disabled:opacity-50"
          >
            {submitting ? 'CREATING...' : 'CREATE MANUAL ORDER'}
          </button>
        </form>
      )}

      {/* ─── Orders Table ─────────────────────────────── */}
      <div className="bg-dark-surface border border-white/10 rounded-xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-pixel text-xs text-gray-400">ALL MANUAL ORDERS</h3>
          <button onClick={loadOrders} className="text-gray-500 hover:text-white text-xs transition-colors">
            ↻ Refresh
          </button>
        </div>

        {loadingOrders ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500 font-pixel text-sm animate-pulse">Loading orders...</div>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-4xl block mb-4">📝</span>
            <p className="text-gray-500 font-pixel text-xs">No manual orders yet</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-gray-400 text-left">
                    <th className="pb-3 font-pixel text-xs pr-4">Player</th>
                    <th className="pb-3 font-pixel text-xs pr-4">Items</th>
                    <th className="pb-3 font-pixel text-xs pr-4 text-right">Total</th>
                    <th className="pb-3 font-pixel text-xs pr-4 hidden sm:table-cell">Method</th>
                    <th className="pb-3 font-pixel text-xs pr-4 hidden md:table-cell">Created By</th>
                    <th className="pb-3 font-pixel text-xs pr-4 hidden md:table-cell">Date</th>
                    <th className="pb-3 font-pixel text-xs hidden lg:table-cell">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-3 pr-4">
                        <span className="text-white font-mono text-xs">{order.mcUsername}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="space-y-0.5">
                          {order.items.map((item, i) => (
                            <div key={i} className="text-gray-300 text-xs">
                              {item.title} <span className="text-gray-500">×{item.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-right">
                        <span className="text-green-400 font-mono text-xs">{fmt(order.total)}</span>
                      </td>
                      <td className="py-3 pr-4 hidden sm:table-cell">
                        <span className="px-2 py-0.5 rounded text-[10px] font-pixel bg-purple-500/20 text-purple-400 border border-purple-500/30">
                          {order.manualPaymentMethod || 'Other'}
                        </span>
                      </td>
                      <td className="py-3 pr-4 hidden md:table-cell">
                        <span className="text-gray-400 text-xs">
                          {order.createdBy?.displayName || order.createdBy?.discordId || '—'}
                        </span>
                      </td>
                      <td className="py-3 pr-4 hidden md:table-cell">
                        <span className="text-gray-500 text-xs">
                          {new Date(order.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>
                      <td className="py-3 hidden lg:table-cell">
                        <span className="text-gray-500 text-xs truncate max-w-40 inline-block">
                          {order.manualNote || '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-white/5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1 text-xs font-pixel bg-dark-bg border border-white/10 rounded text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
                >
                  ← PREV
                </button>
                <span className="text-gray-500 text-xs">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1 text-xs font-pixel bg-dark-bg border border-white/10 rounded text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
                >
                  NEXT →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminManualOrders;
