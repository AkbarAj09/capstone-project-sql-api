// SweetAlert helper
function showAlert(message, type = "success") {
  Swal.fire({
    toast: true,
    position: "top-end",
    icon: type,
    title: message,
    showConfirmButton: false,
    timer: 2000,
    timerProgressBar: true,
  });
}

// Fetch and display all capitals (AJAX reload after add/edit/delete)
async function fetchCapitals() {
  const res = await fetch("/api/capitals");
  const data = await res.json();
  const list = document.getElementById("capitalsList");
  list.innerHTML = "";
  if (data.data.length === 0) {
    list.innerHTML =
      '<li class="list-group-item text-center text-muted">No capitals found.</li>';
    return;
  }
  data.data.forEach((item) => {
    const li = document.createElement("li");
    li.className =
      "list-group-item d-flex justify-content-between align-items-center";
    li.innerHTML = `
                                <span>
                                        <strong>${item.country}</strong>: ${
      item.capital
    }
                                </span>
                                <span>
                                        <button class="btn btn-sm btn-warning me-1" onclick="editCapital(${
                                          item.id
                                        }, '${item.country.replace(
      /'/g,
      "\\'"
    )}', '${item.capital.replace(/'/g, "\\'")}')">Edit</button>
                                        <button class="btn btn-sm btn-danger" onclick="deleteCapital(${
                                          item.id
                                        }, '${item.country.replace(
      /'/g,
      "\\'"
    )}')">Delete</button>
                                </span>
                        `;
    list.appendChild(li);
  });
}

// Add new capital
document
  .getElementById("addCapitalForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();
    const country = document.getElementById("country").value;
    const capital = document.getElementById("capital").value;
    const res = await fetch("/country", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country, capital }),
    });
    if (res.ok) {
      showAlert("Berhasil menambah data!", "success");
      this.reset();
      fetchCapitals();
    } else {
      showAlert("Gagal menambah data!", "error");
    }
  });

// Delete capital
async function deleteCapital(id, country) {
  const result = await Swal.fire({
    title: `Apakah benar data (${country}) ingin dihapus?`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Ya, hapus!",
    cancelButtonText: "Batal",
  });
  if (result.isConfirmed) {
    const res = await fetch(`/country/${id}`, { method: "DELETE" });
    if (res.ok) {
      showAlert("Berhasil menghapus data!", "success");
      fetchCapitals();
    } else {
      showAlert("Gagal menghapus data!", "error");
    }
  }
}

// Edit capital (open modal)
let editModal;
function editCapital(id, country, capital) {
  document.getElementById("editId").value = id;
  document.getElementById("editCountry").value = country;
  document.getElementById("editCapital").value = capital;
  if (!editModal) {
    editModal = new bootstrap.Modal(document.getElementById("editModal"));
  }
  editModal.show();
}

// Handle edit modal submit
document
  .getElementById("editCapitalForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();
    const id = document.getElementById("editId").value;
    const country = document.getElementById("editCountry").value;
    const capital = document.getElementById("editCapital").value;
    const res = await fetch(`/country/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country, capital }),
    });
    if (res.ok) {
      showAlert("Berhasil mengedit data!", "success");
      fetchCapitals();
      bootstrap.Modal.getInstance(document.getElementById("editModal")).hide();
    } else {
      showAlert("Gagal mengedit data!", "error");
    }
  });



// Initial load
fetchCapitals();

document.getElementById("logoutButton").addEventListener("click", async () => {
    const result = await Swal.fire({
        title: "Apakah Anda yakin ingin logout?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Ya, logout",
        cancelButtonText: "Batal",
    });
    if (result.isConfirmed) {
        const res = await fetch("/logout", { method: "POST", credentials: 'include' });
        if (res.ok) {
            window.location.href = "/login";
        } else {
            Swal.fire("Error", "Gagal logout.", "error");
        }
    }
});
