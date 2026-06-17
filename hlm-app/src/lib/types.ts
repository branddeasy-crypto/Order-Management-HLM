export type Customer = {
  id: string
  whatsapp_name: string
  whatsapp_number: string
  address: string | null
  receiver_name: string | null
  receiver_phone: string | null
  whatsapp_group: string | null
  credit_balance: number
}

export type Book = {
  id: string
  publisher: string
  isbn: string | null
  title: string
  format: 'PB' | 'HC' | 'BB' | 'FB' | 'TOYS' | 'MONTESSORI'
  price_gbp: number | null
  price_currency: 'GBP' | 'USD' | 'AUD' | null
  price_idr: number
  eta: string | null
  status: 'available' | 'ready_stock' | 'oos'
}

export type OrderStatus = 'pending' | 'confirmed' | 'hold' | 'dp_paid' | 'paid_off' | 'queued' | 'shipped'

export type Order = {
  id: string
  customer_id: string
  book_id: string
  qty: number
  status: OrderStatus
  note: string | null
  customers?: Customer
  books?: Book
}

export type Payment = {
  id: string
  order_id: string
  kind: 'dp' | 'pelunasan'
  amount: number
  paid_at: string
  bank_account: string | null
}

export type Shipment = {
  id: string
  order_id: string
  expedition: string | null
  tracking_number: string | null
  queue_no: number | null
  shipped_at: string | null
  weight_actual: number | null
  shipping_cost_actual: number | null
}

export function formatIDR(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}
