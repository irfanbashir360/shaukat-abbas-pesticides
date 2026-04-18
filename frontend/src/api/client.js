import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// Products
export const getProducts = (category) => api.get('/products', { params: { category } }).then(r => r.data)
export const createProduct = (data) => api.post('/products', data).then(r => r.data)
export const updateProduct = (id, data) => api.put(`/products/${id}`, data).then(r => r.data)
export const deleteProduct = (id) => api.delete(`/products/${id}`)

// Suppliers
export const getSuppliers = () => api.get('/suppliers').then(r => r.data)
export const createSupplier = (data) => api.post('/suppliers', data).then(r => r.data)
export const updateSupplier = (id, data) => api.put(`/suppliers/${id}`, data).then(r => r.data)
export const deleteSupplier = (id) => api.delete(`/suppliers/${id}`)

// Customers
export const getCustomers = () => api.get('/customers').then(r => r.data)
export const createCustomer = (data) => api.post('/customers', data).then(r => r.data)
export const updateCustomer = (id, data) => api.put(`/customers/${id}`, data).then(r => r.data)
export const deleteCustomer = (id) => api.delete(`/customers/${id}`)

// Purchases
export const getPurchases = () => api.get('/purchases').then(r => r.data)
export const createPurchase = (data) => api.post('/purchases', data).then(r => r.data)
export const voidPurchase = (id, reason) => api.post(`/purchases/${id}/void`, { void_reason: reason }).then(r => r.data)

// Sales
export const getSales = () => api.get('/sales').then(r => r.data)
export const createSale = (data) => api.post('/sales', data).then(r => r.data)
export const updateSale = (id, data) => api.put(`/sales/${id}`, data).then(r => r.data)
export const voidSale = (id, reason) => api.post(`/sales/${id}/void`, { void_reason: reason }).then(r => r.data)

// Invoices
export const getInvoices = () => api.get('/invoices').then(r => r.data)
export const getInvoice = (id) => api.get(`/invoices/${id}`).then(r => r.data)
export const createInvoice = (data) => api.post('/invoices', data).then(r => r.data)
export const markInvoicePaid = (id) => api.post(`/invoices/${id}/mark-paid`).then(r => r.data)
export const dismissPaymentAlert = (id) => api.post(`/invoices/${id}/dismiss-payment-alert`).then(r => r.data)
export const dismissValidityAlert = (id) => api.post(`/invoices/${id}/dismiss-validity-alert`).then(r => r.data)
export const getInvoicePdfUrl = (id) => `/api/invoices/${id}/pdf`

// Creditors
export const getCreditors = () => api.get('/creditors').then(r => r.data)
export const recordCreditorPayment = (id, data) => api.post(`/creditors/${id}/payments`, data).then(r => r.data)

// Dashboard
export const getDashboard = () => api.get('/dashboard').then(r => r.data)

// Reports
export const getSalesReport = (params) => api.get('/reports/sales', { params }).then(r => r.data)
export const getPurchasesReport = (params) => api.get('/reports/purchases', { params }).then(r => r.data)
export const getStockReport = () => api.get('/reports/stock').then(r => r.data)
export const getCreditorsReport = () => api.get('/reports/creditors').then(r => r.data)

// Settings
export const getSettings = () => api.get('/settings').then(r => r.data)
export const updateSettings = (data) => api.put('/settings', data).then(r => r.data)

// Settings — logo
export const uploadLogo = (file) => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post('/settings/logo', fd).then(r => r.data)
}
export const deleteLogo = () => api.delete('/settings/logo').then(r => r.data)
export const getLogoUrl = () => `/api/settings/logo`

// Units
export const getUnits = () => api.get('/units').then(r => r.data)
export const createUnit = (name) => api.post('/units', { name }).then(r => r.data)
export const deleteUnit = (id) => api.delete(`/units/${id}`)

// Backup
export const exportBackup = () => { window.location.href = '/api/backup/export' }
export const importBackup = (file) => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post('/backup/import', fd).then(r => r.data)
}
