const menus = document.querySelectorAll(".menu");
const pages = document.querySelectorAll(".page");

const productForm = document.getElementById("productForm");
const productTableBody = document.getElementById("productTableBody");
const productTitle = document.getElementById("productTitle");
const productPrice = document.getElementById("productPrice");
const productStock = document.getElementById("productStock");
const productEta = document.getElementById("productEta");

const orderForm = document.getElementById("orderForm");
const orderTableBody = document.getElementById("orderTableBody");
const bookSelect = document.getElementById("bookSelect");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");

const customerTableBody = document.getElementById("customerTableBody");
const paymentTableBody = document.getElementById("paymentTableBody");
const shippingTableBody = document.getElementById("shippingTableBody");
const latestOrders = document.getElementById("latestOrders");

let products = JSON.parse(localStorage.getItem("products")) || [];
let orders = JSON.parse(localStorage.getItem("orders")) || [];

function saveProducts() {
  localStorage.setItem("products", JSON.stringify(products));
}

function saveOrders() {
  localStorage.setItem("orders", JSON.stringify(orders));
}

function formatRupiah(number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0
  }).format(Number(number) || 0);
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

function updateDashboard() {
  const totalOrders = orders.length;
  const waitingDP = orders.filter((order) => order.status === "Menunggu DP").length;
  const readyShipping = orders.filter((order) => order.status === "Ready Kirim").length;
  const revenue = orders.reduce((total, order) => total + Number(order.total || 0), 0);

  document.getElementById("totalOrders").textContent = totalOrders;
  document.getElementById("waitingDP").textContent = waitingDP;
  document.getElementById("readyShipping").textContent = readyShipping;
  document.getElementById("monthlyRevenue").textContent = formatRupiah(revenue);
}

function renderLatestOrders() {
  if (orders.length === 0) {
    latestOrders.innerHTML = `<p class="empty-state">Belum ada order terbaru.</p>`;
    return;
  }

  const latest = [...orders].slice(-5).reverse();

  latestOrders.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Invoice</th>
          <th>Customer</th>
          <th>Buku</th>
          <th>Total</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${latest.map(order => `
          <tr>
            <td>${order.invoiceNumber || "-"}</td>
            <td>${order.customerName}</td>
            <td>${order.bookTitle}</td>
            <td>${formatRupiah(order.total)}</td>
            <td><span class="${getStatusClass(order.status)}">${order.status}</span></td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderProducts() {
  if (products.length === 0) {
    productTableBody.innerHTML = `
      <tr>
        <td colspan="5">Belum ada produk.</td>
      </tr>
    `;
  } else {
    productTableBody.innerHTML = products.map((product, index) => `
      <tr>
        <td>${product.title}</td>
        <td>${formatRupiah(product.price)}</td>
        <td>${product.stock}</td>
        <td>${product.eta || "-"}</td>
        <td>
          <div class="action-buttons">
            <button class="delete-btn" onclick="deleteProduct(${index})">Hapus</button>
          </div>
        </td>
      </tr>
    `).join("");
  }

  renderProductOptions();
}

function renderProductOptions() {
  bookSelect.innerHTML = `<option value="">Pilih Produk</option>`;

  products.forEach((product, index) => {
    bookSelect.innerHTML += `
      <option value="${index}">${product.title} - ${formatRupiah(product.price)}</option>
    `;
  });
}

function renderOrders() {
  updateDashboard();

  const keyword = searchInput.value.toLowerCase();
  const selectedStatus = statusFilter.value;

  const filteredOrders = orders.filter((order) => {
    const matchSearch =
      (order.invoiceNumber || "").toLowerCase().includes(keyword) ||
      order.customerName.toLowerCase().includes(keyword) ||
      order.whatsapp.toLowerCase().includes(keyword) ||
      order.bookTitle.toLowerCase().includes(keyword);

    const matchStatus = selectedStatus === "" || order.status === selectedStatus;

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

  orderTableBody.innerHTML = filteredOrders.map((order) => {
    const originalIndex = orders.indexOf(order);

    return `
      <tr>
        <td>${order.invoiceNumber || "-"}</td>
        <td>${order.customerName}</td>
        <td>${order.whatsapp}</td>
        <td>${order.bookTitle}</td>
        <td>${order.quantity}</td>
        <td>${formatRupiah(order.total)}</td>
        <td><span class="${getStatusClass(order.status)}">${order.status}</span></td>
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

            <button class="copy-btn" onclick="copyInvoice(${originalIndex})">Copy Invoice</button>
            <button class="delete-btn" onclick="deleteOrder(${originalIndex})">Hapus</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function renderCustomers() {
  const customerMap = {};

  orders.forEach((order) => {
    const key = order.whatsapp;

    if (!customerMap[key]) {
      customerMap[key] = {
        name: order.customerName,
        whatsapp: order.whatsapp,
        totalOrders: 0,
        totalSpend: 0
      };
    }

    customerMap[key].totalOrders += 1;
    customerMap[key].totalSpend += Number(order.total || 0);
  });

  const customers = Object.values(customerMap);

  if (customers.length === 0) {
    customerTableBody.innerHTML = `
      <tr>
        <td colspan="4">Belum ada customer.</td>
      </tr>
    `;
    return;
  }

  customerTableBody.innerHTML = customers.map((customer) => `
    <tr>
      <td>${customer.name}</td>
      <td>${customer.whatsapp}</td>
      <td>${customer.totalOrders}</td>
      <td>${formatRupiah(customer.totalSpend)}</td>
    </tr>
  `).join("");
}

function renderPayments() {
  if (orders.length === 0) {
    paymentTableBody.innerHTML = `
      <tr>
        <td colspan="5">Belum ada data pembayaran.</td>
      </tr>
    `;
    return;
  }

  paymentTableBody.innerHTML = orders.map((order, index) => `
    <tr>
      <td>${order.invoiceNumber || "-"}</td>
      <td>${order.customerName}</td>
      <td>${formatRupiah(order.total)}</td>
      <td><span class="${getStatusClass(order.status)}">${order.status}</span></td>
      <td>
        <div class="action-buttons">
          <button class="warning-btn" onclick="changeStatus(${index}, 'DP Masuk')">Tandai DP</button>
          <button class="success-btn" onclick="changeStatus(${index}, 'Ready Kirim')">Ready Kirim</button>
        </div>
      </td>
    </tr>
  `).join("");
}

function renderShipping() {
  const shippingOrders = orders.filter((order) =>
    ["Ready Kirim", "Dikirim", "Selesai"].includes(order.status)
  );

  if (shippingOrders.length === 0) {
    shippingTableBody.innerHTML = `
      <tr>
        <td colspan="7">Belum ada order siap kirim.</td>
      </tr>
    `;
    return;
  }

  shippingTableBody.innerHTML = shippingOrders.map((order) => {
    const originalIndex = orders.indexOf(order);

    return `
      <tr>
        <td>${order.invoiceNumber || "-"}</td>
        <td>${order.customerName}</td>
        <td>${order.whatsapp}</td>
        <td>${order.bookTitle}</td>
        <td><span class="${getStatusClass(order.status)}">${order.status}</span></td>
        <td>
          <input
            class="resi-input"
            type="text"
            value="${order.resi || ""}"
            placeholder="Input resi"
            onchange="updateResi(${originalIndex}, this.value)"
          />
        </td>
        <td>
          <div class="action-buttons">
            <button class="success-btn" onclick="changeStatus(${originalIndex}, 'Dikirim')">Dikirim</button>
            <button class="copy-btn" onclick="copyShippingMessage(${originalIndex})">Copy WA</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function renderAll() {
  updateDashboard();
  renderLatestOrders();
  renderProducts();
  renderOrders();
  renderCustomers();
  renderPayments();
  renderShipping();
}

menus.forEach((menu) => {
  menu.addEventListener("click", () => {
    menus.forEach((item) => item.classList.remove("active"));
    pages.forEach((page) => page.classList.remove("active-page"));

    menu.classList.add("active");
    document.getElementById(menu.dataset.page).classList.add("active-page");

    renderAll();
  });
});

productForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const newProduct = {
    title: productTitle.value,
    price: Number(productPrice.value),
    stock: Number(productStock.value),
    eta: productEta.value
  };

  products.push(newProduct);
  saveProducts();
  productForm.reset();
  renderAll();
});

function deleteProduct(index) {
  const confirmDelete = confirm("Yakin mau hapus produk ini?");
  if (!confirmDelete) return;

  products.splice(index, 1);
  saveProducts();
  renderAll();
}

bookSelect.addEventListener("change", function () {
  const selectedProduct = products[bookSelect.value];

  if (!selectedProduct) {
    document.getElementById("price").value = "";
    return;
  }

  document.getElementById("price").value = selectedProduct.price;
});

orderForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const selectedProduct = products[bookSelect.value];
  const bookTitle = selectedProduct ? selectedProduct.title : "Produk tidak ditemukan";

  const customerName = document.getElementById("customerName").value;
  const whatsapp = document.getElementById("whatsapp").value;
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
    status,
    resi: ""
  };

  orders.push(newOrder);
  saveOrders();
  orderForm.reset();
  renderAll();
});

function changeStatus(index, newStatus) {
  if (!newStatus) return;

  orders[index].status = newStatus;
  saveOrders();
  renderAll();
}

function deleteOrder(index) {
  const confirmDelete = confirm("Yakin mau hapus order ini?");
  if (!confirmDelete) return;

  orders.splice(index, 1);
  saveOrders();
  renderAll();
}

function updateResi(index, resi) {
  orders[index].resi = resi;
  saveOrders();
  renderAll();
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

function copyShippingMessage(index) {
  const order = orders[index];

  const message = `
Halo Kak ${order.customerName},

Yeay, pesanan Happy Little Mind Kakak sudah dikirim 😊

Invoice: ${order.invoiceNumber}
Judul Buku: ${order.bookTitle}
Nomor Resi: ${order.resi || "-"}

Terima kasih sudah berbelanja di Happy Little Mind.
Semoga bukunya bermanfaat untuk si kecil ya Kak 💛
  `;

  navigator.clipboard.writeText(message.trim());
  alert("Pesan pengiriman berhasil dicopy.");
}

searchInput.addEventListener("input", renderOrders);
statusFilter.addEventListener("change", renderOrders);

renderAll();
