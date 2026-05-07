console.log("Happy Little Mind Admin App aktif");
const orderForm = document.getElementById("orderForm");
const orderTableBody = document.getElementById("orderTableBody");

let orders = [];

function formatRupiah(number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0
  }).format(number);
}

function renderOrders() {
  if (orders.length === 0) {
    orderTableBody.innerHTML = `
      <tr>
        <td colspan="6">Belum ada order.</td>
      </tr>
    `;
    return;
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
      <td>${order.status}</td>
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

  renderOrders();
  orderForm.reset();
});
