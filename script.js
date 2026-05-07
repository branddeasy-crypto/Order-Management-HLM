console.log("Happy Little Mind Admin App aktif");
const orderForm = document.getElementById("orderForm");
const orderTableBody = document.getElementById("orderTableBody");

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

function renderOrders() {
  if (orders.length === 0) {
    orderTableBody.innerHTML = `
      <tr>
        <td colspan="6">Belum ada order.</td>
      </tr>
    `;
    return;
    updateDashboard();
  }

  orderTableBody.innerHTML = "";

  orders.forEach((order) => {
    const row = document.createElement("tr");

    row.innerHTML = `
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
    `;

    orderTableBody.appendChild(row);
  });
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
