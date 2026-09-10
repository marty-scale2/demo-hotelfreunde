(function(){
  "use strict";
  var reduce=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var preloader=document.querySelector(".preloader");
  window.addEventListener("load",function(){setTimeout(function(){preloader.classList.add("done");document.body.classList.remove("is-loading")},reduce?0:650)});

  var header=document.querySelector(".site-header");
  var progress=document.querySelector(".scroll-progress");
  var parallax=[].slice.call(document.querySelectorAll("[data-parallax]"));
  var ticking=false;
  function updateScroll(){
    var y=window.scrollY,max=document.documentElement.scrollHeight-window.innerHeight;
    header.classList.toggle("scrolled",y>40);
    progress.style.width=(max>0?y/max*100:0)+"%";
    if(!reduce)parallax.forEach(function(img){
      var rect=img.parentElement.getBoundingClientRect();
      var speed=parseFloat(img.getAttribute("data-parallax"))||.05;
      var offset=(rect.top+rect.height/2-window.innerHeight/2)*speed;
      img.style.transform="translate3d(0,"+(-offset)+"px,0)";
    });
    ticking=false;
  }
  addEventListener("scroll",function(){if(!ticking){requestAnimationFrame(updateScroll);ticking=true}},{passive:true});
  updateScroll();

  var reveals=document.querySelectorAll(".reveal");
  if("IntersectionObserver" in window&&!reduce){
    var observer=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(entry.isIntersecting){entry.target.classList.add("in-view");observer.unobserve(entry.target)}})},{threshold:.12,rootMargin:"0px 0px -6% 0px"});
    reveals.forEach(function(el){observer.observe(el)});
  }else reveals.forEach(function(el){el.classList.add("in-view")});

  document.querySelectorAll("[data-tilt]").forEach(function(card){
    card.addEventListener("mousemove",function(e){
      if(reduce||innerWidth<900)return;
      var r=card.getBoundingClientRect(),rx=((e.clientY-r.top)/r.height-.5)*-3,ry=((e.clientX-r.left)/r.width-.5)*3;
      card.style.transform="rotateX("+rx+"deg) rotateY("+ry+"deg) translateY(-5px)";
    });
    card.addEventListener("mouseleave",function(){card.style.transform=""});
  });

  if(matchMedia("(hover:hover) and (pointer:fine)").matches&&!reduce){
    var cursor=document.querySelector(".cursor"),dot=document.querySelector(".cursor-dot");
    var mx=-100,my=-100,cx=-100,cy=-100;
    document.addEventListener("mousemove",function(e){mx=e.clientX;my=e.clientY;document.body.classList.add("cursor-active");dot.style.transform="translate3d("+(mx-2)+"px,"+(my-2)+"px,0)"});
    document.querySelectorAll("a,button,input,select,textarea,.experience").forEach(function(el){
      el.addEventListener("mouseenter",function(){cursor.classList.add("hover")});
      el.addEventListener("mouseleave",function(){cursor.classList.remove("hover")});
    });
    (function move(){cx+=(mx-cx)*.14;cy+=(my-cy)*.14;cursor.style.transform="translate3d("+(cx-cursor.offsetWidth/2)+"px,"+(cy-cursor.offsetHeight/2)+"px,0)";requestAnimationFrame(move)})();
  }

  var today=new Date(),tomorrow=new Date(today),nextWeek=new Date(today);
  tomorrow.setDate(today.getDate()+1);nextWeek.setDate(today.getDate()+4);
  function iso(d){return d.toISOString().slice(0,10)}
  ["quick-arrival","anreise"].forEach(function(id){var el=document.getElementById(id);el.min=iso(today);if(!el.value)el.value=iso(tomorrow)});
  ["quick-departure","abreise"].forEach(function(id){var el=document.getElementById(id);el.min=iso(tomorrow);if(!el.value)el.value=iso(nextWeek)});
  document.getElementById("quickBook").addEventListener("submit",function(e){
    e.preventDefault();
    document.getElementById("anreise").value=document.getElementById("quick-arrival").value;
    document.getElementById("abreise").value=document.getElementById("quick-departure").value;
    document.getElementById("personen").value=parseInt(document.getElementById("quick-guests").value,10)||2;
    document.getElementById("buchen").scrollIntoView({behavior:reduce?"auto":"smooth"});
  });

  document.getElementById("demoBtn").addEventListener("click",function(){
    try{sessionStorage.setItem("hirschen_dbw_seen","1")}catch(e){}
    if(window.Direktbucher)window.Direktbucher.open();
  });
})();
