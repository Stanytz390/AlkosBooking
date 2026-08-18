document.addEventListener("DOMContentLoaded",()=>{
  const openModal=(id)=>document.getElementById(id)?.classList.add("open");
  const closeAll=()=>document.querySelectorAll(".modal.open").forEach(m=>m.classList.remove("open"));
  document.querySelectorAll("[data-modal-open]").forEach(b=>b.addEventListener("click",()=>openModal(b.dataset.modalOpen)));
  document.querySelectorAll("[data-modal-close]").forEach(b=>b.addEventListener("click",closeAll));
  document.querySelectorAll(".modal").forEach(m=>m.addEventListener("click",e=>{if(e.target===m) m.classList.remove("open")}));
  document.addEventListener("keydown",e=>{if(e.key==="Escape") closeAll()});

  const showGallery=(src,title)=>{
    const img=document.getElementById("modalGalleryImage"), t=document.getElementById("modalGalleryTitle");
    if(!img) return;
    img.src=src; t.textContent=title||"ALKOS Apartments"; openModal("galleryModal");
  };
  document.querySelectorAll(".gallery-tile").forEach(b=>b.addEventListener("click",()=>showGallery(b.dataset.src,b.dataset.title)));
  document.querySelectorAll(".gallery-open").forEach(b=>b.addEventListener("click",()=>{
    try{const imgs=JSON.parse(b.dataset.images); showGallery(imgs[0]||"", "Apartment gallery")}catch{}
  }));
  document.querySelector(".gallery-all")?.addEventListener("click",()=>document.querySelector(".gallery-tile")?.click());

  const formDate=document.getElementById("checkIn");
  const outDate=document.getElementById("checkOut");
  const setMin=()=>{if(formDate){const today=new Date().toISOString().slice(0,10);formDate.min=today;outDate.min=formDate.value||today}};
  setMin(); formDate?.addEventListener("change",()=>{outDate.min=formDate.value});

  document.getElementById("searchAvailability")?.addEventListener("click",async()=>{
    const ci=formDate.value, co=outDate.value, guests=document.getElementById("guests").value;
    const box=document.getElementById("availabilityResults");
    if(!ci||!co||co<=ci){box.classList.remove("hidden");box.innerHTML="<b>Please select valid check-in and check-out dates.</b>";return}
    box.classList.remove("hidden"); box.innerHTML="Checking live availability…";
    try{
      const r=await fetch(`/availability?checkIn=${encodeURIComponent(ci)}&checkOut=${encodeURIComponent(co)}&guests=${guests}`);
      const data=await r.json();
      const available=(data.units||[]).filter(u=>u.available);
      box.innerHTML=available.length?`<b>${available.length} apartment${available.length>1?"s are":" is"} available.</b>`+available.map(u=>`<div class="avail-row"><span>${u.name}<small> · ${Number(u.price).toLocaleString()} TZS/night</small></span><a href="/book/${u._id}?checkIn=${ci}&checkOut=${co}&guests=${guests}">Book →</a></div>`).join(""):"<b>No apartment is available for those dates.</b><br><small>Please try different dates.</small>";
    }catch{box.innerHTML="Unable to check availability right now."}
  });

  const params=new URLSearchParams(location.search);
  if(params.get("review")==="received"){
    const toast=document.getElementById("toast"); if(toast){toast.classList.add("show");setTimeout(()=>toast.classList.remove("show"),4000)}
  }
  document.querySelector("[data-menu]")?.addEventListener("click",()=>document.querySelector(".nav-links")?.classList.toggle("mobile-open"));
});
