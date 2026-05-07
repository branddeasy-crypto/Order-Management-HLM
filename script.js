console.log("Happy Little Mind Admin App aktif");
const orderForm = document.getElementById("orderForm");
const orderTableBody = document.getElementById("orderTableBody");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");

let orders = JSON.parse(localStorage.getItem("orders")) || [];

function saveOrders() {
  localStorage.setItem("orders", JSON.stringify(orders));
}

function formatRupiah(number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0
  }).format(number);
}

function generateInvoiceNumber() {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const date = String(today.getDate()).padStart(2, "0");

  const dateCode = `${year}${month}${date}`;
  const dailyOrders = orders.filter((order) =>
    order.invoiceNumber && order.invoiceNumber.includes(dateCode)
  );

  const sequence = String(dailyOrders.length + 1).padStart(3, "0");

  return `HLM-${dateCode}-${sequence}`;
}

function updateDashboard() {
  const totalOrders = orders.length;

  const waitingDP = orders.filter(
    (order) => order.status === "Menunggu DP"
  ).length;

  const readyShipping = orders.filter(
    (order) => order.status === "Ready Kirim"
  ).length;

  const monthlyRevenue = orders.reduce(
    (total, order) => total + order.total,
    0
  );

  document.getElementById("totalOrders").textContent = totalOrders;

  document.getElementById("waitingDP").textContent = waitingDP;

  document.getElementById("readyShipping").textContent = readyShipping;

  document.getElementById("monthlyRevenue").textContent =
    formatRupiah(monthlyRevenue);
}

function getStatusClass(status) {
  switch (status) {
    case "Menunggu DP":
      return "status status-menunggu";

    case "DP Masuk":
      return "status status-dp";

    case "Ready Kirim":
      return "status status-ready";

    case "Dikirim":
      return "status status-dikirim";

    case "Selesai":
      return "status status-selesai";

    default:
      return "status";
  }
}

searchInput.addEventListener("input", renderOrders);
statusFilter.addEventListener("change", renderOrders);

function renderOrders() {
  updateDashboard();

  const searchKeyword = searchInput.value.toLowerCase();
  const selectedStatus = statusFilter.value;

  const filteredOrders = orders.filter((order) => {
    const matchSearch =
      order.customerName.toLowerCase().includes(searchKeyword) ||
      order.whatsapp.toLowerCase().includes(searchKeyword) ||
      order.bookTitle.toLowerCase().includes(searchKeyword);

    const matchStatus =
      selectedStatus === "" || order.status === selectedStatus;

    return matchSearch && matchStatus;
  });

  if (filteredOrders.length === 0) {
    orderTableBody.innerHTML = `
      <tr>
        <td colspan="8">Tidak ada order yang sesuai.</td>
      </tr>
    `;
    return;
  }

  orderTableBody.innerHTML = "";

  filteredOrders.forEach((order) => {
    const originalIndex = orders.indexOf(order);
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${order.invoiceNumber || "-"}</td>
      <td>${order.customerName}</td>
      <td>${order.whatsapp}</td>
      <td>${order.bookTitle}</td>
      <td>${order.quantity}</td>
      <td>${formatRupiah(order.total)}</td>
      <td>
        <span class="${getStatusClass(order.status)}">
          ${order.status}
        </span>
      </td>
      <td>
        <div class="action-buttons">
          <select class="status-select" onchange="changeStatus(${originalIndex}, this.value)">
            <option value="">Ubah Status</option>
            <option value="Menunggu DP">Menunggu DP</option>
            <option value="DP Masuk">DP Masuk</option>
            <option value="Ready Kirim">Ready Kirim</option>
            <option value="Dikirim">Dikirim</option>
            <option value="Selesai">Selesai</option>
          </select>
        
          <button class="copy-btn" onclick="copyInvoice(${originalIndex})">
            Copy Invoice
          </button>
        
          <button class="delete-btn" onclick="deleteOrder(${originalIndex})">
            Hapus
          </button>
        </div>
      </td>
    `;

    orderTableBody.appendChild(row);
  });
}

function changeStatus(index, newStatus) {
  if (!newStatus) return;

  orders[index].status = newStatus;
  saveOrders();
  renderOrders();
}

function deleteOrder(index) {
  const confirmDelete = confirm("Yakin mau hapus order ini?");

  if (!confirmDelete) return;

  orders.splice(index, 1);
  saveOrders();
  renderOrders();
}

function copyInvoice(index) {
  const order = orders[index];

  const invoiceText = `
Halo Kak ${order.customerName},

Berikut detail pesanan Happy Little Mind:

Invoice: ${order.invoiceNumber}
Judul Buku: ${order.bookTitle}
Qty: ${order.quantity}
Harga Satuan: ${formatRupiah(order.price)}
Total: ${formatRupiah(order.total)}
Status: ${order.status}

Silakan melakukan pembayaran ke rekening berikut:

BCA 1234567890
a.n. Happy Little Mind

Setelah pembayaran, mohon kirimkan bukti transfer ya Kak.

Terima kasih 😊
  `;

  navigator.clipboard.writeText(invoiceText.trim());

  alert("Invoice berhasil dicopy. Tinggal paste ke WhatsApp customer.");
}

orderForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const customerName = document.getElementById("customerName").value;
  const whatsapp = document.getElementById("whatsapp").value;
  const bookTitle = document.getElementById("bookTitle").value;
  const quantity = Number(document.getElementById("quantity").value);
  const price = Number(document.getElementById("price").value);
  const status = document.getElementById("status").value;

  const total = quantity * price;

  const newOrder = {
  invoiceNumber: generateInvoiceNumber(),
  customerName,
  whatsapp,
  bookTitle,
  quantity,
  price,
  total,
  status
  };

  orders.push(newOrder);
  saveOrders();
  renderOrders();
  orderForm.reset();
});

renderOrders();
