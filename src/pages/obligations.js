const API_BASE="http://127.0.0.1:8000";

const urgentList=document.getElementById("obligations_urgent");
const urgentInput=document.getElementById("obligation-urgent-input");
const urgentButton=document.getElementById("urgent-btn");

let urgentObligationId=null;

function renderUrgentItems(items){
  if(!urgentList) return;
  urgentList.innerHTML="";
  items.forEach((item)=>{
    const li=document.createElement("li");
    li.textContent= item.title;
    urgentList.appendChild(li);
  });
}

async function ensureUrgentObligation(){
  const res=await fetch('${API_BASE}/obligations?title=urgent');
  if(!res.ok){
    console.error("load urgent obligation failed: ", res.status, await res.text());
    return null;
  }
  const list=await res.json();
  let urgent=list[0];
  if(!urgent){
    const createRes=await fetch('${API_BASE}/obligations',{
      method: "POST",
      headers: {"Content-Type" : "application/json"},
      body: JSON.stringify({title: "urgent", description:"", position:0}),
    });
  if(!createRes.ok){
    console.error("create urgent obligation:", createRes.status, await createRes.text());
    return null;
  }
  urgent =  await createRes.json();  
  }
  urgentObligationId=urgent.id;
  return urgent;  
}

async function loadUrgentItems(){
  const urgent = aawit ensureUrgentObligation();
  if(!urgent) return;
  renderUrgentItems(urgent.obligation_items || []);
}

async function addUrgentItem(){
  const title.urgentInput?.value.trim();
  if(!title) return;
  
  if(!urgentObligationId){
    const urgent=await ensureUrgentObligation();
    if(!urgent)return;
  }
  const res=await fetch('${API_BASE}/obligations/${urgentObligationId}/items',{
    method:"POST",
    headers:{Content-Type:"application/json"},
    body: JSON.stringify({title,description:null})
  });

  if(!res.ok){
    console.error("add urgent item failed:", res.status, await res.text());
    return;
  }

  urgentInput.value="";
  await loadUrgentItems();
}

urgentForm?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  await addurgentItem();
});

urgentButton?.addEventListener("click", async (e)=>{
  e.preventDefault();
  await addUrgentItem();
})






