/* ========================================
   GLOBAL EVENT
======================================== */

document.addEventListener("click", function (e) {
    const dropdown = document.querySelector(".dropdown");
    if (dropdown && !dropdown.contains(e.target)) {
        dropdown.classList.remove("active");
    }

    const popup = e.target.closest?.(".popup");
    if (popup && e.target === popup) {
        popup.classList.remove("show");
    }
});

/* ==========================================================
   POPUP SCROLL LOCK
   Covers both static popups and dynamically injected feature popups.
========================================================== */
(function(){
  let frame=0;
  const sync=()=>{
    frame=0;
    document.body.classList.toggle('popup-open',!!document.querySelector('.popup.show'));
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(sync);};
  const observer=new MutationObserver(schedule);
  observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class'],childList:true});
  sync();
})();

