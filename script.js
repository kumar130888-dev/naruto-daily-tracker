const templateInput = document.getElementById("templateImage");
const imagePreview = document.getElementById("imagePreview");
const imgHint = document.getElementById("imgHint");
const form = document.getElementById("taskForm");
const taskNameSelect = document.getElementById("taskName");
const entriesTableBody = document.querySelector("#entriesTable tbody");
const exportCsv = document.getElementById("exportCsv");
const printReport = document.getElementById("printReport");
const reportMessage = document.getElementById("reportMessage");

let tasks = [];
const apiBase = "http://localhost:3001/api";


const defaultNarutoImage = "https://www.pngitem.com/pimgs/m/522-5225018_naruto-uzumaki-png-transparent-png.png";
imagePreview.src = defaultNarutoImage;
imagePreview.hidden = false;
imgHint.textContent = "Naruto face loaded. You can upload your own image as well.";

templateInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) {
    imagePreview.src = defaultNarutoImage;
    imagePreview.hidden = false;
    imgHint.textContent = "Naruto face loaded. You can upload your own image as well.";
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    imagePreview.src = e.target.result;
    imagePreview.hidden = false;
    imgHint.textContent = "Custom image loaded.";
  };
  reader.readAsDataURL(file);
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const dateValue = document.getElementById("taskDate").value;
  const nameValue = taskNameSelect.value;
  const statusValue = document.getElementById("taskStatus").value;
  const notesValue = document.getElementById("taskNotes").value.trim();

  if (!dateValue || !nameValue) {
    reportMessage.textContent = "Date and task are required.";
    return;
  }

  const payload = { date: dateValue, task: nameValue, status: statusValue, notes: notesValue };

  const submitBtn = document.querySelector("#taskForm button[type='submit']");
  const editId = submitBtn.getAttribute("data-edit-id");

  try {
    let response;
    if (editId) {
      // Update existing
      response = await fetch(`${apiBase}/tasks/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        const updatedTask = await response.json();
        const index = tasks.findIndex(t => t.id == editId);
        if (index !== -1) {
          tasks[index] = updatedTask;
        }
        renderTasks();
        form.reset();
        submitBtn.textContent = "Add entry";
        submitBtn.removeAttribute("data-edit-id");
        showSuccessMessage("🌀 Task updated! You're training hard! 🚀");
      } else {
        reportMessage.textContent = "Could not update entry.";
      }
    } else {
      // Add new
      response = await fetch(`${apiBase}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to add task: ${response.statusText}`);
      }

      const newTask = await response.json();
      tasks.push(newTask);
      renderTasks();
      form.reset();
      showSuccessMessage("� Dattebayo! Task added successfully! Believe it! 🌟");
    } else {
      reportMessage.textContent = "Could not save entry to database.";
    }
    }
  } catch (error) {
    console.error(error);
    reportMessage.textContent = "Could not save entry to database.";
  }
});

async function loadTasksFromServer() {
  try {
    const response = await fetch(`${apiBase}/tasks`);
    if (response.ok) {
      tasks = await response.json();
      renderTasks();
      reportMessage.textContent = "📚 Tasks loaded! Ready to become Hokage!";
    } else {
      reportMessage.textContent = "Could not load tasks from database.";
    }
  } catch (error) {
    console.error(error);
    reportMessage.textContent = "Database service unavailable.";
  }
}

async function loadMasterTasks() {
  try {
    const response = await fetch(`${apiBase}/master-tasks`);
    if (response.ok) {
      const masterTasks = await response.json();
      taskNameSelect.innerHTML = '<option value="">Select a task</option>';
      masterTasks.forEach(mt => {
        const option = document.createElement("option");
        option.value = mt.task;
        option.textContent = mt.task;
        taskNameSelect.appendChild(option);
      });
    } else {
      reportMessage.textContent = "Could not load master tasks.";
    }
  } catch (error) {
    console.error(error);
    reportMessage.textContent = "Database service unavailable.";
  }
}

function renderTasks() {
  entriesTableBody.innerHTML = "";

  tasks.forEach((task, index) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${task.date}</td>
      <td>${task.task}</td>
      <td>${task.status}</td>
      <td>${task.notes || ""}</td>
      <td>
        <button class="edit-btn" data-id="${task.id}">Edit</button>
        <button class="delete-btn" data-id="${task.id}">Delete</button>
      </td>
    `;

    entriesTableBody.appendChild(row);
  });

  // Add event listeners to delete buttons
  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const id = e.target.getAttribute("data-id");
      if (confirm("Are you sure you want to delete this entry?")) {
        try {
          const response = await fetch(`${apiBase}/tasks/${id}`, { method: "DELETE" });
          if (response.ok) {
            tasks = tasks.filter(t => t.id != id);
            renderTasks();
            showSuccessMessage("🗑️ Task deleted! Keep pushing forward! 👍");
          } else {
            reportMessage.textContent = "Could not delete entry.";
          }
        } catch (error) {
          console.error(error);
          reportMessage.textContent = "Database service unavailable.";
        }
      }
    });
  });

  // Add event listeners to edit buttons
  document.querySelectorAll(".edit-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.target.getAttribute("data-id");
      const task = tasks.find(t => t.id == id);
      if (task) {
        // Populate form with task data
        document.getElementById("taskDate").value = task.date;
        taskNameSelect.value = task.task;
        document.getElementById("taskStatus").value = task.status;
        document.getElementById("taskNotes").value = task.notes || "";
        // Change submit button to update
        const submitBtn = document.querySelector("#taskForm button[type='submit']");
        submitBtn.textContent = "Update entry";
        submitBtn.setAttribute("data-edit-id", id);
      }
    });
  });
}

exportCsv.addEventListener("click", () => {
  if (tasks.length === 0) {
    reportMessage.textContent = "No entries to export.";
    return;
  }

  const csvRows = ["No,Date,Task,Status,Notes"];

  tasks.forEach((task, idx) => {
    const sanitizedNotes = task.notes.replace(/"/g, '""');
    csvRows.push(`${idx + 1},${task.date},"${task.task}",${task.status},"${sanitizedNotes}"`);
  });

  const csvString = csvRows.join("\n");
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = `daily-tracker-report-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showSuccessMessage("📊 Jutsu report downloaded! 📈");
});

printReport.addEventListener("click", () => {
  if (tasks.length === 0) {
    reportMessage.textContent = "No entries to print.";
    return;
  }
  window.print();
});

// initialize date to today
const dateInput = document.getElementById("taskDate");
const today = new Date().toISOString().split("T")[0];
dateInput.value = today;

function showSuccessMessage(message) {
  reportMessage.textContent = message;
  reportMessage.style.animation = "bounce 1s";
  setTimeout(() => {
    reportMessage.style.animation = "";
  }, 1000);
}
