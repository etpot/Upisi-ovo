const API_BASE = "http://127.0.0.1:8000";

const obligationsList = document.getElementById("obligations-panel");
const obligationsUrgentList = document.getElementById("obligations-urgent");

async function loadObligations() {
    const res = await fetch(`${API_BASE}/obligations`);
    const obligations = await res.json();

    obligationsUrgentList.innerHTML = obligations
        .filter((obligation) => obligation.priority === "high")
        .map((obligation) => `<li>${obligation.title}</li>`)
        .join("");
}

loadObligations();



async function renderObligations(obligations) {
    obligationsUrgentList.innerHTML = obligations
        .filter((obligation) => obligation.priority === "high")
        .map((obligation) => `<li>${obligation.title}</li>`)
        .join("");
}
