export default function LineItemsTable({ items, products, onChange, onAdd, onRemove }) {
  return (
    <div>
      <table className="w-full text-sm border-collapse mb-2">
        <thead>
          <tr className="bg-gray-50 text-left">
            <th className="p-2 border">Product</th>
            <th className="p-2 border w-24">Qty</th>
            <th className="p-2 border w-28">Unit Price</th>
            <th className="p-2 border w-24">Total</th>
            <th className="p-2 border w-10"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx}>
              <td className="p-2 border">
                <select
                  className="w-full border rounded px-2 py-1"
                  value={item.product_id}
                  onChange={e => onChange(idx, 'product_id', parseInt(e.target.value))}
                >
                  <option value="">Select product…</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                  ))}
                </select>
              </td>
              <td className="p-2 border">
                <input type="number" min="0" step="0.01"
                  className="w-full border rounded px-2 py-1"
                  value={item.quantity}
                  onChange={e => onChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                />
              </td>
              <td className="p-2 border">
                <input type="number" min="0" step="0.01"
                  className="w-full border rounded px-2 py-1"
                  value={item.unit_price}
                  onChange={e => onChange(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                />
              </td>
              <td className="p-2 border text-right">
                PKR {(item.quantity * item.unit_price).toFixed(2)}
              </td>
              <td className="p-2 border text-center">
                <button onClick={() => onRemove(idx)} className="text-red-500 hover:text-red-700 font-bold">×</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={onAdd}
        className="text-sm text-green-700 hover:text-green-900 underline">
        + Add item
      </button>
    </div>
  )
}
